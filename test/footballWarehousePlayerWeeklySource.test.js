"use strict";

const crypto = require("node:crypto");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  adaptPlayerWeeklyCsv,
  parseStrictCsv,
  REQUIRED_COLUMNS,
  sourceUrlForSeason,
} = require("../src/services/footballWarehouse/playerWeeklySource");

const EXTRA_COLUMNS = ["player_display_name", "note"];
const HEADERS = [...REQUIRED_COLUMNS, ...EXTRA_COLUMNS];

function csvRow(values) {
  return HEADERS.map((header) => values[header] ?? "").join(",");
}

function rawCsv(lines) {
  return Buffer.from(`${HEADERS.join(",")}\r\n${lines.join("\r\n")}\r\n`, "utf8");
}

function sourceArgs(raw) {
  return {
    raw,
    season: 2026,
    sourceUrl: sourceUrlForSeason(2026),
    runId: "player-week-2026-a",
    playerIdByGsis: new Map([
      ["00-0001", "omen:player:gsis.00-0001"],
      // A display name in the map must never resolve a row without a matching GSIS id.
      ["Same Name", "omen:player:wrong-name-match"],
    ]),
  };
}

function row(overrides = {}) {
  return {
    player_id: "00-0001",
    season: "2026",
    week: "3",
    season_type: "REG",
    team: "BUF",
    opponent_team: "NYJ",
    position: "QB",
    fantasy_points_ppr: "22.4",
    attempts: "34",
    passing_yards: "280",
    carries: "5",
    rushing_yards: "31",
    targets: "",
    receptions: "NA",
    receiving_yards: "",
    target_share: "NA",
    game_id: "2026_03_BUF_NYJ",
    player_display_name: "Same Name",
    note: "ordinary",
    ...overrides,
  };
}

test("hashes exact raw bytes and maps a complete source row to writer input", () => {
  const raw = rawCsv([csvRow(row())]);
  const result = adaptPlayerWeeklyCsv(sourceArgs(raw));

  assert.deepEqual(result.receipt, {
    runId: "player-week-2026-a",
    sourceUrl: sourceUrlForSeason(2026),
    sourceRef: `sha256:${crypto.createHash("sha256").update(raw).digest("hex")}`,
    sourceBytes: raw.length,
    sourceRows: 1,
    metadata: {
      schema_fingerprint: `sha256:${crypto.createHash("sha256").update(Buffer.from(JSON.stringify(HEADERS))).digest("hex")}`,
      source_columns: HEADERS,
    },
  });
  assert.equal(result.unmatchedRows, 0);
  assert.deepEqual(result.unmatched, []);
  assert.deepEqual(result.rows, [{
    season: 2026,
    week: 3,
    seasonType: "REG",
    playerId: "omen:player:gsis.00-0001",
    teamId: "omen:team:buf",
    opponentTeamId: "omen:team:nyj",
    gameId: "2026_03_BUF_NYJ",
    footballPosition: "QB",
    fantasyPointsPpr: 22.4,
    passingYards: 280,
    rushingYards: 31,
    receivingYards: null,
    targets: null,
    receptions: null,
    carries: 5,
    passingAttempts: 34,
    targetShare: null,
    stats: {
      fantasy_points_ppr: 22.4,
      attempts: 34,
      passing_yards: 280,
      carries: 5,
      rushing_yards: 31,
    },
    opportunity: {},
    sourceRow: row(),
  }]);
});

test("strict parser preserves quoted commas, doubled quotes and embedded newlines", () => {
  const values = row({ note: undefined });
  const base = csvRow(values);
  const line = `${base.slice(0, base.lastIndexOf(",") + 1)}"line one, yes\nline ""two"""`;
  const result = adaptPlayerWeeklyCsv(sourceArgs(rawCsv([line])));

  assert.equal(result.rows[0].sourceRow.note, 'line one, yes\nline "two"');
  assert.deepEqual(parseStrictCsv('a,b\r\n"x,y","z""q"\r\n'), [
    ["a", "b"],
    ["x,y", 'z"q'],
  ]);
});

