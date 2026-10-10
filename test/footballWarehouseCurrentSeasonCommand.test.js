"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { parseArgs, runCurrentSeasonCommand } = require("../src/services/footballWarehouse/currentSeasonCommand");

function config(requireDatabase) {
  return { connectionString: requireDatabase ? "secret" : null, acquisitionTimeoutMs: 10, shutdownTimeoutMillis: 10, expectedDatabase: "omen_football", expectedRole: "omen_warehouse_ingest" };
}

test("defaults to configuration validation and performs no network or database work", async () => {
  const output = [];
  const got = await runCurrentSeasonCommand({
    argv: [], env: {}, Pool: class { constructor() { throw new Error("pool constructed"); } },
    output: (row) => output.push(row),
    parseConfig: ({ requireDatabase }) => config(requireDatabase),
    createValidation: () => { throw new Error("source validation constructed"); },
  });
  assert.deepEqual(got, { job: "football-warehouse-current-season", mode: "config", state: "validated" });
  assert.deepEqual(output, [got]);
});

test("strictly parses modes and explicit seasons", () => {
  assert.deepEqual(parseArgs(["source-validate", "--season", "2026"]), { mode: "source-validate", season: 2026 });
  assert.deepEqual(parseArgs(["ingest", "--season", "1999"]), { mode: "ingest", season: 1999 });
  for (const argv of [["write", "--season", "2026"], ["ingest"], ["ingest", "--season=2026"], ["ingest", "--season", "2026", "extra"]]) {
    assert.throws(() => parseArgs(argv));
  }
});

test("source validation constructs no pool and returns sanitized evidence", async () => {
  const output = [];
  const summary = { mode: "validate", season: 2026, counts: { games: 240 }, sourceRefs: { schedules: "sha256:abc" } };
  const got = await runCurrentSeasonCommand({
    argv: ["source-validate", "--season", "2026"], env: {}, Pool: class { constructor() { throw new Error("pool constructed"); } },
    output: (row) => output.push(row), parseConfig: ({ requireDatabase }) => config(requireDatabase),
    createValidation: () => ({ run: async (input) => { assert.equal(input.mode, "validate"); return summary; } }),
  });
  assert.deepEqual(got, { job: "football-warehouse-current-season", state: "validated", ...summary });
  assert.deepEqual(output, [got]);
});

test("ingest requires an exact activation value before pool construction", async () => {
  const output = [];
  await assert.rejects(runCurrentSeasonCommand({
    argv: ["ingest", "--season", "2026"], env: { FOOTBALL_WAREHOUSE_INGEST_ENABLED: "TRUE" }, Pool: class {},
    output: (row) => output.push(row), parseConfig: ({ requireDatabase }) => config(requireDatabase),
    createPool: () => { throw new Error("pool constructed"); },
  }), (error) => error.code === "ingest_disabled");
  assert.deepEqual(output[0], { job: "football-warehouse-current-season", mode: "ingest", season: 2026, state: "failed", code: "ingest_disabled" });
});

test("ingest verifies its target, runs once, and drains the pool exactly once", async () => {
  const events = [], signalSource = new EventEmitter();
  const pool = Object.assign(new EventEmitter(), { end: async () => events.push("pool:end") });
  const got = await runCurrentSeasonCommand({
    argv: ["ingest", "--season", "2026"], env: { FOOTBALL_WAREHOUSE_INGEST_ENABLED: "true" }, Pool: class {}, signalSource,
    output: () => {}, parseConfig: ({ requireDatabase }) => config(requireDatabase), createPool: () => pool,
    verifyTarget: async () => events.push("target"),
    createIngest: () => ({ run: async ({ mode, signal }) => { events.push(`run:${mode}`); assert.ok(signal instanceof AbortSignal); return { mode, season: 2026, stages: {} }; } }),
  });
  assert.equal(got.state, "succeeded");
  assert.deepEqual(events, ["target", "run:ingest", "pool:end"]);
  assert.equal(signalSource.listenerCount("SIGTERM"), 0);
});

test("a signal aborts an active run, reports failure, and then drains the pool", async () => {
  const events = [], output = [], signalSource = new EventEmitter();
  const pool = Object.assign(new EventEmitter(), { end: async () => events.push("pool:end") });
  await assert.rejects(runCurrentSeasonCommand({
    argv: ["ingest", "--season", "2026"], env: { FOOTBALL_WAREHOUSE_INGEST_ENABLED: "true" }, Pool: class {}, signalSource,
    output: (row) => output.push(row), parseConfig: ({ requireDatabase }) => config(requireDatabase), createPool: () => pool,
    verifyTarget: async () => {}, createIngest: () => ({ run: ({ signal }) => new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => { events.push("aborted"); reject(Object.assign(new Error("secret must not log"), { name: "AbortError" })); }, { once: true });
      signalSource.emit("SIGTERM");
    }) }),
  }));
  assert.deepEqual(events, ["aborted", "pool:end"]);
  assert.equal(JSON.stringify(output).includes("secret must not log"), false);
  assert.equal(output[0].code, "warehouse_command_failed");
});

