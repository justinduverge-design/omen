"use strict";

/**
 * Recent usage from nflverse weekly player stats (plan A, item A2).
 *
 * Answers "how is this player actually being used?" for a roster player: targets and share of the
 * team's targets, carries, pass attempts, over the player's last few games before the given week.
 * Roster players are keyed `espn:<id>`, `sleeper:<id>`, `yahoo:<id>`; the crosswalk
 * (player_provider_ids, filled daily by omen_player_crosswalk_cron.js) maps them to the NFL gsis id
 * that nflverse uses.
 *
 * Observed box-score facts only: nothing here predicts or ranks. Any failure (stats file, crosswalk
 * read) returns no usage, and the caller then shows no usage line; it never guesses one.
 */

const { parseCsv } = require("./csvRows");

const STATS_URL = (season) =>
  `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_${season}.csv`;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;
const RECENT_GAMES = 3;
const PROVIDERS = new Set(["espn", "sleeper", "yahoo"]);

const cache = new Map(); // season -> { at, byGsis: Map<gsis, rows[]> }

async function loadSeason(season, { fetchImpl = fetch, now = Date.now() } = {}) {
  const hit = cache.get(season);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.byGsis;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(STATS_URL(season), { signal: controller.signal, redirect: "follow" });
    if (!res.ok) throw new Error(`stats ${res.status}`);
    const rows = parseCsv(await res.text(), { required: ["player_id", "week", "season_type", "targets", "carries", "target_share", "team"] });
    const byGsis = new Map();
    for (const row of rows) {
      if (row.season_type !== "REG" || !row.player_id) continue;
      if (!byGsis.has(row.player_id)) byGsis.set(row.player_id, []);
      byGsis.get(row.player_id).push(row);
    }
    cache.set(season, { at: now, byGsis });
    return byGsis;
  } finally {
    clearTimeout(timer);
  }
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Usage over the player's last RECENT_GAMES games played before `beforeWeek`. Null without games. */
function summarize(rows, beforeWeek) {
  const games = (rows || [])
    .filter((r) => num(r.week) < beforeWeek)
    .sort((a, b) => num(b.week) - num(a.week))
    .slice(0, RECENT_GAMES);
  if (!games.length) return null;
  const n = games.length;
  const sum = (key) => games.reduce((total, r) => total + num(r[key]), 0);
  return {
    games: n,
    weeks: games.map((r) => num(r.week)).sort((a, b) => a - b),
    team: games[0].team || null,
    targets_per_game: sum("targets") / n,
    receptions_per_game: sum("receptions") / n,
    carries_per_game: sum("carries") / n,
    attempts_per_game: sum("attempts") / n,
    target_share: sum("target_share") / n,
  };
}

/** player_key -> gsis id, read from the crosswalk. */
async function resolveGsis(supabase, playerKeys) {
  const byProvider = new Map();
  for (const key of playerKeys) {
    const [provider, id] = String(key || "").split(":");
    if (!PROVIDERS.has(provider) || !id) continue;
    if (!byProvider.has(provider)) byProvider.set(provider, []);
    byProvider.get(provider).push(id);
  }
  const out = new Map();
  for (const [provider, ids] of byProvider) {
    const { data, error } = await supabase
      .from("player_provider_ids")
      .select("provider_player_id, players!inner(gsis_id)")
      .eq("provider", provider)
      .in("provider_player_id", ids);
    if (error) throw new Error(`crosswalk read failed: ${error.code || "unknown"}`);
    for (const row of data || []) {
      const gsis = row.players?.gsis_id;
      if (gsis) out.set(`${provider}:${row.provider_player_id}`, gsis);
    }
  }
  return out;
}

/**
 * @returns {Promise<Map<string, object>>} player_key -> usage summary; empty on any failure.
 */
async function getRecentUsage({ supabase, playerKeys, season, beforeWeek, fetchImpl, log }) {
  try {
    if (!supabase || !playerKeys?.length || !Number.isInteger(season) || !Number.isInteger(beforeWeek)) return new Map();
    const gsisByKey = await resolveGsis(supabase, playerKeys);
    if (!gsisByKey.size) return new Map();
    const byGsis = await loadSeason(season, { fetchImpl });
    const out = new Map();
    for (const [key, gsis] of gsisByKey) {
      const usage = summarize(byGsis.get(gsis), beforeWeek);
      if (usage) out.set(key, usage);
    }
    return out;
  } catch (error) {
    log?.warn?.("player usage unavailable", { reason: error.message });
    return new Map();
  }
}

const round1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
const pct = (share) => `${Math.round(share * 100)}%`;

/** One plain-English usage sentence for a player, or null when the position has no usage line. */
function usageStatement(name, position, usage) {
  if (!usage) return null;
  const span = usage.games === 1 ? "in the last game" : `a game over the last ${usage.games} games`;
  switch (String(position || "").toUpperCase()) {
    case "WR":
    case "TE":
      return `${name}: ${round1(usage.targets_per_game)} targets ${span} (${pct(usage.target_share)} of the team's targets).`;
    case "RB":
      return `${name}: ${round1(usage.carries_per_game)} carries and ${round1(usage.targets_per_game)} targets ${span}.`;
    case "QB":
      return `${name}: ${round1(usage.attempts_per_game)} pass attempts and ${round1(usage.carries_per_game)} carries ${span}.`;
    default:
      return null;
  }
}

function _resetCache() { cache.clear(); }

module.exports = { getRecentUsage, usageStatement, summarize, _resetCache, RECENT_GAMES };
