"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

const cache = require("../src/services/responseCache");

function freshStore() {
  const store = cache.createMemoryResponseCacheStore();
  cache.setStoreForTests(store);
  return store;
}

test.afterEach(() => cache.setStoreForTests(undefined));

// --- Unit: the store contract -------------------------------------------------

test("a stored answer is replayed for the same user and inputs", async () => {
  freshStore();
  const first = await cache.lookup({ route: "waiver_analysis", userId: "u1", parts: { league: "L1", week: 7 } });
  assert.equal(first.hit, false);
  assert.equal(await cache.store(first, 200, { n: 1 }, { cache: true }), true);
  const second = await cache.lookup({ route: "waiver_analysis", userId: "u1", parts: { week: 7, league: "L1" } });
  assert.equal(second.hit, true);
  assert.deepEqual(second.body, { n: 1 });
  assert.equal(second.status, 200);
});

test("two users with the same league and week never share an entry", async () => {
  freshStore();
  const parts = { platform: "sleeper", league_id: "L1", week: 7 };
  const a = await cache.lookup({ route: "waiver_analysis", userId: "user-a", parts });
  await cache.store(a, 200, { owner: "a" }, { cache: true });
  const b = await cache.lookup({ route: "waiver_analysis", userId: "user-b", parts });
  assert.equal(b.hit, false);
  await cache.store(b, 200, { owner: "b" }, { cache: true });
  assert.deepEqual((await cache.lookup({ route: "waiver_analysis", userId: "user-a", parts })).body, { owner: "a" });
  assert.deepEqual((await cache.lookup({ route: "waiver_analysis", userId: "user-b", parts })).body, { owner: "b" });
});

test("the same user in two leagues, weeks, contracts or routes gets separate entries", async () => {
  freshStore();
  const write = async (route, parts, body) => cache.store(await cache.lookup({ route, userId: "u1", parts }), 200, body, { cache: true });
  await write("waiver_analysis", { league_id: "L1", week: 7 }, { v: "L1w7" });
  await write("waiver_analysis", { league_id: "L2", week: 7 }, { v: "L2w7" });
  await write("waiver_analysis", { league_id: "L1", week: 8 }, { v: "L1w8" });
  await write("league_overview", { league_id: "L1", week: 7 }, { v: "overview" });
  const read = async (route, parts) => (await cache.lookup({ route, userId: "u1", parts })).body;
  assert.deepEqual(await read("waiver_analysis", { league_id: "L1", week: 7 }), { v: "L1w7" });
  assert.deepEqual(await read("waiver_analysis", { league_id: "L2", week: 7 }), { v: "L2w7" });
  assert.deepEqual(await read("waiver_analysis", { league_id: "L1", week: 8 }), { v: "L1w8" });
  assert.deepEqual(await read("league_overview", { league_id: "L1", week: 7 }), { v: "overview" });
});

test("invalidateUser orphans that user's entries only", async () => {
  freshStore();
  const put = async (userId) => cache.store(await cache.lookup({ route: "quiet_week", userId, parts: {} }), 200, { userId }, { cache: true });
  await put("u1");
  await put("u2");
  assert.equal(await cache.invalidateUser("u1"), true);
  assert.equal((await cache.lookup({ route: "quiet_week", userId: "u1", parts: {} })).hit, false);
  assert.equal((await cache.lookup({ route: "quiet_week", userId: "u2", parts: {} })).hit, true);
});

test("a write by a request that started before an invalidation cannot repopulate the cache", async () => {
  freshStore();
  const inFlight = await cache.lookup({ route: "quiet_week", userId: "u1", parts: {} });
  await cache.invalidateUser("u1");
  await cache.store(inFlight, 200, { stale: true }, { cache: true });
  assert.equal((await cache.lookup({ route: "quiet_week", userId: "u1", parts: {} })).hit, false);
});

test("non-2xx responses and cache:false verdicts are never stored", async () => {
  freshStore();
  for (const status of [400, 401, 404, 500, 502, 503]) {
    const handle = await cache.lookup({ route: "quiet_week", userId: "u1", parts: { status } });
    assert.equal(await cache.store(handle, status, { error: "x" }, { cache: true }), false);
    assert.equal((await cache.lookup({ route: "quiet_week", userId: "u1", parts: { status } })).hit, false);
  }
  const handle = await cache.lookup({ route: "quiet_week", userId: "u1", parts: {} });
  assert.equal(await cache.store(handle, 200, { ok: 1 }, { cache: false }), false);
});

