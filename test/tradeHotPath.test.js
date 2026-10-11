"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");
const { createMemoryTradeFindCache } = require("../src/services/tradeFindCacheStore");
const { createNarrationGuard } = require("../src/services/narrationBudget");

// Responses from these stubbed scenarios must not become contract fixtures.
const SKIP = { headers: { "x-contract-record": "skip" } };

function loadTradeRoutes() {
  const routePath = require.resolve("../src/routes/trade");
  delete require.cache[routePath];
  const counters = { scans: 0 };
  const originalLoad = Module._load;
  Module._load = function patched(request, parent) {
    const loaded = originalLoad.apply(this, arguments);
    if (request === "../services/tradeFind" && parent?.filename === routePath) {
      return {
        ...loaded,
        findLeagueTradeCandidates: (...args) => {
          counters.scans += 1;
          return loaded.findLeagueTradeCandidates(...args);
        },
      };
    }
    return loaded;
  };
  try {
    return { routes: require("../src/routes/trade"), counters };
  } finally {
    Module._load = originalLoad;
  }
}

function player(id, position, points) {
  return { player_id: id, player_key: id, name: id, position, eligible_positions: [position], selected_position: "BN", projected_points: points };
}

function fixture() {
  return {
    league_status: "in_season",
    roster_positions: ["RB", "RB", "WR"],
    teams: [
      { roster_id: "1", team_name: "Own", players: [player("my-rb", "RB", 18), player("rb-one", "RB", 20), player("rb-two", "RB", 19), player("low-wr", "WR", 5)] },
      { roster_id: "2", team_name: "Opp", players: [player("their-wr", "WR", 12), player("wr-one", "WR", 20), player("wr-two", "WR", 19), player("low-rb", "RB", 5)] },
    ],
  };
}

async function withServer(app, fn) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function appFor(router) {
  const app = express();
  app.use(express.json());
  app.use("/api/trade", router);
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  return app;
}

test("/roster serves the warm /find bundle without touching the provider", async () => {
  const { routes } = loadTradeRoutes();
  let providerReads = 0;
  const tradeFindCache = createMemoryTradeFindCache();
  const router = routes.createTradeRouter({
    authenticate: async () => ({ id: "user-1" }),
    nflWeekContext: () => ({ week: 3 }),
    tradeFindCache,
    fetchLeagueRosters: async () => { providerReads += 1; return fixture(); },
  });
  await withServer(appFor(router), async (base) => {
    const find = await (await fetch(`${base}/api/trade/find?platform=sleeper&league_id=L1&team_id=1&week=3`, SKIP)).json();
    assert.equal(find.cache.hit, false);
    assert.equal(providerReads, 1);
    const roster = await (await fetch(`${base}/api/trade/roster?platform=sleeper&league_id=L1&week=3`, SKIP)).json();
    assert.equal(providerReads, 1, "roster must reuse the cached bundle");
    assert.equal(roster.status, "ok");
    assert.equal(roster.week, 3);
    assert.equal(roster.teams.length, 2);
    // A different league is a cache miss and reads the provider as before.
    await fetch(`${base}/api/trade/roster?platform=sleeper&league_id=L2&week=3`, SKIP);
    assert.equal(providerReads, 2);
  });
});

test("/roster output is identical whether served from the bundle or the provider", async () => {
  const { routes } = loadTradeRoutes();
  const router = routes.createTradeRouter({
    authenticate: async () => ({ id: "user-1" }),
    nflWeekContext: () => ({ week: 3 }),
    tradeFindCache: createMemoryTradeFindCache(),
    fetchLeagueRosters: async () => fixture(),
  });
  await withServer(appFor(router), async (base) => {
    const cold = await (await fetch(`${base}/api/trade/roster?platform=sleeper&league_id=L1&week=3`, SKIP)).json();
    await fetch(`${base}/api/trade/find?platform=sleeper&league_id=L1&team_id=1&week=3`, SKIP);
    const warm = await (await fetch(`${base}/api/trade/roster?platform=sleeper&league_id=L1&week=3`, SKIP)).json();
    assert.deepEqual(warm, cold);
  });
});

