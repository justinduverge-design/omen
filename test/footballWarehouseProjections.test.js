"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const { EventEmitter } = require("node:events");

const {
  ProjectionSourceError, contentHash, createSleeperProjectionSource, normalizeRecords, projectionUrl,
} = require("../src/services/footballWarehouse/sleeperProjectionSource");
const { createProjectionWriter, ProjectionWriteError } = require("../src/services/footballWarehouse/projectionWriter");
const { createProjectionStages, weeksToFetch } = require("../src/services/footballWarehouse/projectionStages");
const { createWarehouseProjectionRepository } = require("../src/services/footballWarehouse/projectionRepository");
const { createStoredProjectionReader } = require("../src/services/footballWarehouse/storedProjections");
const { runCurrentSeasonCommand } = require("../src/services/footballWarehouse/currentSeasonCommand");
const { createWarehouseReadRuntime } = require("../src/services/footballWarehouse/readRuntime");

const SEASON = 2026;

function records(count, week = 6) {
  return Array.from({ length: count }, (_, i) => ({
    player_id: String(1000 + i), week, season: SEASON, company: "rotowire", stats: { pts_ppr: i, rec: 1, rush_yd: 2.5 },
  }));
}

// ---------- source adapter ----------

test("source: requests the regular-season projections for one week and keeps the stat line as delivered", async () => {
  const requested = [];
  const payload = [
    ...records(3),
    { player_id: "4034", week: 6, season: SEASON, company: "rotowire", stats: { pts_ppr: 18.2, adp_ppr: 12, gp: 1, rush_yd: 80 } },
    { player_id: "bad", week: 6, season: SEASON },
    { player_id: "other-week", week: 7, season: SEASON, stats: { rec: 1 } },
    { player_id: "1000", week: 6, season: SEASON, company: "rotowire", stats: { pts_ppr: 99 } },
  ];
  const body = JSON.stringify(payload);
  const source = createSleeperProjectionSource({
    fetchImpl: async (url) => {
      requested.push(url);
      return { ok: true, status: 200, headers: new Map(), arrayBuffer: async () => Buffer.from(body) };
    },
  });
  const got = await source.fetchWeek({ season: SEASON, week: 6 });
  assert.match(requested[0], /^https:\/\/api\.sleeper\.app\/projections\/nfl\/2026\/6\?season_type=regular/);
  assert.equal(got.rightsBasis, "provider_projection_permission_pending");
  assert.equal(got.source, "sleeper");
  assert.equal(got.sourceRows, payload.length);
  assert.equal(got.skipped, 2);
  assert.equal(got.duplicates, 1);
  const rb = got.records.find((r) => r.sourcePlayerId === "4034");
  assert.deepEqual(rb.statLine, { pts_ppr: 18.2, adp_ppr: 12, gp: 1, rush_yd: 80 }, "keys are kept exactly as delivered");
  assert.equal(rb.company, "rotowire");
  assert.match(got.sourceRef, /^sha256:[0-9a-f]{64}$/);
  assert.equal(got.records.find((r) => r.sourcePlayerId === "1000").statLine.pts_ppr, 99, "a later duplicate replaces an earlier one");
});

test("source: content hash ignores key order and changes with content", () => {
  const a = contentHash({ company: "rotowire", statLine: { a: 1, b: 2 } });
  assert.equal(a, contentHash({ company: "rotowire", statLine: { b: 2, a: 1 } }));
  assert.notEqual(a, contentHash({ company: "rotowire", statLine: { a: 1, b: 3 } }));
  assert.notEqual(a, contentHash({ company: null, statLine: { a: 1, b: 2 } }));
});

