"use strict";

/**
 * Omen nflverse weekly stats ingest (redo step 14; spec:
 * Blueprints/specs/football-data/omen-nflverse-weekly-stats-ingest-v1.md).
 *
 * Daily: downloads nflverse's weekly player stats and snap counts for the whole current season, resolves every row to a canonical `players.id` and upserts one
 * `nflverse_weekly_stats` row per player-week. Each run is one `data_events` ingest, inserted before
 * any stats row (rows name it in `ingest_event_id`); `data_events` is append-only, so its row_count
 * is the planned count, computed in memory first.
 *
 * Identity: stats rows carry nflverse's gsis id, which the step-04 crosswalk stores as
 * `players.gsis_id`. Snap rows carry a PFR id, mapped to gsis through nflverse `players.csv`. A row
 * that does not resolve is skipped and counted, never matched by name; more than MAX_UNMATCHED_SHARE
 * of them refuses the whole run before anything is written. The job never creates `players` rows.
 *
 * Re-runnable: the whole season is re-read every run, so nflverse's corrections to earlier weeks and
 * a missed run are both caught by the next one. Nothing is deleted. Daily, so Thursday, Saturday,
 * Sunday and Monday games all land the next morning; a run whose source files are byte-identical to
 * the last ingest's writes nothing (no data_events row either), which keeps off-season days free.
 *
 * Until step 14 is applied to production the table does not exist: the run then logs and exits
 * cleanly without writing a data_events row.
 */

const crypto = require("crypto");
const { initSentry, flushSentry } = require("./middleware/sentry");
const { parseCsv } = require("./services/csvRows");
const facts = require("./services/nflverseFacts");
const { streamGzCsv } = require("./omen_football_intelligence_cron");
const { HISTORY_FROM_SEASON } = require("./omen_player_crosswalk_cron");

const RELEASES = "https://github.com/nflverse/nflverse-data/releases/download";
const URLS = {
  stats: (season) => `${RELEASES}/stats_player/stats_player_week_${season}.csv`,
  snaps: (season) => `${RELEASES}/snap_counts/snap_counts_${season}.csv`,
  players: `${RELEASES}/players/players.csv`,
  pbp: (season) => `${RELEASES}/pbp/play_by_play_${season}.csv.gz`,
  teamStats: (season) => `${RELEASES}/stats_team/stats_team_week_${season}.csv`,
  rosters: (season) => `${RELEASES}/weekly_rosters/roster_weekly_${season}.csv`,
  games: `${RELEASES}/schedules/games.csv`,
};
const TABLE = "nflverse_weekly_stats";
const JOB = "omen_nflverse_weekly_stats_cron v1";
const BATCH = 500;
const FETCH_TIMEOUT_MS = 120_000;
const MAX_UNMATCHED_SHARE = 0.05; // 2026 through week 4: 1,434 of 1,434 stats players resolved.
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);
const MISSING_COLUMN_CODES = new Set(["42703", "PGRST204"]);
// Weekly rosters list practice-squad and reserve players the crosswalk may not hold yet; they are
// skipped and counted like any unmatched row, under a looser limit than box-score rows.
const MAX_UNMATCHED_ROSTER_SHARE = 0.15;

// Integer columns: table column -> nflverse stats column.
const STAT_COLUMNS = {
  pass_yards: "passing_yards",
  pass_tds: "passing_tds",
  interceptions: "passing_interceptions",
  rush_yards: "rushing_yards",
  rush_tds: "rushing_tds",
  carries: "carries",
  targets: "targets",
  receptions: "receptions",
  rec_yards: "receiving_yards",
  rec_tds: "receiving_tds",
};
const STATS_REQUIRED = ["player_id", "season", "week", ...Object.values(STAT_COLUMNS), "fantasy_points_ppr"];
const SNAPS_REQUIRED = ["pfr_player_id", "season", "week", "offense_snaps", "offense_pct"];

