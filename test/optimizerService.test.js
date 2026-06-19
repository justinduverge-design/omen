"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const optimizer = require("../src/services/optimizer");

function roster() {
  return {
    slots: {
      starters: [{
        player_key: "starter-rb",
        name: "Starter RB",
        position: "RB",
        selected_position: "RB",
        eligible_positions: ["RB"],
        projected_points: 10,
      }],
      bench: [{
        player_key: "bench-rb",
        name: "Bench RB",
        position: "RB",
        eligible_positions: ["RB"],
        projected_points: 11,
      }],
    },
  };
}

test("optimizer defaults remain stable when no scoring config is supplied", () => {
  const recommendations = optimizer.evaluateLineup(roster());

  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].delta, 1);
});

test("optimizer consumes the scoring-config row as a direct parameter", () => {
  const scoringConfig = {
    scoring_format: "ppr",
    default_scoring_rules: {
      optimizer: { lineup_min_delta: 2 },
    },
  };

  assert.deepEqual(optimizer.evaluateLineup(roster(), scoringConfig), []);
});

test("explicit optimizer options override a separately supplied scoring config", () => {
  const scoringConfig = {
    default_scoring_rules: {
      optimizer: { lineup_min_delta: 2 },
    },
  };

  const recommendations = optimizer.evaluateLineup(
    roster(),
    { minDelta: Number.NEGATIVE_INFINITY },
    scoringConfig
  );

  assert.equal(recommendations.length, 1);
});

test("waiver recommendations honor configured delta and result limits", () => {
  const waiverPool = [
    { player_key: "waiver-rb-1", name: "Waiver RB One", position: "RB", projected_points: 13 },
    { player_key: "waiver-rb-2", name: "Waiver RB Two", position: "RB", projected_points: 12 },
  ];
  const scoringConfig = {
    default_scoring_rules: {
      optimizer: {
        waiver_min_delta: 4,
        waiver_limit: 1,
      },
    },
  };

  assert.deepEqual(optimizer.findWaiverMoves(roster(), waiverPool, scoringConfig), []);

  scoringConfig.default_scoring_rules.optimizer.waiver_min_delta = 2;
  const recommendations = optimizer.findWaiverMoves(roster(), waiverPool, scoringConfig);
  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].delta, 3);
});