test("a repeat /find reuses the scan; a new bundle or team rescans", async () => {
  const { routes, counters } = loadTradeRoutes();
  const tradeFindCache = createMemoryTradeFindCache();
  const router = routes.createTradeRouter({
    authenticate: async () => ({ id: "user-1" }),
    nflWeekContext: () => ({ week: 3 }),
    tradeFindCache,
    fetchLeagueRosters: async () => fixture(),
  });
  await withServer(appFor(router), async (base) => {
    const url = (team) => `${base}/api/trade/find?platform=sleeper&league_id=L1&team_id=${team}&week=3`;
    const first = await (await fetch(url("1"), SKIP)).json();
    const second = await (await fetch(url("1"), SKIP)).json();
    assert.equal(counters.scans, 1);
    assert.ok(first.candidates.length > 0);
    // Only the per-response batch token differs.
    const strip = (body) => ({ ...body, candidates: body.candidates.map(({ id, ...rest }) => rest) });
    assert.deepEqual(strip(second), strip({ ...first, cache: second.cache }));
    assert.notEqual(first.candidates[0].id, second.candidates[0].id, "each response still issues its own batch token");
    await fetch(url("2"), SKIP);
    assert.equal(counters.scans, 2, "a different team rescans");
  });
});

test("an expired/regenerated bundle invalidates the scan memo", async () => {
  const { routes, counters } = loadTradeRoutes();
  const tradeFindCache = createMemoryTradeFindCache();
  let tick = 0;
  const router = routes.createTradeRouter({
    authenticate: async () => ({ id: "user-1" }),
    nflWeekContext: () => ({ week: 3 }),
    tradeFindCache,
    now: () => new Date(Date.UTC(2026, 9, 10, 0, 0, tick++)),
    fetchLeagueRosters: async () => fixture(),
  });
  await withServer(appFor(router), async (base) => {
    const url = `${base}/api/trade/find?platform=sleeper&league_id=L1&team_id=1&week=3`;
    await fetch(url, SKIP);
    // Drop the cached bundle (as TTL expiry would); the next /find regenerates it.
    const bundle = await tradeFindCache.read("user-1:sleeper:L1:3");
    if (bundle) await tradeFindCache.write("user-1:sleeper:L1:3", { ...bundle, generated_at: "2000-01-01T00:00:00.000Z" }, 900);
    await fetch(url, SKIP);
    assert.equal(counters.scans, 2);
  });
});

