"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
delete process.env.REDIS_URL;
delete process.env.REDIS_TOKEN;

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

function loadSleeperAdapterWithFixtures(fixtures, opts = {}) {
  const adapterPath = require.resolve("../src/adapters/sleeper");
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
  const calls = [];
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "axios" && parent?.filename === adapterPath) {
      return {
        get: async (url, options = {}) => {
          calls.push({ url, options });
          if (url.includes("/user/testuser")) return { data: fixtures.user };
          if (url.includes("/league/league-1/matchups/")) return { data: fixtures.matchups };
          if (url.includes("/league/league-1/rosters")) return { data: fixtures.rosters };
          if (url.includes("/league/league-1/users")) return { data: fixtures.users };
          if (url.includes("/league/league-1")) return { data: fixtures.league };
          if (url.includes("/players/nfl") && !url.includes("/projections/")) return { data: fixtures.players };
          if (url.includes("/projections/nfl/2026/1")) return { data: fixtures.projections };
          throw new Error(`Unexpected URL ${url}`);
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
      adapter: require("../src/adapters/sleeper"),
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

function fixtures() {
  return {
    user: {
      user_id: "user-1",
      display_name: "Test User",
      username: "testuser",
    },
    league: {
      league_id: "league-1",
      season: "2026",
      roster_positions: ["QB", "SUPER_FLEX", "FLEX", "BN", "IR"],
    },
    users: [
      { user_id: "user-1", display_name: "Test User" },
      { user_id: "user-2", display_name: "Other User" },
    ],
    rosters: [
      {
        roster_id: 7,
        owner_id: "user-1",
        players: ["100", "200", "300", "400", "500"],
        starters: ["100", "200", "300"],
        reserve: ["500"],
        taxi: [],
      },
    ],
    players: {
      100: {
        player_id: "100",
        full_name: "Starter QB",
        position: "QB",
        fantasy_positions: ["QB"],
        team: "KC",
        injury_status: null,
        espn_id: "espn-100",
        yahoo_id: "yahoo-100",
        gsis_id: "gsis-100",
      },
      200: {
        player_id: "200",
        full_name: "Superflex QB",
        position: "QB",
        fantasy_positions: ["QB"],
        team: "BUF",
        injury_status: "O",
      },
      300: {
        player_id: "300",
        full_name: "Flex RB",
        position: "RB",
        fantasy_positions: ["RB"],
        team: "NYJ",
        injury_status: "Q",
      },
      400: {
        player_id: "400",
        full_name: "Bench WR",
        position: "WR",
        fantasy_positions: ["WR"],
        team: "DAL",
        injury_status: null,
      },
      500: {
        player_id: "500",
        full_name: "IR TE",
        position: "TE",
        fantasy_positions: ["TE"],
        team: "DET",
        injury_status: "IR",
      },
    },
    projections: {
      100: { pts_ppr: 18.4 },
      200: { pts_ppr: 21.2 },
      300: { pts_ppr: 12.1 },
      500: { pts_ppr: 6.6 },
    },
  };
}

test("buildNormalizedRoster returns starters, bench, and IR in normalized shape", async () => {
  const { adapter } = loadSleeperAdapterWithFixtures(fixtures());
  const roster = await adapter.buildNormalizedRoster("league-1", "testuser", 1);

  assert.equal(roster.week, 1);
  assert.equal(roster.league_key, "league-1");
  assert.equal(roster.team_key, "7");
  assert.equal(roster.source, "sleeper");
  assert.equal(roster.slots.starters.length, 3);
  assert.equal(roster.slots.bench.length, 1);
  assert.equal(roster.slots.ir.length, 1);

  assert.deepEqual(roster.slots.starters[0], {
    player_key: "sleeper:100",
    player_id: "100",
    name: "Starter QB",
    position: "QB",
    eligible_positions: ["QB"],
    selected_position: "QB",
    team: "KC",
    opponent: null,
    status: null,
    projected_points: 18.4,
    actual_points: null,
    image_url: "https://sleepercdn.com/content/nfl/players/100.jpg",
    is_starter: true,
    espn_id: "espn-100",
    yahoo_id: "yahoo-100",
    gsis_id: "gsis-100",
  });
});

test("injury status O is preserved in output", async () => {
  const { adapter } = loadSleeperAdapterWithFixtures(fixtures());
  const roster = await adapter.buildNormalizedRoster("league-1", "testuser", 1);

  assert.equal(roster.slots.starters[1].status, "O");
});

test("null injury status remains null", async () => {
  const { adapter } = loadSleeperAdapterWithFixtures(fixtures());
  const roster = await adapter.buildNormalizedRoster("league-1", "testuser", 1);

  assert.equal(roster.slots.bench[0].status, null);
});

test("SUPER_FLEX roster slot maps to QB selected_position", async () => {
  const { adapter } = loadSleeperAdapterWithFixtures(fixtures());
  const roster = await adapter.buildNormalizedRoster("league-1", "testuser", 1);

  assert.equal(roster.slots.starters[1].selected_position, "QB");
});

test("missing projections do not crash and produce null projected_points", async () => {
  const { adapter } = loadSleeperAdapterWithFixtures(fixtures());
  const roster = await adapter.buildNormalizedRoster("league-1", "testuser", 1);

  assert.equal(roster.slots.bench[0].projected_points, null);
});

test("fetchSleeperStandings ranks by wins then points for", async () => {
  const data = fixtures();
  data.users = [
    { user_id: "user-1", display_name: "Test User", metadata: { team_name: "Current Team" } },
    { user_id: "user-2", display_name: "Other User", metadata: { team_name: "Other Team" } },
  ];
  data.rosters = [
    {
      roster_id: 7,
      owner_id: "user-1",
      settings: {
        wins: 6,
        losses: 2,
        fpts: 1142,
        fpts_decimal: 40,
        fpts_against: 980,
        fpts_against_decimal: 60,
      },
    },
    {
      roster_id: 2,
      owner_id: "user-2",
      settings: {
        wins: 6,
        losses: 2,
        fpts: 1200,
        fpts_decimal: 10,
        fpts_against: 1001,
        fpts_against_decimal: 20,
      },
    },
  ];
  const { adapter } = loadSleeperAdapterWithFixtures(data);

  const standings = await adapter.fetchSleeperStandings("league-1", "user-1");

  assert.deepEqual(standings, [
    {
      rank: 1,
      team_id: "2",
      team_name: "Other Team",
      is_current_user: false,
      wins: 6,
      losses: 2,
      points_for: 1200.1,
      points_against: 1001.2,
    },
    {
      rank: 2,
      team_id: "7",
      team_name: "Current Team",
      is_current_user: true,
      wins: 6,
      losses: 2,
      points_for: 1142.4,
      points_against: 980.6,
    },
  ]);
});

test("lastResultFromMatchups returns W for the user's completed Sleeper matchup", () => {
  const { adapter } = loadSleeperAdapterWithFixtures(fixtures());

  const result = adapter.lastResultFromMatchups({
    leagueId: "league-1",
    week: 7,
    rosterId: 7,
    matchups: [
      { roster_id: 7, matchup_id: 3, points: 118.4 },
      { roster_id: 2, matchup_id: 3, points: 101.2 },
    ],
  });

  assert.deepEqual(result, {
    lastResult: "W",
    lastGameId: "league-1:7:3",
    lastGameKickoff: null,
  });
});

test("lastResultFromMatchups returns null result for tied Sleeper matchup", () => {
  const { adapter } = loadSleeperAdapterWithFixtures(fixtures());

  const result = adapter.lastResultFromMatchups({
    leagueId: "league-1",
    week: 7,
    rosterId: 7,
    matchups: [
      { roster_id: 7, matchup_id: 3, points: 101.2 },
      { roster_id: 2, matchup_id: 3, points: 101.2 },
    ],
  });

  assert.deepEqual(result, {
    lastResult: null,
    lastGameId: "league-1:7:3",
    lastGameKickoff: null,
  });
});

test("fetchSleeperMatchups caches by league/week (6h) so a second call doesn't refetch", async () => {
  const data = fixtures();
  data.matchups = [
    { roster_id: 7, matchup_id: 3, points: 118.4 },
    { roster_id: 2, matchup_id: 3, points: 101.2 },
  ];
  const { adapter, calls, store } = loadSleeperAdapterWithFixtures(data, { redis: true });

  const first = await adapter.fetchSleeperMatchups("league-1", 7);
  const second = await adapter.fetchSleeperMatchups("league-1", 7);

  assert.deepEqual(second, first);
  const matchupCalls = calls.filter((c) => c.url.includes("/matchups/"));
  assert.equal(matchupCalls.length, 1, "second call should be served from cache, not a live Sleeper request");
  assert.equal(store.size, 1);
});
