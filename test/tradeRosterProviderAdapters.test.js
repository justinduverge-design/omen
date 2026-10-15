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

test("fetchYahooLeagueRosters enriches the whole league with source-labelled projections before Trade scans it", async () => {
  const yahooAdapterPath = require.resolve("../src/adapters/yahoo");
  const yahooServicePath = require.resolve("../src/services/yahoo");
  const yahooProjectionsPath = require.resolve("../src/services/yahooProjections");
  const originalYahooService = require.cache[yahooServicePath];
  const originalYahooProjections = require.cache[yahooProjectionsPath];
  delete require.cache[yahooAdapterPath];

  class FakeYahooClient {
    async getCurrentWeek() { return 5; }
    async getLeagueStandings() {
      return [
        { team_id: "411.l.1.t.1", team_name: "Own Team" },
        { team_id: "411.l.1.t.2", team_name: "Rival Team" },
      ];
    }
    async getRoster(teamKey) {
      const playerID = teamKey.endsWith(".1") ? "101" : "202";
      return {
        fantasy_content: {
          team: [
            [],
            { roster: { "0": { players: {
              "0": { player: [[
                { player_key: `${teamKey}.p.${playerID}` },
                { player_id: playerID },
                { name: { full: `Player ${playerID}` } },
                { eligible_positions: [{ position: "WR" }] },
              ], { selected_position: { position: "WR" } }] },
              count: 1,
            } } } },
          ],
        },
      };
    }
  }

  let enrichedPlayers = null;
  require.cache[yahooServicePath] = {
    id: yahooServicePath,
    filename: yahooServicePath,
    loaded: true,
    exports: FakeYahooClient,
  };
  require.cache[yahooProjectionsPath] = {
    id: yahooProjectionsPath,
    filename: yahooProjectionsPath,
    loaded: true,
    exports: {
      enrichYahooPlayers: async (players) => {
        enrichedPlayers = players;
        for (const [index, player] of players.entries()) {
          player.projected_points = 10 + index;
          player.projection_source = "sleeper_public_projections";
          player.projection_basis = "league_scoring";
        }
        return {
          available: true,
          source: "sleeper_public_projections",
          scoring_basis: "league_scoring",
          players_total: players.length,
          players_with_projection: players.length,
          reason: null,
        };
      },
    },
  };

  try {
    const yahooAdapter = require("../src/adapters/yahoo");
    const result = await yahooAdapter.fetchYahooLeagueRosters("411.l.1", "token", 5);

    assert.equal(enrichedPlayers.length, 2, "the enrichment receives players from every team");
    assert.deepEqual(
      result.teams.flatMap((team) => team.players).map((player) => player.projected_points),
      [10, 11],
      "the enriched values are the values Find receives from the adapter"
    );
    assert.ok(result.teams.flatMap((team) => team.players).every(
      (player) => player.projection_source === "sleeper_public_projections"
    ));
    assert.deepEqual(result.projection_meta, {
      available: true,
      source: "sleeper_public_projections",
      scoring_basis: "league_scoring",
      players_total: 2,
      players_with_projection: 2,
      reason: null,
    });
  } finally {
    delete require.cache[yahooAdapterPath];
    if (originalYahooService) require.cache[yahooServicePath] = originalYahooService;
    else delete require.cache[yahooServicePath];
    if (originalYahooProjections) require.cache[yahooProjectionsPath] = originalYahooProjections;
    else delete require.cache[yahooProjectionsPath];
  }
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
  // The failed read is flagged, so it is never mistaken for a genuinely empty roster.
  assert.equal(result.teams[0].read_status, "ok");
  assert.equal(result.teams[1].read_status, "unreadable");
  assert.deepEqual(result.unreadable_team_ids, ["t.2"]);

  delete require.cache[yahooServicePath];
  delete require.cache[yahooAdapterPath];
});

test("evaluateTradeForConnection skips an unreadable Yahoo team instead of treating it as an empty roster", async () => {
  const { evaluateTradeForConnection } = require("../src/services/omenTradeCandidate");
  const teams = [
    { team_id: "t.1", team_name: "Own", players: [], read_status: "unreadable" },
    { team_id: "t.2", team_name: "Rival", players: [], read_status: "unreadable" },
  ];
  const adapters = { yahoo: { fetchYahooLeagueRosters: async () => ({ teams, roster_positions: ["QB"] }) } };
  const roster = { week: 5, team_key: "t.1", slots: { starters: [{ projected_points: 10 }], bench: [] } };
  const result = await evaluateTradeForConnection({
    connection: { platform: "yahoo", league_id: "411.l.1" },
    roster,
    deps: { adapters, yahooAuth: { accessToken: "x" } },
  });
  // Own roster unreadable: honest unavailable, never "no trade found".
  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "rosters_unreadable");

  // Only an opponent unreadable: the others are still searched and the skipped one is counted.
  const mk = (id, pos, pts) => ({ player_id: id, player_key: id, position: pos, eligible_positions: [pos], projected_points: pts });
  const mixed = [
    { team_id: "t.1", players: [mk("r1", "RB", 5), mk("w1", "WR", 15), mk("w2", "WR", 14)], read_status: "ok" },
    { team_id: "t.2", players: [], read_status: "unreadable" },
    { team_id: "t.3", players: [mk("r2", "RB", 15), mk("r3", "RB", 14), mk("w3", "WR", 4)], read_status: "ok" },
  ];
  const mixedAdapters = { yahoo: { fetchYahooLeagueRosters: async () => ({ teams: mixed, roster_positions: ["RB", "WR"] }) } };
  const ok = await evaluateTradeForConnection({
    connection: { platform: "yahoo", league_id: "411.l.1" },
    roster: { week: 5, team_key: "t.1", slots: { starters: [{ projected_points: 10 }], bench: [] } },
    deps: { adapters: mixedAdapters, yahooAuth: { accessToken: "x" } },
  });
  assert.equal(ok.status, "candidate");
  assert.equal(ok.teams_checked, 1);
  assert.equal(ok.teams_unreadable, 1);
});