test("source: failures carry safe codes and never include the response", async () => {
  const mk = (fetchImpl) => createSleeperProjectionSource({ fetchImpl });
  await assert.rejects(mk(async () => { throw new Error("secret host detail"); }).fetchWeek({ season: SEASON, week: 1 }),
    (e) => e instanceof ProjectionSourceError && e.code === "source_unreachable" && !/secret/.test(e.message));
  await assert.rejects(mk(async () => ({ ok: false, status: 503, headers: new Map() })).fetchWeek({ season: SEASON, week: 1 }),
    (e) => e.code === "source_http_503");
  await assert.rejects(mk(async () => ({ ok: true, headers: new Map(), arrayBuffer: async () => Buffer.from("<html>") })).fetchWeek({ season: SEASON, week: 1 }),
    (e) => e.code === "source_shape");
  await assert.rejects(mk(async () => ({ ok: true, headers: new Map(), arrayBuffer: async () => Buffer.from("{}") })).fetchWeek({ season: SEASON, week: 1 }),
    (e) => e.code === "source_shape");
  assert.throws(() => projectionUrl(SEASON, 0));
  assert.equal(normalizeRecords([], { season: SEASON, week: 1 }).records.length, 0);
});

// ---------- writer ----------

function fakePool({ failOn } = {}) {
  const log = [];
  const client = {
    async query(request) {
      const text = typeof request === "string" ? request : request.text;
      const name = typeof request === "string" ? request : request.name || text;
      log.push(name);
      if (failOn && name === failOn) throw Object.assign(new Error("db detail with secret"), { code: "23505" });
      if (name === "warehouse-projection-receipt-v1") return { rows: [{ id: "41" }] };
      if (name === "warehouse-projection-counts-v1") return { rows: [{ inserted: 2, changed: 1, unchanged: 3, unmatched: 4 }] };
      return { rows: [] };
    },
    release(arg) { log.push(arg ? "release:destroy" : "release"); },
  };
  return { log, async connect() { return client; } };
}

function fetchedOf(count) {
  const normalized = normalizeRecords(records(count), { season: SEASON, week: 6 });
  return { source: "sleeper", season: SEASON, week: 6, rightsBasis: "provider_projection_permission_pending", sourceUrl: "https://api.sleeper.app/x", sourceRef: `sha256:${"a".repeat(64)}`, sourceBytes: 10, sourceRows: count, ...normalized };
}

test("writer: one transaction per week in lock, receipt, upsert, versions, counts order", async () => {
  const pool = fakePool();
  const result = await createProjectionWriter({ pool }).writeWeek({ runId: "r1", fetched: fetchedOf(60) });
  assert.deepEqual(pool.log.filter((n) => n.startsWith("warehouse-projection") || ["BEGIN", "COMMIT"].includes(n)), [
    "BEGIN", "warehouse-projection-lock-v1", "warehouse-projection-receipt-v1", "warehouse-projection-upsert-v1",
    "warehouse-projection-versions-v1", "warehouse-projection-counts-v1", "warehouse-projection-receipt-counts-v1", "COMMIT",
  ]);
  assert.equal(result.state, "succeeded");
  assert.deepEqual([result.inserted, result.changed, result.unchanged, result.unmatched], [2, 1, 3, 4]);
});

test("writer: a database error rolls back, leaves a failed receipt, and exposes only a code", async () => {
  const pool = fakePool({ failOn: "warehouse-projection-upsert-v1" });
  await assert.rejects(createProjectionWriter({ pool }).writeWeek({ runId: "r2", fetched: fetchedOf(60) }),
    (e) => e instanceof ProjectionWriteError && e.code === "23505" && !/secret/.test(e.message));
  assert.ok(pool.log.includes("ROLLBACK"));
  assert.ok(pool.log.includes("warehouse-projection-failure-v1"));
  assert.ok(!pool.log.includes("COMMIT") || pool.log.indexOf("ROLLBACK") < pool.log.lastIndexOf("COMMIT"));
});

test("writer: a truncated source is refused with a failed receipt and no write", async () => {
  const pool = fakePool();
  await assert.rejects(createProjectionWriter({ pool }).writeWeek({ runId: "r3", fetched: fetchedOf(5) }), (e) => e.code === "source_too_small");
  assert.ok(!pool.log.includes("warehouse-projection-upsert-v1"));
  assert.ok(pool.log.includes("warehouse-projection-failure-v1"));
});

// ---------- stage ----------

const weekContext = (week, season = SEASON, raw = week) => () => ({ season, week, raw_week: raw });

test("stage: current week plus the next two, none outside the live season", () => {
  assert.deepEqual(weeksToFetch({ season: SEASON, weekContext: weekContext(6) }), [6, 7, 8]);
  assert.deepEqual(weeksToFetch({ season: SEASON, weekContext: weekContext(17) }), [17, 18]);
  assert.deepEqual(weeksToFetch({ season: SEASON, weekContext: weekContext(18, SEASON, 20) }), []);
  assert.deepEqual(weeksToFetch({ season: 2025, weekContext: weekContext(6) }), []);
});