const defaultLog = {
  info: (...args) => console.log(`[${new Date().toISOString()}] [omen-weekly-stats]`, ...args),
  warn: (...args) => console.warn(`[${new Date().toISOString()}] [omen-weekly-stats] WARN`, ...args),
  error: (...args) => console.error(`[${new Date().toISOString()}] [omen-weekly-stats] ERROR`, ...args),
};

async function fetchRaw(url, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { signal: controller.signal, redirect: "follow" });
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

const sha256 = (...parts) => {
  const hash = crypto.createHash("sha256");
  for (const part of parts) hash.update(part);
  return `sha256:${hash.digest("hex")}`;
};

/** Empty or non-numeric is NULL, never 0. */
function intOrNull(value) {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function numOrNull(value) {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Pure: builds the rows to upsert (without ingest_event_id) and the unmatched list.
 * @param {object} p
 * @param {object[]} p.statRows      nflverse weekly stats rows
 * @param {object[]} p.snapRows      nflverse snap count rows
 * @param {Map<string,string>} p.playerIdByGsis  players.gsis_id -> players.id
 * @param {Map<string,string>} p.gsisByPfr       nflverse players.csv pfr_id -> gsis_id
 */
function buildWeeklyRows({ statRows, snapRows, playerIdByGsis, gsisByPfr, opportunity = null }) {
  const full = opportunity instanceof Map;
  const rows = new Map(); // `${player_id}|${season}|${week}` -> row
  const unmatched = [];
  let considered = 0;
  const rowFor = (playerId, season, week) => {
    const key = `${playerId}|${season}|${week}`;
    if (!rows.has(key)) {
      const empty = { player_id: playerId, season, week, snaps: null, snap_share: null, fantasy_points_ppr: null };
      for (const column of Object.keys(STAT_COLUMNS)) empty[column] = null;
      if (full) Object.assign(empty, { team: null, opponent: null, game_id: null, season_type: null, position: null, stats: {}, opportunity: {} });
      rows.set(key, empty);
    }
    return rows.get(key);
  };

  for (const r of statRows) {
    const season = intOrNull(r.season);
    const week = intOrNull(r.week);
    if (season == null || week == null) continue;
    considered += 1;
    const playerId = r.player_id ? playerIdByGsis.get(r.player_id) : null;
    if (!playerId) {
      unmatched.push({ source: "stats", provider_id: r.player_id || null, name: r.player_display_name || null, season, week,
                       reason: r.player_id ? "gsis_id_not_in_crosswalk" : "no_gsis_id" });
      continue;
    }
    const row = rowFor(playerId, season, week);
    for (const [column, source] of Object.entries(STAT_COLUMNS)) row[column] = intOrNull(r[source]);
    row.fantasy_points_ppr = numOrNull(r.fantasy_points_ppr);
    if (full) Object.assign(row, facts.playerWeekDetail(r, opportunity.get(`${r.player_id}|${season}|${week}`)));
  }

  for (const r of snapRows) {
    const season = intOrNull(r.season);
    const week = intOrNull(r.week);
    const snaps = intOrNull(r.offense_snaps);
    // Defenders and special-teamers have no offensive snaps; there is nothing offensive to store.
    if (season == null || week == null || !snaps) continue;
    considered += 1;
    const gsis = gsisByPfr.get(r.pfr_player_id);
    const playerId = gsis ? playerIdByGsis.get(gsis) : null;
    if (!playerId) {
      unmatched.push({ source: "snaps", provider_id: r.pfr_player_id || null, name: r.player || null, season, week,
                       reason: gsis ? "gsis_id_not_in_crosswalk" : "pfr_id_not_in_nflverse_players" });
      continue;
    }
    const row = rowFor(playerId, season, week);
    row.snaps = snaps;
    row.snap_share = numOrNull(r.offense_pct);
  }

  return { rows: [...rows.values()], unmatched, considered };
}

function must({ error }, what) {
  if (error) throw new Error(`${what} failed: ${error.code || "unknown"}`);
}

async function tableExists(client) {
  const { error } = await client.from(TABLE).select("player_id").limit(1);
  if (!error) return true;
  if (MISSING_TABLE_CODES.has(error.code)) return false;
  throw new Error(`${TABLE} read failed: ${error.code || "unknown"}`);
}

/** True once redo step 15 (full stat lines, team, roster and game tables) is applied. */
async function hasStep15(client) {
  const { error } = await client.from(TABLE).select("stats").limit(1);
  if (!error) return true;
  if (MISSING_COLUMN_CODES.has(error.code) || MISSING_TABLE_CODES.has(error.code)) return false;
  throw new Error(`${TABLE} read failed: ${error.code || "unknown"}`);
}

async function playerIdsByGsis(client) {
  const out = new Map();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from("players").select("id, gsis_id").not("gsis_id", "is", null).range(from, from + 999);
    must({ error }, "players read");
    for (const p of data || []) out.set(p.gsis_id, p.id);
    if (!data || data.length < 1000) return out;
  }
}

/**
 * @param {object} p
 * @param {number[]} p.seasons  seasons to read in full (normally just the current one)
 */
async function lastSourceRef(client, subject = TABLE) {
  const { data, error } = await client.from("data_events").select("source_ref")
    .eq("subject", subject).order("id", { ascending: false }).limit(1).maybeSingle();
  must({ error }, "data_events read");
  return data?.source_ref || null;
}

/**
 * One subject (one table): unchanged-source skip, unmatched limit, one data_events ingest, batched upsert.
 * The event is inserted before any row, with the planned row count (data_events is append-only).
 */
async function writeSubject({ client, table, conflict, built, sourceRef, seasons, force, log, maxUnmatched, label }) {
  if (!force && sourceRef === (await lastSourceRef(client, table))) {
    log.info(`${label}: nflverse sources unchanged since the last ingest; nothing written`);
    return { skipped: "source_unchanged" };
  }
  const { rows, unmatched, considered } = built;
  if (!rows.length) throw new Error(`${label} refused: no rows resolved from ${considered} source rows; sources likely empty or truncated`);
  const unmatchedShare = considered ? unmatched.length / considered : 0;
  for (const u of unmatched.slice(0, 50)) log.warn(`${label}: unmatched skipped`, u);
  if (unmatchedShare > maxUnmatched) {
    throw new Error(`${label} refused: ${unmatched.length} of ${considered} rows unmatched (over ${maxUnmatched * 100}%); crosswalk likely stale`);
  }
  const weeks = [...new Set(rows.map((r) => `${r.season}-${r.week}`))].sort();
  const { data: event, error: eventError } = await client.from("data_events").insert({
    event: "ingest",
    subject: table,
    provider: "nflverse",
    rights_basis: "nflverse_open_data",
    job: JOB,
    source_ref: sourceRef,
    row_count: rows.length,
    details: { seasons, weeks, source_rows: considered, unmatched: unmatched.length },
  }).select("id").single();
  must({ error: eventError }, "data_events ingest");
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((r) => ({ ...r, ingest_event_id: event.id }));
    must(await client.from(table).upsert(batch, { onConflict: conflict }), `${table} upsert`);
  }
  log.info(`${label}: ${rows.length} rows (${weeks.length} weeks), ${unmatched.length} unmatched skipped, event ${event.id}`);
  return { written: rows.length, unmatched: unmatched.length, eventId: event.id };
}

