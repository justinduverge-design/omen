"use strict";

const { withinLatencyBudget } = require("./latencyBudget");

const DEFAULT_BUDGET_MS = 800;

/**
 * Recent usage for a roster, for corroborating the Omen call's confidence band.
 *
 * Returns a Map (player_key -> usage summary) or null. Null means "no usage evidence": the reader is
 * unavailable, the read failed or timed out, or nothing was found. Callers treat null as today's
 * behavior; this function never throws.
 *
 * @param {object} input
 * @param {{mode: string, read: Function}|null} input.reader usage reader in its current mode
 *   (legacy authoritative in supabase/shadow; this never selects or changes the mode)
 */
async function readRosterUsage({ reader, supabase, roster, season, beforeWeek, log, budgetMs = DEFAULT_BUDGET_MS }) {
  try {
    if (!reader || typeof reader.read !== "function") return null;
    // Only shadow/warehouse add usage to the Omen call; supabase mode keeps today's hot path untouched.
    if (reader.mode === "supabase") return null;
    const players = [...(roster?.slots?.starters || []), ...(roster?.slots?.bench || [])];
    const playerKeys = [...new Set(players.map((p) => p?.player_key).filter(Boolean))];
    const seasonNumber = Number(season);
    const weekNumber = Number(beforeWeek);
    if (!playerKeys.length || !Number.isInteger(seasonNumber) || !Number.isInteger(weekNumber) || weekNumber < 1) return null;

    const bundle = await withinLatencyBudget("omen_usage_corroboration", budgetMs, (signal) => reader.read({
      mode: reader.mode,
      input: { signal, supabase, playerKeys, season: seasonNumber, beforeWeek: weekNumber, log },
    }));
    const usage = bundle?.usage;
    return usage instanceof Map && usage.size ? usage : null;
  } catch {
    return null;
  }
}

module.exports = { readRosterUsage, DEFAULT_BUDGET_MS };
