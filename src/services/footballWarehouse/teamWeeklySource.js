"use strict";

const crypto = require("node:crypto");
const { parseStrictCsv } = require("./playerWeeklySource");
const { teamIdFor } = require("../footballIntelligence/nflTeams");
const { sparseStats } = require("../nflverseFacts");

const MAX_SOURCE_BYTES = 32 * 1024 * 1024;
const REQUIRED_COLUMNS = Object.freeze(["team", "season", "week", "season_type", "opponent_team", "game_id"]);
const sourceUrlForSeason = (season) => `https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_${season}.csv`;
const validRun = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const nullable = (v) => { const s = String(v ?? "").trim(); return !s || s.toUpperCase() === "NA" ? null : s; };
function integer(v, name, min, max) { const n = Number(String(v).trim()); if (!Number.isInteger(n) || n < min || n > max) throw new TypeError(`${name} is invalid`); return n; }
function parse(raw) {
  if (!Buffer.isBuffer(raw) || !raw.length) throw new TypeError("CSV source is empty");
  if (raw.length > MAX_SOURCE_BYTES) throw new RangeError(`CSV source exceeds ${MAX_SOURCE_BYTES} bytes`);
  let text; try { text = new TextDecoder("utf-8", { fatal: true }).decode(raw); } catch { throw new TypeError("CSV source is not valid UTF-8"); }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const records = parseStrictCsv(text); if (records.length < 2) throw new TypeError("CSV source has no data rows");
  const headers = records[0].map((v) => v.trim());
  if (headers.some((v) => !v) || new Set(headers).size !== headers.length) throw new TypeError("CSV headers are invalid or duplicated");
  for (const required of REQUIRED_COLUMNS) if (!headers.includes(required)) throw new TypeError(`CSV missing required column: ${required}`);
  const rows = records.slice(1).map((values, index) => { if (values.length !== headers.length) throw new TypeError(`CSV row ${index + 2} field count is invalid`); return Object.fromEntries(headers.map((h, i) => [h, values[i]])); });
  return { headers, rows };
}
function adaptTeamWeeklyCsv({ raw, season, sourceUrl, runId, scoresByGameId } = {}) {
  if (!Number.isInteger(season) || season < 1999 || season > 2100) throw new TypeError("season is invalid");
  if (sourceUrl !== sourceUrlForSeason(season)) throw new TypeError("sourceUrl is not the allowlisted season asset");
  if (typeof runId !== "string" || !validRun.test(runId)) throw new TypeError("runId is invalid");
  if (!(scoresByGameId instanceof Map)) throw new TypeError("scoresByGameId must be a Map");
  const parsed = parse(raw); const rows = []; const keys = new Set(); let teamMissing = 0;
  parsed.rows.forEach((sourceRow, i) => {
    const rowSeason = integer(sourceRow.season, `CSV row ${i + 2} season`, 1999, 2100); if (rowSeason !== season) throw new TypeError(`CSV row ${i + 2} season does not match requested season`);
    const week = integer(sourceRow.week, `CSV row ${i + 2} week`, 1, 23); const seasonType = String(sourceRow.season_type).trim(); if (!/^(REG|POST)$/.test(seasonType)) throw new TypeError(`CSV row ${i + 2} season_type is invalid`);
    // A stray row with no team and no opponent (1999 week 9) cannot be attached to anything: count it unmatched.
    if (!String(sourceRow.team ?? "").trim() && !String(sourceRow.opponent_team ?? "").trim()) { teamMissing += 1; return; }
    const teamId = teamIdFor(sourceRow.team); const opponentTeamId = teamIdFor(sourceRow.opponent_team); if (!teamId || !opponentTeamId || teamId === opponentTeamId) throw new TypeError(`CSV row ${i + 2} has an invalid team`);
    const gameId = nullable(sourceRow.game_id); if (!gameId) throw new TypeError(`CSV row ${i + 2} game_id is empty`);
    const key = `${week}\0${seasonType}\0${teamId}`; if (keys.has(key)) throw new TypeError("CSV contains a duplicate team-week row"); keys.add(key);
    const game = scoresByGameId.get(gameId); if (!game) throw new TypeError(`CSV row ${i + 2} game has no exact score record`);
    let pointsFor; let pointsAgainst;
    if (game.homeTeamId === teamId && game.awayTeamId === opponentTeamId) { pointsFor = game.homeScore; pointsAgainst = game.awayScore; }
    else if (game.awayTeamId === teamId && game.homeTeamId === opponentTeamId) { pointsFor = game.awayScore; pointsAgainst = game.homeScore; }
    else throw new TypeError(`CSV row ${i + 2} game teams do not match`);
    rows.push({ season, week, seasonType, teamId, opponentTeamId, gameId, pointsFor: pointsFor ?? null, pointsAgainst: pointsAgainst ?? null, stats: sparseStats(sourceRow), sourceRow });
  });
  const hash = (b) => `sha256:${crypto.createHash("sha256").update(b).digest("hex")}`;
  return { receipt: { runId, sourceUrl, sourceRef: hash(raw), sourceBytes: raw.length, sourceRows: parsed.rows.length, metadata: { schema_fingerprint: hash(Buffer.from(JSON.stringify(parsed.headers))), source_columns: parsed.headers } }, rows, unmatchedRows: teamMissing };
}
module.exports = { adaptTeamWeeklyCsv, sourceUrlForSeason, MAX_SOURCE_BYTES, REQUIRED_COLUMNS };