test("compare: a hung explainer is cut at the budget and the response carries explanation null", async () => {
  const { routes } = loadTradeRoutes();
  const router = routes.createTradeRouter({
    playerResolver: async (players) => players.map((p, i) => ({
      status: "resolved",
      player: { id: `t:${i}:${p.name}`, name: p.name, position: p.position || "UNK", team: "FA", projected_points: p.projected_points ?? null },
    })),
    tradeExplainer: () => new Promise(() => {}),
    narrationGuard: createNarrationGuard({ logger: { warn() {} } }),
  });
  await withServer(appFor(router), async (base) => {
    const started = Date.now();
    const res = await fetch(`${base}/api/trade/compare`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-contract-record": "skip" },
      body: JSON.stringify({
        send: [{ name: "Justin Jefferson", position: "WR", projected_points: 18 }],
        receive: [{ name: "Patrick Mahomes", position: "QB", projected_points: 22 }],
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.explanation, null);
    assert.ok(body.verdict, "deterministic verdict is untouched");
    const elapsed = Date.now() - started;
    assert.ok(elapsed >= 1400 && elapsed < 3500, `elapsed ${elapsed}ms`);
  });
});

test("compare: an open breaker skips the explainer entirely", async () => {
  const { routes } = loadTradeRoutes();
  const guard = createNarrationGuard({ failureThreshold: 1, logger: { warn() {} } });
  await guard.run("trade_compare", 50, async () => { throw new Error("down"); });
  let explainCalls = 0;
  const router = routes.createTradeRouter({
    playerResolver: async (players) => players.map((p, i) => ({
      status: "resolved",
      player: { id: `t:${i}:${p.name}`, name: p.name, position: p.position || "UNK", team: "FA", projected_points: p.projected_points ?? null },
    })),
    tradeExplainer: async () => { explainCalls += 1; return "text"; },
    narrationGuard: guard,
  });
  await withServer(appFor(router), async (base) => {
    const res = await fetch(`${base}/api/trade/compare`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-contract-record": "skip" },
      body: JSON.stringify({
        send: [{ name: "Justin Jefferson", position: "WR", projected_points: 18 }],
        receive: [{ name: "Patrick Mahomes", position: "QB", projected_points: 22 }],
      }),
    });
    const body = await res.json();
    assert.equal(body.explanation, null);
    assert.equal(explainCalls, 0);
  });
});

test("compare: context resolution overlaps player resolution and unresolved players still 422 first", async () => {
  const { routes } = loadTradeRoutes();
  const events = [];
  const router = routes.createTradeRouter({
    authenticate: async () => ({ id: "user-1" }),
    playerResolver: async (players) => {
      events.push("players:start");
      await new Promise((resolve) => setTimeout(resolve, 40));
      events.push("players:end");
      return players.map((p) => ({ status: "unresolved", reason: "not_found", query: p.name, suggestions: [] }));
    },
    leagueContextResolver: async () => {
      events.push("context:start");
      return { status: "unavailable", reason: "league_context_unavailable" };
    },
    tradeExplainer: async () => "never",
    narrationGuard: createNarrationGuard({ logger: { warn() {} } }),
  });
  await withServer(appFor(router), async (base) => {
    const res = await fetch(`${base}/api/trade/compare`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer x", "x-contract-record": "skip" },
      body: JSON.stringify({
        send: [{ name: "Nobody One", position: "WR" }],
        receive: [{ name: "Nobody Two", position: "QB" }],
        league_context: { platform: "sleeper", league_id: "L1" },
      }),
    });
    assert.equal(res.status, 422);
    assert.ok(events.indexOf("context:start") < events.lastIndexOf("players:end"), events.join(","));
  });
});

test("/roster ignores a bundle older than 60s, and fresh=1 bypasses a young one", async () => {
  const { routes } = loadTradeRoutes();
  let providerReads = 0;
  let clock = Date.UTC(2026, 9, 10, 12, 0, 0);
  const router = routes.createTradeRouter({
    authenticate: async () => ({ id: "user-1" }),
    nflWeekContext: () => ({ week: 3 }),
    tradeFindCache: createMemoryTradeFindCache(),
    now: () => new Date(clock),
    fetchLeagueRosters: async () => { providerReads += 1; return fixture(); },
  });
  await withServer(appFor(router), async (base) => {
    await fetch(`${base}/api/trade/find?platform=sleeper&league_id=L1&team_id=1&week=3`, SKIP);
    assert.equal(providerReads, 1);
    clock += 30_000;
    await fetch(`${base}/api/trade/roster?platform=sleeper&league_id=L1&week=3`, SKIP);
    assert.equal(providerReads, 1, "30s old bundle is reused");
    await fetch(`${base}/api/trade/roster?platform=sleeper&league_id=L1&week=3&fresh=1`, SKIP);
    assert.equal(providerReads, 2, "fresh=1 reads the provider");
    clock += 31_000;
    await fetch(`${base}/api/trade/roster?platform=sleeper&league_id=L1&week=3`, SKIP);
    assert.equal(providerReads, 3, "a bundle older than 60s is not used");
  });
});