async function loadGsisByPfr(fetchImpl) {
  const raw = await fetchRaw(URLS.players, fetchImpl);
  const out = new Map();
  for (const p of parseCsv(raw.toString("utf8"), { required: ["gsis_id", "pfr_id"], columns: ["gsis_id", "pfr_id"] })) {
    if (p.gsis_id && p.pfr_id) out.set(p.pfr_id, p.gsis_id);
  }
  return out;
}

/**
 * The player-week subject (nflverse_weekly_stats). With step 15 applied it also stores the full stat
 * line and play-by-play opportunity. `players.csv` is a lookup (PFR -> gsis), not part of source_ref:
 * it changes daily, and folding it in would defeat the unchanged-source skip.
 */
async function runWeeklyStats({ client, seasons, fetchImpl = fetch, log = defaultLog, force = false, full, playerIdByGsis }) {
  if (!(await tableExists(client))) {
    log.info(`${TABLE} does not exist (redo step 14 not applied); nothing written`);
    return { skipped: "table_absent" };
  }
  const withFull = full ?? (await hasStep15(client));
  const gsisByPfr = await loadGsisByPfr(fetchImpl);
  const byGsis = playerIdByGsis || (await playerIdsByGsis(client));

  const statRows = [];
  const snapRows = [];
  const pbpRows = [];
  const hashes = [];
  for (const season of seasons) {
    const [statsRaw, snapsRaw, pbp] = await Promise.all([
      fetchRaw(URLS.stats(season), fetchImpl),
      fetchRaw(URLS.snaps(season), fetchImpl),
      withFull ? streamGzCsv(URLS.pbp(season), facts.PBP_COLUMNS, fetchImpl) : null,
    ]);
    hashes.push(statsRaw, snapsRaw);
    if (pbp) { hashes.push(pbp.sha256); pbpRows.push(...pbp.rows); }
    statRows.push(...parseCsv(statsRaw.toString("utf8"), withFull
      ? { required: STATS_REQUIRED }
      : { required: STATS_REQUIRED, columns: [...STATS_REQUIRED, "player_display_name"] }));
    snapRows.push(...parseCsv(snapsRaw.toString("utf8"), { required: SNAPS_REQUIRED, columns: [...SNAPS_REQUIRED, "player"] }));
  }
  const opportunity = withFull ? facts.buildOpportunity(pbpRows) : null;
  const built = buildWeeklyRows({ statRows, snapRows, playerIdByGsis: byGsis, gsisByPfr, opportunity });
  return writeSubject({ client, table: TABLE, conflict: "player_id,season,week", built, sourceRef: sha256(...hashes),
                        seasons, force, log, maxUnmatched: MAX_UNMATCHED_SHARE, label: "player weeks" });
}

