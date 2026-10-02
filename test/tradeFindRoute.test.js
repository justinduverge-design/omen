"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const tradeRoutes = require("../src/routes/trade");
const { createMemoryTradeFindCache } = require("../src/services/tradeFindCacheStore");

// The exact one-for-one improvement fixture proven in tradeLineup.test.js
// ("findTradeCandidate keeps only a fair swap that improves both starting
// lineups"), so a candidate is guaranteed without re-deriving the lineup
// math by hand.
const ROSTER_POSITIONS = ["RB", "RB", "WR"];

function player(id, position, points) {
  return {
    player_id: id,
    player_key: id,
    name: id,
    position,
    eligible_positions: [position],
    selected_position: "BN",
    projected_points: points,
  };
}

function ownCandidateRoster(tag) {
  return [
    player(`${tag}-my-rb`, "RB", 18),
    player(`${tag}-rb-one`, "RB", 20),
    player(`${tag}-rb-two`, "RB", 19),
    player(`${tag}-low-wr`, "WR", 5),
  ];
}

function opponentCandidateRoster(tag) {
  return [
    player(`${tag}-their-wr`, "WR", 12),
    player(`${tag}-wr-one`, "WR", 20),
    player(`${tag}-wr-two`, "WR", 19),
    player(`${tag}-low-rb`, "RB", 5),
  ];
}

function sleeperFixture(opponentCount = 1) {
  const teams = [{ roster_id: "1", team_name: "Own Team", players: ownCandidateRoster("own") }];
  for (let i = 0; i < opponentCount; i += 1) {
    teams.push({
      roster_id: `${i + 2}`,
      team_name: `Opponent ${i}`,
      players: opponentCandidateRoster(`opp${i}`),
    });
  }
  return { league_status: "in_season", roster_positions: ROSTER_POSITIONS, teams };
}

function buildApp({
  authenticate = async () => ({ id: "user-1" }),
  fetchLeagueRosters,
  nflWeekContext = () => ({ week: 3 }),
  tradeFindCache = createMemoryTradeFindCache(),
} = {}) {
  let sleeperCallCount = 0;
  const wrappedFetch = fetchLeagueRosters || (async () => {
    sleeperCallCount += 1;
    return sleeperFixture(3);
  });
  const countingFetch = fetchLeagueRosters ? (async (...args) => {
    sleeperCallCount += 1;
    return fetchLeagueRosters(...args);
  }) : wrappedFetch;

  const router = tradeRoutes.createTradeRouter({
    authenticate,
    fetchLeagueRosters: countingFetch,
    nflWeekContext,
    tradeFindCache,
  });
  const app = express();
  app.use(express.json());
  app.use("/api/trade", router);
  app.use((_req, res) => res.status(404).json({ error: "not_found" }));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  return { app, getSleeperCallCount: () => sleeperCallCount };
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

test("GET /api/trade/find requires authentication", async () => {
  const { app } = buildApp({ authenticate: async () => { throw new Error("no session"); } });
  const res = await get(app, "/api/trade/find?platform=sleeper&league_id=abc&team_id=1");
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "trade_find_auth_required");
});

test("GET /api/trade/find requires platform, league_id, and team_id", async () => {
  const { app } = buildApp();
  const authorization = "Bearer t";

  const missingPlatform = await get(app, "/api/trade/find?league_id=abc&team_id=1", { authorization });
  assert.equal(missingPlatform.status, 400);

  const missingLeague = await get(app, "/api/trade/find?platform=sleeper&team_id=1", { authorization });
  assert.equal(missingLeague.status, 400);

  const missingTeamId = await get(app, "/api/trade/find?platform=sleeper&league_id=abc", { authorization });
  assert.equal(missingTeamId.status, 400);
  assert.equal(missingTeamId.body.code, "trade_find_team_id_required");

  const badPlatform = await get(app, "/api/trade/find?platform=nope&league_id=abc&team_id=1", { authorization });
  assert.equal(badPlatform.status, 400);
});

