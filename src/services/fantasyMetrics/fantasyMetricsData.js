"use strict";

/**
 * Season bundle for Omen's own stats (beta slice): play-by-play rolled up by player-week, player
 * positions and names, and the schedule with spread and total. Read straight from nflverse release
 * files (CC BY 4.0, attribution "nflverse"), cached for 6 hours like playerUsage.js, with one download
 * in flight per season however many requests arrive.
 *
 * Play-by-play is streamed and reduced to compact target/carry records as it is read, so a full season
 * stays small in memory. Any failure returns null and the caller shows no lines; it never guesses.
 * No database reads or writes.
 */

const readline = require("readline");
const zlib = require("zlib");
const { Readable } = require("stream");
const { parseCsv, parseCsvLine } = require("../csvRows");
const { PBP_COLUMNS, compactPlay, rollupPlayerWeeks, num } = require("./fatedPoints");
const { canonicalAbbreviation } = require("../footballIntelligence/nflTeams");
const tables = require("./xfp-tables-v1.json");

const RELEASES = "https://github.com/nflverse/nflverse-data/releases/download";
const PBP_URL = (season) => `${RELEASES}/pbp/play_by_play_${season}.csv.gz`;
const PLAYERS_URL = `${RELEASES}/players/players.csv`;
const GAMES_URL = `${RELEASES}/schedules/games.csv`;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 60_000;

const cache = new Map(); // key -> { at, promise }

function cached(key, build, now) {
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.promise;
  const promise = build().catch((error) => { cache.delete(key); throw error; });
  cache.set(key, { at: now, promise });
  return promise;
}

async function open(url, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { signal: controller.signal, redirect: "follow" });
    if (!res.ok) throw new Error(`${url.split("/").pop()} ${res.status}`);
    return { res, done: () => clearTimeout(timer) };
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

async function fetchText(url, fetchImpl) {
  const { res, done } = await open(url, fetchImpl);
  try { return await res.text(); } finally { done(); }
}

/** Streams the season's play-by-play into compact target/carry records. */
async function loadPlays(season, fetchImpl) {
  const { res, done } = await open(PBP_URL(season), fetchImpl);
  try {
    const source = typeof res.body?.getReader === "function" ? Readable.fromWeb(res.body) : Readable.from(res.body);
    const lines = readline.createInterface({ input: source.pipe(zlib.createGunzip()), crlfDelay: Infinity });
    let keep = null;
    const plays = [];
    for await (const line of lines) {
      if (!line) continue;
      const values = parseCsvLine(line);
      if (!keep) {
        keep = PBP_COLUMNS.map((c) => [c, values.indexOf(c)]);
        const missing = keep.filter(([, i]) => i < 0).map(([c]) => c);
        if (missing.length) throw new Error(`play-by-play is missing columns: ${missing.join(", ")}`);
        continue;
      }
      const row = {};
      for (const [c, i] of keep) row[c] = values[i] == null ? "" : values[i].trim();
      const play = compactPlay(row);
      if (play) plays.push(play);
    }
    return plays;
  } finally { done(); }
}

function group(rows, key) {
  const out = new Map();
  for (const row of rows) {
    if (!out.has(row[key])) out.set(row[key], []);
    out.get(row[key]).push(row);
  }
  return out;
}

/** Builds the bundle from already-parsed inputs. Exported for tests. */
function buildBundle({ plays, playerRows, gameRows, season }) {
  const rollups = [...rollupPlayerWeeks(plays, tables).values()];
  const byPlayer = group(rollups, "player");
  const byTeam = group(rollups, "team");
  const teamWeeks = new Map();
  for (const [team, rows] of byTeam) teamWeeks.set(team, [...new Set(rows.map((r) => r.week))].sort((a, b) => a - b));
  const positions = new Map();
  const names = new Map();
  for (const p of playerRows) {
    if (!p.gsis_id) continue;
    if (p.position) positions.set(p.gsis_id, p.position.toUpperCase());
    if (p.display_name) names.set(p.gsis_id, p.display_name);
  }
  const games = gameRows
    .filter((g) => num(g.season) === season && g.game_type === "REG")
    .map((g) => ({
      week: num(g.week),
      home: canonicalAbbreviation(g.home_team),
      away: canonicalAbbreviation(g.away_team),
      spread: num(g.spread_line),
      total: num(g.total_line),
    }));
  return { season, formula_version: tables.formula_version, tables_sha256: tables.content_sha256, byPlayer, byTeam, teamWeeks, positions, names, games };
}

/**
 * @returns {Promise<object|null>} the season bundle, or null on any failure.
 */
async function getSeasonBundle({ season, fetchImpl = fetch, now = Date.now(), log } = {}) {
  if (!Number.isInteger(season)) return null;
  try {
    return await cached(`bundle:${season}`, async () => {
      const [plays, playersText, gamesText] = await Promise.all([
        loadPlays(season, fetchImpl),
        fetchText(PLAYERS_URL, fetchImpl),
        fetchText(GAMES_URL, fetchImpl),
      ]);
      const playerRows = parseCsv(playersText, { required: ["gsis_id", "position", "display_name"], columns: ["gsis_id", "position", "display_name"] });
      const gameRows = parseCsv(gamesText, {
        required: ["season", "game_type", "week", "home_team", "away_team", "spread_line", "total_line"],
        columns: ["season", "game_type", "week", "home_team", "away_team", "spread_line", "total_line"],
      });
      return buildBundle({ plays, playerRows, gameRows, season });
    }, now);
  } catch (error) {
    log?.warn?.("fantasy metrics unavailable", { reason: error.message });
    return null;
  }
}

function _resetCache() { cache.clear(); }

module.exports = { getSeasonBundle, buildBundle, _resetCache };
