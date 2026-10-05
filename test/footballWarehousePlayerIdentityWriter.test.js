"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createPlayerIdentityWriter,
  WarehouseIdentityIngestError,
} = require("../src/services/footballWarehouse/playerIdentityWriter");

const HASH = `sha256:${"a".repeat(64)}`;
const writerFor = (pool) => createPlayerIdentityWriter({ pool, minPlayerRows: 1 });

function input(overrides = {}) {
  return {
    receipt: {
      runId: "players-snapshot-a",
      sourceUrl: "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv",
      sourceRef: HASH,
      sourceBytes: 999,
      sourceRows: 1,
      metadata: { schema_fingerprint: HASH, source_columns: ["gsis_id", "display_name"] },
    },
    players: [{
      playerId: "omen:player:gsis.00-0031234",
      gsisId: "00-0031234",
      displayName: "Public Player",
      firstName: "Public",
      lastName: "Player",
      footballPosition: "QB",
      birthDate: "1995-01-02",
      sourceRow: { gsis_id: "00-0031234", display_name: "Public Player" },
    }],
    playerIds: [{
      provider: "gsis",
      providerId: "00-0031234",
      playerId: "omen:player:gsis.00-0031234",
      matchMethod: "source_crosswalk",
    }],
    ...overrides,
  };
}

function fakePool({ existing = [], run = [], failAt, conflicts = 0 } = {}) {
  const calls = [];
  let released = false;
  const client = {
    async query(query) {
      const name = typeof query === "string" ? query : query.name;
      calls.push(query);
      if (name === failAt) {
        const error = new Error("postgres://root:secret@private-host sensitive detail");
        error.code = "23505";
        throw error;
      }
      if (name === "warehouse-player-identity-existing-v1") return { rows: existing };
      if (name === "warehouse-player-identity-run-v1") return { rows: run };
      if (name === "warehouse-player-identity-start-receipt-v1" ||
          name === "warehouse-player-identity-restart-receipt-v1") return { rows: [{ id: 81 }] };
      if (name === "warehouse-player-identity-stage-count-v1") {
        return { rows: [{ player_count: 1, id_count: 1 }] };
      }
      if (name === "warehouse-player-identity-stage-conflicts-v1") {
        return { rows: [{ invalid_count: conflicts }] };
      }
      if (name === "warehouse-player-identity-succeed-receipt-v1") return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    },
    release() { released = true; },
  };
  return { pool: { async connect() { return client; } }, calls, wasReleased: () => released };
}

function names(calls) {
  return calls.map((query) => typeof query === "string" ? query : query.name).filter(Boolean);
}

test("atomically upserts players and replaces only the GSIS mapping snapshot", async () => {
  const db = fakePool();
  const result = await writerFor(db.pool).writeSnapshot(input());

  assert.deepEqual(result, {
    state: "succeeded",
    ingestEventId: 81,
    sourceRows: 1,
    writtenPlayers: 1,
    writtenPlayerIds: 1,
  });
  assert.deepEqual(names(db.calls), [
    "BEGIN",
    "warehouse-local-transaction-timeouts-v1",
    "warehouse-player-identity-lock-v1",
    "warehouse-player-identity-existing-v1",
    "warehouse-player-identity-run-v1",
    "warehouse-player-identity-start-receipt-v1",
    "warehouse-player-identity-create-player-stage-v1",
    "warehouse-player-identity-stage-players-v1",
    "warehouse-player-identity-create-id-stage-v1",
    "warehouse-player-identity-stage-ids-v1",
    "warehouse-player-identity-stage-count-v1",
    "warehouse-player-identity-stage-conflicts-v1",
    "warehouse-player-identity-upsert-players-v1",
    "warehouse-player-identity-delete-gsis-v1",
    "warehouse-player-identity-promote-ids-v1",
    "warehouse-player-identity-succeed-receipt-v1",
    "COMMIT",
  ]);
  const deletion = db.calls.find((call) => call.name === "warehouse-player-identity-delete-gsis-v1");
  assert.match(deletion.text, /WHERE provider='gsis'/);
  assert.doesNotMatch(deletion.text, /football_players/);
  const upsert = db.calls.find((call) => call.name === "warehouse-player-identity-upsert-players-v1");
  assert.doesNotMatch(upsert.text, /DELETE/i);
  assert.match(upsert.text, /ON CONFLICT \(player_id\) DO UPDATE/);
  assert.equal(db.wasReleased(), true);
});

test("preserves dot-bearing canonical IDs and complete public source rows", async () => {
  const db = fakePool();
  await writerFor(db.pool).writeSnapshot(input());

  const playerStage = db.calls.find((call) => call.name === "warehouse-player-identity-stage-players-v1");
  assert.deepEqual(JSON.parse(playerStage.values[0]), [{
    player_id: "omen:player:gsis.00-0031234",
    gsis_id: "00-0031234",
    display_name: "Public Player",
    first_name: "Public",
    last_name: "Player",
    football_position: "QB",
    birth_date: "1995-01-02",
    source_row: { gsis_id: "00-0031234", display_name: "Public Player" },
  }]);
});

