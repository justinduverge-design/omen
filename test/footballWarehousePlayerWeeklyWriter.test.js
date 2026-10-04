"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createPlayerWeeklyWriter,
  WarehouseIngestError,
} = require("../src/services/footballWarehouse/playerWeeklyWriter");

const HASH_A = `sha256:${"a".repeat(64)}`;

function input(overrides = {}) {
  return {
    season: 2026,
    receipt: {
      runId: "weekly-2026-a",
      sourceUrl: "https://github.com/nflverse/example.csv",
      sourceRef: HASH_A,
      sourceBytes: 1234,
      sourceRows: 1,
      metadata: {
        schema_fingerprint: HASH_A,
        source_columns: ["player_id", "season", "week"],
      },
    },
    unmatchedRows: 0,
    rows: [{
      season: 2026,
      week: 1,
      seasonType: "REG",
      playerId: "omen:player:00-0031234",
      teamId: "omen:team:buf",
      opponentTeamId: "omen:team:nyj",
      gameId: "2026_01_BUF_NYJ",
      footballPosition: "QB",
      fantasyPointsPpr: 22.4,
      passingYards: 280,
      rushingYards: 31,
      carries: 5,
      passingAttempts: 34,
      targetShare: 0.2,
      stats: { attempts: 34 },
      opportunity: { carries: 5 },
      sourceRow: { player_id: "00-0031234", week: 1 },
    }],
    ...overrides,
  };
}

function fakePool({ existing = [], failAt } = {}) {
  const calls = [];
  let released = false;
  const client = {
    async query(query) {
      const name = typeof query === "string" ? query : query.name || query.text.trim().split(/\s+/).slice(0, 3).join(" ");
      calls.push(query);
      if (name === failAt) {
        const error = new Error("postgres://admin:secret@warehouse.internal private detail");
        error.code = "23505";
        throw error;
      }
      if (name === "warehouse-player-weekly-existing-v1") return { rows: existing };
      if (name === "warehouse-player-weekly-start-receipt-v1") return { rows: [{ id: 71 }] };
      if (name === "warehouse-player-weekly-stage-count-v1") return { rows: [{ row_count: 1 }] };
      if (name === "warehouse-player-weekly-stage-references-v1") return { rows: [{ invalid_count: 0 }] };
      return { rows: [], rowCount: 1 };
    },
    release() { released = true; },
  };
  return {
    pool: { async connect() { return client; } },
    calls,
    wasReleased: () => released,
  };
}

function names(calls) {
  return calls.map((query) => typeof query === "string" ? query : query.name).filter(Boolean);
}

test("writes player weekly facts and the succeeded receipt in one guarded transaction", async () => {
  const db = fakePool();
  const writer = createPlayerWeeklyWriter({ pool: db.pool });

  const result = await writer.writeSeason(input());

  assert.deepEqual(result, {
    state: "succeeded",
    ingestEventId: 71,
    sourceRows: 1,
    writtenRows: 1,
    unmatchedRows: 0,
  });
  assert.deepEqual(names(db.calls), [
    "BEGIN",
    "warehouse-player-weekly-lock-v1",
    "warehouse-player-weekly-existing-v1",
    "warehouse-player-weekly-start-receipt-v1",
    "warehouse-player-weekly-create-stage-v1",
    "warehouse-player-weekly-stage-v1",
    "warehouse-player-weekly-stage-count-v1",
    "warehouse-player-weekly-stage-references-v1",
    "warehouse-player-weekly-delete-season-v1",
    "warehouse-player-weekly-promote-v1",
    "warehouse-player-weekly-succeed-receipt-v1",
    "COMMIT",
  ]);
  const lock = db.calls.find((call) => call.name === "warehouse-player-weekly-lock-v1");
  assert.deepEqual(lock.values, ["player_weekly_stats:2026"]);
  const staged = db.calls.find((call) => call.name === "warehouse-player-weekly-stage-v1");
  assert.equal(staged.values[1], 71);
  assert.deepEqual(JSON.parse(staged.values[0]), [{
    season: 2026,
    week: 1,
    season_type: "REG",
    player_id: "omen:player:00-0031234",
    team_id: "omen:team:buf",
    opponent_team_id: "omen:team:nyj",
    game_id: "2026_01_BUF_NYJ",
    football_position: "QB",
    fantasy_points_ppr: 22.4,
    passing_yards: 280,
    rushing_yards: 31,
    receiving_yards: null,
    targets: null,
    receptions: null,
    carries: 5,
    passing_attempts: 34,
    target_share: 0.2,
    stats: { attempts: 34 },
    opportunity: { carries: 5 },
    source_row: { player_id: "00-0031234", week: 1 },
  }]);
  assert.equal(db.wasReleased(), true);
});

