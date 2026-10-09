"use strict";

const crypto = require("node:crypto");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  adaptPlayersCsv,
  PLAYERS_SOURCE_URL,
} = require("../src/services/footballWarehouse/playerIdentitySource");
const { playerIdFor } = require("../src/services/playerCrosswalk");

const HEADERS = [
  "gsis_id", "display_name", "position", "first_name", "last_name", "birth_date",
  "espn_id", "pfr_id", "nfl_id", "status", "last_season", "note",
];

function csvField(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function row(overrides = {}) {
  return {
    gsis_id: "00-0032464",
    display_name: "Current, Player",
    position: "QB",
    first_name: "Current",
    last_name: "Player",
    birth_date: "1995-01-02",
    espn_id: "12345",
    pfr_id: "PlayCu00",
    nfl_id: "current-player",
    status: "ACT",
    last_season: "2026",
    note: "line one\nline two",
    ...overrides,
  };
}

function rawCsv(rows, headers = HEADERS) {
  const lines = rows.map((values) => headers.map((header) => csvField(values[header])).join(","));
  return Buffer.from(`${headers.join(",")}\r\n${lines.join("\r\n")}\r\n`, "utf8");
}

function adapt(raw, overrides = {}) {
  return adaptPlayersCsv({ raw, sourceUrl: PLAYERS_SOURCE_URL, runId: "players-identity-a", ...overrides });
}

test("preserves exact provenance and admits current and retired GSIS identities without recency pruning", () => {
  const retired = row({
    gsis_id: "00-0000123", display_name: "Historic Defender", position: "LB",
    first_name: "Historic", last_name: "Defender", birth_date: "1970-05-06",
    espn_id: "NA", pfr_id: "DefeHi00", nfl_id: "", status: "RET", last_season: "2001",
    note: "retired historical player",
  });
  const raw = rawCsv([row(), retired]);
  const result = adapt(raw);

  assert.deepEqual(result.receipt, {
    runId: "players-identity-a",
    sourceUrl: PLAYERS_SOURCE_URL,
    sourceRef: `sha256:${crypto.createHash("sha256").update(raw).digest("hex")}`,
    sourceBytes: raw.length,
    sourceRows: 2,
    metadata: {
      schema_fingerprint: `sha256:${crypto.createHash("sha256").update(Buffer.from(JSON.stringify(HEADERS))).digest("hex")}`,
      source_columns: HEADERS,
    },
  });
  assert.equal(result.players.length, 2);
  assert.deepEqual(result.players[1], {
    playerId: playerIdFor("00-0000123"),
    gsisId: "00-0000123",
    displayName: "Historic Defender",
    firstName: "Historic",
    lastName: "Defender",
    footballPosition: "LB",
    birthDate: "1970-05-06",
    sourceRow: retired,
  });
  assert.equal(result.players[0].sourceRow.note, "line one\nline two");
  assert.equal(result.playerIdByGsis.get("00-0032464"), playerIdFor("00-0032464"));
  assert.equal(result.playerIdByGsis.get("Current, Player"), undefined, "display names never become identity keys");
  assert.deepEqual(result.playerIds.filter((identity) => identity.playerId === playerIdFor("00-0000123")), [
    { provider: "gsis", providerId: "00-0000123", playerId: playerIdFor("00-0000123"), matchMethod: "source_crosswalk" },
  ]);
});

test("uses exact playerIdFor output and admits only direct GSIS identifiers", () => {
  const result = adapt(rawCsv([row()]));
  const canonical = playerIdFor("00-0032464");
  assert.equal(result.players[0].playerId, canonical);
  assert.deepEqual(result.playerIds, [
    { provider: "gsis", providerId: "00-0032464", playerId: canonical, matchMethod: "source_crosswalk" },
  ]);
  assert.ok(result.playerIds.every(({ provider }) => provider === "gsis"));
});

test("admits exact historical source IDs without guessing or normalizing lookup keys", () => {
  const result = adapt(rawCsv([row(), row({
    gsis_id: "ABB498348", display_name: "Vince Abbott", position: "K",
  })]));

  assert.equal(result.players.length, 2);
  assert.equal(result.playerIdByGsis.get("ABB498348"), playerIdFor("ABB498348"));
  assert.equal(result.playerIdByGsis.get("abb498348"), undefined);
  assert.equal(result.players[1].gsisId, "ABB498348");
  assert.equal(result.players[1].playerId, "omen:player:gsis.abb498348");
  assert.equal(result.playerIds[1].providerId, "ABB498348");
  assert.equal(result.playerIdByGsis.has("Vince Abbott"), false);
  assert.equal(result.receipt.sourceRows, 2);
});

test("fails closed on duplicate, empty, malformed and conflicting identities", () => {
  assert.throws(() => adapt(rawCsv([row(), row({ display_name: "Other" })])), /duplicate GSIS identity/);
  assert.throws(() => adapt(rawCsv([row({ gsis_id: "" })])), /gsis_id is empty/);
  assert.throws(() => adapt(rawCsv([row({ gsis_id: "Current, Player" })])), /gsis_id is malformed/);
  assert.throws(() => adapt(rawCsv([row({ gsis_id: "a".repeat(129) })])), /gsis_id is malformed/);
  assert.throws(() => adapt(rawCsv([
    row({ gsis_id: "ABB498348" }),
    row({ gsis_id: "abb498348", display_name: "Conflicting Player" }),
  ])), /canonical player identity collision/);
  assert.throws(() => adapt(rawCsv([row({ display_name: "NA" })])), /display_name is empty/);
  assert.throws(() => adapt(rawCsv([row({ position: "NA" })])), /position is empty/);
});

test("fails closed on invalid bytes, headers, row widths, dates and URLs", () => {
  assert.throws(() => adapt(Buffer.from([0xff, 0xfe])), /not valid UTF-8/);
  assert.throws(() => adapt(Buffer.alloc(0)), /source is empty/);
  assert.throws(() => adapt(rawCsv([row()], HEADERS.filter((header) => header !== "position"))), /missing required column: position/);
  assert.throws(() => adapt(Buffer.from("gsis_id,gsis_id,display_name,position\n00-1,00-1,A,QB\n")), /duplicate headers/);
  assert.throws(() => adapt(Buffer.from(`${HEADERS.join(",")}\n00-0001,A,QB\n`)), /fields; expected/);
  assert.throws(() => adapt(rawCsv([row({ birth_date: "2026-02-30" })])), /birth_date is not a valid date/);
  assert.throws(() => adapt(rawCsv([row()]), { sourceUrl: `${PLAYERS_SOURCE_URL}?download=1` }), /not the allowlisted players asset/);
  assert.throws(() => adapt(rawCsv([row()]), { sourceUrl: "https://u:p@example.com/players.csv" }), /sourceUrl is invalid/);
});
