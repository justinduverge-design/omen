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
          const response = typeof opts.responseForRequest === "function"
            ? opts.responseForRequest(options, requests.length - 1)
            : { teams, schedule: opts.schedule };
          const body = JSON.stringify(response);
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

test("ESPN requests target the reads subdomain with the required headers", async () => {
  // fantasy.espn.com's own /apis/v3/... path redirects instead of serving
  // data, confirmed live 2026-07-07 against a real account with a valid
  // session and the correct league id (regular fetch() returned
  // type: "opaqueredirect"). lm-api-reads.fantasy.espn.com is what ESPN's
  // own frontend actually calls, and it requires these two headers or it
  // redirects the same way. This test only guards against silently
  // regressing back to the broken hostname/headers — it can't catch a
  // wrong-but-still-200 response, since the mock always returns canned data.
  const { adapter, requests } = loadEspnAdapterWithTeams(fixtureTeams());
  await adapter.buildNormalizedRoster("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].hostname, "lm-api-reads.fantasy.espn.com");
  assert.equal(requests[0].headers["x-fantasy-platform"], "espn-fantasy-web");
  assert.equal(requests[0].headers["x-fantasy-source"], "kona");
});

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

test("waiverPoolFromEspnData keeps only unrostered waiver candidates with projected stats", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);
  const pool = adapter.waiverPoolFromEspnData({
    players: [
      {
        playerPoolEntry: {
          onTeamId: 0,
          status: "FREEAGENT",
          player: {
            id: 2001,
            fullName: "Available WR",
            defaultPosition: 3,
            eligiblePositions: [3],
            proTeamAbbreviation: "KC",
            injuryStatus: "QUESTIONABLE",
            stats: [
              { statSourceId: 0, scoringPeriodId: 4, appliedTotal: 18.2 },
              { statSourceId: 1, scoringPeriodId: 4, appliedTotal: 12.4 },
            ],
          },
        },
      },
      {
        onTeamId: 7,
        status: "FREEAGENT",
        player: {
          id: 2002,
          fullName: "Rostered WR",
          defaultPosition: 3,
          stats: [{ statSourceId: 1, scoringPeriodId: 4, appliedTotal: 20 }],
        },
      },
      {
        onTeamId: 0,
        status: "ONTEAM",
        player: {
          id: 2003,
          fullName: "Unavailable RB",
          defaultPosition: 2,
          stats: [{ statSourceId: 1, scoringPeriodId: 4, appliedTotal: 16 }],
        },
      },
      {
        onTeamId: 0,
        status: "WAIVERS",
        player: {
          id: 2004,
          fullName: "Actuals Only TE",
          defaultPosition: 4,
          stats: [{ statSourceId: 0, scoringPeriodId: 4, appliedTotal: 9.3 }],
        },
      },
    ],
  }, { week: 4 });

  assert.deepEqual(pool, [
    {
      player_key: "espn:2001",
      player_id: "2001",
      name: "Available WR",
      position: "WR",
      eligible_positions: ["WR"],
      team: "KC",
      status: "Q",
      projected_points: 12.4,
    },
    {
      player_key: "espn:2004",
      player_id: "2004",
      name: "Actuals Only TE",
      position: "TE",
      eligible_positions: ["TE"],
      team: null,
      status: null,
      projected_points: null,
    },
  ]);
});

