"use strict";

const crypto = require("node:crypto");
const { playerIdFor } = require("../playerCrosswalk");
const { parseStrictCsv, MAX_SOURCE_BYTES } = require("./playerWeeklySource");

const PLAYERS_SOURCE_URL =
  "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv";
const REQUIRED_COLUMNS = Object.freeze(["gsis_id", "display_name", "position"]);
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const GSIS_ID = /^\d{2}-\d{1,12}$/;

function textOrNull(value) {
  const text = String(value ?? "").trim();
  return !text || text.toUpperCase() === "NA" ? null : text;
}

function isoDateOrNull(value, label) {
  const text = textOrNull(value);
  if (text == null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new TypeError(`${label} is not an ISO date`);
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== text) {
    throw new TypeError(`${label} is not a valid date`);
  }
  return text;
}

function validateSourceUrl(value) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new TypeError("sourceUrl is invalid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new TypeError("sourceUrl is invalid");
  }
  if (value !== PLAYERS_SOURCE_URL) throw new TypeError("sourceUrl is not the allowlisted players asset");
  return value;
}

function parseObjects(raw) {
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

function adaptPlayersCsv({ raw, sourceUrl, runId }) {
  if (typeof runId !== "string" || !RUN_ID.test(runId)) throw new TypeError("runId is invalid");
  validateSourceUrl(sourceUrl);
  const parsed = parseObjects(raw);
  const players = [];
  const playerIds = [];
  const playerIdByGsis = new Map();

  for (let index = 0; index < parsed.rows.length; index += 1) {
    const sourceRow = parsed.rows[index];
    const rowLabel = `CSV row ${index + 2}`;
    const gsisId = textOrNull(sourceRow.gsis_id);
    const displayName = textOrNull(sourceRow.display_name);
    const footballPosition = textOrNull(sourceRow.position);
    if (!gsisId) throw new TypeError(`${rowLabel} gsis_id is empty`);
    if (!GSIS_ID.test(gsisId)) throw new TypeError(`${rowLabel} gsis_id is malformed`);
    if (!displayName) throw new TypeError(`${rowLabel} display_name is empty`);
    if (!footballPosition) throw new TypeError(`${rowLabel} position is empty`);
    if (playerIdByGsis.has(gsisId)) throw new TypeError("CSV contains a duplicate GSIS identity");

    const playerId = playerIdFor(gsisId);
    playerIdByGsis.set(gsisId, playerId);
    players.push({
      playerId,
      gsisId,
      displayName,
      firstName: textOrNull(sourceRow.first_name),
      lastName: textOrNull(sourceRow.last_name),
      footballPosition,
      birthDate: isoDateOrNull(sourceRow.birth_date, `${rowLabel} birth_date`),
      sourceRow,
    });

    playerIds.push({ provider: "gsis", providerId: gsisId, playerId, matchMethod: "source_crosswalk" });
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
      sourceRows: parsed.rows.length,
      metadata: { schema_fingerprint: schemaFingerprint, source_columns: parsed.headers },
    },
    players,
    playerIds,
    playerIdByGsis,
  };
}

module.exports = {
  adaptPlayersCsv,
  PLAYERS_SOURCE_URL,
  REQUIRED_COLUMNS,
};
