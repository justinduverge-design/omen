"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
delete process.env.REDIS_URL;
delete process.env.REDIS_TOKEN;

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

function loadSleeperAdapterWithFixtures(fixtures) {
  const adapterPath = require.resolve("../src/adapters/sleeper");
  delete require.cache[adapterPath];

  const calls = [];
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "axios" && parent?.filename === adapterPath) {
      return {
        get: async (url, options = {}) => {
          calls.push({ url, options });
          if (url.includes("/user/testuser")) return { data: fixtures.user };
          if (url.includes("/league/league-1/rosters")) return { data: fixtures.rosters };
          if (url.includes("/league/league-1/users")) return { data: fixtures.users };
          if (url.includes("/league/league-1")) return { data: fixtures.league };
          if (url.includes("/players/nfl") && !url.includes("/projections/")) return { data: fixtures.players };
          if (url.includes("/projections/nfl/2026/1")) return { data: fixtures.projections };
          throw new Error(`Unexpected URL ${url}`);
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return {
      adapter: require("../src/adapters/sleeper"),
      calls,
    };
  } finally {
    Module._load = originalLoad;
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