/**
 * The whole nflverse record for `seasons`: player weeks, and with step 15 applied, team weeks, games
 * and weekly rosters. Each table is its own subject, so one failing does not block the others; the run
 * fails at the end if any did.
 */
/**
 * Storage budget (free plan, 500 MB database): stat lines, team weeks and games from HISTORY_FROM_SEASON
 * (2021, about 9 MB a season), weekly rosters only for `rosterFromSeason` on (the current and previous
 * season, about 10 MB each; older rosters are the largest and least used history).
 */
async function runNflverseIngest({ client, seasons, fetchImpl = fetch, log = defaultLog, force = false, rosterFromSeason = -Infinity }) {
  const early = seasons.filter((season) => season < HISTORY_FROM_SEASON);
  if (early.length) throw new Error(`seasons before ${HISTORY_FROM_SEASON} are not stored: ${early.join(", ")}`);
  if (!(await tableExists(client))) {
    log.info(`${TABLE} does not exist (redo step 14 not applied); nothing written`);
    return { skipped: "table_absent" };
  }
  const full = await hasStep15(client);
  const playerIdByGsis = await playerIdsByGsis(client);
  const results = {};
  const failures = [];
  const attempt = async (name, fn) => {
    try { results[name] = await fn(); } catch (err) { failures.push(`${name}: ${err.message}`); log.error(`${name}: ${err.message}`); }
  };

  await attempt("player_weeks", () => runWeeklyStats({ client, seasons, fetchImpl, log, force, full, playerIdByGsis }));
  if (full) {
    const gamesRaw = await fetchRaw(URLS.games, fetchImpl);
    const games = parseCsv(gamesRaw.toString("utf8"), { required: ["game_id", "season", "week", "game_type", "away_team", "home_team", "away_score", "home_score"] });
    await attempt("games", async () => {
      const seasonGames = games.filter((g) => seasons.includes(Number(g.season)));
      return writeSubject({ client, table: "nflverse_games", conflict: "game_id", built: facts.buildGameRows(games, seasons),
                            sourceRef: sha256(JSON.stringify(seasonGames)), seasons, force, log, maxUnmatched: MAX_UNMATCHED_SHARE, label: "games" });
    });
    await attempt("team_weeks", async () => {
      const raws = await Promise.all(seasons.map((season) => fetchRaw(URLS.teamStats(season), fetchImpl)));
      const teamRows = raws.flatMap((raw) => parseCsv(raw.toString("utf8"), { required: ["team", "season", "week", "season_type"] }));
      const seasonGames = games.filter((g) => seasons.includes(Number(g.season)));
      return writeSubject({ client, table: "nflverse_team_weekly_stats", conflict: "team_id,season,week",
                            built: facts.buildTeamWeekRows({ teamRows, games: seasonGames }),
                            sourceRef: sha256(...raws, JSON.stringify(seasonGames.map((g) => [g.game_id, g.away_score, g.home_score]))),
                            seasons, force, log, maxUnmatched: MAX_UNMATCHED_SHARE, label: "team weeks" });
    });
    const rosterSeasons = seasons.filter((season) => season >= rosterFromSeason);
    if (rosterSeasons.length) await attempt("rosters", async () => {
      const raws = await Promise.all(rosterSeasons.map((season) => fetchRaw(URLS.rosters(season), fetchImpl)));
      const rosterRows = raws.flatMap((raw) => parseCsv(raw.toString("utf8"), { required: ["season", "week", "team", "gsis_id"] }));
      return writeSubject({ client, table: "nflverse_weekly_rosters", conflict: "player_id,season,week,team_id",
                            built: facts.buildRosterRows({ rosterRows, playerIdByGsis }), sourceRef: sha256(...raws),
                            seasons: rosterSeasons, force, log, maxUnmatched: MAX_UNMATCHED_ROSTER_SHARE, label: "rosters" });
    });
  }
  if (failures.length) throw new Error(`nflverse ingest: ${failures.join("; ")}`);
  return results;
}