test("ESPN carries provider lock flags and Trade never proposes a trade-locked player", () => {
  const { findTradeCandidate } = require("../src/services/tradeLineup");
  const mk = (id, position, pts, extra = {}) => ({ player_id: id, player_key: id, name: id, position, eligible_positions: [position], projected_points: pts, ...extra });
  const own = { roster_id: "a", players: [mk("r1", "RB", 5), mk("w1", "WR", 15), mk("w2", "WR", 14)] };
  const mkOpp = (locked) => ({ roster_id: "b", players: [mk("r2", "RB", 15, { trade_locked: locked }), mk("r3", "RB", 14), mk("w3", "WR", 4)] });
  const run = (opp) => findTradeCandidate({ ownTeam: own, opponentTeams: [opp], rosterPositions: ["RB", "WR"] });
  const open = run(mkOpp(false));
  const locked = run(mkOpp(true));
  assert.equal(open.receive.player_id, "r2", "control: the best RB upgrade is the unlocked r2");
  assert.notEqual(locked && locked.receive.player_id, "r2", "a trade-locked player is never the one Omen proposes to receive");
});

test("ESPN roster normalization reads lineup/roster/trade lock flags; absent means not locked", () => {
  const { leagueRostersFromEspnSchedule } = require("../src/adapters/espn");
  const entry = (id, flags) => ({ playerId: id, lineupSlotId: 0, ...flags, playerPoolEntry: { player: { id, fullName: `P${id}`, defaultPositionId: 1 } } });
  const data = { teams: [{ id: 1 }], schedule: [{ matchupPeriodId: 5, home: { teamId: 1, rosterForCurrentScoringPeriod: { entries: [entry(1, { tradeLocked: true, lineupLocked: true }), entry(2, {})] } } }] };
  const [team] = leagueRostersFromEspnSchedule(data, 5).teams;
  assert.equal(team.players[0].trade_locked, true);
  assert.equal(team.players[0].lineup_locked, true);
  assert.equal(team.players[1].trade_locked, false);
});

test("league starting slots come from provider settings, in names the lineup solver fills", () => {
  const { rosterPositionsFromEspnSettings } = require("../src/adapters/espn");
  const { rosterPositionsFromYahooSettings } = require("../src/adapters/yahoo");
  const { solveOptimalLineup } = require("../src/services/tradeLineup");
  assert.deepEqual(
    rosterPositionsFromEspnSettings({ settings: { rosterSettings: { lineupSlotCounts: { 0: 1, 2: 2, 4: 2, 6: 1, 17: 1, 20: 6, 21: 1, 23: 1, 16: 0 } } } }),
    ["QB", "RB", "RB", "WR", "WR", "TE", "K", "FLEX"]
  );
  assert.deepEqual(rosterPositionsFromEspnSettings({}), []);
  const yahooSettings = [{ league_key: "x" }, { settings: [{ roster_positions: [
    { roster_position: { position: "QB", count: 1, is_starting_position: 1 } },
    { roster_position: { position: "RB", count: 2, is_starting_position: 1 } },
    { roster_position: { position: "W/R/T", count: 1, is_starting_position: 1 } },
    { roster_position: { position: "BN", count: 5, is_starting_position: 0 } },
  ] }] }];
  const slots = rosterPositionsFromYahooSettings(yahooSettings);
  assert.deepEqual(slots, ["QB", "RB", "RB", "W/R/T"]);
  // Yahoo's flex slot is actually filled by an eligible player.
  const mk = (id, position, pts) => ({ player_id: id, player_key: id, position, eligible_positions: [position], projected_points: pts });
  const lineup = solveOptimalLineup({ players: [mk("q", "QB", 20), mk("a", "RB", 10), mk("b", "RB", 9), mk("c", "WR", 8)], rosterPositions: slots });
  assert.equal(lineup.total, 47, "the WR fills W/R/T");
});