test("fetchEspnWaiverPool pages the filtered player pool without putting the filter in the URL", async () => {
  const availablePlayer = (id) => ({
    onTeamId: 0,
    status: "FREEAGENT",
    player: {
      id,
      fullName: `Available ${id}`,
      defaultPosition: 2,
      stats: [{ statSourceId: 1, scoringPeriodId: 4, appliedTotal: 8.5 }],
    },
  });
  const firstPage = Array.from({ length: 500 }, (_, index) => availablePlayer(3000 + index));
  const { adapter, requests } = loadEspnAdapterWithTeams([], {
    responseForRequest: (_request, index) => ({ players: index === 0 ? firstPage : [availablePlayer(4000)] }),
  });

  const pool = await adapter.fetchEspnWaiverPool(
    "12345", "test-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 4
  );

  assert.equal(pool.length, 501);
  assert.equal(requests.length, 2);
  assert.match(requests[0].path, /view=kona_player_info/);
  assert.match(requests[0].path, /scoringPeriodId=4/);
  assert.doesNotMatch(requests[0].path, /x-fantasy-filter/);
  assert.deepEqual(JSON.parse(requests[0].headers["x-fantasy-filter"]), {
    players: {
      filterStatus: { value: ["FREEAGENT", "WAIVERS"] },
      filterSlotIds: { value: [0, 2, 4, 6, 16, 17] },
      limit: 500,
      offset: 0,
      sortPercOwned: { sortAsc: false, sortPriority: 1 },
    },
  });
  assert.equal(JSON.parse(requests[1].headers["x-fantasy-filter"]).players.offset, 500);
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

/**
 * ESPN reported a null league name to every client.
 *
 * `buildLeagueStandings` has always requested `mSettings`, and the league's name has always
 * been in that response — it was simply never read, and `espnStandings()`/`espnOverview()`
 * built their envelopes without one. Sleeper and Yahoo both supplied it. On Android the null
 * surfaced as the literal word "null" under the team name on the Command Center; on iOS and
 * web the league was left unnamed.
 */
test("buildLeagueContext reads the league name ESPN already returns", async () => {
  const teams = [
    { id: 9, ownerId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", name: "Current Team", wins: 5, losses: 3 },
  ];
  const { adapter } = loadEspnAdapterWithTeams(teams, {
    responseForRequest: () => ({ teams, settings: { name: "The Titans of Slopsilonia" } }),
  });

  const context = await adapter.buildLeagueContext(
    "12345",
    "s2-cookie",
    "{SWID}",
    { seasonId: 2026, week: 1 }
  );

  assert.equal(context.league_name, "The Titans of Slopsilonia");
  assert.equal(context.standings.length, 1);
  assert.equal(context.standings[0].team_name, "Current Team");
});

test("a league with no usable name is null, never the string 'null'", async () => {
  const teams = [{ id: 9, name: "Current Team", wins: 1, losses: 0 }];
  for (const settings of [undefined, {}, { name: null }, { name: "" }, { name: "   " }]) {
    const { adapter } = loadEspnAdapterWithTeams(teams, {
      responseForRequest: () => ({ teams, settings }),
    });
    const context = await adapter.buildLeagueContext("12345", "s2", "{SWID}", { seasonId: 2026, week: 1 });
    assert.equal(context.league_name, null, `settings ${JSON.stringify(settings)} should yield null`);
  }
});

// --- 2026-09-06: rostered players came back with no projection at all -------
//
// `mRoster` ships projections as rows in `player.stats`, keyed by `scoringPeriodId` with
// `statSourceId: 1`. `normalizePlayer` read six flat fields — `entry.projectedPoints`,
// `player.projectedStats.appliedTotal` and friends — **none of which exist on that payload**,
// so every rostered player normalized to `projected_points: null`.
//
// Downstream, `Number(null) === 0` turned every one of them into a confident zero. Every
// lineup tied at 0.00, no swap could ever be an improvement, and Omen told the founder
// "No move clears the recommendation threshold this week" about a roster whose real week-1
// projections were sitting unread in the same HTTP response. Measured after the fix on a live
// league: 16 of 16 players projected, and a 126.16-point starting lineup.
//
// `projectedPointsForEspnPlayer` already existed and did exactly this — it was wired only to
// the waiver pool.
test("normalizePlayer reads the projection ESPN ships in player.stats for the requested week", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);
  {
    const data = {
      teams: [{
        id: 8,
        owners: ["{AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE}"],
        roster: {
          entries: [{
            playerId: 4432622,
            lineupSlotId: 2,
            playerPoolEntry: {
              player: {
                id: 4432622,
                fullName: "Jaxon Smith-Njigba",
                defaultPositionId: 3,
                eligibleSlots: [3, 4, 5, 23],
                stats: [
                  // The week we asked for.
                  { scoringPeriodId: 1, statSourceId: 1, statSplitTypeId: 1, appliedTotal: 18.92226009, seasonId: 2026 },
                  // Season-long projection — must NOT be mistaken for a weekly one.
                  { scoringPeriodId: 0, statSourceId: 1, statSplitTypeId: 0, appliedTotal: 326.67, seasonId: 2026 },
                  // Last season's actuals.
                  { scoringPeriodId: 0, statSourceId: 0, statSplitTypeId: 0, appliedTotal: 359.9, seasonId: 2025 },
                ],
              },
            },
          }],
        },
      }],
    };

    const roster = adapter.rosterFromEspnData(data, "517756847", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1, {});
    const player = [...roster.slots.starters, ...roster.slots.bench][0];

    assert.equal(player.name, "Jaxon Smith-Njigba");
    assert.equal(player.projected_points, 18.92226009);
  }
});

// `Number(null)` and `Number("")` are both 0, so a bare `Number.isFinite` check accepts an
// absent value as a real zero. A player we know nothing about must not outrank an empty slot.
test("firstFinite treats null and empty string as absent rather than as zero", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);
  {
    const data = (projected) => ({
      teams: [{
        id: 8,
        owners: ["{AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE}"],
        roster: { entries: [{ playerId: 1, lineupSlotId: 2, playerPoolEntry: { player: { id: 1, fullName: "P", defaultPositionId: 3, projectedPoints: projected } } }] },
      }],
    });

    const nulled = adapter.rosterFromEspnData(data(null), "1", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1, {});
    assert.equal([...nulled.slots.starters, ...nulled.slots.bench][0].projected_points, null);

    // A real zero is a real projection and survives.
    const zeroed = adapter.rosterFromEspnData(data(0), "1", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1, {});
    assert.equal([...zeroed.slots.starters, ...zeroed.slots.bench][0].projected_points, 0);
  }
});

