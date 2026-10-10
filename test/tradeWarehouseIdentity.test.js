"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const tradeRoutes = require("../src/routes/trade");
const { withWarehouseIdentityFallback } = require("../src/services/tradePlayerIdentity");
const {
  createWarehousePlayerIdentityRepository,
} = require("../src/services/footballWarehouse/playerIdentityRepository");

// Legacy resolver stand-in: knows Sleeper keys only, like the real Sleeper-dump index.
async function legacyResolver(players) {
  return players.map((input) => {
    if (String(input.player_key).startsWith("sleeper:")) {
      return {
        status: "resolved",
        player: {
          id: input.player_key, name: input.name, position: input.position,
          team: input.team || "FA", projected_points: input.projected_points ?? null,
        },
      };
    }
    return { status: "unresolved", input, suggestions: [] };
  });
}

function runtimeWith(rows, { mode = "shadow", fail = false } = {}) {
  const calls = [];
  return {
    calls,
    mode,
    enabled: true,
    identityRepository: {
      async readPlayersByProviderIds({ keys }) {
        calls.push(keys);
        if (fail) throw Object.assign(new Error("connect ECONNREFUSED postgres://secret@host"), { code: "ECONNREFUSED" });
        return new Map(rows);
      },
    },
  };
}

const ESPN_HIT = ["espn:4242", { gsis_id: "00-0036000", name: "Puka Nacua", position: "WR", team: "LA" }];

function quietLogger() {
  const lines = [];
  return { lines, info: (...a) => lines.push(a), warn: (...a) => lines.push(a) };
}

test("fallback resolves an espn: key the legacy resolver could not", async () => {
  const runtime = runtimeWith([ESPN_HIT]);
  const resolve = withWarehouseIdentityFallback(legacyResolver, { getRuntime: () => runtime, logger: quietLogger() });
  const out = await resolve([
    { player_key: "espn:4242", name: "P. Nacua", position: "WR" },
    { player_key: "sleeper:1", name: "Legacy Guy", position: "RB" },
  ]);
  assert.equal(out[0].status, "resolved");
  assert.equal(out[0].player.id, "espn:4242");
  assert.equal(out[0].player.name, "Puka Nacua");
  assert.equal(out[0].player.team, "LA");
  assert.equal(out[0].player.gsis_id, "00-0036000");
  assert.equal(out[0].player.projected_points, null);
  assert.equal(out[1].player.name, "Legacy Guy");
  assert.deepEqual(runtime.calls, [[{ provider: "espn", providerId: "4242" }]]);
});

test("fallback never touches the warehouse in supabase mode or when nothing is unresolved", async () => {
  const off = runtimeWith([ESPN_HIT], { mode: "supabase" });
  const a = await withWarehouseIdentityFallback(legacyResolver, { getRuntime: () => off })([{ player_key: "espn:4242", name: "X", position: "WR" }]);
  assert.equal(a[0].status, "unresolved");
  const none = runtimeWith([ESPN_HIT]);
  await withWarehouseIdentityFallback(legacyResolver, { getRuntime: () => none })([{ player_key: "sleeper:1", name: "X", position: "WR" }]);
  assert.equal(off.calls.length + none.calls.length, 0);
  const disabled = await withWarehouseIdentityFallback(legacyResolver, { getRuntime: () => ({ enabled: false }) })([{ player_key: "espn:1", name: "X" }]);
  assert.equal(disabled[0].status, "unresolved");
});

test("fallback leaves keys without provider shape and unknown ids unresolved", async () => {
  const runtime = runtimeWith([ESPN_HIT]);
  const resolve = withWarehouseIdentityFallback(legacyResolver, { getRuntime: () => runtime });
  const out = await resolve([
    { name: "No Key", position: "WR" },
    { player_key: "espn:9999", name: "Unknown", position: "WR" },
    { player_key: "bogus:1", name: "Odd", position: "WR" },
  ]);
  assert.deepEqual(out.map((r) => r.status), ["unresolved", "unresolved", "unresolved"]);
});

