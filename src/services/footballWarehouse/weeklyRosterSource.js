"use strict";
const crypto = require("node:crypto");
const { parseStrictCsv } = require("./playerWeeklySource");
const { teamIdFor } = require("../footballIntelligence/nflTeams");
const MAX_SOURCE_BYTES = 64 * 1024 * 1024;
const REQUIRED_COLUMNS = Object.freeze(["season", "week", "team", "gsis_id"]);
const sourceUrlForSeason = (season) => `https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_${season}.csv`;
const nullable = (v) => { const s = String(v ?? "").trim(); return !s || s.toUpperCase() === "NA" ? null : s; };
function adaptWeeklyRosterCsv({ raw, season, sourceUrl, runId, playerIdByGsis } = {}) {
  if (!Number.isInteger(season) || season < 1999 || season > 2100) throw new TypeError("season is invalid");
  if (sourceUrl !== sourceUrlForSeason(season)) throw new TypeError("sourceUrl is not the allowlisted season asset");
  if (typeof runId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(runId)) throw new TypeError("runId is invalid");
  if (!(playerIdByGsis instanceof Map)) throw new TypeError("playerIdByGsis must be a Map");
  if (!Buffer.isBuffer(raw) || !raw.length) throw new TypeError("CSV source is empty"); if (raw.length > MAX_SOURCE_BYTES) throw new RangeError(`CSV source exceeds ${MAX_SOURCE_BYTES} bytes`);
  let text; try { text = new TextDecoder("utf-8", { fatal: true }).decode(raw); } catch { throw new TypeError("CSV source is not valid UTF-8"); } if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const records = parseStrictCsv(text); if (records.length < 2) throw new TypeError("CSV source has no data rows"); const headers = records[0].map((v) => v.trim());
  if (headers.some((v) => !v) || new Set(headers).size !== headers.length) throw new TypeError("CSV headers are invalid or duplicated"); for (const c of REQUIRED_COLUMNS) if (!headers.includes(c)) throw new TypeError(`CSV missing required column: ${c}`);
  const rows = []; const unmatched = []; const keys = new Set(); let invalidJerseys = 0;
  records.slice(1).forEach((values, i) => { if (values.length !== headers.length) throw new TypeError(`CSV row ${i + 2} field count is invalid`); const sourceRow = Object.fromEntries(headers.map((h, j) => [h, values[j]]));
    const rowSeason = Number(sourceRow.season); const week = Number(sourceRow.week); if (rowSeason !== season || !Number.isInteger(week) || week < 1 || week > 23) throw new TypeError(`CSV row ${i + 2} season or week is invalid`);
    const teamId = teamIdFor(sourceRow.team); if (!teamId) throw new TypeError(`CSV row ${i + 2} team is invalid`); const gsisId = nullable(sourceRow.gsis_id); const playerId = gsisId ? playerIdByGsis.get(gsisId) : null;
    if (!playerId) { unmatched.push({ provider: "gsis", providerId: gsisId, season, week, reason: gsisId ? "gsis_id_not_in_crosswalk" : "no_gsis_id" }); return; }
    const key = `${week}\0${teamId}\0${playerId}`; keys.add(key);
    const jersey = nullable(sourceRow.jersey_number); let jerseyNumber = jersey == null ? null : Number(jersey); if (jerseyNumber != null && (!Number.isInteger(jerseyNumber) || jerseyNumber < 0 || jerseyNumber > 99)) { jerseyNumber = null; invalidJerseys += 1; }
    rows.push({ season, week, teamId, playerId, gameType: nullable(sourceRow.game_type), footballPosition: nullable(sourceRow.position), depthPosition: nullable(sourceRow.depth_chart_position), jerseyNumber, rosterStatus: nullable(sourceRow.status), statusDetail: nullable(sourceRow.status_description_abbr), sourceRow });
  });
  // Older seasons list a player twice in one week when their status changed (e.g. TRD then ACT). The primary key is
  // (season, week, team, player), so the LAST row in source order wins; every superseded row is reported as unmatched.
  const lastIndex = new Map(rows.map((r, i) => [`${r.week}\0${r.teamId}\0${r.playerId}`, i]));
  const kept = rows.filter((r, i) => lastIndex.get(`${r.week}\0${r.teamId}\0${r.playerId}`) === i);
  const superseded = rows.length - kept.length;
  if (superseded) {
    rows.filter((r, i) => lastIndex.get(`${r.week}\0${r.teamId}\0${r.playerId}`) !== i)
      .forEach((r) => unmatched.push({ provider: "gsis", providerId: r.playerId, season, week: r.week, reason: "superseded_duplicate" }));
    rows.length = 0; rows.push(...kept);
  }
  const hash = (b) => `sha256:${crypto.createHash("sha256").update(b).digest("hex")}`;
  return { receipt: { runId, sourceUrl, sourceRef: hash(raw), sourceBytes: raw.length, sourceRows: records.length - 1, metadata: { schema_fingerprint: hash(Buffer.from(JSON.stringify(headers))), source_columns: headers, duplicate_policy: "last_row_wins", superseded_duplicate_rows: superseded, invalid_jersey_numbers: invalidJerseys } }, rows, unmatched, unmatchedRows: unmatched.length };
}
module.exports = { adaptWeeklyRosterCsv, sourceUrlForSeason, MAX_SOURCE_BYTES, REQUIRED_COLUMNS };
