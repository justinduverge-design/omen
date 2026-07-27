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
    // Real Sleeper shape, verified live 2026-07-26 against
    // GET /projections/nfl/{season}/{week}?season_type=regular&position[]=...
    //
    // This is an ARRAY of records with points nested under `stats`. A previous
    // fixture here used an object map keyed by player id with a flat `pts_ppr`,
    // which the live API has never returned — so these tests certified a shape
    // that does not exist and every live projection silently resolved to null.
    // Do not "simplify" this back into a map.
    projections: [
      { player_id: "100", stats: { pts_ppr: 18.4 } },
      { player_id: "200", stats: { pts_ppr: 21.2 } },
      { player_id: "300", stats: { pts_ppr: 12.1 } },
      { player_id: "500", stats: { pts_ppr: 6.6 } },
    ],
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

// Regression guards for the 2026-07-26 live projection-mapping defect. The
// live payload is an array with points under `stats`; reading it as an object
// map returned null for every player, and for low-numbered veteran ids a string
// key indexed the array by POSITION, resolving to a different player's record.
// The two defects masked each other — fixing only the nesting would have turned
// silent-null into silently-wrong points attributed to the wrong player.

test("projections map by player_id, not by array position", async () => {
  const data = fixtures();
  // Player "300" is third in this array. If the adapter indexes by position
  // instead of id, "300" would pick up 99.9 from the entry at index 300 (absent)
  // and, worse, low ids would match unrelated records. Ids here are chosen so a
  // positional read yields a visibly different number than the correct one.
  data.projections = [
    { player_id: "300", stats: { pts_ppr: 12.1 } },
    { player_id: "100", stats: { pts_ppr: 18.4 } },
    { player_id: "200", stats: { pts_ppr: 21.2 } },
    { player_id: "500", stats: { pts_ppr: 6.6 } },
  ];

  const { adapter } = loadSleeperAdapterWithFixtures(data);
  const roster = await adapter.buildNormalizedRoster("league-1", "testuser", 1);

  const byId = Object.fromEntries(
    [...roster.slots.starters, ...roster.slots.bench, ...roster.slots.ir]
      .map((p) => [p.player_id, p.projected_points]),
  );

  // Correct id-keyed values regardless of array order.
  assert.equal(byId["100"], 18.4);
  assert.equal(byId["200"], 21.2);
  assert.equal(byId["300"], 12.1);
  assert.equal(byId["500"], 6.6);
});

test("a player id that is a valid array index does not borrow another player's projection", async () => {
  const data = fixtures();
  // "1" is a legal index into this 3-entry array. A positional read would give
  // player "1" the 77.7 belonging to the entry at index 1.
  data.rosters[0].players = ["1"];
  data.rosters[0].starters = ["1"];
  data.rosters[0].reserve = [];
  data.players = {
    1: { player_id: "1", full_name: "Low Id Veteran", position: "QB", fantasy_positions: ["QB"], team: "KC" },
  };
  data.projections = [
    { player_id: "900", stats: { pts_ppr: 55.5 } },
    { player_id: "901", stats: { pts_ppr: 77.7 } },
    { player_id: "902", stats: { pts_ppr: 88.8 } },
  ];

  const { adapter } = loadSleeperAdapterWithFixtures(data);
  const roster = await adapter.buildNormalizedRoster("league-1", "testuser", 1);

  // Player "1" has no projection of its own. Absent is correct; 77.7 is the bug.
  assert.equal(roster.slots.starters[0].player_id, "1");
  assert.equal(roster.slots.starters[0].projected_points, null);
});

test("points are read from stats.pts_ppr, not a flat pts_ppr", async () => {
  const data = fixtures();
  data.projections = [
    // Flat `pts_ppr` is the shape the old fixture invented. Tolerated as a
    // fallback, but nested `stats` is what live returns and must win.
    { player_id: "100", stats: { pts_ppr: 18.4 }, pts_ppr: 999 },
  ];

  const { adapter } = loadSleeperAdapterWithFixtures(data);
  const roster = await adapter.buildNormalizedRoster("league-1", "testuser", 1);
  const starter = roster.slots.starters.find((p) => p.player_id === "100");

  assert.equal(starter.projected_points, 18.4);
});

// B2-D-S1 — available (waiver) player pool.
//
// Pool = active skill players from /players/nfl, minus every player rostered by
// ANY team in the league, joined to week projections. Sleeper has no dedicated
// free-agent endpoint, so the pool is derived. The correctness risk is the
// subtraction: missing a single roster silently offers an owned player as
// available, which would be presented as live advice.

function poolFixtures() {
  const data = fixtures();

  // Two teams. user-1 owns 100/200; user-2 owns 300. 400 and 500 are free.
  data.rosters = [
    { roster_id: 7, owner_id: "user-1", players: ["100", "200"], starters: ["100", "200"], reserve: [] },
    { roster_id: 8, owner_id: "user-2", players: ["300"], starters: ["300"], reserve: [] },
  ];

  data.players = {
    100: { player_id: "100", full_name: "Owned QB", position: "QB", fantasy_positions: ["QB"], team: "KC", active: true },
    200: { player_id: "200", full_name: "Owned RB", position: "RB", fantasy_positions: ["RB"], team: "BUF", active: true },
    300: { player_id: "300", full_name: "Rival WR", position: "WR", fantasy_positions: ["WR"], team: "NYJ", active: true },
    400: { player_id: "400", full_name: "Free WR", position: "WR", fantasy_positions: ["WR"], team: "DAL", active: true },
    500: { player_id: "500", full_name: "Free TE", position: "TE", fantasy_positions: ["TE"], team: "DET", active: true },
    600: { player_id: "600", full_name: "Retired K", position: "K", fantasy_positions: ["K"], team: null, active: false },
    700: { player_id: "700", full_name: "Head Coach", position: "HC", fantasy_positions: ["HC"], team: "MIA", active: true },
    800: { player_id: "800", full_name: "Unprojected WR", position: "WR", fantasy_positions: ["WR"], team: "SF", active: true },
  };

  data.projections = [
    { player_id: "400", stats: { pts_ppr: 11.2 } },
    { player_id: "500", stats: { pts_ppr: 14.8 } },
    { player_id: "300", stats: { pts_ppr: 20.0 } },
    // 800 deliberately has no projection.
  ];

  return data;
}

