"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
process.env.LOG_LEVEL ||= "error";

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

function loadEspnAdapterWithTeams(teams, opts = {}) {
  const adapterPath = require.resolve("../src/adapters/espn");
  const configPath = require.resolve("../src/config");
  delete require.cache[adapterPath];
  delete require.cache[configPath];

  const { EventEmitter } = require("node:events");

  const previousRedisUrl = process.env.REDIS_URL;
  const previousRedisToken = process.env.REDIS_TOKEN;
  if (opts.redis) {
    process.env.REDIS_URL = "https://redis.example";
    process.env.REDIS_TOKEN = "redis-token";
  } else {
    delete process.env.REDIS_URL;
    delete process.env.REDIS_TOKEN;
  }

  const store = opts.store || new Map();
  const requests = [];
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "https" && parent?.filename === adapterPath) {
      return {
        request: (options, callback) => {
          requests.push(options);
          const body = JSON.stringify({ teams, schedule: opts.schedule });
          const req = new EventEmitter();
          req.end = () => {
            const res = new EventEmitter();
            res.statusCode = 200;
            callback(res);
            res.emit("data", Buffer.from(body));
            res.emit("end");
          };
          return req;
        },
      };
    }
    if (request === "@upstash/redis" && parent?.filename === adapterPath) {
      return {
        Redis: class MockRedis {
          async get(key) {
            return store.get(key) || null;
          }

          async set(key, value) {
            store.set(key, value);
          }
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return {
      adapter: require("../src/adapters/espn"),
      requests,
      store,
    };
  } finally {
    Module._load = originalLoad;
    if (previousRedisUrl == null) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previousRedisUrl;
    if (previousRedisToken == null) delete process.env.REDIS_TOKEN;
    else process.env.REDIS_TOKEN = previousRedisToken;
  }
}

function fixtureTeams() {
  return [
    {
      id: 9,
      ownerId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      roster: [
        {
          lineupSlotId: 0,
          projectedPoints: 18.7,
          totalPoints: 21.3,
          player: {
            id: 1001,
            fullName: "Starter QB",
            defaultPosition: "QB",
            eligiblePositions: ["QB"],
            proTeamAbbreviation: "KC",
            injuryStatus: "ACTIVE",
            headshotUrl: "https://img.example/qb.png",
          },
        },
        {
          lineupSlotId: 20,
          player: {
            id: 1002,
            fullName: "Bench RB",
            defaultPosition: "RB",
            eligiblePositions: ["RB"],
            proTeamAbbreviation: "NYJ",
            injuryStatus: "QUESTIONABLE",
          },
        },
        {
          lineupSlotId: 21,
          projectedPoints: 4.2,
          player: {
            id: 1003,
            fullName: "IR WR",
            defaultPosition: "WR",
            eligiblePositions: ["WR"],
            proTeamAbbreviation: "DAL",
            injuryStatus: "INJURED_RESERVE",
          },
        },
      ],
    },
  ];
}

test("buildNormalizedRoster returns starters, bench, and IR in normalized shape", async () => {
  const { adapter } = loadEspnAdapterWithTeams(fixtureTeams());
  const roster = await adapter.buildNormalizedRoster(
    "12345",
    "espn-cookie",
    "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}",
    1,
    { seasonId: 2026 }
  );

  assert.equal(roster.week, 1);
  assert.equal(roster.league_key, "12345");
  assert.equal(roster.team_key, "9");
  assert.equal(roster.source, "espn");
  assert.equal(roster.slots.starters.length, 1);
  assert.equal(roster.slots.bench.length, 1);
  assert.equal(roster.slots.ir.length, 1);
});

test("lineupSlotId 20 maps to BN and is_starter false", async () => {
  const { adapter } = loadEspnAdapterWithTeams(fixtureTeams());
  const roster = await adapter.buildNormalizedRoster("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1);

  assert.equal(roster.slots.bench[0].selected_position, "BN");
  assert.equal(roster.slots.bench[0].is_starter, false);
});

test("lineupSlotId 21 goes into IR array", async () => {
  const { adapter } = loadEspnAdapterWithTeams(fixtureTeams());
  const roster = await adapter.buildNormalizedRoster("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1);

  assert.equal(roster.slots.ir[0].selected_position, "IR");
  assert.equal(roster.slots.ir[0].name, "IR WR");
});

test("ESPN QUESTIONABLE maps to Q", async () => {
  const { adapter } = loadEspnAdapterWithTeams(fixtureTeams());
  const roster = await adapter.buildNormalizedRoster("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1);

  assert.equal(roster.slots.bench[0].status, "Q");
});

test("ESPN ACTIVE maps to null", async () => {
  const { adapter } = loadEspnAdapterWithTeams(fixtureTeams());
  const roster = await adapter.buildNormalizedRoster("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1);

  assert.equal(roster.slots.starters[0].status, null);
});

test("missing projected points do not crash and produce null", async () => {
  const { adapter } = loadEspnAdapterWithTeams(fixtureTeams());
  const roster = await adapter.buildNormalizedRoster("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1);

  assert.equal(roster.slots.bench[0].projected_points, null);
});

test("player_key is prefixed with espn", async () => {
  const { adapter } = loadEspnAdapterWithTeams(fixtureTeams());
  const roster = await adapter.buildNormalizedRoster("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1);

  assert.equal(roster.slots.starters[0].player_key, "espn:1001");
});

test("buildLeagueStandings maps ESPN teams without exposing cookies", async () => {
  const teams = [
    {
      id: 9,
      ownerId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      name: "Current Team",
      wins: 5,
      losses: 3,
      regularSeasonPointsFor: 1001.2,
      regularSeasonPointsAgainst: 944.6,
    },
    {
      id: 4,
      name: "Top Team",
      wins: 7,
      losses: 1,
      regularSeasonPointsFor: 1200,
      regularSeasonPointsAgainst: 900,
    },
  ];
  const { adapter } = loadEspnAdapterWithTeams(teams);

  const standings = await adapter.buildLeagueStandings(
    "12345",
    "espn-cookie",
    "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}",
    { seasonId: 2026, week: 8 }
  );

  assert.deepEqual(standings, [
    {
      rank: 1,
      team_id: "4",
      team_name: "Top Team",
      is_current_user: false,
      wins: 7,
      losses: 1,
      points_for: 1200,
      points_against: 900,
    },
    {
      rank: 2,
      team_id: "9",
      team_name: "Current Team",
      is_current_user: true,
      wins: 5,
      losses: 3,
      points_for: 1001.2,
      points_against: 944.6,
    },
  ]);
  assert.equal(JSON.stringify(standings).includes("espn-cookie"), false);
});

test("verifyLeagueAccess returns team_id and team_name for a known team", async () => {
  const { adapter } = loadEspnAdapterWithTeams([
    { id: 9, ownerId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", name: "Current Team" },
  ]);
  const result = await adapter.verifyLeagueAccess(
    "12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", null
  );
  assert.equal(result.team_id, "9");
  assert.equal(result.team_name, "Current Team");
});

test("verifyLeagueAccess throws 404 when team not found", async () => {
  const { adapter } = loadEspnAdapterWithTeams([
    { id: 99, ownerId: "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz", name: "Other Team" },
  ]);
  await assert.rejects(
    () => adapter.verifyLeagueAccess("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", null),
    (err) => err.status === 404
  );
});

test("lastResultFromEspnSchedule returns W without exposing credentials", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);

  const result = adapter.lastResultFromEspnSchedule({
    leagueId: "12345",
    week: 7,
    teamId: "9",
    schedule: [{
      id: 77,
      matchupPeriodId: 7,
      winner: "HOME",
      home: { teamId: 9, totalPoints: 112.3 },
      away: { teamId: 4, totalPoints: 101.4 },
    }],
  });

  assert.deepEqual(result, {
    lastResult: "W",
    lastGameId: "77",
    lastGameKickoff: null,
  });
  assert.equal(JSON.stringify(result).includes("espn-cookie"), false);
});

test("lastResultFromEspnSchedule falls back to points when winner is missing", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);

  const result = adapter.lastResultFromEspnSchedule({
    leagueId: "12345",
    week: 7,
    teamId: "9",
    schedule: [{
      matchupPeriodId: 7,
      home: { teamId: 9, totalPoints: 88.3 },
      away: { teamId: 4, totalPoints: 101.4 },
    }],
  });

  assert.deepEqual(result, {
    lastResult: "L",
    lastGameId: "12345:7:9:4",
    lastGameKickoff: null,
  });
});

test("fetchEspnLastResult caches by league/week/teamId and never embeds the SWID cookie", async () => {
  const schedule = [{
    id: 77,
    matchupPeriodId: 7,
    winner: "HOME",
    home: { teamId: 9, totalPoints: 112.3 },
    away: { teamId: 4, totalPoints: 101.4 },
  }];
  const { adapter, requests, store } = loadEspnAdapterWithTeams([], { schedule, redis: true });

  const first = await adapter.fetchEspnLastResult(
    "12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", { week: 7, teamId: "9" }
  );
  const second = await adapter.fetchEspnLastResult(
    "12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", { week: 7, teamId: "9" }
  );

  assert.deepEqual(second, first);
  assert.equal(requests.length, 1, "second call should be served from cache, not a live ESPN request");
  assert.equal(store.size, 1);
  for (const key of store.keys()) {
    assert.equal(key.toLowerCase().includes("aaaaaaaa"), false, "cache key must not embed the SWID cookie");
  }
});

test("standingsFromEspnData normalizes already-fetched data without a network call", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);
  const data = {
    teams: [
      {
        id: 9,
        ownerId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        name: "Current Team",
        wins: 5,
        losses: 3,
        regularSeasonPointsFor: 1001.2,
        regularSeasonPointsAgainst: 944.6,
      },
      {
        id: 4,
        name: "Top Team",
        wins: 7,
        losses: 1,
        regularSeasonPointsFor: 1200,
        regularSeasonPointsAgainst: 900,
      },
    ],
  };

  const standings = adapter.standingsFromEspnData(data, "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", {});

  assert.deepEqual(standings, [
    { rank: 1, team_id: "4", team_name: "Top Team", is_current_user: false, wins: 7, losses: 1, points_for: 1200, points_against: 900 },
    { rank: 2, team_id: "9", team_name: "Current Team", is_current_user: true, wins: 5, losses: 3, points_for: 1001.2, points_against: 944.6 },
  ]);
});

test("teamFromEspnData finds the caller's team from already-fetched data", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);
  const data = { teams: [{ id: 9, ownerId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", name: "Current Team" }] };

  const result = adapter.teamFromEspnData(data, "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", null);

  assert.equal(result.team_id, "9");
  assert.equal(result.team_name, "Current Team");
});

test("teamFromEspnData throws 404 when team not found in already-fetched data", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);
  const data = { teams: [{ id: 99, ownerId: "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz", name: "Other Team" }] };

  assert.throws(
    () => adapter.teamFromEspnData(data, "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", null),
    (err) => err.status === 404
  );
});

test("rosterFromEspnData normalizes starters/bench/IR from already-fetched data", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);
  const data = { teams: fixtureTeams() };

  const roster = adapter.rosterFromEspnData(data, "12345", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1, {});

  assert.equal(roster.week, 1);
  assert.equal(roster.league_key, "12345");
  assert.equal(roster.team_key, "9");
  assert.equal(roster.source, "espn");
  assert.equal(roster.slots.starters.length, 1);
  assert.equal(roster.slots.bench.length, 1);
  assert.equal(roster.slots.ir.length, 1);
});

test("fetchEspnLastResult never caches when teamId is unknown", async () => {
  const schedule = [{
    id: 77,
    matchupPeriodId: 7,
    winner: "HOME",
    home: { teamId: 9, totalPoints: 112.3 },
    away: { teamId: 4, totalPoints: 101.4 },
  }];
  const { adapter, requests, store } = loadEspnAdapterWithTeams([], { schedule, redis: true });

  await adapter.fetchEspnLastResult("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", { week: 7 });
  await adapter.fetchEspnLastResult("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", { week: 7 });

  assert.equal(requests.length, 2, "without a teamId there is nothing safe to key a cache entry on, so each call refetches");
  assert.equal(store.size, 0);
});
