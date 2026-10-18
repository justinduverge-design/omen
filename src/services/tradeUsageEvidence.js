"use strict";

/**
 * Observed usage for the players in a trade, from the football warehouse's per-week opportunity
 * counts (targets, carries, red-zone work). The same facts and wording Waiver uses
 * (`waiverUsageSentence`), attached to Trade candidates as evidence beside the projection math.
 *
 * Rules, shared with Waiver:
 *   - Observed facts only. A missing count is left out; a player with nothing real to say gets no row.
 *   - Evidence, never a score: nothing here changes who is proposed or how a trade is ranked.
 *   - Runs only when the football data mode has a warehouse reader (shadow or warehouse). In
 *     `supabase` mode, or on any read failure or timeout, the candidates come back untouched and
 *     `usage_evidence_state` says why.
 *
 * Read-only: one public-GSIS-keyed query for both sides of a trade.
 */

const { resolveGsis } = require("./playerUsage");
const { withinLatencyBudget } = require("./latencyBudget");
const { waiverUsageSentence } = require("./waiverUsageEvidence");

const DEFAULT_BUDGET_MS = 1500;
const SOURCE = "nfl_weekly_opportunity";
const MAX_PLAYERS = 40;

const STATES = Object.freeze({
  OK: "ok",
  NONE: "no_usage_for_these_players",
  NOT_ENABLED: "warehouse_not_enabled",
  UNAVAILABLE: "unavailable",
  NOT_IN_SEASON: "not_in_season",
});

function playerKey(player) {
  return player?.player_key ? String(player.player_key) : null;
}

/**
 * @returns {Promise<{state:string, byKey:Map<string,{statement:string, source:string}>}>}
 */
function createTradeUsageEvidence({
  getRuntime,
  getSupabase,
  budgetMs = DEFAULT_BUDGET_MS,
  log = null,
  resolve = resolveGsis,
}) {
  return async function usageFor(players, { season, week } = {}) {
    const empty = (state) => ({ state, byKey: new Map() });
    try {
      const unique = new Map();
      for (const player of Array.isArray(players) ? players : []) {
        const key = playerKey(player);
        if (key && !unique.has(key)) unique.set(key, player);
      }
      if (!unique.size) return empty(STATES.NONE);
      if (unique.size > MAX_PLAYERS) return empty(STATES.UNAVAILABLE);
      if (!Number.isInteger(Number(season)) || !Number.isInteger(Number(week)) || Number(week) < 1)
        return empty(STATES.NOT_IN_SEASON);

      const runtime = getRuntime();
      if (!runtime || runtime.mode === "supabase" || typeof runtime.repository?.readOpportunityWeeks !== "function") {
        return empty(STATES.NOT_ENABLED);
      }

      const byKey = await withinLatencyBudget("trade_usage_evidence", budgetMs, async () => {
        const gsisByKey = await resolve(getSupabase ? getSupabase() : null, [...unique.keys()]);
        const gsisIds = [...new Set([...unique.keys()].map((key) => gsisByKey.get(key)).filter(Boolean))];
        if (!gsisIds.length) return new Map();
        const rows = await runtime.repository.readOpportunityWeeks({
          gsisIds,
          season: Number(season),
          beforeWeek: Number(week),
        });
        const out = new Map();
        for (const [key, player] of unique) {
          const gsis = gsisByKey.get(key);
          const statement = gsis
            ? waiverUsageSentence(player.name || "This player", player.position, rows.get(gsis))
            : null;
          if (statement) out.set(key, { statement, source: SOURCE });
        }
        return out;
      });
      return { state: byKey && byKey.size ? STATES.OK : STATES.NONE, byKey: byKey || new Map() };
    } catch (error) {
      try {
        log?.warn?.("Trade usage evidence unavailable", { code: error?.code || "failure" });
      } catch {
        /* never throws */
      }
      return empty(STATES.UNAVAILABLE);
    }
  };
}

/** Evidence rows for one trade, in the order they should read: what you give, then what you get. */
function usageRowsForTrade({ give, receive }, byKey) {
  const rows = [];
  for (const [side, player] of [
    ["give", give],
    ["receive", receive],
  ]) {
    const hit = byKey.get(playerKey(player));
    if (hit)
      rows.push({
        side,
        player_key: playerKey(player),
        statement: hit.statement,
        source: hit.source,
        kind: "observed_usage",
      });
  }
  return rows;
}

module.exports = { createTradeUsageEvidence, usageRowsForTrade, USAGE_STATES: STATES, USAGE_SOURCE: SOURCE };