test("a pool error requests cancellation without emitting the raw error", async () => {
  const output = [], signalSource = new EventEmitter();
  const pool = Object.assign(new EventEmitter(), { end: async () => {} });
  await assert.rejects(runCurrentSeasonCommand({
    argv: ["ingest", "--season", "2026"], env: { FOOTBALL_WAREHOUSE_INGEST_ENABLED: "true" }, Pool: class {}, signalSource,
    output: (row) => output.push(row), parseConfig: ({ requireDatabase }) => config(requireDatabase), createPool: () => pool,
    verifyTarget: async () => {}, createIngest: () => ({ run: ({ signal }) => new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      pool.emit("error", new Error("postgres://user:password@host/db"));
    }) }),
  }));
  assert.equal(JSON.stringify(output).includes("password"), false);
});

test("a stuck pool drain is bounded and fails with a safe code", async () => {
  const signalSource = new EventEmitter();
  const pool = Object.assign(new EventEmitter(), { end: async () => new Promise(() => {}) });
  await assert.rejects(runCurrentSeasonCommand({
    argv: ["ingest", "--season", "2026"], env: { FOOTBALL_WAREHOUSE_INGEST_ENABLED: "true" }, Pool: class {}, signalSource,
    output: () => {}, parseConfig: ({ requireDatabase }) => ({ ...config(requireDatabase), shutdownTimeoutMillis: 5 }), createPool: () => pool,
    verifyTarget: async () => {}, createIngest: () => ({ run: async () => ({ mode: "ingest", season: 2026, stages: {} }) }),
  }), (error) => error.code === "shutdown_timeout");
});

test("derived stages run only when explicitly enabled, after the facts, and report counts only", async () => {
  const calls = [];
  const base = {
    argv: ["ingest", "--season", "2026"], Pool: class { on() {} async end() {} }, signalSource: new EventEmitter(),
    parseConfig: ({ requireDatabase }) => config(requireDatabase), createPool: () => ({ on() {}, async end() {} }),
    verifyTarget: async () => {},
    createIngest: () => ({ run: async () => { calls.push("facts"); return { counts: { games: 1 } }; } }),
    createDerived: () => ({ run: async ({ season }) => { calls.push(`derived:${season}`); return { opportunity: { state: "succeeded", writtenRows: 3 }, ratQb: { state: "unchanged", valueCount: null } }; } }),
  };
  const off = await runCurrentSeasonCommand({ ...base, env: { FOOTBALL_WAREHOUSE_INGEST_ENABLED: "true" }, output: () => {} });
  assert.equal(off.derived, undefined);
  assert.deepEqual(calls, ["facts"]);
  calls.length = 0;
  const on = await runCurrentSeasonCommand({ ...base, env: { FOOTBALL_WAREHOUSE_INGEST_ENABLED: "true", FOOTBALL_WAREHOUSE_DERIVED_ENABLED: "true" }, output: () => {} });
  assert.deepEqual(calls, ["facts", "derived:2026"]);
  assert.deepEqual(on.derived.opportunity, { state: "succeeded", writtenRows: 3 });
});

test("a derived stage failure is a coded failure after facts commit", async () => {
  const out = [];
  await assert.rejects(runCurrentSeasonCommand({
    argv: ["ingest", "--season", "2026"], env: { FOOTBALL_WAREHOUSE_INGEST_ENABLED: "true", FOOTBALL_WAREHOUSE_DERIVED_ENABLED: "true" },
    Pool: class {}, signalSource: new EventEmitter(), output: (row) => out.push(row),
    parseConfig: ({ requireDatabase }) => config(requireDatabase), createPool: () => ({ on() {}, async end() {} }),
    verifyTarget: async () => {}, createIngest: () => ({ run: async () => ({ counts: {} }) }),
    createDerived: () => ({ run: async () => { throw Object.assign(new Error("x"), { code: "derived_opportunity_stats_missing" }); } }),
  }), (error) => error.code === "derived_opportunity_stats_missing");
  assert.equal(out.at(-1).state, "failed");
  assert.equal(out.at(-1).code, "derived_opportunity_stats_missing");
});
