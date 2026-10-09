"use strict";

const crypto = require("node:crypto");
const { teamIdFor } = require("../footballIntelligence/nflTeams");
const { sparseStats } = require("../nflverseFacts");

const MAX_SOURCE_BYTES = 64 * 1024 * 1024;
const sourceUrlForSeason = (season) =>
  `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_${season}.csv`;
const REQUIRED_COLUMNS = Object.freeze([
  "player_id", "season", "week", "season_type", "team", "opponent_team", "position",
  "fantasy_points_ppr", "attempts", "passing_yards", "carries", "rushing_yards",
  "targets", "receptions", "receiving_yards", "target_share",
  "game_id",
]);
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function pushRecord(rows, row, field) {
  row.push(field);
  rows.push(row);
}

/** Strict RFC-4180 parser. It deliberately stays local: existing callers rely on csvRows' leniency. */
function parseStrictCsv(text) {
  const records = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let afterQuote = false;
  let justEndedRecord = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
        afterQuote = true;
      } else {
        field += char;
      }
      justEndedRecord = false;
      continue;
    }

    if (afterQuote) {
      if (char === ",") {
        row.push(field);
        field = "";
        afterQuote = false;
      } else if (char === "\n") {
        pushRecord(records, row, field);
        row = [];
        field = "";
        afterQuote = false;
        justEndedRecord = true;
      } else if (char === "\r" && text[index + 1] === "\n") {
        pushRecord(records, row, field);
        row = [];
        field = "";
        afterQuote = false;
        justEndedRecord = true;
        index += 1;
      } else {
        throw new TypeError("CSV has characters after a closing quote");
      }
      continue;
    }

    if (char === '"') {
      if (field.length) throw new TypeError("CSV quote must begin a field");
      inQuotes = true;
      justEndedRecord = false;
    } else if (char === ",") {
      row.push(field);
      field = "";
      justEndedRecord = false;
    } else if (char === "\n") {
      pushRecord(records, row, field);
      row = [];
      field = "";
      justEndedRecord = true;
    } else if (char === "\r" && text[index + 1] === "\n") {
      pushRecord(records, row, field);
      row = [];
      field = "";
      justEndedRecord = true;
      index += 1;
    } else if (char === "\r") {
      throw new TypeError("CSV uses an invalid record separator");
    } else {
      field += char;
      justEndedRecord = false;
    }
  }

  if (inQuotes) throw new TypeError("CSV has an unterminated quoted field");
  if (!justEndedRecord || row.length || field.length || afterQuote) pushRecord(records, row, field);
  return records;
}

function finiteOrNull(value, name) {
  const text = String(value ?? "").trim();
  if (!text || text.toUpperCase() === "NA") return null;
  const number = Number(text);
  if (!Number.isFinite(number)) throw new TypeError(`${name} is not numeric`);
  return number;
}

function integer(value, name, min, max) {
  const number = finiteOrNull(value, name);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new TypeError(`${name} is invalid`);
  }
  return number;
}

function textOrNull(value) {
  const text = String(value ?? "").trim();
  return !text || text.toUpperCase() === "NA" ? null : text;
}

function teamId(value, name) {
  const text = textOrNull(value);
  if (text == null) throw new TypeError(`${name} is empty`);
  const id = teamIdFor(text);
  if (!id) throw new TypeError(`${name} is not a known NFL team`);
  return id;
}

function validateUrl(value, season) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new TypeError("sourceUrl is invalid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new TypeError("sourceUrl is invalid");
  }
  if (value !== sourceUrlForSeason(season)) throw new TypeError("sourceUrl is not the allowlisted season asset");
  return value;
}

