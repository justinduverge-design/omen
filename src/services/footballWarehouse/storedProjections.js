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
 *   FOOTBALL_PROJECTIONS_MAX_AGE_HOURS         older than this (default 26) counts as missing
 *
 * Freshness caveat: the stage runs once a day, so a stored week can be up to a day old. Projections move on game
 * days (inactives, injuries), and a live fetch is at most an hour old. Treat the stored copy as authoritative on
 * non-game days; on game days the live Sleeper fetch is the more current source. Turning the read on is a
 * deliberate trade of freshness for stability and rights control, not a free win.
 *
 * Load shape: one shared warehouse read per season-week per process (concurrent callers share it), kept 5 minutes,
 * and a failed or empty read is remembered for 60 seconds so an unhealthy warehouse costs one query a minute, not
 * one per request. Nothing is written to the 1 hour Redis projection cache from here: a stored value must never
 * outlive its own staleness limit by living in a longer-lived cache.
 */

const DEFAULT_MAX_AGE_HOURS = 26;
const MIN_PLAYERS = 50;
const HIT_TTL_MS = 5 * 60_000;
const MISS_TTL_MS = 60_000;
const MAX_MEMO = 12;

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
  const memo = new Map(); // "season:week" -> { promise, expires }

  async function load({ season, week, runtime }) {
    try {
      const stored = await runtime.projectionRepository.readWeek({ source: "sleeper", season, week });
      if (!stored) { log({ event: "stored_projections", outcome: "missing", mode: runtime.mode, season, week }); return null; }
      if (stored.rows.length < MIN_PLAYERS) {
        log({ event: "stored_projections", outcome: "incomplete", mode: runtime.mode, season, week });
        return null;
      }
      return { rows: stored.rows, fetchedAt: stored.fetchedAt };
    } catch {
      log({ event: "stored_projections", outcome: "unavailable", mode: runtime.mode, season, week });
      return null;
    }
  }

  return {
    /**
     * @returns {Promise<{ rows: Array<{source_player_id:string, stat_line:object}>, fetchedAt: Date, ageMs: number } | null>}
     */
    async readSleeperWeek({ season, week }) {
      if (!isEnabled(env)) return null;
      let runtime;
      try { runtime = typeof getRuntime === "function" ? getRuntime() : null; } catch { runtime = null; }
      if (!runtime?.enabled || !runtime.projectionRepository || runtime.mode === "supabase") return null;

      const key = `${season}:${week}`;
      let entry = memo.get(key);
      if (!entry || entry.expires <= now()) {
        const created = { expires: now() + MISS_TTL_MS, promise: null };
        created.promise = load({ season, week, runtime }).then((value) => {
          if (value) created.expires = now() + HIT_TTL_MS;
          return value;
        });
        if (memo.size >= MAX_MEMO) memo.delete(memo.keys().next().value);
        memo.set(key, created);
        entry = created;
      }
      const value = await entry.promise;
      if (!value) return null;
      const ageMs = now() - value.fetchedAt.getTime();
      if (!(ageMs >= -60_000) || ageMs > maxAgeMs(env)) {
        log({ event: "stored_projections", outcome: "stale", mode: runtime.mode, season, week });
        return null;
      }
      return { rows: value.rows, fetchedAt: value.fetchedAt, ageMs: Math.max(0, ageMs) };
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