function stageHarness({ failWeeks = new Set(), writerFails = new Set(), env = {}, mode = "report" } = {}) {
  const fetched = [];
  const written = [];
  const failures = [];
  const stages = createProjectionStages({
    mode, env, weekContext: weekContext(6),
    source: { async fetchWeek({ season, week }) {
      fetched.push(week);
      if (failWeeks.has(week)) throw Object.assign(new Error("boom"), { code: "source_http_503" });
      return { ...fetchedOf(60), season, week };
    } },
    writer: {
      async writeWeek({ fetched: f }) {
        if (writerFails.has(f.week)) throw Object.assign(new Error("w"), { code: "projection_write_failed" });
        written.push(f.week);
        return { state: "succeeded", inserted: 60, changed: 0, unchanged: 0, unmatched: 3 };
      },
      async recordFailure(row) { failures.push(row); },
    },
  });
  return { stages, fetched, written, failures };
}

test("stage: a week that fails does not stop the other weeks, and report mode never throws", async () => {
  const h = stageHarness({ failWeeks: new Set([7]) });
  const out = await h.stages.run({ season: SEASON });
  assert.equal(out.state, "partial");
  assert.deepEqual(out.weeks.map((w) => [w.week, w.state]), [[6, "succeeded"], [7, "failed"], [8, "succeeded"]]);
  assert.equal(out.weeks[1].code, "source_http_503");
  assert.deepEqual(h.written, [6, 8]);
  assert.equal(h.failures.length, 1, "a fetch failure before the writer gets its own receipt");
});

test("stage: every week failing is a failed result, not an exception, in report mode", async () => {
  const h = stageHarness({ failWeeks: new Set([6, 7, 8]) });
  const out = await h.stages.run({ season: SEASON });
  assert.equal(out.state, "failed");
});

test("stage: strict mode throws a coded error after trying every week", async () => {
  const h = stageHarness({ writerFails: new Set([6]), mode: "strict" });
  await assert.rejects(h.stages.run({ season: SEASON }), (e) => e.code === "projections_projection_write_failed");
  assert.deepEqual(h.fetched, [6, 7, 8]);
});

test("stage: the kill switch stops it before any fetch", async () => {
  const h = stageHarness({ env: { FOOTBALL_PROJECTIONS_DISABLED: "1" } });
  assert.deepEqual(await h.stages.run({ season: SEASON }), { state: "disabled", weeks: [] });
  assert.deepEqual(h.fetched, []);
});

function commandBase(calls) {
  return {
    argv: ["ingest", "--season", "2026"], Pool: class {}, signalSource: new EventEmitter(),
    parseConfig: ({ requireDatabase }) => ({ connectionString: requireDatabase ? "secret" : null, acquisitionTimeoutMs: 10, shutdownTimeoutMillis: 10, expectedDatabase: "omen_football", expectedRole: "omen_warehouse_ingest" }),
    createPool: () => ({ on() {}, async end() {} }), verifyTarget: async () => {},
    createIngest: () => ({ run: async () => { calls.push("facts"); return { counts: { games: 1 } }; } }),
  };
}

test("command: projections run only when opted in, after the facts", async () => {
  const calls = [];
  const base = { ...commandBase(calls), createProjections: () => ({ run: async ({ season }) => { calls.push(`projections:${season}`); return { state: "succeeded", weeks: [] }; } }) };
  const off = await runCurrentSeasonCommand({ ...base, env: { FOOTBALL_WAREHOUSE_INGEST_ENABLED: "true" }, output: () => {} });
  assert.equal(off.projections, undefined);
  assert.deepEqual(calls, ["facts"]);
  calls.length = 0;
  const on = await runCurrentSeasonCommand({ ...base, env: { FOOTBALL_WAREHOUSE_INGEST_ENABLED: "true", FOOTBALL_WAREHOUSE_PROJECTIONS_ENABLED: "true" }, output: () => {} });
  assert.deepEqual(calls, ["facts", "projections:2026"]);
  assert.equal(on.projections.state, "succeeded");
});