function csvObjects(raw) {
  if (!Buffer.isBuffer(raw)) throw new TypeError("raw must be a Buffer");
  if (!raw.length) throw new TypeError("CSV source is empty");
  if (raw.length > MAX_SOURCE_BYTES) throw new RangeError(`CSV source exceeds ${MAX_SOURCE_BYTES} bytes`);

  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(raw); } catch {
    throw new TypeError("CSV source is not valid UTF-8");
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const records = parseStrictCsv(text);
  if (records.length < 2) throw new TypeError("CSV source has no data rows");

  const headers = records[0].map((header) => header.trim());
  if (headers.some((header) => !header)) throw new TypeError("CSV contains an empty header");
  if (new Set(headers).size !== headers.length) throw new TypeError("CSV contains duplicate headers");
  for (const required of REQUIRED_COLUMNS) {
    if (!headers.includes(required)) throw new TypeError(`CSV missing required column: ${required}`);
  }

  const rows = records.slice(1).map((values, index) => {
    if (values.length !== headers.length) {
      throw new TypeError(`CSV row ${index + 2} has ${values.length} fields; expected ${headers.length}`);
    }
    if (values.every((value) => value === "")) throw new TypeError(`CSV row ${index + 2} is empty`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
  return { headers, rows };
}

function adaptPlayerWeeklyCsv({ raw, season, playerIdByGsis, sourceUrl, runId }) {
  if (!Number.isInteger(season) || season < 1999 || season > 2100) {
    throw new TypeError("season must be an integer from 1999 through 2100");
  }
  if (!(playerIdByGsis instanceof Map)) throw new TypeError("playerIdByGsis must be a Map");
  if (typeof runId !== "string" || !RUN_ID.test(runId)) throw new TypeError("runId is invalid");
  validateUrl(sourceUrl, season);

  const parsed = csvObjects(raw);
  const sourceRows = parsed.rows;
  const rows = [];
  const unmatched = [];
  const keys = new Set();

  for (let index = 0; index < sourceRows.length; index += 1) {
    const sourceRow = sourceRows[index];
    const rowSeason = integer(sourceRow.season, `CSV row ${index + 2} season`, 1999, 2100);
    const week = integer(sourceRow.week, `CSV row ${index + 2} week`, 1, 23);
    const seasonType = String(sourceRow.season_type).trim();
    if (rowSeason !== season) throw new TypeError(`CSV row ${index + 2} season does not match requested season`);
    if (!new Set(["REG", "POST"]).has(seasonType)) {
      throw new TypeError(`CSV row ${index + 2} season_type is invalid`);
    }

    const gsisId = String(sourceRow.player_id ?? "").trim();
    const sourceKey = `${gsisId}\u0000${week}\u0000${seasonType}`;
    if (keys.has(sourceKey)) throw new TypeError("CSV contains a duplicate player-week row");
    keys.add(sourceKey);

    const playerId = gsisId ? playerIdByGsis.get(gsisId) : null;
    if (!playerId) {
      unmatched.push({
        provider: "gsis",
        providerId: gsisId || null,
        season,
        week,
        reason: gsisId ? "gsis_id_not_in_crosswalk" : "no_gsis_id",
      });
      continue;
    }

    const targetShare = finiteOrNull(sourceRow.target_share, `CSV row ${index + 2} target_share`);
    if (targetShare != null && (targetShare < 0 || targetShare > 1)) {
      throw new TypeError(`CSV row ${index + 2} target_share is invalid`);
    }
    const gameId = textOrNull(sourceRow.game_id);
    if (!gameId) throw new TypeError(`CSV row ${index + 2} game_id is empty`);
    const footballPosition = textOrNull(sourceRow.position);
    if (!footballPosition) throw new TypeError(`CSV row ${index + 2} position is empty`);
    rows.push({
      season,
      week,
      seasonType,
      playerId,
      teamId: teamId(sourceRow.team, `CSV row ${index + 2} team`),
      opponentTeamId: teamId(sourceRow.opponent_team, `CSV row ${index + 2} opponent_team`),
      gameId,
      footballPosition,
      fantasyPointsPpr: finiteOrNull(sourceRow.fantasy_points_ppr, `CSV row ${index + 2} fantasy_points_ppr`),
      passingYards: finiteOrNull(sourceRow.passing_yards, `CSV row ${index + 2} passing_yards`),
      rushingYards: finiteOrNull(sourceRow.rushing_yards, `CSV row ${index + 2} rushing_yards`),
      receivingYards: finiteOrNull(sourceRow.receiving_yards, `CSV row ${index + 2} receiving_yards`),
      targets: finiteOrNull(sourceRow.targets, `CSV row ${index + 2} targets`),
      receptions: finiteOrNull(sourceRow.receptions, `CSV row ${index + 2} receptions`),
      carries: finiteOrNull(sourceRow.carries, `CSV row ${index + 2} carries`),
      passingAttempts: finiteOrNull(sourceRow.attempts, `CSV row ${index + 2} attempts`),
      targetShare,
      stats: sparseStats(sourceRow),
      opportunity: {},
      sourceRow,
    });
  }

  const sourceRef = `sha256:${crypto.createHash("sha256").update(raw).digest("hex")}`;
  const schemaFingerprint = `sha256:${crypto.createHash("sha256")
    .update(Buffer.from(JSON.stringify(parsed.headers))).digest("hex")}`;
  return {
    receipt: {
      runId,
      sourceUrl,
      sourceRef,
      sourceBytes: raw.length,
      sourceRows: sourceRows.length,
      metadata: { schema_fingerprint: schemaFingerprint, source_columns: parsed.headers },
    },
    rows,
    unmatched,
    unmatchedRows: unmatched.length,
  };
}

module.exports = {
  adaptPlayerWeeklyCsv,
  parseStrictCsv,
  REQUIRED_COLUMNS,
  MAX_SOURCE_BYTES,
  sourceUrlForSeason,
};