test("available pool excludes players rostered by ANY team, not just the user's", async () => {
  const { adapter } = loadSleeperAdapterWithFixtures(poolFixtures());
  const pool = await adapter.fetchSleeperAvailablePlayers("league-1", 1, "2026");
  const ids = pool.map((p) => p.player_id);

  assert.ok(!ids.includes("100"), "user's own player must not be offered");
  assert.ok(!ids.includes("200"), "user's own player must not be offered");
  assert.ok(!ids.includes("300"), "a rival team's player must not be offered as available");
});

test("available pool includes only active skill-position players", async () => {
  const { adapter } = loadSleeperAdapterWithFixtures(poolFixtures());
  const pool = await adapter.fetchSleeperAvailablePlayers("league-1", 1, "2026");
  const ids = pool.map((p) => p.player_id);

  assert.ok(!ids.includes("600"), "inactive player must be excluded");
  assert.ok(!ids.includes("700"), "non-skill position must be excluded");
  assert.deepEqual(ids.sort(), ["400", "500", "800"]);
});

test("available pool includes a fullback that is fantasy-eligible at RB", async () => {
  // Found against live data 2026-07-26: Sleeper lists fullbacks as position
  // "FB" with fantasy_positions ["RB"]. 74 active players (4 of them projected,
  // e.g. Kyle Juszczyk) are rosterable at RB but would be withheld by a
  // primary-position filter. Eligibility, not primary position, decides.
  const data = poolFixtures();
  data.players[900] = {
    player_id: "900",
    full_name: "Fantasy Eligible FB",
    position: "FB",
    fantasy_positions: ["RB"],
    team: "SF",
    active: true,
  };
  data.projections = [...data.projections, { player_id: "900", stats: { pts_ppr: 9.4 } }];

  const { adapter } = loadSleeperAdapterWithFixtures(data);
  const pool = await adapter.fetchSleeperAvailablePlayers("league-1", 1, "2026");
  const fb = pool.find((p) => p.player_id === "900");

  assert.ok(fb, "an FB with fantasy_positions [RB] must be available");
  assert.equal(fb.projected_points, 9.4);
  assert.deepEqual(fb.eligible_positions, ["RB"]);
});

test("available pool still excludes a position with no fantasy eligibility", async () => {
  const data = poolFixtures();
  data.players[901] = {
    player_id: "901",
    full_name: "Offensive Lineman",
    position: "OL",
    fantasy_positions: ["OL"],
    team: "SF",
    active: true,
  };

  const { adapter } = loadSleeperAdapterWithFixtures(data);
  const pool = await adapter.fetchSleeperAvailablePlayers("league-1", 1, "2026");

  assert.ok(!pool.map((p) => p.player_id).includes("901"));
});

test("available pool ranks by projected points, unprojected players last", async () => {
  const { adapter } = loadSleeperAdapterWithFixtures(poolFixtures());
  const pool = await adapter.fetchSleeperAvailablePlayers("league-1", 1, "2026");

  assert.deepEqual(pool.map((p) => p.player_id), ["500", "400", "800"]);
  assert.equal(pool[0].projected_points, 14.8);
  assert.equal(pool[1].projected_points, 11.2);
  assert.equal(pool[2].projected_points, null, "no projection must be null, never 0");
});

test("available pool returns the normalized player shape", async () => {
  const { adapter } = loadSleeperAdapterWithFixtures(poolFixtures());
  const pool = await adapter.fetchSleeperAvailablePlayers("league-1", 1, "2026");
  const top = pool[0];

  assert.equal(top.player_key, "sleeper:500");
  assert.equal(top.position, "TE");
  assert.equal(top.is_starter, false);
  assert.equal(top.selected_position, null);
  assert.deepEqual(top.eligible_positions, ["TE"]);
});

test("available pool is empty, not an error, when every eligible player is rostered", async () => {
  const data = poolFixtures();
  data.rosters = [
    { roster_id: 7, owner_id: "user-1", players: ["100", "200", "400", "500", "800"], starters: [], reserve: [] },
    { roster_id: 8, owner_id: "user-2", players: ["300"], starters: [], reserve: [] },
  ];

  const { adapter } = loadSleeperAdapterWithFixtures(data);
  const pool = await adapter.fetchSleeperAvailablePlayers("league-1", 1, "2026");

  assert.deepEqual(pool, []);
});

test("available pool tolerates a roster row with no players array", async () => {
  const data = poolFixtures();
  data.rosters = [
    { roster_id: 7, owner_id: "user-1", players: null, starters: [], reserve: [] },
    { roster_id: 8, owner_id: "user-2", players: ["300"], starters: [], reserve: [] },
  ];

  const { adapter } = loadSleeperAdapterWithFixtures(data);
  const pool = await adapter.fetchSleeperAvailablePlayers("league-1", 1, "2026");

  // A malformed roster must not throw and must not silently offer its players.
  assert.ok(!pool.map((p) => p.player_id).includes("300"));
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