test("returns unmatched GSIS rows without matching on player name", () => {
  const raw = rawCsv([
    csvRow(row({ player_id: "00-9999", week: "1" })),
    csvRow(row({ player_id: "", week: "2" })),
  ]);
  const result = adaptPlayerWeeklyCsv(sourceArgs(raw));

  assert.deepEqual(result.rows, []);
  assert.equal(result.unmatchedRows, 2);
  assert.deepEqual(result.unmatched, [
    { provider: "gsis", providerId: "00-9999", season: 2026, week: 1, reason: "gsis_id_not_in_crosswalk" },
    { provider: "gsis", providerId: null, season: 2026, week: 2, reason: "no_gsis_id" },
  ]);
});

test("rejects missing and duplicate headers before mapping", () => {
  const missing = Buffer.from("player_id,season\n00-0001,2026\n");
  assert.throws(() => adaptPlayerWeeklyCsv(sourceArgs(missing)), /missing required column: week/);

  const duplicate = Buffer.from(`${HEADERS.join(",")},week\n${csvRow(row())},3\n`);
  assert.throws(() => adaptPlayerWeeklyCsv(sourceArgs(duplicate)), /duplicate headers/);
});

test("rejects empty, truncated, malformed and duplicate player-week sources", () => {
  assert.throws(() => adaptPlayerWeeklyCsv(sourceArgs(Buffer.alloc(0))), /source is empty/);

  const short = Buffer.from(`${HEADERS.join(",")}\n${csvRow(row()).split(",").slice(0, -1).join(",")}\n`);
  assert.throws(() => adaptPlayerWeeklyCsv(sourceArgs(short)), /fields; expected/);

  const unterminated = Buffer.from(`${HEADERS.join(",")}\n${csvRow(row())},"unfinished`);
  assert.throws(() => adaptPlayerWeeklyCsv(sourceArgs(unterminated)), /unterminated quoted field/);

  const boundary = Buffer.from(`${HEADERS.join(",")}\n${csvRow(row())}"bad\n`);
  assert.throws(() => adaptPlayerWeeklyCsv(sourceArgs(boundary)), /quote must begin a field/);

  const duplicateRows = rawCsv([csvRow(row()), csvRow(row({ player_display_name: "Changed Name" }))]);
  assert.throws(() => adaptPlayerWeeklyCsv(sourceArgs(duplicateRows)), /duplicate player-week row/);
});

test("rejects wrong seasons, invalid numerics and credential-bearing source URLs", () => {
  assert.throws(
    () => adaptPlayerWeeklyCsv(sourceArgs(rawCsv([csvRow(row({ season: "2025" }))]))),
    /season does not match requested season/,
  );
  assert.throws(
    () => adaptPlayerWeeklyCsv(sourceArgs(rawCsv([csvRow(row({ targets: "not-a-number" }))]))),
    /targets is not numeric/,
  );
  assert.throws(
    () => adaptPlayerWeeklyCsv({
      ...sourceArgs(rawCsv([csvRow(row())])),
      sourceUrl: "https://user:password@example.com/source.csv",
    }),
    /sourceUrl is invalid/,
  );
  assert.throws(
    () => adaptPlayerWeeklyCsv({
      ...sourceArgs(rawCsv([csvRow(row())])),
      sourceUrl: "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2025.csv",
    }),
    /not the allowlisted season asset/,
  );
  assert.throws(
    () => adaptPlayerWeeklyCsv(sourceArgs(rawCsv([csvRow(row({ team: "NOT" }))]))),
    /team is not a known NFL team/,
  );
  assert.throws(
    () => adaptPlayerWeeklyCsv(sourceArgs(rawCsv([csvRow(row({ game_id: "" }))]))),
    /game_id is empty/,
  );
  assert.throws(
    () => adaptPlayerWeeklyCsv(sourceArgs(rawCsv([csvRow(row({ opponent_team: "" }))]))),
    /opponent_team is empty/,
  );
});
