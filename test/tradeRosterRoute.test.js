"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const tradeRoutes = require("../src/routes/trade");

const SLEEPER_FIXTURE = {
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
};

// Shaped like `leagueRostersFromEspnSchedule`'s real return value — a fixture, not a live
// ESPN call, per the hazard already paid for in this project (fixtures over live network).
const ESPN_FIXTURE = {
  league_status: null,
  roster_positions: [],
  teams: [
    { team_id: "10", team_name: "Own ESPN Team", players: [{ player_key: "espn:1", name: "Own ESPN Player" }] },
    { team_id: "20", team_name: "Rival ESPN Team", players: [{ player_key: "espn:2", name: "Rival ESPN Player" }] },
  ],
};

// Shaped like `fetchYahooLeagueRosters`'s real return value.
const YAHOO_FIXTURE = {
  week: 3,
  league_status: null,
  roster_positions: [],
  teams: [
    { team_id: "411.l.1.t.1", team_name: "Own Yahoo Team", players: [{ player_key: "yahoo:1", name: "Own Yahoo Player" }] },
    { team_id: "411.l.1.t.2", team_name: "Rival Yahoo Team", players: [{ player_key: "yahoo:2", name: "Rival Yahoo Player" }] },
  ],
};

function buildApp({
  authenticate = async () => ({ id: "user-1" }),
  fetchLeagueRosters = async () => SLEEPER_FIXTURE,
  nflWeekContext = () => ({ week: 3 }),
  fetchEspnLeagueRosters = async () => ESPN_FIXTURE,
  fetchYahooLeagueRosters = async () => YAHOO_FIXTURE,
  espnCredentials = async () => ({ espn_s2: "s2-fixture", swid: "{swid-fixture}" }),
  yahooClient = async () => ({ client: {}, accessToken: "yahoo-access-fixture" }),
} = {}) {
  const router = tradeRoutes.createTradeRouter({
    authenticate,
    fetchLeagueRosters,
    nflWeekContext,
    fetchEspnLeagueRosters,
    fetchYahooLeagueRosters,
    espnCredentials,
    yahooClient,
  });
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

test("GET /api/trade/roster returns every Sleeper team when team_id is omitted", async () => {
  const app = buildApp();
  const res = await get(app, "/api/trade/roster?platform=sleeper&league_id=abc123", {
    authorization: "Bearer t",
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.teams.length, 2);
});

test("GET /api/trade/roster resolves a real ESPN opponent roster from the schedule-walk normalizer", async () => {
  const app = buildApp();
  const res = await get(app, "/api/trade/roster?platform=espn&league_id=espnleague&team_id=20", {
    authorization: "Bearer t",
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(res.body.platform, "espn");
  assert.equal(res.body.teams.length, 1);
  assert.equal(res.body.teams[0].team_name, "Rival ESPN Team");
  assert.equal(res.body.teams[0].players[0].name, "Rival ESPN Player");
});

test("GET /api/trade/roster resolves a real Yahoo opponent roster from the per-team-key composition", async () => {
  const app = buildApp();
  const res = await get(app, "/api/trade/roster?platform=yahoo&league_id=411.l.1&team_id=411.l.1.t.2", {
    authorization: "Bearer t",
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(res.body.platform, "yahoo");
  assert.equal(res.body.teams.length, 1);
  assert.equal(res.body.teams[0].team_name, "Rival Yahoo Team");
  assert.equal(res.body.teams[0].players[0].name, "Rival Yahoo Player");
});

test("GET /api/trade/roster gives the honest unavailable shape, never a crash, when ESPN credentials can't be resolved", async () => {
  const app = buildApp({
    espnCredentials: async () => { throw Object.assign(new Error("ESPN not connected"), { status: 404 }); },
  });
  const res = await get(app, "/api/trade/roster?platform=espn&league_id=espnleague", {
    authorization: "Bearer t",
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "unavailable");
  assert.equal(res.body.platform, "espn");
  assert.equal(res.body.reason, "provider_reauth_required");
  assert.deepEqual(res.body.teams, []);
});

test("GET /api/trade/roster gives the honest unavailable shape, never a crash, when Yahoo re-auth is required", async () => {
  const app = buildApp({
    yahooClient: async () => { throw Object.assign(new Error("Yahoo refresh token missing"), { status: 401 }); },
  });
  const res = await get(app, "/api/trade/roster?platform=yahoo&league_id=411.l.1", {
    authorization: "Bearer t",
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "unavailable");
  assert.equal(res.body.platform, "yahoo");
  assert.equal(res.body.reason, "provider_reauth_required");
});

test("GET /api/trade/roster never leaks ESPN cookie values onto the wire", async () => {
  const app = buildApp();
  const res = await get(app, "/api/trade/roster?platform=espn&league_id=espnleague", {
    authorization: "Bearer t",
  });
  const serialized = JSON.stringify(res.body);
  assert.ok(!serialized.includes("s2-fixture"));
  assert.ok(!serialized.includes("swid-fixture"));
});

test("GET /api/trade/roster reports unavailable, not a 500, when a Sleeper league has not drafted", async () => {
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

test("GET /api/trade/roster answers 503, never a fabricated roster, when the Sleeper read fails", async () => {
  const app = buildApp({
    fetchLeagueRosters: async () => { throw new Error("sleeper down"); },
  });
  const res = await get(app, "/api/trade/roster?platform=sleeper&league_id=abc123", {
    authorization: "Bearer t",
  });
  assert.equal(res.status, 503);
  assert.equal(res.body.code, "trade_roster_unavailable");
});

test("GET /api/trade/roster answers 503, never a fabricated roster, when the ESPN provider read fails after credentials resolve", async () => {
  const app = buildApp({
    fetchEspnLeagueRosters: async () => { throw new Error("espn 502"); },
  });
  const res = await get(app, "/api/trade/roster?platform=espn&league_id=espnleague", {
    authorization: "Bearer t",
  });
  assert.equal(res.status, 503);
  assert.equal(res.body.code, "trade_roster_unavailable");
});