test("TTL: route default is 60 s, env overrides it, 0 turns the route off, degraded answers are capped", async () => {
  const saved = process.env.OMEN_CACHE_TTL_QUIET_WEEK;
  try {
    delete process.env.OMEN_CACHE_TTL_QUIET_WEEK;
    for (const route of Object.keys(cache.ROUTE_TTL_SECONDS)) assert.equal(cache.ROUTE_TTL_SECONDS[route](), 60);
    process.env.OMEN_CACHE_TTL_QUIET_WEEK = "90";
    assert.equal(cache.ROUTE_TTL_SECONDS.quiet_week(), 90);
    process.env.OMEN_CACHE_TTL_QUIET_WEEK = "0";
    freshStore();
    const off = await cache.lookup({ route: "quiet_week", userId: "u1", parts: {} });
    assert.equal(off.enabled, false);
    delete process.env.OMEN_CACHE_TTL_QUIET_WEEK;

    let nowMs = 1_000_000;
    cache.setStoreForTests(cache.createMemoryResponseCacheStore({ now: () => nowMs }));
    const normal = await cache.lookup({ route: "quiet_week", userId: "u1", parts: { k: "normal" } });
    await cache.store(normal, 200, { v: 1 }, { cache: true });
    const degraded = await cache.lookup({ route: "quiet_week", userId: "u1", parts: { k: "degraded" } });
    await cache.store(degraded, 200, { v: 2 }, { cache: true, degraded: true });
    nowMs += (cache.DEGRADED_TTL_SECONDS + 1) * 1000;
    assert.equal((await cache.lookup({ route: "quiet_week", userId: "u1", parts: { k: "normal" } })).hit, true);
    assert.equal((await cache.lookup({ route: "quiet_week", userId: "u1", parts: { k: "degraded" } })).hit, false);
    nowMs += 60 * 1000;
    assert.equal((await cache.lookup({ route: "quiet_week", userId: "u1", parts: { k: "normal" } })).hit, false);
  } finally {
    if (saved === undefined) delete process.env.OMEN_CACHE_TTL_QUIET_WEEK;
    else process.env.OMEN_CACHE_TTL_QUIET_WEEK = saved;
  }
});

test("a missing or broken store is a miss, never a failure", async () => {
  cache.setStoreForTests(null);
  const none = await cache.lookup({ route: "quiet_week", userId: "u1", parts: {} });
  assert.equal(none.hit, false);
  assert.equal(none.enabled, false);
  assert.equal(await cache.store(none, 200, {}, { cache: true }), false);
  assert.equal(await cache.invalidateUser("u1"), false);

  cache.setStoreForTests({
    kind: "broken",
    get: async () => { throw new Error("redis down"); },
    set: async () => { throw new Error("redis down"); },
    getEpoch: async () => { throw new Error("redis down"); },
    bumpEpoch: async () => { throw new Error("redis down"); },
  });
  const broken = await cache.lookup({ route: "quiet_week", userId: "u1", parts: {} });
  assert.equal(broken.hit, false);
  assert.equal(broken.enabled, false);
  assert.equal(await cache.store(broken, 200, {}, { cache: true }), false);
  assert.equal(await cache.invalidateUser("u1"), false);
});

test("a store that hangs costs at most the timeout and is a miss", async () => {
  cache.setStoreForTests({
    kind: "hung",
    get: () => { const p = new Promise(() => {}); setTimeout(() => {}, 500); return p; },
    set: () => new Promise(() => {}),
    getEpoch: () => { const p = new Promise(() => {}); setTimeout(() => {}, 500); return p; },
    bumpEpoch: () => new Promise(() => {}),
  });
  const startedAt = Date.now();
  const handle = await cache.lookup({ route: "quiet_week", userId: "u1", parts: {} });
  assert.equal(handle.hit, false);
  assert.ok(Date.now() - startedAt < 2000);
});