test("GET /api/trade/find returns ranked candidates with reasoning for a real league shape", async () => {
  const { app } = buildApp({ fetchLeagueRosters: async () => sleeperFixture(2) });
  const res = await get(app, "/api/trade/find?platform=sleeper&league_id=abc123&team_id=1", {
    authorization: "Bearer t",
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "trade-find.v1");
  assert.equal(res.body.status, "ok");
  assert.equal(res.body.platform, "sleeper");
  assert.equal(res.body.team_id, "1");
  assert.ok(Array.isArray(res.body.candidates));
  assert.ok(res.body.candidates.length >= 1);

  const candidate = res.body.candidates[0];
  assert.ok(candidate.reasoning, "every candidate must carry reasoning");
  assert.ok(Array.isArray(candidate.reasoning.fills_need_for));
  assert.ok(candidate.valuation);
  assert.equal(res.body.cache.hit, false);
});

test("GET /api/trade/find reports own_team not found rather than guessing", async () => {
  const { app } = buildApp({ fetchLeagueRosters: async () => sleeperFixture(1) });
  const res = await get(app, "/api/trade/find?platform=sleeper&league_id=abc123&team_id=does-not-exist", {
    authorization: "Bearer t",
  });
  assert.equal(res.status, 404);
  assert.equal(res.body.code, "trade_find_team_not_found");
});

test("GET /api/trade/find gives the honest unavailable shape, never a crash, when the Sleeper league has not drafted", async () => {
  const { app } = buildApp({
    fetchLeagueRosters: async () => ({ league_status: "drafting", roster_positions: [], teams: [] }),
  });
  const res = await get(app, "/api/trade/find?platform=sleeper&league_id=abc123&team_id=1", {
    authorization: "Bearer t",
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "unavailable");
  assert.equal(res.body.reason, "league_not_active");
  assert.deepEqual(res.body.candidates, []);
});

test("GET /api/trade/find answers 503, never a fabricated batch, when the roster read fails", async () => {
  const { app } = buildApp({ fetchLeagueRosters: async () => { throw new Error("sleeper down"); } });
  const res = await get(app, "/api/trade/find?platform=sleeper&league_id=abc123&team_id=1", {
    authorization: "Bearer t",
  });
  assert.equal(res.status, 503);
  assert.equal(res.body.code, "trade_find_unavailable");
});

test("GET /api/trade/find degrades with a named reason when one team's roster is unreadable, rather than failing the whole batch", async () => {
  const { app } = buildApp({
    fetchLeagueRosters: async () => ({
      league_status: "in_season",
      roster_positions: ROSTER_POSITIONS,
      teams: [
        { roster_id: "1", team_name: "Own Team", players: ownCandidateRoster("own") },
        { roster_id: "2", team_name: "Broken Team", players: [] },
        { roster_id: "3", team_name: "Rival Team", players: opponentCandidateRoster("rival") },
      ],
    }),
  });
  const res = await get(app, "/api/trade/find?platform=sleeper&league_id=abc123&team_id=1", {
    authorization: "Bearer t",
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "degraded");
  assert.equal(res.body.degraded_teams.length, 1);
  assert.equal(res.body.degraded_teams[0].team_id, "2");
  assert.equal(res.body.degraded_teams[0].reason, "roster_unreadable");
  assert.ok(res.body.candidates.some((c) => c.opponent_team_id === "3"));
});

// --- #404-shape regression at the route level ------------------------------
//
// Many connected teams, many rosters — the exact shape of the outage in
// #404. The route must stay bounded (a hard cap surfaced in `bounds`) and a
// second request within the cache TTL must not re-read the provider at all.

test("GET /api/trade/find stays bounded against a many-team league (#404 shape)", async () => {
  const { app } = buildApp({ fetchLeagueRosters: async () => sleeperFixture(30) });
  const res = await get(app, "/api/trade/find?platform=sleeper&league_id=abc123&team_id=1", {
    authorization: "Bearer t",
  });

  assert.equal(res.status, 200);
  assert.ok(["ok", "degraded"].includes(res.body.status));
  assert.ok(res.body.bounds.teams_considered <= res.body.bounds.max_opponent_teams);
  assert.ok(res.body.bounds.teams_skipped_for_cap.length > 0);
  assert.ok(res.body.candidates.length <= res.body.bounds.max_candidates);
});

test("GET /api/trade/find serves a second request from cache without re-reading the provider", async () => {
  const cache = createMemoryTradeFindCache();
  const { app, getSleeperCallCount } = buildApp({
    fetchLeagueRosters: async () => sleeperFixture(4),
    tradeFindCache: cache,
  });

  const first = await get(app, "/api/trade/find?platform=sleeper&league_id=abc123&team_id=1&week=3", {
    authorization: "Bearer t",
  });
  assert.equal(first.status, 200);
  assert.equal(first.body.cache.hit, false);
  assert.equal(getSleeperCallCount(), 1);

  const second = await get(app, "/api/trade/find?platform=sleeper&league_id=abc123&team_id=1&week=3", {
    authorization: "Bearer t",
  });
  assert.equal(second.status, 200);
  assert.equal(second.body.cache.hit, true);
  // The whole point of the cache: a repeat request for the same league/week
  // must not fan out to the provider again.
  assert.equal(getSleeperCallCount(), 1, "cache hit must not re-read the provider roster");
});

test("GET /api/trade/find never serves one user's cached ESPN league bundle to another user", async () => {
  // Codex on #474: the cache is read before the provider roster read, and that
  // read is the only league-ownership check. User B names user A's private ESPN
  // league id while A's bundle is warm; B must miss and go through B's own
  // credentials, which B does not have.
  const cache = createMemoryTradeFindCache();
  let espnCallCount = 0;
  const router = tradeRoutes.createTradeRouter({
    authenticate: async (authorization) => ({ id: authorization === "Bearer a" ? "user-a" : "user-b" }),
    nflWeekContext: () => ({ week: 3 }),
    espnCredentials: async (userId) => {
      if (userId !== "user-a") throw new Error("no ESPN connection");
      return { espn_s2: "s2-a", swid: "{swid-a}" };
    },
    fetchEspnLeagueRosters: async () => {
      espnCallCount += 1;
      const fixture = sleeperFixture(2);
      return {
        roster_positions: fixture.roster_positions,
        teams: fixture.teams.map((team) => ({ team_id: team.roster_id, team_name: team.team_name, players: team.players })),
      };
    },
    tradeFindCache: cache,
  });
  const app = express();
  app.use("/api/trade", router);

  const path = "/api/trade/find?platform=espn&league_id=private-espn-1&team_id=1&week=3";

  const ownerFirst = await get(app, path, { authorization: "Bearer a" });
  assert.equal(ownerFirst.status, 200);
  assert.equal(ownerFirst.body.cache.hit, false);
  assert.ok(ownerFirst.body.candidates.length > 0);
  assert.equal(espnCallCount, 1);

  const intruder = await get(app, path, { authorization: "Bearer b" });
  assert.equal(intruder.status, 200);
  assert.equal(intruder.body.status, "unavailable");
  assert.equal(intruder.body.reason, "provider_reauth_required");
  assert.deepEqual(intruder.body.candidates, []);
  assert.equal(intruder.body.cache, undefined, "user B must not receive user A's cache entry");
  assert.equal(espnCallCount, 1, "user B has no ESPN credentials, so no provider read happens either");

  // The owner's own repeat still hits — the fix scopes the cache, it does not disable it.
  const ownerSecond = await get(app, path, { authorization: "Bearer a" });
  assert.equal(ownerSecond.body.cache.hit, true);
  assert.equal(espnCallCount, 1);
});