// ---------------------------------------------------------------------------
// Matchup projections. `matchupFromEspnSchedule` hardwired `projected: null` for every ESPN
// side, so the Command Center's PROJ column showed an em dash for ESPN and Sleeper leagues
// while the Yahoo league beside them showed a number. Founder, 2026-09-06: "the matchup
// doesn't produce projections for all leagues, only Yahoo."
// ---------------------------------------------------------------------------

test("a matchup side falls back to ESPN's stated total when it ships no roster", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);
  // `totalProjectedPoints` — the server field. NOT `totalProjectedPointsLive`, which ESPN's own
  // client computes and assigns onto the model rather than receiving from the API.
  const schedule = [{
    matchupPeriodId: 3,
    home: { teamId: 9, totalPoints: 61.2, totalProjectedPoints: 118.4 },
    away: { teamId: 4, totalPoints: 58.0, totalProjectedPoints: 111.9 },
  }];

  const matchup = adapter.matchupFromEspnSchedule({ leagueId: "1", week: 3, teamId: "9", schedule });

  assert.equal(matchup.status, "live");
  assert.equal(matchup.you.projected, 118.4);
  assert.equal(matchup.opponent.projected, 111.9);
});

// ESPN's matchup header renders the client-summed `totalProjectedPointsLive`, not the server's
// `totalProjectedPoints`, so when both are available the sum is the number ESPN would show.
test("the starter sum wins over the stated total, matching what ESPN displays", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);
  const entry = (playerId, lineupSlotId, projected) => ({
    playerId,
    lineupSlotId,
    playerPoolEntry: {
      player: { id: playerId, fullName: `P${playerId}`, defaultPositionId: 3, stats: [
        { statSourceId: 1, scoringPeriodId: 3, appliedTotal: projected },
      ] },
    },
  });

  const schedule = [{
    matchupPeriodId: 3,
    home: {
      teamId: 9,
      totalPoints: 10,
      totalProjectedPoints: 999,
      rosterForCurrentScoringPeriod: { entries: [entry(1, 2, 12.5), entry(2, 4, 9.25)] },
    },
    away: { teamId: 4, totalPoints: 8, totalProjectedPoints: 111.9 },
  }];

  const matchup = adapter.matchupFromEspnSchedule({ leagueId: "1", week: 3, teamId: "9", schedule });

  assert.equal(matchup.you.projected, 21.75);
  // The side with no roster still gets the stated total. Sides are resolved independently.
  assert.equal(matchup.opponent.projected, 111.9);
});

