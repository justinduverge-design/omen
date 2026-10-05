"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createCurrentSeasonIngest,
  CurrentSeasonIngestError,
  runIdFor,
} = require("../src/services/footballWarehouse/currentSeasonIngest");

function fixture(overrides = {}) {
  const calls = [];
  const map = new Map([["00-1", "omen:player:one"]]);
  const raw = {
    schedules: Buffer.from("schedules"),
    players: Buffer.from("players"),
    weekly: Buffer.from("weekly"),
  };
  const receipt = (runId, sourceRef) => ({ runId, sourceRef, sourceUrl: "https://example.invalid/source" });
  const dependencies = {
    acquireSchedules: async ({ signal }) => { calls.push(["acquireSchedules", signal]); return { raw: raw.schedules, sourceUrl: "schedule-url" }; },
    acquirePlayers: async ({ signal }) => { calls.push(["acquirePlayers", signal]); return { raw: raw.players, sourceUrl: "players-url" }; },
    acquirePlayerWeekly: async ({ season, signal }) => { calls.push(["acquireWeekly", season, signal]); return { raw: raw.weekly, sourceUrl: "weekly-url" }; },
    adaptSchedules: (input) => { calls.push(["adaptSchedules", input]); return { receipt: receipt(input.runId, "schedule-ref"), teamRows: ["team"], gameRows: ["game"] }; },
    adaptPlayers: (input) => { calls.push(["adaptPlayers", input]); return { receipt: receipt(input.runId, "players-ref"), players: ["player"], playerIds: ["id"], playerIdByGsis: map }; },
    adaptPlayerWeekly: (input) => { calls.push(["adaptWeekly", input]); return { receipt: receipt(input.runId, "weekly-ref"), rows: ["week"], unmatchedRows: 2 }; },
    teamWriter: { writeSnapshot: async (input) => { calls.push(["writeTeams", input]); return { state: "succeeded", writtenTeams: 32 }; } },
    scheduleWriter: { writeSeason: async (input) => { calls.push(["writeSchedules", input]); return { state: "succeeded", writtenGames: 240 }; } },
    playerWriter: { writeSnapshot: async (input) => { calls.push(["writePlayers", input]); return { state: "succeeded", writtenPlayers: 1 }; } },
    playerWeeklyWriter: { writeSeason: async (input) => { calls.push(["writeWeekly", input]); return { state: "succeeded", writtenRows: 1 }; } },
    ...overrides,
  };
  return { runner: createCurrentSeasonIngest(dependencies), dependencies, calls, map, raw };
}

test("derives stable dataset-scoped run ids from exact bytes", () => {
  const raw = Buffer.from("same exact bytes");
  const one = runIdFor({ dataset: "schedules", season: 2026, raw });
  assert.equal(one, runIdFor({ dataset: "schedules", season: 2026, raw }));
  assert.notEqual(one, runIdFor({ dataset: "teams", season: 2026, raw }));
  assert.notEqual(one, runIdFor({ dataset: "schedules", season: 2025, raw }));
  assert.match(one, /^omen-fw:schedules:2026:[0-9a-f]{32}$/);
  assert.ok(one.length <= 128);
});

test("acquires all sources, validates all adapters, then writes in dependency order", async () => {
  const f = fixture();
  const result = await f.runner.run({ season: 2026 });
  assert.deepEqual(f.calls.map((call) => call[0]), [
    "acquireSchedules", "acquirePlayers", "acquireWeekly",
    "adaptSchedules", "adaptPlayers", "adaptWeekly",
    "writeTeams", "writeSchedules", "writePlayers", "writeWeekly",
  ]);
  const signals = f.calls.slice(0, 3).map((call) => call.at(-1));
  assert.ok(signals.every((signal) => signal instanceof AbortSignal && signal === signals[0]));
  assert.equal(f.calls.find((call) => call[0] === "adaptWeekly")[1].playerIdByGsis, f.map);
  assert.equal(f.calls.find((call) => call[0] === "writeTeams")[1].receipt.runId,
    runIdFor({ dataset: "teams", season: 2026, raw: f.raw.schedules }));
  assert.equal(result.unmatchedRows, 2);
  assert.deepEqual(result.sourceRefs, { schedules: "schedule-ref", players: "players-ref", playerWeekly: "weekly-ref" });
  assert.equal(JSON.stringify(result).includes("sourceRow"), false);
  assert.equal(JSON.stringify(result).includes("same exact bytes"), false);
});