test("action and recovery states are never cacheable; a healthy move is", () => {
  const healthy = { state: "success", platform: { name: "sleeper", recovery: null }, signals: { roster: { status: "live" } } };
  assert.deepEqual(cache.omenMoveVerdict(healthy), { cache: true, degraded: false });
  assert.deepEqual(cache.omenMoveVerdict({ ...healthy, state: "empty" }), { cache: true, degraded: false });
  for (const state of [
    "espn_reauth_required", "yahoo_reauth_required", "platform_disconnected", "context_unavailable",
    "sleeper_league_context_missing", "espn_league_context_missing", "espn_import_blocked",
    "espn_recovery_needed", "pending_live_engine", "error", "off_season",
  ]) {
    assert.equal(cache.omenMoveVerdict({ ...healthy, state }).cache, false, state);
  }
  assert.equal(cache.omenMoveVerdict({ ...healthy, platform: { name: "espn", recovery: { code: "reconnect" } } }).cache, false);
  assert.equal(cache.omenMoveVerdict({ ...healthy, error: { code: "x" } }).cache, false);
  assert.deepEqual(
    cache.omenMoveVerdict({ ...healthy, signals: { roster: { status: "unavailable" } } }),
    { cache: true, degraded: true }
  );
  // Routinely-unavailable enrichment is not a provider failure.
  assert.equal(cache.omenMoveVerdict({ ...healthy, signals: { roster: { status: "live" }, llm_reasoning: { status: "unavailable" } } }).degraded, false);
});

// --- Route: waiver analysis ---------------------------------------------------

const ROSTER = {
  week: 7,
  slots: {
    starters: [{ player_key: "s1", name: "Weak RB", position: "RB", eligible_positions: ["RB"], projected_points: 5 }],
    bench: [{ player_key: "b1", name: "Deep RB", position: "RB", eligible_positions: ["RB"], projected_points: 3 }],
  },
};

function freeAgent(name) {
  return { player_key: `f-${name}`, name, position: "RB", eligible_positions: ["RB"], projected_points: 12 };
}

function loadWaiversRouter({ rowsByUser, counters, poolFails = () => false }) {
  const routePath = require.resolve("../src/routes/waivers");
  delete require.cache[routePath];
  const supabaseDouble = {
    from() {
      return {
        select() {
          let userId = null;
          const query = {
            eq(field, value) { if (field === "user_id") userId = value; return query; },
            then: (r, j) => Promise.resolve({ data: rowsByUser[userId] || [], error: null }).then(r, j),
          };
          return query;
        },
      };
    },
  };
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (parent?.filename === routePath) {
      if (request === "@supabase/supabase-js") return { createClient: () => supabaseDouble };
      if (request === "../middleware/auth") {
        return { requireAuth: (req, _res, next) => { req.user = { id: req.headers["x-test-user"] }; next(); } };
      }
      if (request === "../middleware/logging") return { logger: { error() {}, warn() {}, info() {} } };
      if (request === "../services/nflSchedule") {
        return {
          getCurrentNflWeekContext: () => ({ season: 2026, week: 7, season_type: "regular" }),
          isOffSeason: () => false,
          suppressLiveFootballData: () => false,
        };
      }
      if (request === "../adapters/sleeper") {
        return {
          fetchSleeperLeague: async () => ({ scoring_settings: { rec: 0.5 } }),
          buildNormalizedRoster: async () => ROSTER,
          fetchSleeperAvailablePlayers: async (leagueId) => {
            counters.pool.push(leagueId);
            if (poolFails(leagueId)) throw Object.assign(new Error("provider down"), { status: 500 });
            return [freeAgent(`Add-${leagueId}`)];
          },
        };
      }
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require("../src/routes/waivers");
  } finally {
    Module._load = originalLoad;
  }
}

async function call(app, path, { method = "GET", user = "user-1", body } = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: { "x-test-user": user, authorization: "Bearer t", "content-type": "application/json", "x-contract-record": "skip" },
      body: body == null ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json(), cache: response.headers.get("x-omen-cache") };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function sleeperRow(leagueId, extra = {}) {
  return { platform: "sleeper", is_active: true, league_id: leagueId, platform_username: "justin", ...extra };
}

function waiverApp(options) {
  const app = express();
  app.use(express.json());
  app.use("/api/waivers", loadWaiversRouter(options));
  app.use((err, _req, res, _next) => { res.status(err.status || 500).json({ error: err.message }); });
  return app;
}

