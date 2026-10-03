"use strict";

/**
 * Recent usage from nflverse weekly player stats (plan A, item A2) and snap counts (FI-LEAGUE step 8).
 *
 * Answers "how is this player actually being used?" for a roster player: targets and share of the
 * team's targets, carries, pass attempts and share of the offense's snaps, over the player's last few
 * games before the given week, and whether that is meaningfully up or down from his earlier games.
 * Roster players are keyed `espn:<id>`, `sleeper:<id>`, `yahoo:<id>`; the crosswalk
 * (player_provider_ids, filled daily by omen_player_crosswalk_cron.js) maps them to the NFL gsis id
 * that nflverse uses. Snap counts are keyed by the Pro Football Reference id, which the crosswalk does
 * not store, so the gsis -> pfr map is read from nflverse `players.csv` (cached like the rest).
 *
 * Sources: nflverse-data releases `stats_player`, `snap_counts`, `players` (CC BY 4.0, nflverse).
 *
 * Observed box-score facts only: nothing here predicts or ranks. Any failure (stats file, crosswalk
 * read) returns no usage, and the caller then shows no usage line; it never guesses one. A snap-count
 * failure drops only the snap share.
 */

const { parseCsv } = require("./csvRows");

const RELEASES = "https://github.com/nflverse/nflverse-data/releases/download";
const STATS_URL = (season) => `${RELEASES}/stats_player/stats_player_week_${season}.csv`;
const SNAPS_URL = (season) => `${RELEASES}/snap_counts/snap_counts_${season}.csv`;
const PLAYERS_URL = `${RELEASES}/players/players.csv`;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;
const RECENT_GAMES = 3;
const MIN_PRIOR_GAMES = 2;
const PROVIDERS = new Set(["espn", "sleeper", "yahoo"]);

const STATS_COLUMNS = ["player_id", "week", "season_type", "team", "targets", "receptions", "carries", "attempts", "target_share"];
const SNAP_COLUMNS = ["pfr_player_id", "week", "game_type", "offense_pct"];
const PLAYER_COLUMNS = ["gsis_id", "pfr_id"];

// A trend is stated only when the change is meaningful: volume moves by at least 2 a game and 25%,
// snap share by at least 10 points.
const VOLUME_MIN_DELTA = 2;
const VOLUME_MIN_RATIO = 0.25;
const SNAP_MIN_DELTA = 0.1;

const cache = new Map(); // `stats:<season>` | `snaps:<season>` | "pfr" -> { at, value }

async function cached(key, build, now) {
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.value;
  const value = await build();
  cache.set(key, { at: now, value });
  return value;
}

