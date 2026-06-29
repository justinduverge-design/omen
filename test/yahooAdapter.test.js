"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

function playerNode({
  playerKey,
  playerId,
  name,
  eligiblePositions,
  selectedPosition,
  team = "KC",
  status = null,
}) {
  return {
    player: [
      [
        { player_key: playerKey },
        { player_id: playerId },
        { name: { full: name } },
        { editorial_team_abbr: team },
        { eligible_positions: eligiblePositions.map((position) => ({ position })) },
        { status },
        { image_url: `https://img.example/${playerId}.png` },
      ],
      { selected_position: [{ position: selectedPosition }] },
    ],
  };
}

function rawRosterFixture() {
  return {
    fantasy_content: {
      team: [
        [],
        {
          roster: {
            0: {
              players: {
                count: 3,
                0: playerNode({
                  playerKey: "399.p.100",
                  playerId: "100",
                  name: "Starter QB",
                  eligiblePositions: ["QB"],
                  selectedPosition: "QB",
                }),
                1: playerNode({
                  playerKey: "399.p.200",
                  playerId: "200",
                  name: "Bench RB",
                  eligiblePositions: ["RB"],
                  selectedPosition: "BN",
                  team: "NYJ",
                  status: "Q",
                }),
                2: playerNode({
                  playerKey: "399.p.300",
                  playerId: "300",
                  name: "IR WR",
                  eligiblePositions: ["WR"],
                  selectedPosition: "IR",
                  team: "DAL",
                  status: "IR",
                }),
              },
            },
          },
        },
      ],
    },
  };
}

function fixtures(overrides = {}) {
  return {
    teamKey: "399.l.123.t.7",
    currentWeek: 4,
    rawRoster: rawRosterFixture(),
    projectedStats: 101.5,
    projectedStatsError: false,
    ...overrides,
  };
}

