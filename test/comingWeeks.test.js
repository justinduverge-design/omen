"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { attachComingWeeks } = require("../src/services/comingWeeks");
const seasonEnd = require("../src/services/seasonEnd");
const { buildWaiverAnalysis } = require("../src/services/waiverAnalysis");

const PROJECTIONS = {
  7: { 10: 10, 20: 16, 30: 8 },
  8: { 10: 12, 20: 0, 30: 8 },
  9: { 10: 9, 20: 17 },
  10: { 10: 10, 20: 16, 30: 8 },
};
const deps = {
  fetchSleeperProjections: async (_season, week) => PROJECTIONS[week] || {},
  fetchSleeperPlayers: async () => ({
    10: { full_name: "Espn Back", position: "RB", espn_id: 555 },
    20: { full_name: "Yahoo Receiver", position: "WR", yahoo_id: 777 },
    30: { full_name: "Name Only", position: "TE" },
  }),
};

test("Sleeper: the coming weeks are Sleeper's own numbers, a bye or an out is 0", async () => {
  const players = [{ player_id: "20", projected_points: 16 }];
  await attachComingWeeks({ platform: "sleeper", players, week: 7, season: 2026, weeks: 4, deps });
  assert.deepEqual(players[0].projected_points_by_week, { 7: 16, 8: 0, 9: 17, 10: 16 });
});

test("ESPN and Yahoo keep the league's own scale; only the week-to-week shape comes from Sleeper", async () => {
  const espn = [{ player_id: "555", name: "Espn Back", position: "RB", projected_points: 15 }];
  await attachComingWeeks({ platform: "espn", players: espn, week: 7, season: 2026, weeks: 3, deps });
  assert.deepEqual(espn[0].projected_points_by_week, { 7: 15, 8: 18, 9: 13.5 });

  const yahoo = [{ player_id: "470.p.777", name: "Yahoo Receiver", position: "WR", projected_points: 8 }];
  await attachComingWeeks({ platform: "yahoo", players: yahoo, week: 7, season: 2026, weeks: 3, deps });
  assert.deepEqual(yahoo[0].projected_points_by_week, { 7: 8, 8: 0, 9: 8.5 });
});

test("a player with no provider id match is found by one unique name and position; a week with no row is left out", async () => {
  const players = [{ player_id: "x", name: "Name Only", position: "TE", projected_points: 8 }];
  await attachComingWeeks({ platform: "espn", players, week: 7, season: 2026, weeks: 3, deps });
  assert.deepEqual(players[0].projected_points_by_week, { 7: 8, 8: 8 });
});

test("the season end is read from each provider's settings", () => {
  assert.equal(
    seasonEnd.fromSleeper({ settings: { playoff_week_start: 15, playoff_teams: 6, playoff_round_type: 0 } }),
    17,
  );
  assert.equal(
    seasonEnd.fromSleeper({ settings: { playoff_week_start: 15, playoff_teams: 4, playoff_round_type: 1 } }),
    17,
  );
  assert.equal(seasonEnd.fromEspn({ scheduleSettings: { matchupPeriods: { 14: [14], 15: [15], 16: [16, 17] } } }), 17);
  assert.equal(seasonEnd.fromYahoo({ fantasy_content: { league: [{ end_week: "16" }, {}] } }), 16);
  assert.equal(seasonEnd.fromYahoo([{ end_week: 16 }]), 16);
  assert.equal(seasonEnd.fromSleeper({}), null);
});

function p(name, position, points, extra = {}) {
  return { player_key: name, name, position, eligible_positions: [position], projected_points: points, ...extra };
}

test("a pickup who is on bye next week is worth less than one who plays every week", () => {
  const roster = {
    week: 7,
    slots: {
      starters: [{ ...p("RB Starter", "RB", 8), selected_position: "RB" }],
      bench: [p("RB Bench", "RB", 2)],
    },
  };
  const pool = [
    p("Bye Next", "RB", 12, { acquisition: "free_agent", projected_points_by_week: { 7: 12, 8: 0, 9: 12 } }),
    p("Every Week", "RB", 11, { acquisition: "free_agent", projected_points_by_week: { 7: 11, 8: 11, 9: 11 } }),
  ];
  const result = buildWaiverAnalysis({
    roster,
    pool,
    platform: "sleeper",
    leagueId: "L",
    week: 7,
    availabilityConfirmed: true,
    lastPlayoffWeek: 9,
  });
  assert.equal(result.best_move.add.name, "Every Week");
});

const { findTradeCandidate, lineupWeeks } = require("../src/services/tradeLineup");

test("a trade is judged over the coming weeks: a receiver out after this week is worth one week of three, so the healthy receiver is the trade", () => {
  const SLOTS = ["WR", "RB"];
  const own = {
    roster_id: "me",
    players: [p("My RB", "RB", 6, { player_id: "a" }), p("My RB Two", "RB", 15, { player_id: "b" })],
  };
  const hurtSoon = p("WR Hurt Soon", "WR", 20, { player_id: "c", projected_points_by_week: { 7: 20, 8: 0, 9: 0 } });
  const opponent = {
    roster_id: "them",
    players: [hurtSoon, p("Their WR", "WR", 18, { player_id: "d", projected_points_by_week: { 7: 18, 8: 18, 9: 18 } })],
  };
  assert.deepEqual(lineupWeeks([own, opponent]), [7, 8, 9]);
  const thisWeekOnly = findTradeCandidate({
    ownTeam: own,
    opponentTeams: [opponent],
    rosterPositions: SLOTS,
    weeks: [],
  });
  const overWeeks = findTradeCandidate({ ownTeam: own, opponentTeams: [opponent], rosterPositions: SLOTS });
  // This week alone the 20-point receiver is the trade; over the three weeks he plays one, so the healthy one is.
  assert.equal(thisWeekOnly.receive.name, "WR Hurt Soon");
  assert.equal(overWeeks.receive.name, "Their WR");
  assert.deepEqual([overWeeks.userDelta, overWeeks.opponentDelta], [9, 3]);
});

test("with nobody to drop, a real upgrade is still the move, with the drop left empty", () => {
  const roster = {
    week: 7,
    slots: { starters: [{ ...p("RB Starter", "RB", 5), selected_position: "RB" }], bench: [] },
  };
  const result = buildWaiverAnalysis({
    roster,
    pool: [p("RB Wire", "RB", 12, { acquisition: "free_agent" })],
    platform: "sleeper",
    leagueId: "L",
    week: 7,
    availabilityConfirmed: true,
  });
  assert.equal(result.best_move.add.name, "RB Wire");
  assert.equal(result.best_move.drop, null);
});

test("the waiver window stops at the weeks the projections cover", () => {
  const { lineupHorizon } = require("../src/services/waiverAnalysis");
  assert.equal(lineupHorizon({ week: 5, lastPlayoffWeek: 17 }), 4);
  assert.equal(lineupHorizon({ week: 16, lastPlayoffWeek: 17 }), 2);
  assert.equal(lineupHorizon({ week: 5 }), 3);
});
