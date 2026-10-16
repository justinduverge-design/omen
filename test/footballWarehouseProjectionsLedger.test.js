"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { runCurrentSeasonCommand } = require("../src/services/footballWarehouse/currentSeasonCommand");
const { createStoredProjectionReader } = require("../src/services/footballWarehouse/storedProjections");

const SEASON = 2026;
const NOW = Date.UTC(2026, 9, 11, 12, 0, 0);

// ---------- ledger version 3 (regression: applying 0005 must not break the nflverse ingest) ----------

function ledgerPool(version) {
  let calls = 0;
  return {
    on() {},
    async end() {},
    async query() {
      calls += 1;
      if (calls === 1) return { rows: [{ database_name: "omen_football", role_name: "omen_warehouse_ingest", marker_exists: true }] };
      return { rows: [{ migration_count: version, first_version: 1, schema_version: version }] };
    },
  };
}

function commandBase(calls, version) {
  return {
    argv: ["ingest", "--season", "2026"], Pool: class {}, signalSource: new EventEmitter(), output: () => {},
    parseConfig: ({ requireDatabase }) => ({ connectionString: requireDatabase ? "secret" : null, acquisitionTimeoutMs: 10, shutdownTimeoutMillis: 10, expectedDatabase: "omen_football", expectedRole: "omen_warehouse_ingest" }),
    createPool: () => ledgerPool(version),
    createIngest: () => ({ run: async () => { calls.push("facts"); return { counts: { games: 1 } }; } }),
    // verifyTarget is deliberately not injected: the real verifyWarehouseTarget runs against the fake ledger.
  };
}

test("command: the real target check lets the ingest run on a ledger holding version 2 and version 3", async () => {
  for (const version of [2, 3]) {
    const calls = [];
    const result = await runCurrentSeasonCommand({
      ...commandBase(calls, version),
      env: { FOOTBALL_WAREHOUSE_INGEST_ENABLED: "true", FOOTBALL_WAREHOUSE_PROJECTIONS_ENABLED: "true" },
      createProjections: () => ({ run: async () => ({ state: "succeeded", weeks: [] }) }),
    });
    assert.equal(result.state, "succeeded", `ledger version ${version}`);
    assert.deepEqual(calls, ["facts"]);
  }
});

test("command: an unknown ledger version still stops the ingest before any fact is written", async () => {
  const calls = [];
  await assert.rejects(runCurrentSeasonCommand({
    ...commandBase(calls, 5), env: { FOOTBALL_WAREHOUSE_INGEST_ENABLED: "true" },
  }), (error) => error.code === "warehouse_target_mismatch");
  assert.deepEqual(calls, []);
});

// ---------- read path load shape ----------

const storedRows = (n) => Array.from({ length: n }, (_, i) => ({ source_player_id: String(i), stat_line: { rec: 1 } }));
const runtimeWith = (readWeek) => ({ enabled: true, mode: "shadow", projectionRepository: { readWeek } });
const reader = ({ now, runtime }) => createStoredProjectionReader({
  env: { FOOTBALL_PROJECTIONS_STORE_READ_ENABLED: "true" }, now, getRuntime: () => runtime,
});

test("read: concurrent callers share one warehouse read and the result is kept for minutes", async () => {
  let reads = 0;
  let clock = NOW;
  const r = reader({ now: () => clock, runtime: runtimeWith(async () => { reads += 1; return { fetchedAt: new Date(NOW), rows: storedRows(80) }; }) });
  await Promise.all([1, 2, 3, 4].map(() => r.readSleeperWeek({ season: SEASON, week: 6 })));
  assert.equal(reads, 1);
  clock += 2 * 60_000;
  await r.readSleeperWeek({ season: SEASON, week: 6 });
  assert.equal(reads, 1, "still memoised after 2 minutes");
  clock += 4 * 60_000;
  await r.readSleeperWeek({ season: SEASON, week: 6 });
  assert.equal(reads, 2, "re-read after the 5 minute memo");
});

test("read: a failed read is remembered for a minute so an unhealthy warehouse is not queried per request", async () => {
  let reads = 0;
  let clock = NOW;
  const r = reader({ now: () => clock, runtime: runtimeWith(async () => { reads += 1; throw new Error("down"); }) });
  for (let i = 0; i < 5; i += 1) assert.equal(await r.readSleeperWeek({ season: SEASON, week: 6 }), null);
  assert.equal(reads, 1);
  clock += 61_000;
  await r.readSleeperWeek({ season: SEASON, week: 6 });
  assert.equal(reads, 2);
});

test("read: a memoised week that ages past the 26 hour limit stops being served", async () => {
  let clock = NOW;
  const fetchedAt = new Date(NOW - 26 * 3_600_000 + 60_000);
  const r = reader({ now: () => clock, runtime: runtimeWith(async () => ({ fetchedAt, rows: storedRows(80) })) });
  assert.notEqual(await r.readSleeperWeek({ season: SEASON, week: 6 }), null);
  clock += 3 * 60_000;
  assert.equal(await r.readSleeperWeek({ season: SEASON, week: 6 }), null);
});
