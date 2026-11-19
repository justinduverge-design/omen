"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { calculateContractScore, inspectScoringContract } = require("../src/services/scoringContract");
const { scoreStatLine: scoreFacts, SLEEPER_EVENT_MAP } = require("../src/services/scoringRuleSnapshot");
const { SCORING_PRESETS, scoreStatLine, scoreSleeperStatLine, sleeperStatLineToFacts, statLineToFacts } =
  require("../src/services/scoring/statLineScoring");

function contract(rules, coverage = "supported") {
  return {
    ruleset_version: "omen-scoring-contract-v1",
    coverage_state: coverage,
    rules,
  };
}

test("all projection aliases and all presets use the shared scorer", () => {
  const aliases = { passing_yards: "passing_yards", passing_tds: "passing_touchdowns",
    passing_interceptions: "passing_interceptions", rushing_yards: "rushing_yards",
    rushing_tds: "rushing_touchdowns", receptions: "receiving_receptions",
    receiving_yards: "receiving_yards", receiving_tds: "receiving_touchdowns", fumbles_lost: "fumbles_lost" };
  for (const [alias, event] of Object.entries(aliases)) {
    assert.equal(statLineToFacts({ [alias]: 3 })[event], 3, alias);
  }
  for (const [alias, mapping] of Object.entries(SLEEPER_EVENT_MAP)) {
    assert.deepEqual(sleeperStatLineToFacts({ [alias]: 3 }), { [mapping.event_key]: 3 }, alias);
  }
  for (const [name, expected] of [["standard", 8], ["half_ppr", 11], ["ppr", 14]]) {
    const line = { receptions: 6, receiving_yards: 80 };
    assert.equal(scoreStatLine(line, name), expected);
    assert.equal(scoreSleeperStatLine({ rec: 6, rec_yd: 80 }, name), expected);
    assert.equal(scoreFacts(statLineToFacts(line), SCORING_PRESETS[name]).points, expected);
  }
});

test("the scorer preserves contract operators and reports unsupported rules", () => {
  const rules = contract([
    { event_key: "passing_yards", operator: "per_unit", unit: 25, value: 1 },
    { event_key: "rushing_yards", operator: "threshold_bonus", threshold: 100, value: 3 },
    { event_key: "defense_points_allowed", operator: "range_event", min: 0, max: 6, value: 5 },
    { event_key: "mystery", operator: "per_event", value: 9 },
    { event_key: "passing_yards", operator: "mystery_operator", value: 1 },
  ]);
  assert.deepEqual(scoreFacts({ passing_yards: 250, rushing_yards: 100, defense_points_allowed: 3 }, rules),
    { points: 18, unmapped_rules: ["mystery", "passing_yards"] });
  assert.deepEqual(scoreFacts({ passing_yards: 0, rushing_yards: 0, defense_points_allowed: 0 }, rules),
    { points: 0, unmapped_rules: ["mystery", "passing_yards"] });
  assert.deepEqual(scoreFacts({ defense_points_allowed: 0, snaps: 1 }, rules),
    { points: 0, unmapped_rules: ["mystery", "passing_yards"] });
});

test("projection custom contracts retain zero-valued range behavior", () => {
  const custom = contract([{ event_key: "receiving_yards", operator: "range_event", min: 0, max: 0, value: 5 }]);
  assert.equal(scoreStatLine({}, custom), 5);
  assert.deepEqual(scoreFacts({ receiving_yards: 0 }, custom), { points: 0, unmapped_rules: [] });
});

test("zero-valued league rules do not make an all-zero scoring line nonzero", () => {
  const rules = contract([
    { event_key: "receiving_receptions", operator: "per_event", value: 0 },
    { event_key: "defense_points_allowed", operator: "range_event", min: 0, max: 0, value: 5 },
  ]);
  assert.deepEqual(scoreFacts({ receiving_receptions: 1, defense_points_allowed: 0 }, rules),
    { points: 0, unmapped_rules: [] });
});

test("the same stat line grades differently under standard, half-PPR, and PPR contracts", () => {
  const facts = { receiving_yards: 60, receiving_receptions: 6 };
  const baseRules = [{ event_key: "receiving_yards", operator: "per_unit", unit: 10, value: 1 }];

  const standard = calculateContractScore(contract(baseRules), facts);
  const half = calculateContractScore(
    contract([...baseRules, { event_key: "receiving_receptions", operator: "per_event", value: 0.5 }]),
    facts,
  );
  const ppr = calculateContractScore(
    contract([...baseRules, { event_key: "receiving_receptions", operator: "per_event", value: 1 }]),
    facts,
  );

  assert.equal(standard.points, 6);
  assert.equal(half.points, 9);
  assert.equal(ppr.points, 12);
});

test("the engine composes offense, kicking, DST, IDP, threshold, and bonus rules", () => {
  const result = calculateContractScore(
    contract([
      { event_key: "passing_yards", operator: "per_unit", unit: 25, value: 1 },
      { event_key: "passing_touchdowns", operator: "per_event", value: 4 },
      { event_key: "field_goals_made_50_plus", operator: "per_event", value: 5 },
      { event_key: "defense_sacks", operator: "per_event", value: 1 },
      { event_key: "idp_solo_tackles", operator: "per_event", value: 1.5 },
      { event_key: "rushing_yards", operator: "threshold_bonus", threshold: 100, value: 3 },
      { event_key: "defense_points_allowed", operator: "range_event", min: 0, max: 0, value: 10 },
    ]),
    {
      passing_yards: 275,
      passing_touchdowns: 2,
      field_goals_made_50_plus: 1,
      defense_sacks: 3,
      idp_solo_tackles: 4,
      rushing_yards: 101,
      defense_points_allowed: 0,
    },
  );

  assert.equal(result.points, 46);
  assert.equal(result.coverage_state, "supported");
});

test("an unknown rule is explicit unsupported coverage, never silently zero points", () => {
  const inspected = inspectScoringContract(
    contract([{ event_key: "commissioner_mystery_rule", operator: "per_event", value: 9 }]),
  );

  assert.equal(inspected.coverage_state, "unsupported");
  assert.deepEqual(inspected.unsupported_event_keys, ["commissioner_mystery_rule"]);
  assert.throws(
    () =>
      calculateContractScore(contract([{ event_key: "commissioner_mystery_rule", operator: "per_event", value: 9 }]), {
        commissioner_mystery_rule: 1,
      }),
    /unsupported scoring contract/,
  );
});

test("a provider-adjusted contract preserves the adjustment state instead of implying misconduct", () => {
  const inspected = inspectScoringContract(
    contract([{ event_key: "receiving_yards", operator: "per_unit", unit: 10, value: 1 }], "provider_adjusted"),
  );

  assert.equal(inspected.coverage_state, "provider_adjusted");
  assert.equal(inspected.exact, false);
});