test("waivers: second identical request is a hit with an identical body, first is a miss", async () => {
  freshStore();
  const counters = { pool: [] };
  const app = waiverApp({ rowsByUser: { "user-1": [sleeperRow("L1")] }, counters });
  const first = await call(app, "/api/waivers/analysis");
  const second = await call(app, "/api/waivers/analysis");
  assert.equal(first.status, 200);
  assert.equal(first.cache, "miss");
  assert.equal(second.cache, "hit");
  assert.deepEqual(second.body, first.body);
  assert.equal(counters.pool.length, 1);
});

test("waivers: two users in the same league never see each other's answer", async () => {
  freshStore();
  const counters = { pool: [] };
  const app = waiverApp({
    rowsByUser: { "user-a": [sleeperRow("SHARED")], "user-b": [sleeperRow("SHARED")] },
    counters,
  });
  const a = await call(app, "/api/waivers/analysis", { user: "user-a" });
  const b = await call(app, "/api/waivers/analysis", { user: "user-b" });
  assert.equal(a.cache, "miss");
  assert.equal(b.cache, "miss");
  assert.equal(counters.pool.length, 2);
  const aAgain = await call(app, "/api/waivers/analysis", { user: "user-a" });
  assert.equal(aAgain.cache, "hit");
});

test("waivers: same user, two leagues, and a league switch never return the previous league's payload", async () => {
  freshStore();
  const counters = { pool: [] };
  const rowsByUser = { "user-1": [sleeperRow("L1")] };
  const app = waiverApp({ rowsByUser, counters });
  const l1 = await call(app, "/api/waivers/analysis");
  assert.equal(l1.body.best_move.add.name, "Add-L1");

  // The selection moves to another league (rows change; no explicit invalidation).
  rowsByUser["user-1"] = [sleeperRow("L2")];
  const l2 = await call(app, "/api/waivers/analysis");
  assert.equal(l2.cache, "miss");
  assert.equal(l2.body.league_id, "L2");
  assert.equal(l2.body.best_move.add.name, "Add-L2");

  // And back: L1's entry is still its own.
  rowsByUser["user-1"] = [sleeperRow("L1")];
  const back = await call(app, "/api/waivers/analysis");
  assert.equal(back.cache, "hit");
  assert.equal(back.body.best_move.add.name, "Add-L1");

  // A different week is a different answer.
  const week8 = await call(app, "/api/waivers/analysis?week=8");
  assert.equal(week8.cache, "miss");
});

test("waivers: a provider failure (502) and a degraded engine_limitation are not cached", async () => {
  freshStore();
  const counters = { pool: [] };
  let down = true;
  const app = waiverApp({
    rowsByUser: { "user-1": [sleeperRow("L1")] },
    counters,
    poolFails: () => down,
  });
  // Pool failure degrades to engine_limitation (state the user may fix by retrying).
  const degraded = await call(app, "/api/waivers/analysis");
  assert.equal(degraded.status, 200);
  assert.notEqual(degraded.body.state, "confirmed_opportunity");
  down = false;
  const recovered = await call(app, "/api/waivers/analysis");
  assert.equal(recovered.cache, "miss");
  assert.equal(recovered.body.state, "confirmed_opportunity");
});

test("waivers: no usable league (404) is never cached and carries no cache header", async () => {
  freshStore();
  const rowsByUser = { "user-1": [] };
  const app = waiverApp({ rowsByUser, counters: { pool: [] } });
  const none = await call(app, "/api/waivers/analysis");
  assert.equal(none.status, 404);
  assert.equal(none.cache, null);
  rowsByUser["user-1"] = [sleeperRow("L1")];
  const ok = await call(app, "/api/waivers/analysis");
  assert.equal(ok.status, 200);
});

test("waivers: with no cache store the route behaves as before and sends no cache header", async () => {
  cache.setStoreForTests(null);
  const counters = { pool: [] };
  const app = waiverApp({ rowsByUser: { "user-1": [sleeperRow("L1")] }, counters });
  const first = await call(app, "/api/waivers/analysis");
  const second = await call(app, "/api/waivers/analysis");
  assert.equal(first.status, 200);
  assert.equal(first.cache, null);
  assert.equal(second.cache, null);
  assert.equal(counters.pool.length, 2);
});

// --- Route: quiet week --------------------------------------------------------

