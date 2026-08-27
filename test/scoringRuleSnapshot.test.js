"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  canonicalize,
  deriveScoringSnapshot,
  deriveSleeperRules,
  hashOf,
} = require("../src/services/scoringRuleSnapshot");
const { calculateContractScore } = require("../src/services/scoringContract");
const {
  RECONCILIATION_STATES,
  reconcileMoveScoring,
} = require("../src/services/scoringReconciliation");

const HALF_PPR = {
  pass_yd: 0.04, pass_td: 4, pass_int: -2,
  rush_yd: 0.1, rush_td: 6,
  rec: 0.5, rec_yd: 0.1, rec_td: 6,
  fum_lost: -2,
};

// --- Sleeper derivation -----------------------------------------------------

test("a fully mapped Sleeper league derives a supported contract", () => {
  const snapshot = deriveScoringSnapshot({ platform: "sleeper", leagueSettings: HALF_PPR });

  assert.equal(snapshot.coverage_state, "supported");
  assert.deepEqual(snapshot.unmapped_rules, []);
  assert.equal(snapshot.contract.ruleset_version, "omen-scoring-contract-v1");
  assert.equal(snapshot.provider_rule_count, 9);
  assert.deepEqual(snapshot.unsupported_event_keys, []);
});

test("standard, half-PPR, and PPR leagues derive different contracts that score differently", () => {
  const facts = { receiving_receptions: 6, receiving_yards: 60, receiving_touchdowns: 1 };
  const points = (rec) => {
    const snapshot = deriveScoringSnapshot({
      platform: "sleeper",
      leagueSettings: { rec, rec_yd: 0.1, rec_td: 6 },
    });
    assert.equal(snapshot.coverage_state, "supported");
    return calculateContractScore(snapshot.contract, facts).points;
  };

  assert.equal(points(0), 12);    // standard: 60 yards + 1 TD
  assert.equal(points(0.5), 15);  // half PPR: + 3
  assert.equal(points(1), 18);    // PPR: + 6
});

test("a zero-valued reception rule is kept, because standard scoring is literally rec: 0", () => {
  const { rules } = deriveSleeperRules({ rec: 0, rec_yd: 0.1 });
  const reception = rules.find((rule) => rule.event_key === "receiving_receptions");

  assert.ok(reception, "the rule must survive, not be pruned as falsy");
  assert.equal(reception.value, 0);
});

