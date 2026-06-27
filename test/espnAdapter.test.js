"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
process.env.LOG_LEVEL ||= "error";

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

function loadEspnAdapterWithTeams(teams) {
  const adapterPath = require.resolve("../src/adapters/espn");
  delete require.cache[adapterPath];

  const { EventEmitter } = require("node:events");

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "https" && parent?.filename === adapterPath) {
      return {
        request: (_options, callback) => {
          const body = JSON.stringify({ teams });
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
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/adapters/espn");
  } finally {
    Module._load = originalLoad;
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
  const adapter = loadEspnAdapterWithTeams(fixtureTeams());
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
  const adapter = loadEspnAdapterWithTeams(fixtureTeams());
  const roster = await adapter.buildNormalizedRoster("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1);

  assert.equal(roster.slots.bench[0].selected_position, "BN");
  assert.equal(roster.slots.bench[0].is_starter, false);
});

test("lineupSlotId 21 goes into IR array", async () => {
  const adapter = loadEspnAdapterWithTeams(fixtureTeams());
  const roster = await adapter.buildNormalizedRoster("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1);

  assert.equal(roster.slots.ir[0].selected_position, "IR");
  assert.equal(roster.slots.ir[0].name, "IR WR");
});

test("ESPN QUESTIONABLE maps to Q", async () => {
  const adapter = loadEspnAdapterWithTeams(fixtureTeams());
  const roster = await adapter.buildNormalizedRoster("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1);

  assert.equal(roster.slots.bench[0].status, "Q");
});

test("ESPN ACTIVE maps to null", async () => {
  const adapter = loadEspnAdapterWithTeams(fixtureTeams());
  const roster = await adapter.buildNormalizedRoster("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1);

  assert.equal(roster.slots.starters[0].status, null);
});

test("missing projected points do not crash and produce null", async () => {
  const adapter = loadEspnAdapterWithTeams(fixtureTeams());
  const roster = await adapter.buildNormalizedRoster("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", 1);

  assert.equal(roster.slots.bench[0].projected_points, null);
});

test("player_key is prefixed with espn", async () => {
  const adapter = loadEspnAdapterWithTeams(fixtureTeams());
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
  const adapter = loadEspnAdapterWithTeams(teams);

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
  const adapter = loadEspnAdapterWithTeams([
    { id: 9, ownerId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", name: "Current Team" },
  ]);
  const result = await adapter.verifyLeagueAccess(
    "12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", null
  );
  assert.equal(result.team_id, "9");
  assert.equal(result.team_name, "Current Team");
});

test("verifyLeagueAccess throws 404 when team not found", async () => {
  const adapter = loadEspnAdapterWithTeams([
    { id: 99, ownerId: "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz", name: "Other Team" },
  ]);
  await assert.rejects(
    () => adapter.verifyLeagueAccess("12345", "espn-cookie", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", null),
    (err) => err.status === 404
  );
});

test("lastResultFromEspnSchedule returns W without exposing credentials", () => {
  const adapter = loadEspnAdapterWithTeams([]);

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
  const adapter = loadEspnAdapterWithTeams([]);

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