function loadDashboardRouter({ liveByUser, counters }) {
  const routePath = require.resolve("../src/routes/dashboard");
  const omenPath = require.resolve("../src/services/omen");
  delete require.cache[routePath];
  require.cache[omenPath] = {
    id: omenPath,
    filename: omenPath,
    loaded: true,
    exports: {
      buildLiveOmenMvpMoveForUser: async (userId, options) => {
        counters.live.push({ userId, contextId: options.contextId });
        return liveByUser(userId, options);
      },
    },
  };
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "../config") return { supabaseUrl: "https://example.supabase.co", supabaseServiceKey: "k" };
    if (request === "@supabase/supabase-js") {
      return { createClient: () => ({ from: () => ({ select() { return this; }, eq() { return Promise.resolve({ data: [], error: null }); } }) }) };
    }
    if (request === "../middleware/auth" && parent?.filename === routePath) {
      return { requireAuth: (req, _res, next) => { req.user = { id: req.headers["x-test-user"] }; next(); } };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require("../src/routes/dashboard");
  } finally {
    Module._load = originalLoad;
  }
}

test("quiet-week: per user and per context_id isolation, hit/miss header, no cache for recovery states", async () => {
  freshStore();
  const counters = { live: [] };
  let state = "empty";
  const app = express();
  app.use("/api/dashboard", loadDashboardRouter({
    counters,
    liveByUser: (userId, { contextId }) => ({
      status: 200,
      body: {
        state,
        platform: { name: "espn", status: "connected", recovery: state === "espn_reauth_required" ? { code: "reconnect" } : null },
        league: { id: `${userId}:${contextId}` },
        quiet_inputs: { injured_starter: false },
        signals: { roster: { status: "live" } },
      },
    }),
  }));

  const a1 = await call(app, "/api/dashboard/quiet-week?context_id=c1", { user: "user-a" });
  assert.equal(a1.cache, "miss");
  assert.equal((await call(app, "/api/dashboard/quiet-week?context_id=c1", { user: "user-a" })).cache, "hit");
  assert.equal(counters.live.length, 1);

  // Same context id, other user: separate computation.
  assert.equal((await call(app, "/api/dashboard/quiet-week?context_id=c1", { user: "user-b" })).cache, "miss");
  // Same user, other context id (a league switch): separate computation.
  assert.equal((await call(app, "/api/dashboard/quiet-week?context_id=c2", { user: "user-a" })).cache, "miss");
  assert.deepEqual(counters.live.map((c) => `${c.userId}:${c.contextId}`), ["user-a:c1", "user-b:c1", "user-a:c2"]);

  // A reauth state is never cached: two requests, two computations.
  state = "espn_reauth_required";
  await call(app, "/api/dashboard/quiet-week?context_id=c3", { user: "user-a" });
  const again = await call(app, "/api/dashboard/quiet-week?context_id=c3", { user: "user-a" });
  assert.equal(again.cache, "miss");
  assert.equal(counters.live.filter((c) => c.contextId === "c3").length, 2);

  // A malformed query is rejected before the cache is consulted.
  const bad = await call(app, `/api/dashboard/quiet-week?context_id=${"x".repeat(200)}`, { user: "user-a" });
  assert.equal(bad.status, 400);
  assert.equal(bad.cache, null);
});

test("invalidateUserCacheOnWrite bumps the epoch before the handler and again before releasing the response", async () => {
  const store = freshStore();
  const seen = [];
  const realBump = store.bumpEpoch.bind(store);
  store.bumpEpoch = async (userId) => { seen.push(userId); return realBump(userId); };
  const app = express();
  app.use((req, _res, next) => { req.user = { id: req.headers["x-test-user"] }; next(); });
  app.post("/write", cache.invalidateUserCacheOnWrite, (_req, res) => res.json({ ok: true }));

  const handle = await cache.lookup({ route: "quiet_week", userId: "user-1", parts: {} });
  await cache.store(handle, 200, { v: 1 }, { cache: true });
  const res = await call(app, "/write", { method: "POST", user: "user-1" });
  assert.equal(res.status, 200);
  assert.deepEqual(seen, ["user-1", "user-1"]);
  assert.equal((await cache.lookup({ route: "quiet_week", userId: "user-1", parts: {} })).hit, false);
});