function loadYahooAdapterWithFixtures(fixture, opts = {}) {
  const adapterPath = require.resolve("../src/adapters/yahoo");
  const configPath = require.resolve("../src/config");
  delete require.cache[adapterPath];
  delete require.cache[configPath];

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
  const calls = {
    accessTokens: [],
    getMyTeamKey: [],
    getCurrentWeek: [],
    getRoster: [],
    getProjectedStats: [],
    getLeagueScoreboard: [],
    redisGet: [],
    redisSet: [],
  };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "../services/yahoo" && parent?.filename === adapterPath) {
      return class MockYahooClient {
        constructor(accessToken) {
          calls.accessTokens.push(accessToken);
        }

        async getMyTeamKey(leagueKey) {
          calls.getMyTeamKey.push(leagueKey);
          return fixture.teamKey;
        }

        async getCurrentWeek(leagueKey) {
          calls.getCurrentWeek.push(leagueKey);
          return fixture.currentWeek;
        }

        async getRoster(teamKey, week) {
          calls.getRoster.push({ teamKey, week });
          return fixture.rawRoster;
        }

        async getProjectedStats(teamKey, week) {
          calls.getProjectedStats.push({ teamKey, week });
          if (fixture.projectedStatsError) throw new Error("Projected stats unavailable");
          return fixture.projectedStats;
        }

        async getLeagueScoreboard(leagueKey, week) {
          calls.getLeagueScoreboard.push({ leagueKey, week });
          return fixture.scoreboard;
        }
      };
    }

    if (request === "@upstash/redis" && parent?.filename === adapterPath) {
      return {
        Redis: class MockRedis {
          async get(key) {
            calls.redisGet.push(key);
            return store.get(key) || null;
          }

          async set(key, value, options) {
            calls.redisSet.push({ key, value, options });
            store.set(key, value);
          }
        },
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return {
      adapter: require("../src/adapters/yahoo"),
      calls,
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

test("buildNormalizedRoster returns the normalized Yahoo roster shape", async () => {
  const { adapter } = loadYahooAdapterWithFixtures(fixtures());
  const roster = await adapter.buildNormalizedRoster("nfl.l.123", "access-token", 1);

  assert.equal(roster.week, 1);
  assert.equal(roster.league_key, "nfl.l.123");
  assert.equal(roster.team_key, "399.l.123.t.7");
  assert.equal(roster.source, "yahoo");
  assert.equal(roster.slots.starters.length, 1);
  assert.equal(roster.slots.bench.length, 1);
  assert.equal(roster.slots.ir.length, 1);
});

test("player_key values are prefixed with yahoo", async () => {
  const { adapter } = loadYahooAdapterWithFixtures(fixtures());
  const roster = await adapter.buildNormalizedRoster("nfl.l.123", "access-token", 1);

  assert.equal(roster.slots.starters[0].player_key, "yahoo:100");
  assert.equal(roster.slots.bench[0].player_key, "yahoo:200");
  assert.equal(roster.slots.ir[0].player_key, "yahoo:300");
});

test("player objects include cross-platform id fields", async () => {
  const { adapter } = loadYahooAdapterWithFixtures(fixtures());
  const roster = await adapter.buildNormalizedRoster("nfl.l.123", "access-token", 1);

  assert.equal(roster.slots.starters[0].yahoo_id, "100");
  assert.equal(roster.slots.starters[0].espn_id, null);
  assert.equal(roster.slots.starters[0].gsis_id, null);
});

test("buildNormalizedRoster returns cached result on second call", async () => {
  const { adapter, calls } = loadYahooAdapterWithFixtures(fixtures(), { redis: true });

  const first = await adapter.buildNormalizedRoster("nfl.l.123", "access-token", 1);
  const second = await adapter.buildNormalizedRoster("nfl.l.123", "access-token", 1);

  assert.deepEqual(second, first);
  assert.equal(calls.getRoster.length, 1);
  assert.equal(calls.redisSet.length, 1);
  assert.equal(calls.redisSet[0].options.ex, 300);
});

test("buildNormalizedRoster throws 404 if no Yahoo team exists in the league", async () => {
  const { adapter } = loadYahooAdapterWithFixtures(fixtures({ teamKey: null }));

  await assert.rejects(
    () => adapter.buildNormalizedRoster("nfl.l.123", "access-token", 1),
    (error) => error.status === 404 && error.message === "No Yahoo team found in this league"
  );
});

test("getProjectedStats failure degrades gracefully", async () => {
  const { adapter } = loadYahooAdapterWithFixtures(fixtures({ projectedStatsError: true }));
  const roster = await adapter.buildNormalizedRoster("nfl.l.123", "access-token", 1);

  assert.equal(roster.slots.starters[0].projected_points, null);
  assert.equal(roster.slots.bench[0].projected_points, null);
  assert.equal(roster.slots.ir[0].projected_points, null);
});

test("lastResultFromYahooScoreboard returns W for the user's completed matchup", () => {
  const { adapter } = loadYahooAdapterWithFixtures(fixtures());
  const scoreboard = {
    matchups: {
      0: {
        matchup: {
          matchup_id: "m-7",
          winner_team_key: "449.l.1.t.7",
          teams: [
            { team_key: "449.l.1.t.7", team_points: { total: "121.4" } },
            { team_key: "449.l.1.t.2", team_points: { total: "99.2" } },
          ],
        },
      },
    },
  };

  const result = adapter.lastResultFromYahooScoreboard({
    leagueKey: "449.l.1",
    week: 7,
    teamKey: "449.l.1.t.7",
    scoreboard,
  });

  assert.deepEqual(result, {
    lastResult: "W",
    lastGameId: "m-7",
    lastGameKickoff: null,
  });
});

test("lastResultFromYahooScoreboard falls back to points when winner key is missing", () => {
  const { adapter } = loadYahooAdapterWithFixtures(fixtures());
  const scoreboard = {
    matchups: {
      0: {
        matchup: {
          teams: [
            { team_key: "449.l.1.t.7", team_points: { total: "88.4" } },
            { team_key: "449.l.1.t.2", team_points: { total: "99.2" } },
          ],
        },
      },
    },
  };

  const result = adapter.lastResultFromYahooScoreboard({
    leagueKey: "449.l.1",
    week: 7,
    teamKey: "449.l.1.t.7",
    scoreboard,
  });

  assert.deepEqual(result, {
    lastResult: "L",
    lastGameId: "449.l.1:7:449.l.1.t.7",
    lastGameKickoff: null,
  });
});

test("fetchYahooLastResult caches by teamKey/week (6h) so a second call doesn't refetch", async () => {
  const data = fixtures();
  data.scoreboard = {
    matchups: {
      0: {
        matchup: {
          matchup_id: "m-7",
          winner_team_key: "399.l.123.t.7",
          teams: [
            { team_key: "399.l.123.t.7", team_points: { total: "121.4" } },
            { team_key: "399.l.123.t.2", team_points: { total: "99.2" } },
          ],
        },
      },
    },
  };
  const { adapter, calls, store } = loadYahooAdapterWithFixtures(data, { redis: true });
  const client = { getLeagueScoreboard: async (leagueKey, week) => {
    calls.getLeagueScoreboard.push({ leagueKey, week });
    return data.scoreboard;
  } };

  const first = await adapter.fetchYahooLastResult({
    client, leagueKey: "399.l.123", teamKey: "399.l.123.t.7", week: 7,
  });
  const second = await adapter.fetchYahooLastResult({
    client, leagueKey: "399.l.123", teamKey: "399.l.123.t.7", week: 7,
  });

  assert.deepEqual(second, first);
  assert.deepEqual(first, { lastResult: "W", lastGameId: "m-7", lastGameKickoff: null });
  assert.equal(calls.getLeagueScoreboard.length, 1, "second call should be served from cache, not a live Yahoo request");
  assert.equal(store.size, 1);
});
