"use strict";

/**
 * The Sight switch for the API. One helper adds a `sight` block to every player object it is given:
 *
 *   SIGHT_ENABLED=true   attach Sight (SIGHT_VERSION picks which version, default v1)
 *   anything else        change nothing: no field, no warehouse read
 *
 * Present renders, absent hides: the app shows Sight wherever a player carries the block, so flipping the
 * switch (or the version) changes every surface at once. Never throws and never delays a response past its
 * budget; a warehouse problem simply means no block.
 */

const { withinLatencyBudget } = require("./latencyBudget");

const DEFAULT_BUDGET_MS = 800;

function sightSettings(env = process.env) {
  return { enabled: String(env.SIGHT_ENABLED || "").toLowerCase() === "true", version: env.SIGHT_VERSION || "v1" };
}

function keyOf(player) {
  const key = player?.player_key || player?.playerKey || player?.id;
  return typeof key === "string" && /^(sleeper|espn|yahoo):/.test(key) ? key : null;
}

function providerPointsOf(player) {
  const value = player?.projected_points ?? player?.projectedPoints ?? player?.projection;
  return value == null || !Number.isFinite(Number(value)) ? null : Number(value);
}

const MAX_DEPTH = 8;
const MAX_PLAYERS = 600;

/** Every player object in a response: anything carrying a provider player_key. Bounded depth and count. */
function collectPlayers(root) {
  const found = [];
  const seen = new Set();
  const walk = (node, depth) => {
    if (!node || typeof node !== "object" || depth > MAX_DEPTH || seen.has(node) || found.length >= MAX_PLAYERS) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    if (keyOf(node)) found.push(node);
    for (const [k, value] of Object.entries(node)) if (k !== "sight") walk(value, depth + 1);
  };
  walk(root, 0);
  return found;
}

// The stats and grade reads are decoration beside Omen's read: kept short so they never lengthen a call.
const EXTRA_READ_BUDGET_MS = 600;

function createSightEnricher({ getRuntime, env = process.env, budgetMs = DEFAULT_BUDGET_MS, log = null } = {}) {
  /** Adds `sight` to every player object found in `payload` (any response shape). Mutates and returns it. */
  /**
   * `compact: true` keeps only what a list row draws (points, grade, confidence, position and the
   * crosswind gap), for whole-league payloads like the trade roster, where the full receipt on
   * every player made the response several times larger than the rosters themselves.
   */
  return async function attachSight(payload, { compact = false } = {}) {
    const players = payload;
    // A player that already carries Sight (attached before a decision) is not read twice.
    const list = collectPlayers(payload).filter((player) => !player.sight);
    const settings = sightSettings(env);
    if (!settings.enabled || !list.length) return players;
    try {
      const runtime = getRuntime?.();
      const repo = runtime?.sightRepository;
      if (!repo || runtime.mode === "supabase") return players;
      const keys = [...new Set(list.map(keyOf).filter(Boolean))];
      if (!keys.length) return players;
      // Name, team and position let Sight place a player the index has not paired yet (new Yahoo rookies).
      const hints = new Map(
        list.map((player) => [keyOf(player), { name: player.name, team: player.team, position: player.position }]),
      );
      // Player envelopes are not required to carry position before enrichment; ask for the six bounded
      // fantasy cohorts so a resolved Sight block can always receive the matching receipt.
      const positions = ["QB", "RB", "WR", "TE", "K", "DEF"];
      // Real numbers and Omen Grades run beside the read, each on its own short clock, OUTSIDE the
      // Sight budget: a slow or failed stats read costs the numbers only, never Omen's read.
      const extra = (read) =>
        typeof read !== "function"
          ? Promise.resolve(new Map())
          : withinLatencyBudget("sight_extra", Math.min(budgetMs, EXTRA_READ_BUDGET_MS), () =>
              read.call(repo, { playerKeys: keys }),
            ).catch(() => new Map());
      const statsRead = extra(repo.readStats);
      const ratingsRead = extra(repo.readRatings);
      const { byKey, byPosition } = await withinLatencyBudget("sight_read", budgetMs, async () => {
        const [reads, authority] = await Promise.all([
          repo.readSight({ playerKeys: keys, version: settings.version, hints }),
          typeof repo.readAuthority === "function"
            ? repo.readAuthority({ positions, version: settings.version })
            : Promise.resolve(new Map()),
        ]);
        return { byKey: reads, byPosition: authority };
      });
      const [stats, ratings] = await Promise.all([statsRead, ratingsRead]);
      for (const player of list) {
        const line = stats.get(keyOf(player));
        if (line) player.stats = line;
        const rating = ratings.get(keyOf(player));
        if (rating) player.rating = rating;
      }
      for (const player of list) {
        const block = byKey.get(keyOf(player));
        if (block) {
          const position = String(block.position || player?.position || "").toUpperCase();
          const authority = byPosition.get(position) || null;
          const providerPoints = providerPointsOf(player);
          const omenPoints = Number.isFinite(Number(block.sight_points)) ? Number(block.sight_points) : null;
          const threshold = Number.isFinite(Number(authority?.omen_mae)) ? Number(authority.omen_mae) : null;
          const drivers = Array.isArray(block.drivers) ? block.drivers.slice(0, 3) : [];
          const crosswind =
            providerPoints != null &&
            omenPoints != null &&
            threshold != null &&
            threshold > 0 &&
            Math.abs(omenPoints - providerPoints) > threshold &&
            drivers.length
              ? {
                  gap_points: Math.round((omenPoints - providerPoints) * 10) / 10,
                  threshold_points: threshold,
                  drivers,
                }
              : null;
          player.sight = compact
            ? {
                version: block.version,
                position: block.position,
                sight_points: block.sight_points,
                grade: block.grade,
                confidence: block.confidence,
                crosswind: crosswind ? { gap_points: crosswind.gap_points } : null,
              }
            : { ...block, authority, crosswind };
        }
      }
    } catch (error) {
      try {
        log?.warn?.("Sight unavailable for this response", { code: error?.code || "failure" });
      } catch {
        /* never throws */
      }
    }
    return players;
  };
}

module.exports = { createSightEnricher, sightSettings, collectPlayers, providerPointsOf };
