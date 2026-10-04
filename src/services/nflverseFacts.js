"use strict";

/**
 * Pure builders for the full nflverse football record (redo step 15). The daily job
 * (src/omen_nflverse_weekly_stats_cron.js) downloads the files; these turn their rows into table rows.
 *
 * Sources, all nflverse release families admitted on 2026-08-24 (CC BY 4.0, attribution "nflverse"):
 * stats_player, stats_team, pbp, schedules, rosters. Nothing here reads Next Gen Stats, PFR advanced
 * stats, ESPN QBR or depth charts, or contracts: those are not nflverse's to license.
 *
 * Identity follows the step-04 rule: a player is resolved through `players.gsis_id`, never by name; a row
 * that does not resolve is returned in `unmatched` for the caller to count and log. Teams resolve through
 * nflTeams (franchise ids: Oakland and Las Vegas are one team, as are San Diego and Los Angeles).
 */

const { teamIdFor } = require("./footballIntelligence/nflTeams");

// stats_player_week / stats_team_week columns that are identity or text, not stats.
const NON_STAT_COLUMNS = new Set([
  "player_id", "player_name", "player_display_name", "position", "position_group", "headshot_url",
  "season", "week", "season_type", "game_id", "team", "opponent_team",
  "fg_made_list", "fg_missed_list", "fg_blocked_list",
]);

/** Every numeric, non-zero stat by its nflverse name. Absent means 0 or not recorded. */
function sparseStats(row) {
  const out = {};
  for (const [key, raw] of Object.entries(row)) {
    if (NON_STAT_COLUMNS.has(key) || raw == null) continue;
    const text = String(raw).trim();
    if (text === "" || text === "NA") continue;
    const n = Number(text);
    if (Number.isFinite(n) && n !== 0) out[key] = Math.round(n * 10000) / 10000;
  }
  return out;
}