test("skips an unchanged source under the season lock without replacing facts", async () => {
  const db = fakePool({ existing: [{ id: 44, run_id: "older-run" }] });
  const writer = createPlayerWeeklyWriter({ pool: db.pool });

  const result = await writer.writeSeason(input());

  assert.deepEqual(result, { state: "unchanged", ingestEventId: 44, sourceRows: 1, writtenRows: 1 });
  assert.deepEqual(names(db.calls), [
    "BEGIN",
    "warehouse-player-weekly-lock-v1",
    "warehouse-player-weekly-existing-v1",
    "COMMIT",
  ]);
  assert.equal(db.wasReleased(), true);
});

test("rolls back partial work before writing a bounded failed receipt", async () => {
  const db = fakePool({ failAt: "warehouse-player-weekly-promote-v1" });
  const writer = createPlayerWeeklyWriter({ pool: db.pool });

  await assert.rejects(
    writer.writeSeason(input()),
    (error) => {
      assert.ok(error instanceof WarehouseIngestError);
      assert.equal(error.code, "23505");
      assert.equal(error.message, "player weekly ingest failed");
      assert.doesNotMatch(error.message, /secret|warehouse\.internal/);
      return true;
    },
  );

  const callNames = names(db.calls);
  assert.ok(callNames.indexOf("ROLLBACK") > callNames.indexOf("warehouse-player-weekly-promote-v1"));
  assert.ok(callNames.indexOf("warehouse-player-weekly-failed-receipt-v1") > callNames.indexOf("ROLLBACK"));
  assert.equal(callNames.includes("warehouse-player-weekly-succeed-receipt-v1"), false);
  const failure = db.calls.find((call) => call.name === "warehouse-player-weekly-failed-receipt-v1");
  assert.equal(failure.values[8], "23505");
  assert.equal(failure.values[9], "player weekly ingest failed");
  assert.deepEqual(JSON.parse(failure.values[10]), {
    schema_fingerprint: HASH_A,
    source_columns: ["player_id", "season", "week"],
    unmatched_rows: 0,
  });
  assert.equal(failure.values[7], 1);
  assert.equal(db.wasReleased(), true);
});

test("rejects malformed source hashes and unmatched row metadata before connecting", async () => {
  let connects = 0;
  const writer = createPlayerWeeklyWriter({
    pool: { async connect() { connects += 1; throw new Error("must not connect"); } },
  });

  await assert.rejects(
    writer.writeSeason(input({ receipt: { ...input().receipt, sourceRef: "abc123" } })),
    /receipt\.sourceRef is invalid/,
  );
  await assert.rejects(
    writer.writeSeason(input({ receipt: {
      ...input().receipt,
      sourceUrl: "https://user:secret@example.com/source.csv",
    } })),
    /receipt\.sourceUrl is invalid/,
  );
  await assert.rejects(writer.writeSeason(input({ unmatchedRows: -1 })), /unmatchedRows/);
  await assert.rejects(
    writer.writeSeason(input({ receipt: { ...input().receipt, sourceRows: 0 } })),
    /receipt\.sourceRows/,
  );
  await assert.rejects(
    writer.writeSeason(input({ receipt: { ...input().receipt, sourceRows: 1 }, unmatchedRows: 1 })),
    /sourceRows cannot be smaller/,
  );
  await assert.rejects(
    writer.writeSeason(input({ receipt: { ...input().receipt, sourceRows: 20 }, unmatchedRows: 2 })),
    /unmatched player rows exceed/,
  );
  await assert.rejects(
    writer.writeSeason(input({ receipt: { ...input().receipt, metadata: {} } })),
    /schema_fingerprint/,
  );
  await assert.rejects(writer.writeSeason(input({ rows: [] })), /at least one resolved player week/);
  await assert.rejects(
    writer.writeSeason(input({ rows: [{ ...input().rows[0], sourceRow: undefined }] })),
    /sourceRow must be an object/,
  );
  assert.equal(connects, 0);
});

test("rejects rows from another season and never performs name matching", async () => {
  let connects = 0;
  const writer = createPlayerWeeklyWriter({
    pool: { async connect() { connects += 1; throw new Error("must not connect"); } },
  });
  const row = { ...input().rows[0], season: 2025, playerName: "Do Not Match Me" };

  await assert.rejects(writer.writeSeason(input({ rows: [row] })), /season must match season/);
  assert.equal(connects, 0);
});

test("rejects duplicate player-week keys before connecting", async () => {
  let connects = 0;
  const writer = createPlayerWeeklyWriter({
    pool: { async connect() { connects += 1; throw new Error("must not connect"); } },
  });
  const row = input().rows[0];

  await assert.rejects(
    writer.writeSeason(input({ rows: [row, { ...row }] })),
    /duplicate player-week key/,
  );
  assert.equal(connects, 0);
});