test("command: a projections stage that throws never fails the ingest", async () => {
  const calls = [];
  const out = [];
  const result = await runCurrentSeasonCommand({
    ...commandBase(calls),
    env: { FOOTBALL_WAREHOUSE_INGEST_ENABLED: "true", FOOTBALL_WAREHOUSE_PROJECTIONS_ENABLED: "true" },
    output: (row) => out.push(row),
    createProjections: () => ({ run: async () => { throw Object.assign(new Error("secret"), { code: "projection_exploded" }); } }),
  });
  assert.equal(result.state, "succeeded");
  assert.deepEqual(result.projections, { state: "failed", code: "projection_exploded" });
  assert.equal(out.at(-1).state, "succeeded");
  assert.equal(JSON.stringify(out).includes("secret"), false);
});

test("command: even a failure constructing the stage is isolated", async () => {
  const result = await runCurrentSeasonCommand({
    ...commandBase([]), env: { FOOTBALL_WAREHOUSE_INGEST_ENABLED: "true", FOOTBALL_WAREHOUSE_PROJECTIONS_ENABLED: "true" }, output: () => {},
    createProjections: () => { throw new Error("constructor failed"); },
  });
  assert.equal(result.state, "succeeded");
  assert.equal(result.projections.state, "failed");
});

// ---------- read path ----------

function runtimeWith(readWeek, mode = "shadow") {
  return { enabled: true, mode, projectionRepository: { readWeek } };
}
const NOW = Date.UTC(2026, 9, 11, 12, 0, 0);
const storedRows = (n) => Array.from({ length: n }, (_, i) => ({ source_player_id: String(i), stat_line: { rec: 1, pts_ppr: i } }));
const ON = { FOOTBALL_PROJECTIONS_STORE_READ_ENABLED: "true" };

function reader({ env = ON, runtime, now = () => NOW }) {
  return createStoredProjectionReader({ env, now, getRuntime: () => runtime });
}

test("read: serves a fresh stored week", async () => {
  const fetchedAt = new Date(NOW - 3 * 3_600_000);
  const got = await reader({ runtime: runtimeWith(async () => ({ fetchedAt, rows: storedRows(80) })) }).readSleeperWeek({ season: SEASON, week: 6 });
  assert.equal(got.rows.length, 80);
  assert.equal(got.ageMs, 3 * 3_600_000);
});

test("read: missing, stale, incomplete and failing reads all return null (caller falls back to live)", async () => {
  const read = (runtime, env = ON) => reader({ env, runtime }).readSleeperWeek({ season: SEASON, week: 6 });
  assert.equal(await read(runtimeWith(async () => null)), null, "missing");
  assert.equal(await read(runtimeWith(async () => ({ fetchedAt: new Date(NOW - 40 * 3_600_000), rows: storedRows(80) }))), null, "older than 36h");
  assert.notEqual(await read(runtimeWith(async () => ({ fetchedAt: new Date(NOW - 40 * 3_600_000), rows: storedRows(80) })), { ...ON, FOOTBALL_PROJECTIONS_MAX_AGE_HOURS: "48" }), null, "threshold is configurable");
  assert.equal(await read(runtimeWith(async () => ({ fetchedAt: new Date(NOW), rows: storedRows(10) }))), null, "incomplete week");
  assert.equal(await read(runtimeWith(async () => { throw new Error("db down"); })), null, "query failure");
  assert.equal(await read(runtimeWith(async () => ({ fetchedAt: new Date(NOW + 3_600_000), rows: storedRows(80) }))), null, "fetched in the future is untrusted");
});

test("read: off by default, off in supabase mode, off under the kill switch, off with no runtime", async () => {
  let reads = 0;
  const repo = async () => { reads += 1; return { fetchedAt: new Date(NOW), rows: storedRows(80) }; };
  const read = (opts) => reader(opts).readSleeperWeek({ season: SEASON, week: 6 });
  assert.equal(await read({ env: {}, runtime: runtimeWith(repo) }), null);
  assert.equal(await read({ runtime: runtimeWith(repo, "supabase") }), null);
  assert.equal(await read({ env: { ...ON, FOOTBALL_PROJECTIONS_DISABLED: "1" }, runtime: runtimeWith(repo) }), null);
  assert.equal(await read({ runtime: null }), null);
  assert.equal(await read({ runtime: { enabled: false, mode: "shadow", projectionRepository: null } }), null);
  assert.equal(reads, 0, "no warehouse read happened under any of those gates");
  assert.notEqual(await read({ runtime: runtimeWith(repo, "warehouse") }), null);
});