test("an unmapped non-zero rule makes the whole contract ambiguous rather than being dropped", () => {
  const snapshot = deriveScoringSnapshot({
    platform: "sleeper",
    leagueSettings: { ...HALF_PPR, bonus_rec_te: 0.5, some_future_sleeper_key: 3 },
  });

  assert.equal(snapshot.coverage_state, "ambiguous");
  assert.deepEqual(snapshot.unmapped_rules, ["bonus_rec_te", "some_future_sleeper_key"]);
  assert.match(snapshot.reason, /cannot reproduce 2 of this league's scoring rules/);
});

test("an unmapped rule worth zero points does not make the contract ambiguous", () => {
  const snapshot = deriveScoringSnapshot({
    platform: "sleeper",
    leagueSettings: { ...HALF_PPR, bonus_rec_te: 0 },
  });

  assert.equal(snapshot.coverage_state, "supported");
});

test("banded field goals become per-band COUNT rules, not a yardage range", () => {
  // This previously asserted `range_event` rules keyed on `field_goals_made`, treating the
  // fact as the yardage of one kick. That model was silently wrong while still reporting
  // `supported`: a kicker who made two field goals supplies `field_goals_made: 2`, which
  // fell in the 0-19 band and scored as a 2-yard kick.
  const { rules } = deriveSleeperRules({ fgm_0_19: 3, fgm_20_29: 3, fgm_30_39: 3, fgm_40_49: 4, fgm_50p: 5 });
  const bands = rules.filter((rule) => rule.event_key.startsWith("field_goals_made"));

  assert.deepEqual(
    bands.map((b) => [b.event_key, b.operator, b.value]),
    [
      ["field_goals_made_0_39", "per_event", 3],
      ["field_goals_made_40_49", "per_event", 4],
      ["field_goals_made_50_plus", "per_event", 5],
    ]
  );
});

test("two made field goals score twice, not once as a two-yard kick", () => {
  const snapshot = deriveScoringSnapshot({
    platform: "sleeper",
    leagueSettings: { fgm_0_19: 3, fgm_20_29: 3, fgm_30_39: 3, fgm_40_49: 4, fgm_50p: 5, rec: 0 },
  });
  const points = calculateContractScore(snapshot.contract, {
    field_goals_made_0_39: 2, field_goals_made_40_49: 0, field_goals_made_50_plus: 0,
    receiving_receptions: 0,
  }).points;

  assert.equal(points, 6);
});

test("sub-bands that disagree inside one canonical band make the league ambiguous", () => {
  // Sleeper publishes five bands; the canonical vocabulary has three. A league paying 3 for
  // 0-19 but 5 for 30-39 cannot be expressed, and picking one of the two values would be a
  // confident wrong answer.
  const snapshot = deriveScoringSnapshot({
    platform: "sleeper",
    leagueSettings: { fgm_0_19: 3, fgm_30_39: 5, rec: 0 },
  });

  assert.equal(snapshot.coverage_state, "ambiguous");
  assert.deepEqual(snapshot.unmapped_rules, ["field_goals_made_0_39"]);
});

test("Sleeper settings that carry no scoring weight do not make every league ambiguous", () => {
  const snapshot = deriveScoringSnapshot({
    platform: "sleeper",
    leagueSettings: { ...HALF_PPR, pts_allow: 0, yds_allow: 0 },
  });
  assert.equal(snapshot.coverage_state, "supported");
});

test("absent Sleeper settings are pending, not silently PPR", () => {
  for (const settings of [null, {}, undefined]) {
    const snapshot = deriveScoringSnapshot({ platform: "sleeper", leagueSettings: settings });
    assert.equal(snapshot.coverage_state, "pending");
    assert.equal(JSON.stringify(snapshot).includes("receiving_receptions"), false);
  }
});

// --- ESPN and Yahoo: the external half, named rather than worked around ------

test("ESPN is provider_restricted, and no rules are fabricated for it", () => {
  const snapshot = deriveScoringSnapshot({ platform: "espn", leagueSettings: HALF_PPR });

  assert.equal(snapshot.coverage_state, "provider_restricted");
  assert.deepEqual(snapshot.contract.rules, []);
  assert.match(snapshot.reason, /no provider-granted path/);
});

test("Yahoo is pending on its entitlement rather than unsupported", () => {
  const snapshot = deriveScoringSnapshot({ platform: "yahoo", leagueSettings: HALF_PPR });

  assert.equal(snapshot.coverage_state, "pending");
  assert.match(snapshot.reason, /application-entitlement level/);
});

test("an unknown platform is unsupported, never defaulted", () => {
  assert.equal(deriveScoringSnapshot({ platform: "draftkings" }).coverage_state, "unsupported");
  assert.equal(deriveScoringSnapshot({}).coverage_state, "unsupported");
});

// --- Snapshot integrity -----------------------------------------------------

test("the same rule set hashes identically regardless of key order", () => {
  const a = deriveScoringSnapshot({ platform: "sleeper", leagueSettings: { rec: 0.5, rec_yd: 0.1, rec_td: 6 } });
  const b = deriveScoringSnapshot({ platform: "sleeper", leagueSettings: { rec_td: 6, rec_yd: 0.1, rec: 0.5 } });

  assert.equal(a.contract_hash, b.contract_hash);
  assert.equal(a.provider_rule_snapshot_hash, b.provider_rule_snapshot_hash);
  assert.match(a.contract_hash, /^[0-9a-f]{64}$/);
});

test("a changed rule changes the hash", () => {
  const half = deriveScoringSnapshot({ platform: "sleeper", leagueSettings: { rec: 0.5 } });
  const full = deriveScoringSnapshot({ platform: "sleeper", leagueSettings: { rec: 1 } });

  assert.notEqual(half.contract_hash, full.contract_hash);
});

test("canonicalize sorts object keys so hashing is order-independent", () => {
  assert.equal(canonicalize({ b: 1, a: 2 }), canonicalize({ a: 2, b: 1 }));
  assert.notEqual(hashOf({ a: 1 }), hashOf({ a: 2 }));
});

test("a snapshot never carries a credential, roster, or league identity", () => {
  const snapshot = deriveScoringSnapshot({
    platform: "sleeper",
    leagueSettings: HALF_PPR,
  });
  const serialized = JSON.stringify(snapshot).toLowerCase();

  for (const forbidden of ["espn_s2", "swid", "token", "cookie", "username", "roster"]) {
    assert.equal(serialized.includes(forbidden), false, `${forbidden} must not appear in a rule snapshot`);
  }
});

// --- Reconciliation ---------------------------------------------------------

const SUPPORTED = deriveScoringSnapshot({ platform: "sleeper", leagueSettings: { rec: 0.5, rec_yd: 0.1, rec_td: 6 } });
const FACTS = { receiving_receptions: 6, receiving_yards: 60, receiving_touchdowns: 1 };

test("reconciliation reaches exact only when Omen reproduces the provider's final score", () => {
  const result = reconcileMoveScoring({
    contract: SUPPORTED.contract,
    snapshotCoverageState: "supported",
    facts: FACTS,
    providerFinalPoints: 15,
  });

  assert.equal(result.state, RECONCILIATION_STATES.EXACT);
  assert.equal(result.league_exact, true);
  assert.equal(result.omen_points, 15);
  assert.equal(result.difference, 0);
});

test("a small difference is a provider adjustment and a large one is a mismatch", () => {
  const adjusted = reconcileMoveScoring({
    contract: SUPPORTED.contract, snapshotCoverageState: "supported", facts: FACTS, providerFinalPoints: 15.3,
  });
  const mismatch = reconcileMoveScoring({
    contract: SUPPORTED.contract, snapshotCoverageState: "supported", facts: FACTS, providerFinalPoints: 18,
  });

  assert.equal(adjusted.state, RECONCILIATION_STATES.PROVIDER_ADJUSTED);
  assert.equal(adjusted.league_exact, false);
  assert.equal(mismatch.state, RECONCILIATION_STATES.MISMATCH);
  assert.equal(mismatch.league_exact, false);
});

test("a missing event fact is unsupported and names the fact, rather than scoring it as zero", () => {
  const result = reconcileMoveScoring({
    contract: SUPPORTED.contract,
    snapshotCoverageState: "supported",
    facts: { receiving_receptions: 6 },
    providerFinalPoints: 15,
  });

  assert.equal(result.state, RECONCILIATION_STATES.UNSUPPORTED);
  assert.deepEqual(result.missing_facts, ["receiving_touchdowns", "receiving_yards"]);
  assert.equal(result.omen_points, null);
  assert.equal(result.league_exact, false);
});

test("a restricted or ambiguous snapshot can never reach exact, whatever the numbers say", () => {
  for (const [coverage, expected] of [
    ["provider_restricted", RECONCILIATION_STATES.PROVIDER_RESTRICTED],
    ["ambiguous", RECONCILIATION_STATES.AMBIGUOUS],
  ]) {
    const result = reconcileMoveScoring({
      contract: SUPPORTED.contract,
      snapshotCoverageState: coverage,
      facts: FACTS,
      providerFinalPoints: 15,
    });
    assert.equal(result.state, expected);
    assert.equal(result.league_exact, false);
    assert.equal(result.omen_points, null);
  }
});

test("an absent provider final score is pending, and Omen's own number is still reported", () => {
  const result = reconcileMoveScoring({
    contract: SUPPORTED.contract, snapshotCoverageState: "supported", facts: FACTS, providerFinalPoints: null,
  });

  assert.equal(result.state, RECONCILIATION_STATES.PENDING);
  assert.equal(result.omen_points, 15);
  assert.equal(result.league_exact, false);
});

test("no contract at all is pending, not unsupported", () => {
  const result = reconcileMoveScoring({ contract: null, snapshotCoverageState: null });
  assert.equal(result.state, RECONCILIATION_STATES.PENDING);
});

test("every one of the seven required states is reachable", () => {
  const seen = new Set([
    reconcileMoveScoring({ contract: SUPPORTED.contract, snapshotCoverageState: "supported", facts: FACTS, providerFinalPoints: 15 }).state,
    reconcileMoveScoring({ contract: SUPPORTED.contract, snapshotCoverageState: "supported", facts: FACTS, providerFinalPoints: 15.3 }).state,
    reconcileMoveScoring({ snapshotCoverageState: "provider_restricted" }).state,
    reconcileMoveScoring({ contract: { ruleset_version: "omen-scoring-contract-v1", coverage_state: "supported", rules: [] }, snapshotCoverageState: "supported", facts: FACTS }).state,
    reconcileMoveScoring({ snapshotCoverageState: "ambiguous" }).state,
    reconcileMoveScoring({ contract: SUPPORTED.contract, snapshotCoverageState: "supported", facts: FACTS, providerFinalPoints: 18 }).state,
    reconcileMoveScoring({ contract: null }).state,
  ]);

  assert.deepEqual([...seen].sort(), [
    "ambiguous", "exact", "mismatch", "pending", "provider_adjusted", "provider_restricted", "unsupported",
  ]);
});

test("an unreported provider score is not read as a real zero", () => {
  for (const value of [null, undefined, ""]) {
    const result = reconcileMoveScoring({
      contract: SUPPORTED.contract, snapshotCoverageState: "supported", facts: FACTS, providerFinalPoints: value,
    });
    assert.equal(result.state, RECONCILIATION_STATES.PENDING);
    assert.equal(result.provider_points, null);
  }

  // A genuine reported zero is still a real number and still reconciles.
  const zero = reconcileMoveScoring({
    contract: SUPPORTED.contract, snapshotCoverageState: "supported", facts: FACTS, providerFinalPoints: 0,
  });
  assert.equal(zero.state, RECONCILIATION_STATES.MISMATCH);
  assert.equal(zero.provider_points, 0);
});
