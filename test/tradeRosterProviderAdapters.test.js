"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
process.env.LOG_LEVEL ||= "error";

const assert = require("node:assert/strict");
const test = require("node:test");

const espnAdapter = require("../src/adapters/espn");

// Fixture data only — no live ESPN network call, per the hazard already paid for in this
// project (fixtures over live traffic for a provider whose shapes have burned this repo
// before).
test("leagueRostersFromEspnSchedule walks the WHOLE schedule, not just the caller's own matchup", () => {
  const entry = (playerId, lineupSlotId) => ({
    playerId,
    lineupSlotId,
    playerPoolEntry: { player: { id: playerId, fullName: `Player ${playerId}`, defaultPositionId: 2, stats: [] } },
  });

  const data = {
    teams: [
      { id: 1, location: "Own", nickname: "Team" },
      { id: 2, location: "Rival", nickname: "One" },
      { id: 3, location: "Rival", nickname: "Two" },
      { id: 4, location: "Rival", nickname: "Three" },
    ],
    schedule: [
      {
        matchupPeriodId: 3,
        home: { teamId: 1, rosterForCurrentScoringPeriod: { entries: [entry(101, 2)] } },
        away: { teamId: 2, rosterForCurrentScoringPeriod: { entries: [entry(201, 2)] } },
      },
      {
        matchupPeriodId: 3,
        home: { teamId: 3, rosterForCurrentScoringPeriod: { entries: [entry(301, 2)] } },
        away: { teamId: 4, rosterForCurrentScoringPeriod: { entries: [entry(401, 2)] } },
      },
    ],
  };

  const result = espnAdapter.leagueRostersFromEspnSchedule(data, 3);

  // All four teams, not just the two sides of the caller's own game.
  assert.equal(result.teams.length, 4);
  const byId = Object.fromEntries(result.teams.map((t) => [t.team_id, t]));
  assert.equal(byId["1"].team_name, "Own Team");
  assert.equal(byId["3"].team_name, "Rival Two");
  assert.equal(byId["3"].players[0].name, "Player 301");
  assert.equal(byId["4"].players[0].name, "Player 401");
});

test("leagueRostersFromEspnSchedule ignores games outside the requested week", () => {
  const entry = (playerId) => ({
    playerId,
    lineupSlotId: 2,
    playerPoolEntry: { player: { id: playerId, fullName: `Player ${playerId}`, defaultPositionId: 2, stats: [] } },
  });
  const data = {
    teams: [{ id: 1, location: "A", nickname: "" }, { id: 2, location: "B", nickname: "" }],
    schedule: [
      { matchupPeriodId: 1, home: { teamId: 1, rosterForCurrentScoringPeriod: { entries: [entry(1)] } }, away: { teamId: 2, rosterForCurrentScoringPeriod: { entries: [entry(2)] } } },
    ],
  };
  const result = espnAdapter.leagueRostersFromEspnSchedule(data, 3);
  // No game matches week 3, but `mTeam` still lists both teams — the defensive fallback
  // still returns them (empty rosters via rosterEntries()), never silently drops a team.
  assert.equal(result.teams.length, 2);
  assert.deepEqual(result.teams.map((t) => t.players.length), [0, 0]);
});

test("leagueRostersFromEspnSchedule never carries espn_s2/SWID onto the wire", () => {
  const data = {
    teams: [{ id: 1, location: "A", nickname: "" }],
    schedule: [{ matchupPeriodId: 1, home: { teamId: 1, rosterForCurrentScoringPeriod: { entries: [] } }, away: { teamId: 2, rosterForCurrentScoringPeriod: { entries: [] } } }],
  };
  const result = espnAdapter.leagueRostersFromEspnSchedule(data, 1);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("espn_s2"), false);
  assert.equal(serialized.toLowerCase().includes("swid"), false);
});

// Yahoo's `fetchYahooLeagueRosters` composes `getLeagueStandings` + `getRoster`, both on
// YahooClient. Stub the class rather than hit the network — same discipline as the ESPN
// fixture tests above.
test("fetchYahooLeagueRosters reads every team's roster by composing standings + per-team getRoster", async () => {
  const yahooAdapterPath = require.resolve("../src/adapters/yahoo");
  const yahooServicePath = require.resolve("../src/services/yahoo");
  delete require.cache[yahooAdapterPath];

  const rosterCallsByTeam = [];

  class FakeYahooClient {
    constructor(accessToken) {
      this.accessToken = accessToken;
    }
    async getCurrentWeek() { return 5; }
    async getLeagueStandings() {
      return [
        { team_id: "411.l.1.t.1", team_name: "Own Team" },
        { team_id: "411.l.1.t.2", team_name: "Rival Team" },
      ];
    }
    async getRoster(teamKey, week) {
      rosterCallsByTeam.push({ teamKey, week });
      return {
        fantasy_content: {
          team: [
            [],
            {
              roster: {
                "0": {
                  players: {
                    "0": {
                      player: [
                        [{ player_key: `${teamKey}:p1` }, { player_id: "1" }, { name: { full: `Player of ${teamKey}` } }, { eligible_positions: [{ position: "WR" }] }],
                        { selected_position: { position: "WR" } },
                      ],
                    },
                    count: 1,
                  },
                },
              },
            },
          ],
        },
      };
    }
  }

  require.cache[yahooServicePath] = {
    id: yahooServicePath,
    filename: yahooServicePath,
    loaded: true,
    exports: FakeYahooClient,
  };

  const yahooAdapter = require("../src/adapters/yahoo");

  const result = await yahooAdapter.fetchYahooLeagueRosters("411.l.1", "access-token-fixture", 5);

  assert.equal(result.teams.length, 2);
  assert.equal(result.teams[1].team_id, "411.l.1.t.2");
  assert.equal(result.teams[1].team_name, "Rival Team");
  assert.equal(result.teams[1].players[0].name, "Player of 411.l.1.t.2");
  // Both teams actually read, not just the caller's own.
  assert.deepEqual(rosterCallsByTeam.map((c) => c.teamKey), ["411.l.1.t.1", "411.l.1.t.2"]);

  delete require.cache[yahooServicePath];
  delete require.cache[yahooAdapterPath];
});

test("fetchYahooLeagueRosters does not fail the whole read when one team's roster call throws", async () => {
  const yahooAdapterPath = require.resolve("../src/adapters/yahoo");
  const yahooServicePath = require.resolve("../src/services/yahoo");
  delete require.cache[yahooAdapterPath];

  class FlakyYahooClient {
    async getCurrentWeek() { return 5; }
    async getLeagueStandings() {
      return [
        { team_id: "t.1", team_name: "Own Team" },
        { team_id: "t.2", team_name: "Rival Team" },
      ];
    }
    async getRoster(teamKey) {
      if (teamKey === "t.2") throw new Error("yahoo 500");
      return { fantasy_content: { team: [[], { roster: { "0": { players: { count: 0 } } } }] } };
    }
  }

  require.cache[yahooServicePath] = {
    id: yahooServicePath,
    filename: yahooServicePath,
    loaded: true,
    exports: FlakyYahooClient,
  };

  const yahooAdapter = require("../src/adapters/yahoo");
  const result = await yahooAdapter.fetchYahooLeagueRosters("411.l.1", "token", 5);

  assert.equal(result.teams.length, 2);
  assert.deepEqual(result.teams[1].players, []);

  delete require.cache[yahooServicePath];
  delete require.cache[yahooAdapterPath];
});