test("read: the repository selects the latest fetch of one source-week and rejects bad input", async () => {
  const calls = [];
  const repo = createWarehouseProjectionRepository({ query: async (request) => { calls.push(request); return { rows: [{ source_player_id: 4034, stat_line: { rec: 1 }, fetched_at: "2026-10-11T06:00:00Z" }] }; } });
  const got = await repo.readWeek({ source: "sleeper", season: SEASON, week: 6 });
  assert.deepEqual(got.rows, [{ source_player_id: "4034", stat_line: { rec: 1 } }]);
  assert.deepEqual(calls[0].values, ["sleeper", SEASON, 6]);
  assert.match(calls[0].text, /max\(latest\.fetched_at\)/);
  assert.equal(await createWarehouseProjectionRepository({ query: async () => ({ rows: [] }) }).readWeek({ source: "sleeper", season: SEASON, week: 6 }), null);
  await assert.rejects(repo.readWeek({ source: "rotowire", season: SEASON, week: 6 }), TypeError);
  await assert.rejects(repo.readWeek({ source: "sleeper", season: SEASON, week: 0 }), TypeError);
});

test("read: the warehouse read runtime exposes the projection repository, and is null where the warehouse is off", () => {
  const off = createWarehouseReadRuntime({ env: { FOOTBALL_DATA_MODE: "supabase" } });
  assert.equal(off.projectionRepository, null);
});

// ---------- adapter integration: stored first, live as the fallback ----------

function loadAdapter({ readSleeperWeek, liveBody }) {
  const adapterPath = require.resolve("../src/adapters/sleeper");
  const storedPath = require.resolve("../src/services/footballWarehouse/storedProjections");
  delete require.cache[adapterPath];
  delete process.env.REDIS_URL;
  delete process.env.REDIS_TOKEN;
  const stored = require(storedPath);
  const original = stored.getStoredProjectionReader;
  stored.getStoredProjectionReader = () => ({ readSleeperWeek });
  const live = [];
  const originalLoad = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === "axios" && parent?.filename === adapterPath) {
      return { get: async (url) => { live.push(url); return { data: liveBody }; } };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return { adapter: require(adapterPath), live, restore: () => { stored.getStoredProjectionReader = original; } };
  } finally {
    Module._load = originalLoad;
  }
}

const liveBody = [{ player_id: "live-1", stats: { pts_ppr: 11, rec: 5 } }];

test("adapter: a fresh stored week replaces the live fetch for both points and stat lines", async () => {
  const rows = [
    { source_player_id: "4034", stat_line: { pts_ppr: 18.2, rush_yd: 80, adp_ppr: 9, gp: 1 } },
    { source_player_id: "BUF", stat_line: { pts_ppr: 7, sack: 2 } },
  ];
  const h = loadAdapter({ readSleeperWeek: async () => ({ rows, fetchedAt: new Date(), ageMs: 0 }), liveBody });
  try {
    assert.deepEqual(await h.adapter.fetchSleeperProjections(SEASON, 6), { 4034: 18.2, BUF: 7 });
    assert.deepEqual(await h.adapter.fetchSleeperProjectionStatLines(SEASON, 6), { 4034: { pts_ppr: 18.2, rush_yd: 80 }, BUF: { pts_ppr: 7, sack: 2 } });
    assert.deepEqual(h.live, [], "no live request was made");
  } finally { h.restore(); }
});

test("adapter: a missing, stale or failing stored week falls back to the live fetch", async () => {
  for (const readSleeperWeek of [async () => null, async () => { throw new Error("db down"); }]) {
    const h = loadAdapter({ readSleeperWeek, liveBody });
    try {
      assert.deepEqual(await h.adapter.fetchSleeperProjections(SEASON, 6), { "live-1": 11 });
      assert.equal(h.live.length, 1);
    } finally { h.restore(); }
  }
});