test("returns unchanged under the global identity lock without replacing mappings", async () => {
  const db = fakePool({ existing: [{ id: 55 }] });
  const result = await writerFor(db.pool).writeSnapshot(input());

  assert.equal(result.state, "unchanged");
  assert.equal(result.ingestEventId, 55);
  assert.deepEqual(names(db.calls), [
    "BEGIN",
    "warehouse-local-transaction-timeouts-v1",
    "warehouse-player-identity-lock-v1",
    "warehouse-player-identity-existing-v1",
    "COMMIT",
  ]);
});

test("restarts a matching failed run but rejects a reused or succeeded run identity", async () => {
  const retryDb = fakePool({ run: [{ id: 29, state: "failed", source_ref: HASH }] });
  await writerFor(retryDb.pool).writeSnapshot(input());
  assert.ok(names(retryDb.calls).includes("warehouse-player-identity-restart-receipt-v1"));
  assert.equal(names(retryDb.calls).includes("warehouse-player-identity-start-receipt-v1"), false);

  for (const run of [
    { id: 30, state: "succeeded", source_ref: HASH },
    { id: 31, state: "failed", source_ref: `sha256:${"b".repeat(64)}` },
  ]) {
    const db = fakePool({ run: [run] });
    await assert.rejects(
      writerFor(db.pool).writeSnapshot(input()),
      (error) => error instanceof WarehouseIdentityIngestError && error.code === "run_id_conflict",
    );
    assert.equal(names(db.calls).includes("warehouse-player-identity-upsert-players-v1"), false);
  }
});

test("rolls back facts before recording a separately sanitized failed receipt", async () => {
  const db = fakePool({ failAt: "warehouse-player-identity-promote-ids-v1" });
  await assert.rejects(
    writerFor(db.pool).writeSnapshot(input()),
    (error) => {
      assert.ok(error instanceof WarehouseIdentityIngestError);
      assert.equal(error.code, "23505");
      assert.equal(error.message, "player identity ingest failed");
      assert.doesNotMatch(error.message, /secret|private-host/);
      return true;
    },
  );
  const callNames = names(db.calls);
  assert.ok(callNames.indexOf("ROLLBACK") > callNames.indexOf("warehouse-player-identity-promote-ids-v1"));
  assert.ok(callNames.indexOf("warehouse-player-identity-failed-receipt-v1") > callNames.indexOf("ROLLBACK"));
  const failure = db.calls.find((call) => call.name === "warehouse-player-identity-failed-receipt-v1");
  assert.match(failure.text, /ON CONFLICT \(run_id, dataset\) WHERE season IS NULL DO UPDATE/);
  assert.equal(failure.values[7], "23505");
  assert.equal(failure.values[8], "player identity ingest failed");
});

test("fails closed on database identity conflicts before changing canonical tables", async () => {
  const db = fakePool({ conflicts: 1 });
  await assert.rejects(
    writerFor(db.pool).writeSnapshot(input()),
    (error) => error.code === "identity_conflict",
  );
  assert.equal(names(db.calls).includes("warehouse-player-identity-upsert-players-v1"), false);
  assert.equal(names(db.calls).includes("warehouse-player-identity-delete-gsis-v1"), false);
});

test("rejects lossy, duplicate, non-GSIS, and name-derived identity input before connecting", async () => {
  let connects = 0;
  const writer = createPlayerIdentityWriter({
    pool: { async connect() { connects += 1; throw new Error("must not connect"); } },
    minPlayerRows: 1,
  });
  await assert.rejects(writer.writeSnapshot(input({ receipt: { ...input().receipt, sourceRows: 2 } })), /counts must match/);
  await assert.rejects(writer.writeSnapshot(input({ players: [input().players[0], input().players[0]],
    playerIds: [input().playerIds[0], input().playerIds[0]],
    receipt: { ...input().receipt, sourceRows: 2 } })), /duplicate player id/);
  await assert.rejects(writer.writeSnapshot(input({ playerIds: [{ ...input().playerIds[0], provider: "pfr" }] })), /provider must be gsis/);
  await assert.rejects(writer.writeSnapshot(input({ playerIds: [{ ...input().playerIds[0], matchMethod: "name_match" }] })), /source_crosswalk/);
  await assert.rejects(writer.writeSnapshot(input({ playerIds: [{ ...input().playerIds[0], providerId: "other" }] })), /directly match/);
  await assert.rejects(writer.writeSnapshot(input({ players: [{ ...input().players[0], sourceRow: null }] })), /sourceRow must be an object/);
  await assert.rejects(writer.writeSnapshot(input({ players: [{ ...input().players[0], birthDate: "2026-02-31" }] })), /birthDate is invalid/);
  await assert.rejects(writer.writeSnapshot(input({ receipt: { ...input().receipt, sourceRef: "bad" } })), /sourceRef is invalid/);
  await assert.rejects(
    writer.writeSnapshot(input({ receipt: { ...input().receipt, sourceUrl: `${input().receipt.sourceUrl}?download=1` } })),
    /not the allowlisted players asset/,
  );
  assert.equal(connects, 0);
});

test("production default refuses a suspiciously truncated identity snapshot", async () => {
  let connects = 0;
  const writer = createPlayerIdentityWriter({
    pool: { async connect() { connects += 1; throw new Error("must not connect"); } },
  });
  await assert.rejects(writer.writeSnapshot(input()), /fewer than 1000 players/);
  assert.equal(connects, 0);
});
