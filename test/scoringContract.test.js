"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  calculateContractScore,
  inspectScoringContract,
} = require("../src/services/scoringContract");

function contract(rules, coverage = "supported") {
  return {
    ruleset_version: "omen-scoring-contract-v1",
    coverage_state: coverage,
    rules,
  };
}

test("the same stat line grades differently under standard, half-PPR, and PPR contracts", () => {
  const facts = { receiving_yards: 60, receiving_receptions: 6 };
  const baseRules = [{ event_key: "receiving_yards", operator: "per_unit", unit: 10, value: 1 }];

  const standard = calculateContractScore(contract(baseRules), facts);
  const half = calculateContractScore(contract([...baseRules, { event_key: "receiving_receptions", operator: "per_event", value: 0.5 }]), facts);
  const ppr = calculateContractScore(contract([...baseRules, { event_key: "receiving_receptions", operator: "per_event", value: 1 }]), facts);

  assert.equal(standard.points, 6);
  assert.equal(half.points, 9);
  assert.equal(ppr.points, 12);
});

test("the engine composes offense, kicking, DST, IDP, threshold, and bonus rules", () => {
  const result = calculateContractScore(contract([
    { event_key: "passing_yards", operator: "per_unit", unit: 25, value: 1 },
    { event_key: "passing_touchdowns", operator: "per_event", value: 4 },
    { event_key: "field_goals_made_50_plus", operator: "per_event", value: 5 },
    { event_key: "defense_sacks", operator: "per_event", value: 1 },
    { event_key: "idp_solo_tackles", operator: "per_event", value: 1.5 },
    { event_key: "rushing_yards", operator: "threshold_bonus", threshold: 100, value: 3 },
    { event_key: "defense_points_allowed", operator: "range_event", min: 0, max: 0, value: 10 },
  ]), {
    passing_yards: 275,
    passing_touchdowns: 2,
    field_goals_made_50_plus: 1,
    defense_sacks: 3,
    idp_solo_tackles: 4,
    rushing_yards: 101,
    defense_points_allowed: 0,
  });

  assert.equal(result.points, 46);
  assert.equal(result.coverage_state, "supported");
});

test("an unknown rule is explicit unsupported coverage, never silently zero points", () => {
  const inspected = inspectScoringContract(contract([
    { event_key: "commissioner_mystery_rule", operator: "per_event", value: 9 },
  ]));

  assert.equal(inspected.coverage_state, "unsupported");
  assert.deepEqual(inspected.unsupported_event_keys, ["commissioner_mystery_rule"]);
  assert.throws(
    () => calculateContractScore(contract([
      { event_key: "commissioner_mystery_rule", operator: "per_event", value: 9 },
    ]), { commissioner_mystery_rule: 1 }),
    /unsupported scoring contract/,
  );
});

test("a provider-adjusted contract preserves the adjustment state instead of implying misconduct", () => {
  const inspected = inspectScoringContract(contract([
    { event_key: "receiving_yards", operator: "per_unit", unit: 10, value: 1 },
  ], "provider_adjusted"));

  assert.equal(inspected.coverage_state, "provider_adjusted");
  assert.equal(inspected.exact, false);
});