// ESPN's football `lineupSlots` table marks exactly four rows `starter: false`: 20 BE, 21 IR,
// 22 INV and 25 ALL. The previous test was `slot !== "BN" && slot !== "IR"` against an
// abbreviation map that names ten of ESPN's twenty-six slots, so 22 and 25 counted as starters
// and every IDP slot fell through as "UNK".
test("only ESPN's own starter slots are summed", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);
  const entry = (playerId, lineupSlotId, projected) => ({
    playerId,
    lineupSlotId,
    playerPoolEntry: {
      player: { id: playerId, fullName: `P${playerId}`, defaultPositionId: 3, stats: [
        { statSourceId: 1, scoringPeriodId: 3, appliedTotal: projected },
      ] },
    },
  });

  const schedule = [{
    matchupPeriodId: 3,
    home: {
      teamId: 9,
      totalPoints: 0,
      rosterForCurrentScoringPeriod: { entries: [
        entry(1, 2, 12.5),    // RB     — starter
        entry(2, 4, 9.25),    // WR     — starter
        entry(3, 10, 4.0),    // LB     — starter (IDP; `LINEUP_SLOT_MAP` calls it "UNK")
        entry(4, 23, 6.25),   // FLEX   — starter
        entry(5, 20, 40.0),   // BE     — excluded
        entry(6, 21, 30.0),   // IR     — excluded
        entry(7, 22, 50.0),   // INV    — excluded (counted before this fix)
        entry(8, 25, 60.0),   // ALL    — excluded (counted before this fix)
      ] },
    },
    away: { teamId: 4, totalPoints: 0, rosterForCurrentScoringPeriod: { entries: [entry(9, 2, 20.0)] } },
  }];

  const matchup = adapter.matchupFromEspnSchedule({ leagueId: "1", week: 3, teamId: "9", schedule });

  assert.equal(matchup.you.projected, 32);
  assert.equal(matchup.opponent.projected, 20);
});

// A roster entry with no slot is not evidence of a starter. Guessing "yes" would inflate a
// projected total with a player ESPN is not counting — the one direction of error that produces
// a confident wrong number rather than an honest absence.
test("an entry with no lineup slot is not treated as a starter", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);
  assert.equal(adapter.isEspnStarterSlot(2), true);
  assert.equal(adapter.isEspnStarterSlot(10), true);
  assert.equal(adapter.isEspnStarterSlot(20), false);
  assert.equal(adapter.isEspnStarterSlot(21), false);
  assert.equal(adapter.isEspnStarterSlot(22), false);
  assert.equal(adapter.isEspnStarterSlot(25), false);
  assert.equal(adapter.isEspnStarterSlot(undefined), false);
  assert.equal(adapter.isEspnStarterSlot(null), false);
  assert.equal(adapter.isEspnStarterSlot("not-a-slot"), false);
});

// The whole reason `projected` stayed null for so long: ESPN publishes nothing before a
// season's first week goes live. Absence has to survive as absence — `Number(null) === 0`
// downstream turns a fabricated zero into a confident recommendation.
test("a side ESPN has no projection for is null, never a zero", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);
  const schedule = [{
    matchupPeriodId: 3,
    home: { teamId: 9, totalPoints: 0 },
    away: { teamId: 4, totalPoints: 0 },
  }];

  const matchup = adapter.matchupFromEspnSchedule({ leagueId: "1", week: 3, teamId: "9", schedule });

  assert.equal(matchup.you.projected, null);
  assert.equal(matchup.opponent.projected, null);
});

// A roster present but entirely unprojected is still absence, not zero.
test("a roster whose starters carry no projection is null, never a zero", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);
  const bare = (playerId, lineupSlotId) => ({
    playerId,
    lineupSlotId,
    playerPoolEntry: { player: { id: playerId, fullName: `P${playerId}`, defaultPositionId: 3, stats: [] } },
  });
  const schedule = [{
    matchupPeriodId: 3,
    home: { teamId: 9, totalPoints: 0, rosterForCurrentScoringPeriod: { entries: [bare(1, 2)] } },
    away: { teamId: 4, totalPoints: 0, rosterForCurrentScoringPeriod: { entries: [bare(2, 2)] } },
  }];

  const matchup = adapter.matchupFromEspnSchedule({ leagueId: "1", week: 3, teamId: "9", schedule });

  assert.equal(matchup.you.projected, null);
});

