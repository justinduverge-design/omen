"use strict";

const { CONTRACTS, MODELS } = require("./contracts");

const REQUIRED_COLUMNS = Object.freeze([
  "game_id", "play_id", "season", "week", "season_type", "posteam", "defteam",
  "down", "ydstogo", "yardline_100", "game_seconds_remaining", "play_type",
  "pass", "rush", "qb_scramble", "no_play", "touchdown", "yards_gained",
]);

class OrdinaryPbpError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "OrdinaryPbpError";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new OrdinaryPbpError(code, message, options);
}

function string(value, field) {
  if (typeof value !== "string" || !value.trim()) fail("INVALID_OBSERVED_PLAY", `${field} must be a non-empty string`);
  return value.trim();
}

function integer(value, field, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, nullable = false } = {}) {
  if (nullable && (value === null || value === undefined || value === "")) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    fail("INVALID_OBSERVED_PLAY", `${field} must be an integer from ${min} through ${max}`);
  }
  return parsed;
}

function finite(value, field, { min = -Infinity, max = Infinity, nullable = false } = {}) {
  if (nullable && (value === null || value === undefined || value === "")) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    fail("INVALID_OBSERVED_PLAY", `${field} must be a finite number from ${min} through ${max}`);
  }
  return Object.is(parsed, -0) ? 0 : parsed;
}

function flag(value, field) {
  if (value === true || value === 1 || value === "1" || value === "TRUE" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "FALSE" || value === "false") return false;
  fail("INVALID_OBSERVED_PLAY", `${field} must be a boolean flag`);
}

function assertTable(table, receipt) {
  if (!table || typeof table !== "object" || !Array.isArray(table.columns) || !Array.isArray(table.rows)) {
    fail("INVALID_TABULAR_RESULT", "TabularReader must return { columns, rows }");
  }
  const present = new Set(table.columns);
  const missing = REQUIRED_COLUMNS.filter((column) => !present.has(column));
  if (missing.length) fail("TABULAR_SCHEMA_MISMATCH", `ordinary PBP is missing required columns: ${missing.join(", ")}`);
  if (table.rows.length !== receipt.row_count) {
    fail("TABULAR_ROW_COUNT_MISMATCH", `receipt declares ${receipt.row_count} rows but TabularReader returned ${table.rows.length}`);
  }
}

function normalizePlay(row, provenance) {
  if (!row || typeof row !== "object" || Array.isArray(row)) fail("INVALID_OBSERVED_PLAY", "ordinary PBP rows must be objects");
  if (flag(row.no_play, "no_play")) return { exclusion: "no_play" };
  const isPass = flag(row.pass, "pass");
  const isRush = flag(row.rush, "rush");
  const isScramble = flag(row.qb_scramble, "qb_scramble");
  if (!isPass && !isRush && !isScramble) return { exclusion: "non_scrimmage" };
  if (isPass && (isRush || isScramble)) fail("INVALID_OBSERVED_PLAY", "a play cannot be both pass and rush/scramble");
  if (isScramble && !isRush) fail("INVALID_OBSERVED_PLAY", "qb_scramble requires the ordinary PBP rush flag");

  const seasonType = string(row.season_type, "season_type").toUpperCase();
  if (!new Set(["REG", "POST", "PRE"]).has(seasonType)) fail("INVALID_OBSERVED_PLAY", "season_type is not recognized");
  const sourcePlayType = string(row.play_type, "play_type").toLowerCase();
  const canonicalType = isScramble ? "scramble" : isPass ? "pass" : "rush";
  const possessionTeam = string(row.posteam, "posteam").toUpperCase();
  const defenseTeam = string(row.defteam, "defteam").toUpperCase();
  if (possessionTeam === defenseTeam) fail("INVALID_OBSERVED_PLAY", "possession and defense teams must differ");

  return {
    fact: {
      schema: CONTRACTS.observedFact,
      normalization_version: MODELS.normalization,
      game_id: string(row.game_id, "game_id"),
      play_id: integer(row.play_id, "play_id", { min: 0 }),
      season: integer(row.season, "season", { min: 1920, max: 2200 }),
      week: integer(row.week, "week", { min: 1, max: 25 }),
      season_type: seasonType,
      possession_team: possessionTeam,
      defense_team: defenseTeam,
      situation: {
        down: integer(row.down, "down", { min: 1, max: 4, nullable: true }),
        yards_to_go: finite(row.ydstogo, "ydstogo", { min: 0, nullable: true }),
        yardline_100: finite(row.yardline_100, "yardline_100", { min: 0, max: 100, nullable: true }),
        game_seconds_remaining: finite(row.game_seconds_remaining, "game_seconds_remaining", { min: 0, max: 3600, nullable: true }),
      },
      play: { type: canonicalType, source_type: sourcePlayType, pass: isPass, rush: isRush, qb_scramble: isScramble },
      result: {
        touchdown: flag(row.touchdown, "touchdown"),
        yards_gained: finite(row.yards_gained, "yards_gained", { nullable: true }),
      },
      provenance,
    },
  };
}

async function ingestOrdinaryPbpReceipt({ registry, receiptId, tabularReader } = {}) {
  if (!registry || typeof registry.replayReceipt !== "function") fail("ARTIFACT_REGISTRY_REQUIRED", "registry with replayReceipt is required");
  if (!tabularReader || typeof tabularReader.readRows !== "function") fail("TABULAR_READER_REQUIRED", "TabularReader.readRows is required");
  const replay = await registry.replayReceipt(receiptId);
  const { receipt, bytes } = replay;
  if (receipt.source.family !== "play_by_play" || receipt.intended_use !== "current_denominator" || receipt.artifact_type !== "raw_source") {
    fail("ORDINARY_PBP_RECEIPT_REQUIRED", "receipt must be an admitted raw play_by_play current_denominator capture");
  }
  const table = await tabularReader.readRows({
    bytes,
    mediaType: receipt.artifact.media_type,
    requiredColumns: REQUIRED_COLUMNS,
    schemaFingerprint: receipt.schema_fingerprint,
  });
  assertTable(table, receipt);

  const provenance = Object.freeze({
    artifact_id: receipt.artifact.sha256,
    receipt_id: receipt.receipt_id,
    source_family: receipt.source.family,
    source_schema_fingerprint: receipt.schema_fingerprint,
  });
  const facts = [];
  const coverage = { source_rows: table.rows.length, canonical_plays: 0, excluded_no_play: 0, excluded_non_scrimmage: 0 };
  const identities = new Set();
  for (const row of table.rows) {
    const normalized = normalizePlay(row, provenance);
    if (normalized.exclusion) {
      coverage[normalized.exclusion === "no_play" ? "excluded_no_play" : "excluded_non_scrimmage"] += 1;
      continue;
    }
    const identity = `${normalized.fact.game_id}\u0000${normalized.fact.play_id}`;
    if (identities.has(identity)) fail("DUPLICATE_OBSERVED_PLAY", `duplicate ordinary PBP play identity: ${normalized.fact.game_id}/${normalized.fact.play_id}`);
    identities.add(identity);
    facts.push(normalized.fact);
  }
  facts.sort((a, b) => a.game_id.localeCompare(b.game_id) || a.play_id - b.play_id);
  coverage.canonical_plays = facts.length;
  return Object.freeze({ receipt_id: receipt.receipt_id, artifact_id: receipt.artifact.sha256, coverage: Object.freeze(coverage), facts: Object.freeze(facts) });
}

module.exports = { OrdinaryPbpError, REQUIRED_COLUMNS, ingestOrdinaryPbpReceipt };