test("validates configuration and already-aborted callers before I/O", async () => {
  assert.throws(() => createCurrentSeasonIngest(), /must be a function/);
  const f = fixture();
  await assert.rejects(f.runner.run({ season: 1998 }), /1999 through 2100/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(f.runner.run({ season: 2026, signal: controller.signal }), { name: "AbortError" });
  assert.equal(f.calls.length, 0);
});

test("validate mode completes every source validation without writing", async () => {
  const f = fixture();
  const result = await f.runner.run({ season: 2026, mode: "validate" });
  assert.deepEqual(f.calls.map((call) => call[0]), [
    "acquireSchedules", "acquirePlayers", "acquireWeekly",
    "adaptSchedules", "adaptPlayers", "adaptWeekly",
  ]);
  assert.deepEqual(result, {
    mode: "validate",
    season: 2026,
    counts: { teams: 1, games: 1, players: 1, playerWeeks: 1, unmatchedRows: 2 },
    sourceRefs: { schedules: "schedule-ref", players: "players-ref", playerWeekly: "weekly-ref" },
  });
});

test("rejects an unknown mode before acquisition", async () => {
  const f = fixture();
  await assert.rejects(f.runner.run({ season: 2026, mode: "write" }), /mode must be ingest or validate/);
  assert.equal(f.calls.length, 0);
});

test("an adapter failure causes zero writes", async () => {
  const f = fixture({ adaptPlayerWeekly: () => { throw new Error("bad weekly CSV"); } });
  await assert.rejects(f.runner.run({ season: 2026 }), /bad weekly CSV/);
  assert.equal(f.calls.some((call) => call[0].startsWith("write")), false);
});

test("a writer failure stops every later stage", async () => {
  const f = fixture({ scheduleWriter: { writeSeason: async () => { f.calls.push(["writeSchedules"]); throw new Error("schedule refused"); } } });
  await assert.rejects(f.runner.run({ season: 2026 }), /schedule refused/);
  assert.deepEqual(f.calls.filter((call) => call[0].startsWith("write")).map((call) => call[0]), ["writeTeams", "writeSchedules"]);
});

test("an acquisition failure aborts and drains sibling acquisitions before any adaptation", async () => {
  let observedAbort = false;
  const waits = ({ signal }) => new Promise((resolve, reject) => signal.addEventListener("abort", () => {
    observedAbort = true; reject(Object.assign(new Error("aborted sibling"), { name: "AbortError" }));
  }, { once: true }));
  const f = fixture({
    acquireSchedules: waits,
    acquirePlayers: async () => { throw new Error("players unavailable"); },
    acquirePlayerWeekly: waits,
  });
  await assert.rejects(f.runner.run({ season: 2026 }), /players unavailable/);
  assert.equal(observedAbort, true);
  assert.equal(f.calls.some((call) => call[0].startsWith("adapt") || call[0].startsWith("write")), false);
});

test("the acquisition deadline aborts pending sources and writes nothing", async () => {
  const waits = ({ signal }) => new Promise((resolve, reject) => signal.addEventListener("abort", () =>
    reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true }));
  const base = fixture();
  const runner = createCurrentSeasonIngest({
    ...base.dependencies,
    acquireSchedules: waits, acquirePlayers: waits, acquirePlayerWeekly: waits,
    acquisitionTimeoutMs: 5,
  });
  await assert.rejects(runner.run({ season: 2026 }), (error) =>
    error instanceof CurrentSeasonIngestError && error.code === "acquisition_timeout");
  assert.equal(base.calls.some((call) => call[0].startsWith("write")), false);
});

test("the acquisition deadline returns even when a source ignores cancellation", async () => {
  const never = async () => new Promise(() => {});
  const base = fixture();
  const runner = createCurrentSeasonIngest({
    ...base.dependencies,
    acquireSchedules: never, acquirePlayers: never, acquirePlayerWeekly: never,
    acquisitionTimeoutMs: 5,
  });
  const started = Date.now();
  await assert.rejects(runner.run({ season: 2026 }), (error) => error.code === "acquisition_timeout");
  assert.ok(Date.now() - started < 500);
});

test("caller abort returns promptly when an acquisition ignores cancellation", async () => {
  const never = async () => new Promise(() => {});
  const base = fixture();
  const runner = createCurrentSeasonIngest({
    ...base.dependencies,
    acquireSchedules: never, acquirePlayers: never, acquirePlayerWeekly: never,
    acquisitionTimeoutMs: 10_000,
  });
  const controller = new AbortController();
  const running = runner.run({ season: 2026, signal: controller.signal });
  controller.abort();
  const started = Date.now();
  await assert.rejects(running, { name: "AbortError" });
  assert.ok(Date.now() - started < 500);
});

test("caller cancellation between committed stages prevents every later stage", async () => {
  const controller = new AbortController();
  const f = fixture({
    teamWriter: { writeSnapshot: async (input) => {
      f.calls.push(["writeTeams", input]);
      controller.abort();
      return { state: "succeeded", writtenTeams: 32 };
    } },
  });
  await assert.rejects(f.runner.run({ season: 2026, signal: controller.signal }), { name: "AbortError" });
  assert.deepEqual(f.calls.filter((call) => call[0].startsWith("write")).map((call) => call[0]), ["writeTeams"]);
});