// `rosterForMatchupPeriod` is the other name ESPN's matchup-team model reads.
test("rosterForMatchupPeriod is read when rosterForCurrentScoringPeriod is absent", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);
  const entry = (playerId, lineupSlotId, projected) => ({
    playerId,
    lineupSlotId,
    playerPoolEntry: {
      player: { id: playerId, fullName: `P${playerId}`, defaultPositionId: 3, stats: [
        { statSourceId: 1, scoringPeriodId: 3, appliedTotal: projected },
      ] },
    },
  });
  const schedule = [{
    matchupPeriodId: 3,
    home: { teamId: 9, totalPoints: 0, rosterForMatchupPeriod: { entries: [entry(1, 2, 15.5)] } },
    away: { teamId: 4, totalPoints: 0, rosterForMatchupPeriod: { entries: [entry(2, 2, 11.0)] } },
  }];

  const matchup = adapter.matchupFromEspnSchedule({ leagueId: "1", week: 3, teamId: "9", schedule });

  assert.equal(matchup.you.projected, 15.5);
  assert.equal(matchup.opponent.projected, 11);
});

// `rosterFromEspnData` bucketed with `else slots.starters.push(...)` — a catch-all. Any slot
// `LINEUP_SLOT_MAP` did not name fell into starters, so ESPN's Invalid Player (22) and ALL (25)
// pseudo-slot reached the lineup optimizer as part of the user's starting lineup.
test("an Invalid Player or ALL slot is bucketed as bench, never as a starter", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);
  const entry = (playerId, lineupSlotId) => ({
    playerId,
    lineupSlotId,
    playerPoolEntry: { player: { id: playerId, fullName: `P${playerId}`, defaultPositionId: 3 } },
  });
  const data = {
    teams: [{
      id: 8,
      owners: ["{AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE}"],
      roster: { entries: [
        entry(1, 2),   // RB  — starter
        entry(2, 10),  // LB  — starter (IDP, unnamed in LINEUP_SLOT_MAP)
        entry(3, 20),  // BE  — bench
        entry(4, 21),  // IR  — ir
        entry(5, 22),  // INV — bench, NOT a starter
        entry(6, 25),  // ALL — bench, NOT a starter
      ] },
    }],
  };

  const roster = adapter.rosterFromEspnData(data, "1", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1, {});

  assert.deepEqual(roster.slots.starters.map((p) => p.player_id).sort(), ["1", "2"]);
  assert.deepEqual(roster.slots.ir.map((p) => p.player_id), ["4"]);
  assert.deepEqual(roster.slots.bench.map((p) => p.player_id).sort(), ["3", "5", "6"]);
});

// ESPN stores exactly what an owner typed, padding included. A live read on 2026-09-07 returned
// "    Love Thy Lamb" (four leading spaces) and "The Bijan Incident " (trailing). Untrimmed, the
// padding is laid out — a leading-space name renders visibly indented against every other row in
// the switcher. The `location + nickname` branch was already trimmed; `team.name` was not, and
// `team.name` is the branch that actually fires for these leagues.
test("team names are trimmed of the padding ESPN stores verbatim", () => {
  const { adapter } = loadEspnAdapterWithTeams([]);
  const data = { teams: [
    { id: 1, name: "    Love Thy Lamb", owners: ["{AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE}"] },
    { id: 2, name: "The Bijan Incident " },
    { id: 3, name: "A    B" },
    { id: 4, location: "  Team ", nickname: " Name  " },
  ] };
  const standings = adapter.standingsFromEspnData(data, "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}");
  const names = standings.map((t) => t.team_name);

  assert.ok(names.includes("Love Thy Lamb"), names.join(" | "));
  assert.ok(names.includes("The Bijan Incident"), names.join(" | "));
  // Interior runs collapse too: "A    B" is the same typing artifact, and no team means them.
  assert.ok(names.includes("A B"), names.join(" | "));
  assert.ok(names.includes("Team Name"), names.join(" | "));
  for (const n of names) assert.equal(n, n.trim(), `"${n}" still carries padding`);
});
