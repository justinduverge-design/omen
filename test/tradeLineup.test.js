"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { solveOptimalLineup, findTradeCandidate } = require("../src/services/tradeLineup");

function player(id, positions, points) {
  return {
    player_id: id,
    name: id,
    position: positions[0],
    eligible_positions: positions,
    projected_points: points,
  };
}

test("solveOptimalLineup fills constrained slots before flex and maximizes projection", () => {
  const result = solveOptimalLineup({
    players: [
      player("qb", ["QB"], 20),
      player("wr", ["WR"], 15),
      player("rb", ["RB"], 14),
      player("te", ["TE"], 9),
    ],
    rosterPositions: ["QB", "WR", "FLEX"],
  });

  assert.equal(result.total, 49);
  assert.deepEqual(result.starters.map((row) => row.player.player_id), ["qb", "wr", "rb"]);
});

test("solveOptimalLineup supports super-flex and leaves unprojected players out", () => {
  const result = solveOptimalLineup({
    players: [
      player("qb-one", ["QB"], 20),
      player("qb-two", ["QB"], 18),
      player("wr", ["WR"], 16),
      player("unknown", ["RB"], null),
    ],
    rosterPositions: ["QB", "SUPER_FLEX", "FLEX"],
  });

  assert.equal(result.total, 54);
  assert.deepEqual(result.starters.map((row) => row.player.player_id), ["qb-one", "qb-two", "wr"]);
});

test("solveOptimalLineup leaves an unfillable slot empty instead of inventing points", () => {
  const result = solveOptimalLineup({
    players: [player("qb", ["QB"], 20)],
    rosterPositions: ["QB", "TE"],
  });

  assert.equal(result.total, 20);
  assert.equal(result.starters[1].player, null);
});

test("solveOptimalLineup keeps IR and taxi players tradeable but out of starting totals", () => {
  const result = solveOptimalLineup({
    rosterPositions: ["RB", "WR"],
    players: [
      player("active-rb", ["RB"], 14),
      { ...player("ir-wr", ["WR"], 30), selected_position: "IR" },
      { ...player("taxi-wr", ["WR"], 25), selected_position: "TAXI" },
    ],
  });

  assert.equal(result.total, 14);
  assert.equal(result.starters[1].player, null);
});

test("findTradeCandidate keeps only a fair swap that improves both starting lineups", () => {
  const result = findTradeCandidate({
    ownTeam: { roster_id: "mine", players: [player("my-rb", ["RB"], 18), player("rb-one", ["RB"], 20), player("rb-two", ["RB"], 19), player("low-wr", ["WR"], 5)] },
    opponentTeams: [{ roster_id: "other", team_name: "Team 2", players: [player("their-wr", ["WR"], 12), player("wr-one", ["WR"], 20), player("wr-two", ["WR"], 19), player("low-rb", ["RB"], 5)] }],
    rosterPositions: ["RB", "RB", "WR"],
    fairnessGuard: () => true,
  });

  assert.ok(result);
  assert.ok(result.userDelta > 0);
  assert.ok(result.opponentDelta > 0);
});
