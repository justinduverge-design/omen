"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  createLocalArtifactRegistry,
  ingestOrdinaryPbpReceipt,
} = require("../src/services/footballIntelligence");

const COLUMNS = Object.freeze([
  "game_id", "play_id", "season", "week", "season_type", "posteam", "defteam",
  "down", "ydstogo", "yardline_100", "game_seconds_remaining", "play_type",
  "pass", "rush", "qb_scramble", "no_play", "touchdown", "yards_gained",
]);

const SOURCE = Object.freeze({
  family: "play_by_play",
  owner: "nflverse",
  release: "play_by_play_2025.csv",
  source_url: "https://github.com/nflverse/nflverse-data/releases",
  upstream_updated_at_utc: "2026-09-26T10:00:00.000Z",
  rights: {
    license: "CC BY 4.0",
    license_url: "https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md",
    attribution: "Data sourced from nflverse under CC BY 4.0.",
  },
});

function play(overrides = {}) {
  return {
    game_id: "2025_01_SEA_SF",
    play_id: "101",
    season: "2025",
    week: "1",
    season_type: "REG",
    posteam: "SEA",
    defteam: "SF",
    down: "1",
    ydstogo: "10",
    yardline_100: "75",
    game_seconds_remaining: "3500",
    play_type: "pass",
    pass: "1",
    rush: "0",
    qb_scramble: "0",
    no_play: "0",
    touchdown: "0",
    yards_gained: "8",
    ...overrides,
  };
}

async function setup(t, rows, input = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "omen-fi-pbp-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const registry = createLocalArtifactRegistry({
    root,
    clock: () => new Date("2026-09-26T12:00:00.000Z"),
  });
  const bytes = Buffer.from("exact registered ordinary pbp bytes\n");
  const registered = await registry.registerSourceArtifact({
    artifact_type: "raw_source",
    intended_use: "current_denominator",
    bytes,
    media_type: "text/csv",
    source: SOURCE,
    schema_fingerprint: `sha256:${"4".repeat(64)}`,
    row_count: rows.length,
    coverage: { games: 1, eligible_plays: rows.length, charted_plays: null },
    ...input,
  });
  const calls = [];
  const tabularReader = {
    async readRows(request) {
      calls.push(request);
      return { columns: [...COLUMNS], rows };
    },
  };
  return { bytes, calls, registered, registry, tabularReader };
}

test("exact registered ordinary PBP receipt replays through TabularReader into bounded observed facts", async (t) => {
  const rows = [
    play({ play_id: "103", play_type: "run", pass: "0", rush: "1", yards_gained: "4" }),
    play({ play_id: "102", no_play: "1" }),
    play({ play_id: "101" }),
    play({ play_id: "104", play_type: "field_goal", pass: "0", rush: "0" }),
  ];
  const { bytes, calls, registered, registry, tabularReader } = await setup(t, rows);

  const result = await ingestOrdinaryPbpReceipt({
    registry,
    receiptId: registered.receipt_id,
    tabularReader,
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].bytes, bytes);
  assert.equal(calls[0].mediaType, "text/csv");
  assert.deepEqual(calls[0].requiredColumns, COLUMNS);
  assert.deepEqual(result.coverage, {
    source_rows: 4,
    canonical_plays: 2,
    excluded_no_play: 1,
    excluded_non_scrimmage: 1,
  });
  assert.deepEqual(result.facts.map((fact) => fact.play_id), [101, 103]);
  assert.deepEqual(result.facts[0], {
    schema: "football-observed-fact.v1",
    normalization_version: "football-intelligence-normalization.v1",
    game_id: "2025_01_SEA_SF",
    play_id: 101,
    season: 2025,
    week: 1,
    season_type: "REG",
    possession_team: "SEA",
    defense_team: "SF",
    situation: { down: 1, yards_to_go: 10, yardline_100: 75, game_seconds_remaining: 3500 },
    play: { type: "pass", source_type: "pass", pass: true, rush: false, qb_scramble: false },
    result: { touchdown: false, yards_gained: 8 },
    provenance: {
      artifact_id: registered.artifact_id,
      receipt_id: registered.receipt_id,
      source_family: "play_by_play",
      source_schema_fingerprint: `sha256:${"4".repeat(64)}`,
    },
  });
});

test("canonical facts are deterministic across source row order", async (t) => {
  const rows = [play({ play_id: "2" }), play({ play_id: "1", play_type: "run", pass: "0", rush: "1" })];
  const first = await setup(t, rows);
  const second = await setup(t, [...rows].reverse());
  const one = await ingestOrdinaryPbpReceipt({ registry: first.registry, receiptId: first.registered.receipt_id, tabularReader: first.tabularReader });
  const two = await ingestOrdinaryPbpReceipt({ registry: second.registry, receiptId: second.registered.receipt_id, tabularReader: second.tabularReader });
  assert.deepEqual(one.facts.map(({ provenance, ...fact }) => fact), two.facts.map(({ provenance, ...fact }) => fact));
});

test("fails closed on a non-PBP receipt before invoking TabularReader", async (t) => {
  const rows = [play()];
  const setupResult = await setup(t, rows, {
    intended_use: "historical_replay",
    source: { ...SOURCE, family: "schedules", release: "games.csv" },
  });
  await assert.rejects(
    ingestOrdinaryPbpReceipt({ registry: setupResult.registry, receiptId: setupResult.registered.receipt_id, tabularReader: setupResult.tabularReader }),
    (error) => error.code === "ORDINARY_PBP_RECEIPT_REQUIRED",
  );
  assert.equal(setupResult.calls.length, 0);
});

test("fails closed on row-count drift, duplicate play identity, and malformed observed values", async (t) => {
  const drift = await setup(t, [play()], { row_count: 2 });
  await assert.rejects(
    ingestOrdinaryPbpReceipt({ registry: drift.registry, receiptId: drift.registered.receipt_id, tabularReader: drift.tabularReader }),
    (error) => error.code === "TABULAR_ROW_COUNT_MISMATCH",
  );

  const duplicate = await setup(t, [play(), play()]);
  await assert.rejects(
    ingestOrdinaryPbpReceipt({ registry: duplicate.registry, receiptId: duplicate.registered.receipt_id, tabularReader: duplicate.tabularReader }),
    (error) => error.code === "DUPLICATE_OBSERVED_PLAY",
  );

  const malformed = await setup(t, [play({ down: "first" })]);
  await assert.rejects(
    ingestOrdinaryPbpReceipt({ registry: malformed.registry, receiptId: malformed.registered.receipt_id, tabularReader: malformed.tabularReader }),
    (error) => error.code === "INVALID_OBSERVED_PLAY",
  );

  const schema = await setup(t, [play()]);
  schema.tabularReader.readRows = async () => ({ columns: COLUMNS.filter((column) => column !== "posteam"), rows: [play()] });
  await assert.rejects(
    ingestOrdinaryPbpReceipt({ registry: schema.registry, receiptId: schema.registered.receipt_id, tabularReader: schema.tabularReader }),
    (error) => error.code === "TABULAR_SCHEMA_MISMATCH",
  );
});