/** `2016-2025` or `2024,2025` -> [2016, ..., 2025]. */
function parseSeasons(arg) {
  const out = [];
  for (const part of String(arg).split(",")) {
    const [a, b] = part.split("-").map(Number);
    if (!Number.isInteger(a) || (b != null && !Number.isInteger(b))) throw new Error(`bad --seasons: ${arg}`);
    for (let s = a; s <= (b ?? a); s += 1) out.push(s);
  }
  return out;
}

/** The current season; in its first two weeks, also the previous one (the spec's "season start" read). */
function seasonsFor({ season, week }) {
  return Number(week) <= 2 ? [season - 1, season] : [season];
}

if (require.main === module) {
  initSentry({ component: "cron-nflverse-weekly-stats" });
  const Sentry = require("@sentry/node");
  const { createClient } = require("@supabase/supabase-js");
  const { getCurrentNflWeekContext } = require("./services/nflSchedule");
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].filter((key) => !process.env[key]);
  (async () => {
    if (missing.length) throw new Error(`missing env: ${missing.join(", ")}`);
    const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    // Daily: the current season. Backfill: `--seasons 2021-2025` runs one season at a time (memory).
    const flag = process.argv.indexOf("--seasons");
    const force = process.argv.includes("--force");
    const context = getCurrentNflWeekContext();
    const rosterFromSeason = Number(context.season) - 1;
    if (flag > 0) {
      for (const season of parseSeasons(process.argv[flag + 1])) {
        defaultLog.info(`backfill season ${season}`);
        await runNflverseIngest({ client, seasons: [season], force, rosterFromSeason });
      }
    } else {
      await runNflverseIngest({ client, seasons: seasonsFor({ season: Number(context.season), week: context.week }), force, rosterFromSeason });
    }
  })().then(
    async () => { await flushSentry(); process.exit(0); },
    async (err) => { defaultLog.error(err.message); Sentry.captureException(err); await flushSentry(); process.exit(1); }
  );
}

module.exports = { runNflverseIngest, runWeeklyStats, buildWeeklyRows, seasonsFor, parseSeasons, intOrNull, URLS, MAX_UNMATCHED_SHARE };
