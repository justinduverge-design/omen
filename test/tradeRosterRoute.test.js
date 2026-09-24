"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const tradeRoutes = require("../src/routes/trade");

function buildApp({
  authenticate = async () => ({ id: "user-1" }),
  fetchLeagueRosters = async () => ({
    league_status: "in_season",
    roster_positions: ["QB", "RB", "RB", "WR", "WR", "FLEX", "BN"],
    teams: [
      {
        roster_id: "1",
        team_name: "Own Team",
        players: [{ player_key: "sleeper:100", name: "Own Player", position: "RB" }],
      },
      {
        roster_id: "2",
        team_name: "Opponent Team",
        players: [{ player_key: "sleeper:200", name: "Opponent Player", position: "WR" }],
      },
    ],
  }),
  nflWeekContext = () => ({ week: 3 }),
} = {}) {
  const router = tradeRoutes.createTradeRouter({ authenticate, fetchLeagueRosters, nflWeekContext });
  const app = express();
  app.use(express.json());
  app.use("/api/trade", router);
  app.use((_req, res) => res.status(404).json({ error: "not_found" }));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  return app;
}

async function get(app, path, headers = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { headers });
    return { status: res.status, body: await res.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/trade/roster requires authentication", async () => {
  const app = buildApp({ authenticate: async () => { throw new Error("no session"); } });
  const res = await get(app, "/api/trade/roster?platform=sleeper&league_id=abc");
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "trade_roster_auth_required");
});

test("GET /api/trade/roster requires platform and league_id", async () => {
  const app = buildApp();
  const missingPlatform = await get(app, "/api/trade/roster?league_id=abc", { authorization: "Bearer t" });
  assert.equal(missingPlatform.status, 400);

  const missingLeague = await get(app, "/api/trade/roster?platform=sleeper", { authorization: "Bearer t" });
  assert.equal(missingLeague.status, 400);

  const badPlatform = await get(app, "/api/trade/roster?platform=nope&league_id=abc", { authorization: "Bearer t" });
  assert.equal(badPlatform.status, 400);
});

test("GET /api/trade/roster resolves a real Sleeper opponent roster", async () => {
  const app = buildApp();
  const res = await get(app, "/api/trade/roster?platform=sleeper&league_id=abc123&team_id=2", {
    authorization: "Bearer t",
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "trade-roster.v1");
  assert.equal(res.body.status, "ok");
  assert.equal(res.body.week, 3);
  assert.equal(res.body.teams.length, 1);
  assert.equal(res.body.teams[0].team_id, "2");
  assert.equal(res.body.teams[0].team_name, "Opponent Team");
  assert.equal(res.body.teams[0].players[0].name, "Opponent Player");
});

test("GET /api/trade/roster returns every team when team_id is omitted", async () => {
  const app = buildApp();
  const res = await get(app, "/api/trade/roster?platform=sleeper&league_id=abc123", {
    authorization: "Bearer t",
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.teams.length, 2);
});

test("GET /api/trade/roster gives the honest unavailable shape for ESPN, never a crash or fabricated data", async () => {
  const app = buildApp();
  const res = await get(app, "/api/trade/roster?platform=espn&league_id=abc123", {
    authorization: "Bearer t",
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "unavailable");
  assert.equal(res.body.platform, "espn");
  assert.equal(res.body.reason, "provider_unsupported");
  assert.deepEqual(res.body.teams, []);
});

test("GET /api/trade/roster gives the honest unavailable shape for Yahoo", async () => {
  const app = buildApp();
  const res = await get(app, "/api/trade/roster?platform=yahoo&league_id=abc123", {
    authorization: "Bearer t",
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "unavailable");
  assert.equal(res.body.platform, "yahoo");
  assert.equal(res.body.reason, "provider_unsupported");
});

test("GET /api/trade/roster reports unavailable, not a 500, when the league has not drafted", async () => {
  const app = buildApp({
    fetchLeagueRosters: async () => ({ league_status: "drafting", roster_positions: [], teams: [] }),
  });
  const res = await get(app, "/api/trade/roster?platform=sleeper&league_id=abc123", {
    authorization: "Bearer t",
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "unavailable");
  assert.equal(res.body.reason, "league_not_active");
});

test("GET /api/trade/roster answers 503, never a fabricated roster, when the provider read fails", async () => {
  const app = buildApp({
    fetchLeagueRosters: async () => { throw new Error("sleeper down"); },
  });
  const res = await get(app, "/api/trade/roster?platform=sleeper&league_id=abc123", {
    authorization: "Bearer t",
  });
  assert.equal(res.status, 503);
  assert.equal(res.body.code, "trade_roster_unavailable");
});
