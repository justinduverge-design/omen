"use strict";

const crypto = require("node:crypto");
const zlib = require("node:zlib");
const { teamIdFor } = require("../footballIntelligence/nflTeams");
const { parseStrictCsv } = require("./playerWeeklySource");
const { sourceUrlForSeason, MAX_SOURCE_BYTES } = require("./playByPlayAcquisition");

const MAX_DECOMPRESSED_BYTES = 1024 * 1024 * 1024;
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const REQUIRED_COLUMNS = Object.freeze([
  "season", "week", "game_id", "play_id", "posteam", "defteam",
  "passer_player_id", "rusher_player_id", "receiver_player_id", "play_type", "desc",
  "epa", "wpa", "cpoe", "air_epa", "yac_epa", "success",
]);

function nullable(value) {
  const text = String(value ?? "").trim();
  return !text || text.toUpperCase() === "NA" ? null : text;
}
function finite(value, name) {
  const text = nullable(value);
  if (text == null) return null;
  const number = Number(text);
  if (!Number.isFinite(number)) throw new TypeError(`${name} is not numeric`);
  return number;
}
function integer(value, name, min, max) {
  const number = finite(value, name);
  if (!Number.isInteger(number) || number < min || number > max) throw new TypeError(`${name} is invalid`);
  return number;
}
function boolean(value, name) {
  const text = nullable(value);
  if (text == null) return null;
  if (text === "1" || text.toLowerCase() === "true") return true;
  if (text === "0" || text.toLowerCase() === "false") return false;
  throw new TypeError(`${name} is invalid`);
}
function canonicalTeam(value, name) {
  const alias = nullable(value);
  if (alias == null) return null;
  const id = teamIdFor(alias);
  if (!id) throw new TypeError(`${name} is not a known NFL team`);
  return id;
}
function canonicalPlayer(value, playerIdByGsis, name) {
  const gsis = nullable(value);
  if (gsis == null) return null;
  const id = playerIdByGsis.get(gsis);
  return id || null;
}

function adaptPlayByPlayCsvGzip({ raw, season, playerIdByGsis, sourceUrl, runId }) {
  if (!Number.isInteger(season) || season < 1999 || season > 2100) throw new TypeError("season is invalid");
  if (!(playerIdByGsis instanceof Map)) throw new TypeError("playerIdByGsis must be a Map");
  if (typeof runId !== "string" || !RUN_ID.test(runId)) throw new TypeError("runId is invalid");
  if (sourceUrl !== sourceUrlForSeason(season)) throw new TypeError("sourceUrl is not the allowlisted season asset");
  if (!Buffer.isBuffer(raw) || !raw.length) throw new TypeError("raw must be a nonempty Buffer");
  if (raw.length > MAX_SOURCE_BYTES) throw new RangeError("compressed source exceeds the byte limit");

  let csv;
  try { csv = zlib.gunzipSync(raw, { maxOutputLength: MAX_DECOMPRESSED_BYTES }); } catch {
    throw new TypeError("source is not a valid bounded gzip stream");
  }
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(csv); } catch { throw new TypeError("CSV is not valid UTF-8"); }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const records = parseStrictCsv(text);
  if (records.length < 2) throw new TypeError("CSV source has no data rows");
  const headers = records[0].map((header) => header.trim());
  if (headers.some((header) => !header) || new Set(headers).size !== headers.length) throw new TypeError("CSV headers are invalid");
  for (const column of REQUIRED_COLUMNS) if (!headers.includes(column)) throw new TypeError(`CSV missing required column: ${column}`);

  const rows = [];
  const unmatched = [];
  const keys = new Set();
  for (let index = 1; index < records.length; index += 1) {
    const values = records[index];
    if (values.length !== headers.length) throw new TypeError(`CSV row ${index + 1} has an invalid field count`);
    const sourceRow = Object.fromEntries(headers.map((header, column) => [header, values[column]]));
    const rowSeason = integer(sourceRow.season, `CSV row ${index + 1} season`, 1999, 2100);
    if (rowSeason !== season) throw new TypeError(`CSV row ${index + 1} season does not match requested season`);
    const gameId = nullable(sourceRow.game_id);
    if (!gameId || gameId.length > 64) throw new TypeError(`CSV row ${index + 1} game_id is invalid`);
    const playId = integer(sourceRow.play_id, `CSV row ${index + 1} play_id`, 0, Number.MAX_SAFE_INTEGER);
    const key = `${gameId}\u0000${playId}`;
    if (keys.has(key)) throw new TypeError("CSV contains a duplicate play key");
    keys.add(key);
    const participantIds = ["passer_player_id", "rusher_player_id", "receiver_player_id"];
    const unresolved = participantIds.filter((field) => nullable(sourceRow[field]) && !playerIdByGsis.has(nullable(sourceRow[field])));
    if (unresolved.length) {
      unmatched.push({ gameId, playId, provider: "gsis", providerIds: unresolved.map((field) => nullable(sourceRow[field])), reason: "gsis_id_not_in_crosswalk" });
      continue;
    }
    rows.push({
      season,
      week: integer(sourceRow.week, `CSV row ${index + 1} week`, 1, 23),
      gameId,
      playId,
      posteamId: canonicalTeam(sourceRow.posteam, `CSV row ${index + 1} posteam`),
      defteamId: canonicalTeam(sourceRow.defteam, `CSV row ${index + 1} defteam`),
      passerPlayerId: canonicalPlayer(sourceRow.passer_player_id, playerIdByGsis, `CSV row ${index + 1} passer_player_id`),
      rusherPlayerId: canonicalPlayer(sourceRow.rusher_player_id, playerIdByGsis, `CSV row ${index + 1} rusher_player_id`),
      receiverPlayerId: canonicalPlayer(sourceRow.receiver_player_id, playerIdByGsis, `CSV row ${index + 1} receiver_player_id`),
      playType: nullable(sourceRow.play_type),
      descText: nullable(sourceRow.desc),
      epa: finite(sourceRow.epa, `CSV row ${index + 1} epa`),
      wpa: finite(sourceRow.wpa, `CSV row ${index + 1} wpa`),
      cpoe: finite(sourceRow.cpoe, `CSV row ${index + 1} cpoe`),
      airEpa: finite(sourceRow.air_epa, `CSV row ${index + 1} air_epa`),
      yacEpa: finite(sourceRow.yac_epa, `CSV row ${index + 1} yac_epa`),
      success: boolean(sourceRow.success, `CSV row ${index + 1} success`),
      sourceRow,
    });
  }
  const digest = (value) => `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
  return {
    receipt: {
      runId, sourceUrl, sourceRef: digest(raw), sourceBytes: raw.length, sourceRows: records.length - 1,
      metadata: { schema_fingerprint: digest(Buffer.from(JSON.stringify(headers))), source_columns: headers, unmatched_rows: unmatched.length },
    },
    rows,
    unmatched,
    unmatchedRows: unmatched.length,
  };
}

module.exports = { adaptPlayByPlayCsvGzip, REQUIRED_COLUMNS, MAX_DECOMPRESSED_BYTES };
