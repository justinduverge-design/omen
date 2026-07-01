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
    scoreboardsByWeek: {},
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
          return fixture.scoreboardsByWeek[Number(week)] || null;
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

test("fetchYahooHistoricalSummary treats a tied latest matchup as streak zero", async () => {
  const scoreboard = {
    matchups: {
      0: {
        matchup: {
          matchup_id: "m-7",
          teams: [
            { team_key: "449.l.1.t.7", team_points: { total: "101.2" } },
            { team_key: "449.l.1.t.2", team_points: { total: "101.2" } },
          ],
        },
      },
    },
  };
  const { adapter } = loadYahooAdapterWithFixtures(fixtures({
    scoreboardsByWeek: { 7: scoreboard },
  }));

  const result = await adapter.fetchYahooHistoricalSummary({
    client: {
      getLeagueScoreboard: async (_leagueKey, week) => (week === 7 ? scoreboard : null),
    },
    leagueKey: "449.l.1",
    teamKey: "449.l.1.t.7",
    season: 2026,
    week: 7,
  });

  assert.deepEqual(result, {
    lastResult: null,
    lastGameId: "m-7",
    lastGameKickoff: null,
    currentWinStreak: 0,
  });
});

test("fetchYahooDraft normalizes Yahoo draft results into lazy-sync shape", async () => {
  const { adapter } = loadYahooAdapterWithFixtures(fixtures());
  const draft = await adapter.fetchYahooDraft({
    leagueKey: "449.l.12345",
    client: {
      getLeagueDraftResults: async () => ({
        league_key: "449.l.12345",
        name: "Test League",
        season: 2026,
        draft_status: "predraft",
        num_teams: 3,
        is_finished: 0,
        draft_results: [
          { pick: 1, round: 1, team_key: "449.l.12345.t.7", player_key: "449.p.1001" },
          { pick: 2, round: 1, team_key: "449.l.12345.t.2", player_key: "449.p.1002" },
          { pick: 3, round: 1, team_key: "449.l.12345.t.9", player_key: "449.p.1003" },
          { pick: 4, round: 2, team_key: "449.l.12345.t.9", player_key: "449.p.1004" },
        ],
      }),
      getLeagueSettings: async () => ({
        draft_time: "2026-08-24T19:00:00Z",
        draft_type: "snake",
        roster_positions: [
          { position: "QB", count: 1 },
          { position: "RB", count: 2 },
          { position: "WR", count: 2 },
        ],
      }),
      getPlayerDetails: async () => ([
        {
          player_key: "449.p.1001",
          player_id: "1001",
          name: { full: "Pat Mahomes", first: "Pat", last: "Mahomes" },
          editorial_team_abbr: "KC",
          display_position: "QB",
          eligible_positions: [{ position: "QB" }],
          status: null,
        },
        {
          player_key: "449.p.1002",
          player_id: "1002",
          name: { full: "Ja'Marr Chase", first: "Ja'Marr", last: "Chase" },
          editorial_team_abbr: "CIN",
          display_position: "WR",
          eligible_positions: [{ position: "WR" }],
          status: null,
        },
        {
          player_key: "449.p.1003",
          player_id: "1003",
          name: { full: "Bijan Robinson", first: "Bijan", last: "Robinson" },
          editorial_team_abbr: "ATL",
          display_position: "RB",
          eligible_positions: [{ position: "RB" }],
          status: null,
        },
        {
          player_key: "449.p.1004",
          player_id: "1004",
          name: { full: "Amon-Ra St. Brown", first: "Amon-Ra", last: "St. Brown" },
          editorial_team_abbr: "DET",
          display_position: "WR",
          eligible_positions: [{ position: "WR" }],
          status: null,
        },
      ]),
      getMyTeamKey: async () => "449.l.12345.t.7",
    },
  });

  assert.equal(draft.draft_id, "yahoo:449.l.12345");
  assert.equal(draft.type, "snake");
  assert.equal(draft.user_draft_slot, 1);
  assert.deepEqual(draft.slot_to_roster_id, {
    1: "449.l.12345.t.7",
    2: "449.l.12345.t.2",
    3: "449.l.12345.t.9",
  });
  assert.equal(draft.picks.length, 4);
  assert.equal(draft.picks[0].is_user_pick, true);
  assert.equal(draft.picks[3].draft_slot, 3);
  assert.deepEqual(draft.picks[0].metadata, {
    first_name: "Pat",
    last_name: "Mahomes",
    team: "KC",
    position: "QB",
    status: null,
    injury_status: null,
    years_exp: null,
  });
});