test("a warehouse failure degrades to the legacy answer with a structured, secret-free log", async () => {
  const logger = quietLogger();
  const runtime = runtimeWith([], { fail: true });
  const out = await withWarehouseIdentityFallback(legacyResolver, { getRuntime: () => runtime, logger })(
    [{ player_key: "espn:4242", name: "P. Nacua", position: "WR" }],
  );
  assert.equal(out[0].status, "unresolved");
  const serialized = JSON.stringify(logger.lines);
  assert.match(serialized, /unavailable/);
  assert.doesNotMatch(serialized, /postgres|secret|ECONNREFUSED connect/);
});

test("repository validates public ids, batches one bounded query, and maps rows", async () => {
  const requests = [];
  const repo = createWarehousePlayerIdentityRepository({
    timeoutMs: 750,
    query: async (request) => {
      requests.push(request);
      return { rows: [{ provider: "yahoo", provider_id: "31883", gsis_id: "00-1", display_name: "A Player", football_position: "RB", team: "SF" }] };
    },
  });
  const out = await repo.readPlayersByProviderIds({
    keys: [{ provider: "yahoo", providerId: "31883" }, { provider: "yahoo", providerId: "31883" }],
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].query_timeout, 750);
  assert.deepEqual(requests[0].values, [["yahoo"], ["31883"]]);
  assert.deepEqual(out.get("yahoo:31883"), { gsis_id: "00-1", name: "A Player", position: "RB", team: "SF" });
  assert.equal((await repo.readPlayersByProviderIds({ keys: [] })).size, 0);
  await assert.rejects(repo.readPlayersByProviderIds({ keys: [{ provider: "pfr", providerId: "1" }] }), TypeError);
  await assert.rejects(repo.readPlayersByProviderIds({ keys: [{ provider: "espn", providerId: "1; drop" }] }), TypeError);
  const many = Array.from({ length: 101 }, (_, i) => ({ provider: "espn", providerId: String(i) }));
  await assert.rejects(repo.readPlayersByProviderIds({ keys: many }), RangeError);
});

function buildApp(resolver) {
  const app = express();
  app.use(express.json());
  app.use("/api/trade", tradeRoutes.createTradeRouter({ playerResolver: resolver }));
  return app;
}

async function post(app, body) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/trade/compare`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const TRADE = {
  send: [{ player_key: "espn:4242", name: "P. Nacua", position: "WR" }],
  receive: [{ player_key: "sleeper:7", name: "Some RB", position: "RB", projected_points: 14 }],
};

test("route: ESPN-keyed roster player resolves via warehouse, no projection stays insufficient_data", async () => {
  const resolver = withWarehouseIdentityFallback(legacyResolver, { getRuntime: () => runtimeWith([ESPN_HIT]) });
  const res = await post(buildApp(resolver), TRADE);
  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, tradeRoutes.TRADE_COMPARE_CONTRACT);
  assert.equal(res.body.evaluability.status, "insufficient_data");
  assert.equal(res.body.evaluability.reason, "missing_projections");
  assert.equal(res.body.verdict_state, "insufficient_data");
});

test("route: with a caller-supplied projection the warehouse-resolved player is evaluable", async () => {
  const resolver = withWarehouseIdentityFallback(legacyResolver, { getRuntime: () => runtimeWith([ESPN_HIT]) });
  const body = { ...TRADE, send: [{ ...TRADE.send[0], projected_points: 17 }] };
  const res = await post(buildApp(resolver), body);
  assert.equal(res.status, 200);
  assert.equal(res.body.evaluability.status, "evaluable");
});

test("route: a warehouse outage keeps the old 422 unresolved_players behavior", async () => {
  const resolver = withWarehouseIdentityFallback(legacyResolver, {
    getRuntime: () => runtimeWith([], { fail: true }), logger: quietLogger(),
  });
  const res = await post(buildApp(resolver), TRADE);
  assert.equal(res.status, 422);
  assert.equal(res.body.error, "unresolved_players");
  assert.equal(res.body.unresolved[0].side, "send");
});
