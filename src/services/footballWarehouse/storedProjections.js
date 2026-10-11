"use strict";

/**
 * Read path for stored Sleeper weekly projections (football.player_weekly_projections).
 *
 * The Sleeper adapter asks this before it makes a live per-request fetch. Anything other than a fresh, complete
 * stored week returns null and the adapter falls back to the live fetch, so a request is never worse off than
 * today. The reads are product-internal: callers turn the stat lines into per-league scores and never return
 * the raw rows.
 *
 * Gates, in order (each one returns null, never throws):
 *   FOOTBALL_PROJECTIONS_DISABLED=1            kill switch (also stops the ingest stage). Rights are pending.
 *   FOOTBALL_PROJECTIONS_STORE_READ_ENABLED    must be "true" (opt-in; default off)
 *   FOOTBALL_DATA_MODE                         "supabase" means no warehouse reads at all. "shadow" and "warehouse"
 *                                              read the warehouse. Warehouse mode stays fail-closed where it
 *                                              already is (a bad credential or target is a startup error); a
 *                                              per-request query failure here degrades to the live fetch rather
 *                                              than to a missing projection, because the live fetch is today's
 *                                              behaviour and not another provider's data.
 *   FOOTBALL_PROJECTIONS_MAX_AGE_HOURS         older than this (default 36) counts as missing
 */

const DEFAULT_MAX_AGE_HOURS = 36;
const MIN_PLAYERS = 50;

function maxAgeMs(env) {
  const raw = env.FOOTBALL_PROJECTIONS_MAX_AGE_HOURS;
  if (raw == null || raw === "") return DEFAULT_MAX_AGE_HOURS * 3_600_000;
  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours < 1 || hours > 168) return DEFAULT_MAX_AGE_HOURS * 3_600_000;
  return hours * 3_600_000;
}

function isEnabled(env) {
  return env.FOOTBALL_PROJECTIONS_DISABLED !== "1" && env.FOOTBALL_PROJECTIONS_STORE_READ_ENABLED === "true";
}

function createStoredProjectionReader({ env = process.env, now = Date.now, getRuntime, logger } = {}) {
  const log = (event) => { try { logger?.info?.("Football warehouse stored projections", event); } catch { /* logging never throws */ } };

  return {
    /**
     * @returns {Promise<{ rows: Array<{source_player_id:string, stat_line:object}>, fetchedAt: Date, ageMs: number } | null>}
     */
    async readSleeperWeek({ season, week }) {
      if (!isEnabled(env)) return null;
      let runtime;
      try { runtime = typeof getRuntime === "function" ? getRuntime() : null; } catch { runtime = null; }
      if (!runtime?.enabled || !runtime.projectionRepository || runtime.mode === "supabase") return null;
      try {
        const stored = await runtime.projectionRepository.readWeek({ source: "sleeper", season, week });
        if (!stored) { log({ event: "stored_projections", outcome: "missing", mode: runtime.mode, season, week }); return null; }
        const ageMs = now() - stored.fetchedAt.getTime();
        if (!(ageMs >= -60_000) || ageMs > maxAgeMs(env)) {
          log({ event: "stored_projections", outcome: "stale", mode: runtime.mode, season, week });
          return null;
        }
        if (stored.rows.length < MIN_PLAYERS) {
          log({ event: "stored_projections", outcome: "incomplete", mode: runtime.mode, season, week });
          return null;
        }
        return { rows: stored.rows, fetchedAt: stored.fetchedAt, ageMs: Math.max(0, ageMs) };
      } catch {
        log({ event: "stored_projections", outcome: "unavailable", mode: runtime.mode, season, week });
        return null;
      }
    },
  };
}

let shared;
/** The process-wide reader, over the same lazily-built, fail-safe runtime the usage reads share. */
function getStoredProjectionReader({ logger } = {}) {
  if (!shared) {
    shared = createStoredProjectionReader({
      logger,
      getRuntime: () => require("./sharedUsageAccess").getRuntime({ logger }),
    });
  }
  return shared;
}

function _reset() { shared = undefined; }

module.exports = {
  DEFAULT_MAX_AGE_HOURS, MIN_PLAYERS, createStoredProjectionReader, getStoredProjectionReader, isEnabled, _reset,
};