function intOrNull(value) {
  if (value == null || String(value).trim() === "" || String(value).trim() === "NA") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function numOrNull(value) {
  if (value == null || String(value).trim() === "" || String(value).trim() === "NA") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const PBP_COLUMNS = ["game_id", "season", "season_type", "week", "play_type", "yardline_100", "air_yards",
  "two_point_attempt", "receiver_player_id", "rusher_player_id"];

/**
 * Usage near the goal line and downfield, from play-by-play. Counts real snaps only: pass and run plays,
 * not two-point tries and not plays wiped out by penalty (`no_play`).
 *   rz_* inside the 20, i10_* inside the 10, gl_carries inside the 5,
 *   ez_targets: the throw was aimed into the end zone (air yards reach the goal line),
 *   deep_targets: 20+ air yards.
 * @returns {Map<string, object>} `${gsis}|${season}|${week}` -> counts
 */
function buildOpportunity(pbpRows) {
  const out = new Map();
  const bump = (gsis, r, key) => {
    const k = `${gsis}|${Number(r.season)}|${Number(r.week)}`;
    if (!out.has(k)) out.set(k, {});
    const o = out.get(k);
    o[key] = (o[key] || 0) + 1;
  };
  for (const r of pbpRows) {
    if (r.two_point_attempt === "1") continue;
    const yardline = numOrNull(r.yardline_100);
    if (yardline == null) continue;
    if (r.play_type === "pass" && r.receiver_player_id) {
      const air = numOrNull(r.air_yards);
      if (yardline <= 20) bump(r.receiver_player_id, r, "rz_targets");
      if (yardline <= 10) bump(r.receiver_player_id, r, "i10_targets");
      if (air != null && air >= yardline) bump(r.receiver_player_id, r, "ez_targets");
      if (air != null && air >= 20) bump(r.receiver_player_id, r, "deep_targets");
    } else if (r.play_type === "run" && r.rusher_player_id) {
      if (yardline <= 20) bump(r.rusher_player_id, r, "rz_carries");
      if (yardline <= 10) bump(r.rusher_player_id, r, "i10_carries");
      if (yardline <= 5) bump(r.rusher_player_id, r, "gl_carries");
    }
  }
  return out;
}

/** The step-15 fields of a player-week row, from its stats_player_week row. */
function playerWeekDetail(statRow, opportunity) {
  return {
    team: teamIdFor(statRow.team),
    opponent: teamIdFor(statRow.opponent_team),
    game_id: statRow.game_id || null,
    season_type: statRow.season_type === "POST" ? "POST" : statRow.season_type === "REG" ? "REG" : null,
    position: statRow.position || null,
    stats: sparseStats(statRow),
    opportunity: opportunity || {},
  };
}

/** Final scores by `${team abbr}|${season}|${week}` from schedules (games.csv). */
function scoresByTeamWeek(games) {
  const out = new Map();
  for (const g of games) {
    const home = intOrNull(g.home_score);
    const away = intOrNull(g.away_score);
    if (home == null || away == null) continue;
    out.set(`${teamIdFor(g.home_team)}|${g.season}|${g.week}`, { points_for: home, points_against: away });
    out.set(`${teamIdFor(g.away_team)}|${g.season}|${g.week}`, { points_for: away, points_against: home });
  }
  return out;
}

/** nflverse_team_weekly_stats rows. Unknown team abbreviations are returned as unmatched. */
function buildTeamWeekRows({ teamRows, games }) {
  const scores = scoresByTeamWeek(games);
  const rows = [];
  const unmatched = [];
  for (const r of teamRows) {
    const teamId = teamIdFor(r.team);
    const season = intOrNull(r.season);
    const week = intOrNull(r.week);
    if (!teamId || season == null || week == null || !["REG", "POST"].includes(r.season_type)) {
      unmatched.push({ source: "stats_team", team: r.team || null, season, week, reason: "unknown_team_or_week" });
      continue;
    }
    const score = scores.get(`${teamId}|${season}|${week}`) || {};
    rows.push({
      team_id: teamId, season, week, season_type: r.season_type, game_id: r.game_id || null,
      opponent_team_id: teamIdFor(r.opponent_team), points_for: score.points_for ?? null,
      points_against: score.points_against ?? null, stats: sparseStats(r),
    });
  }
  return { rows, unmatched, considered: teamRows.length };
}

const GAME_TYPES = new Set(["REG", "WC", "DIV", "CON", "SB"]);
const bool01 = (v) => (v === "1" ? true : v === "0" ? false : null);
const textOrNull = (v) => (v == null || String(v).trim() === "" || String(v).trim() === "NA" ? null : String(v).trim());

/** nflverse_games rows for the given seasons, played or scheduled. */
function buildGameRows(games, seasons) {
  const wanted = new Set(seasons.map(Number));
  const rows = [];
  const unmatched = [];
  for (const g of games) {
    const season = intOrNull(g.season);
    if (!wanted.has(season)) continue;
    const home = teamIdFor(g.home_team);
    const away = teamIdFor(g.away_team);
    if (!home || !away || !GAME_TYPES.has(g.game_type) || !g.game_id) {
      unmatched.push({ source: "schedules", game_id: g.game_id || null, reason: "unknown_team_or_type" });
      continue;
    }
    rows.push({
      game_id: g.game_id, season, week: intOrNull(g.week), game_type: g.game_type,
      gameday: /^\d{4}-\d{2}-\d{2}$/.test(g.gameday || "") ? g.gameday : null, gametime: textOrNull(g.gametime),
      away_team_id: away, home_team_id: home, away_score: intOrNull(g.away_score), home_score: intOrNull(g.home_score),
      overtime: bool01(g.overtime), location: textOrNull(g.location), roof: textOrNull(g.roof), surface: textOrNull(g.surface),
      temp: intOrNull(g.temp), wind: intOrNull(g.wind), away_rest: intOrNull(g.away_rest), home_rest: intOrNull(g.home_rest),
      div_game: bool01(g.div_game), spread_line: numOrNull(g.spread_line), total_line: numOrNull(g.total_line),
      away_moneyline: intOrNull(g.away_moneyline), home_moneyline: intOrNull(g.home_moneyline),
      away_coach: textOrNull(g.away_coach), home_coach: textOrNull(g.home_coach), stadium: textOrNull(g.stadium),
    });
  }
  return { rows, unmatched, considered: rows.length + unmatched.length };
}

/** nflverse_weekly_rosters rows; a player the crosswalk cannot resolve is unmatched, never guessed. */
function buildRosterRows({ rosterRows, playerIdByGsis }) {
  const rows = new Map();
  const unmatched = [];
  for (const r of rosterRows) {
    const season = intOrNull(r.season);
    const week = intOrNull(r.week);
    const teamId = teamIdFor(r.team);
    if (season == null || week == null || !teamId) continue;
    const playerId = r.gsis_id ? playerIdByGsis.get(r.gsis_id) : null;
    if (!playerId) {
      unmatched.push({ source: "rosters", provider_id: r.gsis_id || null, name: r.full_name || null, season, week,
                       reason: r.gsis_id ? "gsis_id_not_in_crosswalk" : "no_gsis_id" });
      continue;
    }
    rows.set(`${playerId}|${season}|${week}|${teamId}`, {
      player_id: playerId, season, week, team_id: teamId, game_type: textOrNull(r.game_type),
      position: textOrNull(r.position), depth_chart_position: textOrNull(r.depth_chart_position),
      jersey_number: intOrNull(r.jersey_number), status: textOrNull(r.status),
      status_detail: textOrNull(r.status_description_abbr),
    });
  }
  return { rows: [...rows.values()], unmatched, considered: rows.size + unmatched.length };
}

module.exports = {
  PBP_COLUMNS,
  sparseStats,
  buildOpportunity,
  playerWeekDetail,
  buildTeamWeekRows,
  buildGameRows,
  buildRosterRows,
  intOrNull,
  numOrNull,
};