async function fetchText(url, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { signal: controller.signal, redirect: "follow" });
    if (!res.ok) throw new Error(`${url.split("/").pop()} ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function groupBy(rows, key, keep) {
  const out = new Map();
  for (const row of rows) {
    if (!keep(row) || !row[key]) continue;
    if (!out.has(row[key])) out.set(row[key], []);
    out.get(row[key]).push(row);
  }
  return out;
}

/** gsis id -> weekly stat rows (regular season). */
function loadSeason(season, { fetchImpl = fetch, now = Date.now() } = {}) {
  return cached(`stats:${season}`, async () => {
    const rows = parseCsv(await fetchText(STATS_URL(season), fetchImpl), { required: ["player_id", "week", "season_type", "targets", "carries", "target_share", "team"], columns: STATS_COLUMNS });
    return groupBy(rows, "player_id", (r) => r.season_type === "REG");
  }, now);
}

/** pfr id -> weekly snap rows (regular season). */
function loadSnaps(season, { fetchImpl = fetch, now = Date.now() } = {}) {
  return cached(`snaps:${season}`, async () => {
    const rows = parseCsv(await fetchText(SNAPS_URL(season), fetchImpl), { required: SNAP_COLUMNS, columns: SNAP_COLUMNS });
    return groupBy(rows, "pfr_player_id", (r) => r.game_type === "REG");
  }, now);
}

/** gsis id -> pfr id, from nflverse players.csv. */
function loadPfrIds({ fetchImpl = fetch, now = Date.now() } = {}) {
  return cached("pfr", async () => {
    const rows = parseCsv(await fetchText(PLAYERS_URL, fetchImpl), { required: PLAYER_COLUMNS, columns: PLAYER_COLUMNS });
    const out = new Map();
    for (const row of rows) if (row.gsis_id && row.pfr_id) out.set(row.gsis_id, row.pfr_id);
    return out;
  }, now);
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Mean offense snap share over `games`, or null unless every game has a snap row. */
function snapShare(games, snapRows) {
  if (!snapRows?.length) return null;
  const byWeek = new Map(snapRows.map((r) => [num(r.week), num(r.offense_pct)]));
  const shares = games.map((r) => byWeek.get(num(r.week)));
  if (shares.some((s) => s == null)) return null;
  return shares.reduce((a, b) => a + b, 0) / shares.length;
}

function averages(games, snapRows) {
  const n = games.length;
  const sum = (key) => games.reduce((total, r) => total + num(r[key]), 0);
  return {
    games: n,
    targets_per_game: sum("targets") / n,
    receptions_per_game: sum("receptions") / n,
    carries_per_game: sum("carries") / n,
    attempts_per_game: sum("attempts") / n,
    target_share: sum("target_share") / n,
    snap_share: snapShare(games, snapRows),
  };
}

/**
 * Usage over the player's last RECENT_GAMES games played before `beforeWeek`, plus `prior`: the same
 * averages over his earlier games that season (null with fewer than MIN_PRIOR_GAMES of them, or when
 * the recent window is not full). Null without games.
 */
function summarize(rows, beforeWeek, snapRows = null) {
  const played = (rows || [])
    .filter((r) => num(r.week) < beforeWeek)
    .sort((a, b) => num(b.week) - num(a.week));
  const games = played.slice(0, RECENT_GAMES);
  if (!games.length) return null;
  const earlier = played.slice(RECENT_GAMES);
  return {
    ...averages(games, snapRows),
    weeks: games.map((r) => num(r.week)).sort((a, b) => a - b),
    team: games[0].team || null,
    prior: games.length === RECENT_GAMES && earlier.length >= MIN_PRIOR_GAMES ? averages(earlier, snapRows) : null,
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

/** Snap rows by gsis id; an empty map (and one warning) when snap counts are unavailable. */
async function snapsByGsis(season, gsisIds, { fetchImpl, log }) {
  try {
    const [byPfr, pfrByGsis] = await Promise.all([loadSnaps(season, { fetchImpl }), loadPfrIds({ fetchImpl })]);
    const out = new Map();
    for (const gsis of gsisIds) {
      const rows = byPfr.get(pfrByGsis.get(gsis));
      if (rows) out.set(gsis, rows);
    }
    return out;
  } catch (error) {
    log?.warn?.("snap counts unavailable", { reason: error.message });
    return new Map();
  }
}

/**
 * @returns {Promise<Map<string, object>>} player_key -> usage summary; empty on any failure.
 */
async function getRecentUsage({ supabase, playerKeys, season, beforeWeek, fetchImpl = fetch, log }) {
  try {
    if (!supabase || !playerKeys?.length || !Number.isInteger(season) || !Number.isInteger(beforeWeek)) return new Map();
    const gsisByKey = await resolveGsis(supabase, playerKeys);
    if (!gsisByKey.size) return new Map();
    const [byGsis, snaps] = await Promise.all([
      loadSeason(season, { fetchImpl }),
      snapsByGsis(season, new Set(gsisByKey.values()), { fetchImpl, log }), // never rejects
    ]);
    const out = new Map();
    for (const [key, gsis] of gsisByKey) {
      const usage = summarize(byGsis.get(gsis), beforeWeek, snaps.get(gsis));
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

function volumeMoved(now, before) {
  const delta = now - before;
  return Math.abs(delta) >= VOLUME_MIN_DELTA && Math.abs(delta) >= VOLUME_MIN_RATIO * Math.max(before, 1);
}

/** One short trend sentence (the first meaningful change, in the position's order), or null. */
function trendStatement(usage, metrics) {
  const prior = usage.prior;
  if (!prior || prior.games < MIN_PRIOR_GAMES) return null;
  const over = `over the first ${prior.games} games`;
  for (const metric of metrics) {
    if (metric === "snap_share") {
      if (usage.snap_share == null || prior.snap_share == null) continue;
      if (Math.abs(usage.snap_share - prior.snap_share) < SNAP_MIN_DELTA) continue;
      return `Snap share ${usage.snap_share > prior.snap_share ? "up" : "down"} from ${pct(prior.snap_share)} ${over}.`;
    }
    const [key, label] = metric;
    if (!volumeMoved(usage[key], prior[key])) continue;
    return `${usage[key] > prior[key] ? "Up" : "Down"} from ${round1(prior[key])} ${label} a game ${over}.`;
  }
  return null;
}

const TARGETS = ["targets_per_game", "targets"];
const CARRIES = ["carries_per_game", "carries"];

/** Plain-English usage sentences for a player, or null when the position has no usage line. */
function usageStatement(name, position, usage) {
  if (!usage) return null;
  const span = usage.games === 1 ? "in the last game" : `a game over the last ${usage.games} games`;
  const snaps = usage.snap_share == null ? "" : `, on the field for ${pct(usage.snap_share)} of the offense's snaps`;
  let line;
  let metrics;
  switch (String(position || "").toUpperCase()) {
    case "WR":
    case "TE":
      line = `${name}: ${round1(usage.targets_per_game)} targets ${span} (${pct(usage.target_share)} of the team's targets)${snaps}.`;
      metrics = [TARGETS, "snap_share"];
      break;
    case "RB":
      line = `${name}: ${round1(usage.carries_per_game)} carries and ${round1(usage.targets_per_game)} targets ${span}${snaps}.`;
      metrics = [CARRIES, TARGETS, "snap_share"];
      break;
    case "QB":
      line = `${name}: ${round1(usage.attempts_per_game)} pass attempts and ${round1(usage.carries_per_game)} carries ${span}${snaps}.`;
      metrics = ["snap_share"];
      break;
    default:
      return null;
  }
  const trend = trendStatement(usage, metrics);
  return trend ? `${line} ${trend}` : line;
}

function _resetCache() { cache.clear(); }

module.exports = { getRecentUsage, usageStatement, summarize, _resetCache, RECENT_GAMES };
