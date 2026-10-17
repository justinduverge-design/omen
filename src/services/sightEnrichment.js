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

const MAX_DEPTH = 8;
const MAX_PLAYERS = 600;

/** Every player object in a response: anything carrying a provider player_key. Bounded depth and count. */
function collectPlayers(root) {
  const found = [];
  const seen = new Set();
  const walk = (node, depth) => {
    if (!node || typeof node !== "object" || depth > MAX_DEPTH || seen.has(node) || found.length >= MAX_PLAYERS) return;
    seen.add(node);
    if (Array.isArray(node)) { for (const item of node) walk(item, depth + 1); return; }
    if (keyOf(node)) found.push(node);
    for (const [k, value] of Object.entries(node)) if (k !== "sight") walk(value, depth + 1);
  };
  walk(root, 0);
  return found;
}

function createSightEnricher({ getRuntime, env = process.env, budgetMs = DEFAULT_BUDGET_MS, log = null } = {}) {
  /** Adds `sight` to every player object found in `payload` (any response shape). Mutates and returns it. */
  return async function attachSight(payload) {
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
      const byKey = await withinLatencyBudget("sight_read", budgetMs, () => repo.readSight({ playerKeys: keys, version: settings.version }));
      for (const player of list) {
        const block = byKey.get(keyOf(player));
        if (block) player.sight = block;
      }
    } catch (error) {
      try { log?.warn?.("Sight unavailable for this response", { code: error?.code || "failure" }); } catch { /* never throws */ }
    }
    return players;
  };
}

module.exports = { createSightEnricher, sightSettings, collectPlayers };
