"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  canonicalize,
  deriveScoringSnapshot,
  deriveSleeperRules,
  hashOf,
  scoreStatLine,
} = require("../src/services/scoringRuleSnapshot");
const { calculateContractScore } = require("../src/services/scoringContract");
const { RECONCILIATION_STATES, reconcileMoveScoring } = require("../src/services/scoringReconciliation");

const HALF_PPR = {
  pass_yd: 0.04,
  pass_td: 4,
  pass_int: -2,
  rush_yd: 0.1,
  rush_td: 6,
  rec: 0.5,
  rec_yd: 0.1,
  rec_td: 6,
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

  assert.equal(points(0), 12); // standard: 60 yards + 1 TD
  assert.equal(points(0.5), 15); // half PPR: + 3
  assert.equal(points(1), 18); // PPR: + 6
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
    ],
  );
});

test("two made field goals score twice, not once as a two-yard kick", () => {
  const snapshot = deriveScoringSnapshot({
    platform: "sleeper",
    leagueSettings: { fgm_0_19: 3, fgm_20_29: 3, fgm_30_39: 3, fgm_40_49: 4, fgm_50p: 5, rec: 0 },
  });
  const points = calculateContractScore(snapshot.contract, {
    field_goals_made_0_39: 2,
    field_goals_made_40_49: 0,
    field_goals_made_50_plus: 0,
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

// ESPN was hardcoded `provider_restricted` on the reasoning that Omen had no provider-granted
// path to capture and retain a league's private rules. **The founder authorized capturing and
// retaining them on 2026-09-06**, after being shown the restriction was a rights position
// rather than a technical limit. Coverage is now derived from the league's own settings.
test("ESPN derives a real contract from the league's own scoring items", () => {
  const snapshot = deriveScoringSnapshot({
    platform: "espn",
    leagueSettings: {
      scoringSettings: {
        scoringItems: [
          { statId: 53, points: 0.5, pointsOverrides: {} },
          { statId: 42, points: 0.1, pointsOverrides: {} },
          { statId: 4, points: 4, pointsOverrides: {} },
        ],
      },
    },
  });

  assert.equal(snapshot.coverage_state, "supported");
  const reception = snapshot.contract.rules.find((rule) => rule.event_key === "receiving_receptions");
  assert.equal(reception.value, 0.5, "half PPR must be read from the league, not assumed");
  assert.equal(snapshot.provider_rule_count, 3);
});

// The governing rule: an unknown provider key is never treated as a zero-point rule.
test("an ESPN stat id Omen cannot name drops the contract to ambiguous rather than dropping the rule", () => {
  const snapshot = deriveScoringSnapshot({
    platform: "espn",
    leagueSettings: {
      scoringSettings: {
        scoringItems: [
          { statId: 53, points: 1, pointsOverrides: {} },
          { statId: 9999, points: 3, pointsOverrides: {} },
        ],
      },
    },
  });

  assert.equal(snapshot.coverage_state, "ambiguous");
  assert.deepEqual(snapshot.unmapped_rules, ["stat_9999"]);
});

// ESPN scores some stats differently per position (D/ST is position 16). That is not
// expressible as one canonical number, so it is reported rather than flattened to either value.
test("a position-specific ESPN rule is reported unmapped, never flattened", () => {
  const snapshot = deriveScoringSnapshot({
    platform: "espn",
    leagueSettings: {
      scoringSettings: {
        scoringItems: [
          { statId: 53, points: 1, pointsOverrides: {} },
          { statId: 95, points: 0, pointsOverrides: { 16: 2 } },
        ],
      },
    },
  });

  assert.equal(snapshot.coverage_state, "ambiguous");
  assert.ok(snapshot.unmapped_rules.includes("stat_95"));
});

// A rule worth nothing to anyone cannot change a score, so it is not ambiguity.
test("an ESPN rule worth zero to every position does not make the contract ambiguous", () => {
  const snapshot = deriveScoringSnapshot({
    platform: "espn",
    leagueSettings: {
      scoringSettings: {
        scoringItems: [
          { statId: 53, points: 1, pointsOverrides: {} },
          { statId: 8888, points: 0, pointsOverrides: {} },
        ],
      },
    },
  });

  assert.equal(snapshot.coverage_state, "supported");
});

test("an unreadable ESPN settings payload is unsupported, never fabricated", () => {
  const snapshot = deriveScoringSnapshot({ platform: "espn", leagueSettings: null });

  assert.equal(snapshot.coverage_state, "unsupported");
  assert.deepEqual(snapshot.contract.rules, []);
});

// Yahoo was `pending` because "the Fantasy API is refused at the application-entitlement
// level". That refusal ended 2026-08-28 (facts-of-record #11) and the claim outlived it.
// Yahoo publishes stat_categories alongside stat_modifiers, so its ids carry human names and
// a position_type — which is why its map is larger and better evidenced than ESPN's.
test("Yahoo derives a real contract from the league's own stat modifiers", () => {
  const snapshot = deriveScoringSnapshot({
    platform: "yahoo",
    leagueSettings: {
      stat_modifiers: {
        stats: [
          { stat: { stat_id: 11, value: "0.5" } },
          { stat: { stat_id: 12, value: "0.1" } },
          { stat: { stat_id: 5, value: "4" } },
        ],
      },
    },
  });

  assert.equal(snapshot.coverage_state, "supported");
  const reception = snapshot.contract.rules.find((rule) => rule.event_key === "receiving_receptions");
  assert.equal(reception.value, 0.5, "half PPR read from the league, never assumed");
});

// Yahoo's offensive and defensive interceptions share a name and differ by position_type;
// keying on the stat id keeps them distinct.
test("Yahoo tells offensive interceptions apart from defensive ones", () => {
  const snapshot = deriveScoringSnapshot({
    platform: "yahoo",
    leagueSettings: {
      stat_modifiers: { stats: [{ stat: { stat_id: 6, value: "-1" } }, { stat: { stat_id: 33, value: "2" } }] },
    },
  });

  const keys = snapshot.contract.rules.map((rule) => rule.event_key).sort();
  assert.deepEqual(keys, ["defense_interceptions", "passing_interceptions"]);
});

test("Yahoo field-goal bands resolve to the same canonical bands Sleeper uses", () => {
  const snapshot = deriveScoringSnapshot({
    platform: "yahoo",
    leagueSettings: {
      stat_modifiers: {
        stats: [
          { stat: { stat_id: 19, value: "3" } },
          { stat: { stat_id: 20, value: "3" } },
          { stat: { stat_id: 21, value: "3" } },
          { stat: { stat_id: 22, value: "4" } },
          { stat: { stat_id: 23, value: "5" } },
        ],
      },
    },
  });

  const fg = snapshot.contract.rules.filter((rule) => rule.event_key.startsWith("field_goals_made"));
  assert.equal(fg.find((r) => r.event_key === "field_goals_made_0_39").value, 3);
  assert.equal(fg.find((r) => r.event_key === "field_goals_made_50_plus").value, 5);
});

// Sub-bands that disagree cannot be expressed as one canonical band.
test("Yahoo sub-bands that disagree make the contract ambiguous rather than picking one", () => {
  const snapshot = deriveScoringSnapshot({
    platform: "yahoo",
    leagueSettings: {
      stat_modifiers: { stats: [{ stat: { stat_id: 19, value: "3" } }, { stat: { stat_id: 21, value: "5" } }] },
    },
  });

  assert.equal(snapshot.coverage_state, "ambiguous");
  assert.ok(snapshot.unmapped_rules.includes("field_goals_made_0_39"));
});

// Points-allowed tiers are unmapped for Yahoo exactly as they are for Sleeper.
test("an unnamed non-zero Yahoo rule is reported, never silently dropped", () => {
  const snapshot = deriveScoringSnapshot({
    platform: "yahoo",
    leagueSettings: {
      stat_modifiers: { stats: [{ stat: { stat_id: 11, value: "1" } }, { stat: { stat_id: 50, value: "10" } }] },
    },
  });

  assert.equal(snapshot.coverage_state, "ambiguous");
  assert.deepEqual(snapshot.unmapped_rules, ["stat_50"]);
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
    contract: SUPPORTED.contract,
    snapshotCoverageState: "supported",
    facts: FACTS,
    providerFinalPoints: 15.3,
  });
  const mismatch = reconcileMoveScoring({
    contract: SUPPORTED.contract,
    snapshotCoverageState: "supported",
    facts: FACTS,
    providerFinalPoints: 18,
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
    contract: SUPPORTED.contract,
    snapshotCoverageState: "supported",
    facts: FACTS,
    providerFinalPoints: null,
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
    reconcileMoveScoring({
      contract: SUPPORTED.contract,
      snapshotCoverageState: "supported",
      facts: FACTS,
      providerFinalPoints: 15,
    }).state,
    reconcileMoveScoring({
      contract: SUPPORTED.contract,
      snapshotCoverageState: "supported",
      facts: FACTS,
      providerFinalPoints: 15.3,
    }).state,
    reconcileMoveScoring({ snapshotCoverageState: "provider_restricted" }).state,
    reconcileMoveScoring({
      contract: { ruleset_version: "omen-scoring-contract-v1", coverage_state: "supported", rules: [] },
      snapshotCoverageState: "supported",
      facts: FACTS,
    }).state,
    reconcileMoveScoring({ snapshotCoverageState: "ambiguous" }).state,
    reconcileMoveScoring({
      contract: SUPPORTED.contract,
      snapshotCoverageState: "supported",
      facts: FACTS,
      providerFinalPoints: 18,
    }).state,
    reconcileMoveScoring({ contract: null }).state,
  ]);

  assert.deepEqual([...seen].sort(), [
    "ambiguous",
    "exact",
    "mismatch",
    "pending",
    "provider_adjusted",
    "provider_restricted",
    "unsupported",
  ]);
});

test("an unreported provider score is not read as a real zero", () => {
  for (const value of [null, undefined, ""]) {
    const result = reconcileMoveScoring({
      contract: SUPPORTED.contract,
      snapshotCoverageState: "supported",
      facts: FACTS,
      providerFinalPoints: value,
    });
    assert.equal(result.state, RECONCILIATION_STATES.PENDING);
    assert.equal(result.provider_points, null);
  }

  // A genuine reported zero is still a real number and still reconciles.
  const zero = reconcileMoveScoring({
    contract: SUPPORTED.contract,
    snapshotCoverageState: "supported",
    facts: FACTS,
    providerFinalPoints: 0,
  });
  assert.equal(zero.state, RECONCILIATION_STATES.MISMATCH);
  assert.equal(zero.provider_points, 0);
});

// --- B13-LEAGUE-SCORING: unified scorer fixture leagues ----------------------

test("B13 scorer: Sleeper fixture league scores stat line to published total", () => {
  const sleeperLeague = {
    pass_yd: 0.04,
    pass_td: 4,
    pass_int: -2,
    rush_yd: 0.1,
    rush_td: 6,
    rec: 1, // PPR
    rec_yd: 0.1,
    rec_td: 6,
    fum_lost: -2,
  };
  const statLine = {
    pass_yd: 275, // 11.0
    pass_td: 2,   // 8.0
    pass_int: 1,  // -2.0
    rush_yd: 30,  // 3.0
    rush_td: 1,   // 6.0
    rec: 6,       // 6.0
    rec_yd: 72,   // 7.2
    rec_td: 1,   // 6.0
    fum_lost: 1,  // -2.0
    pts_ppr: 999, // ignored
  };
  // Published total: 11 + 8 - 2 + 3 + 6 + 6 + 7.2 + 6 - 2 = 43.2
  const publishedTotal = 43.2;
  const result = scoreStatLine(statLine, { platform: "sleeper", leagueSettings: sleeperLeague });
  assert.equal(result.points, publishedTotal);
  assert.deepEqual(result.unknown, []);
});

test("B13 scorer: ESPN standard fixture league scores stat line to published total", () => {
  const espnStandard = {
    scoringSettings: {
      scoringItems: [
        { statId: 3, points: 0.04 }, // pass_yd (25 yds / pt)
        { statId: 4, points: 4 },    // pass_td
        { statId: 20, points: -2 },  // pass_int
        { statId: 24, points: 0.1 }, // rush_yd (10 yds / pt)
        { statId: 25, points: 6 },   // rush_td
        { statId: 42, points: 0.1 }, // rec_yd (10 yds / pt)
        { statId: 43, points: 6 },   // rec_td
        { statId: 53, points: 0 },   // rec (0 in standard)
        { statId: 72, points: -2 },  // fum_lost
      ],
    },
  };
  const wrStatLine = {
    rec: 6,      // 6 * 0 = 0
    rec_yd: 85,  // 85 * 0.1 = 8.5
    rec_td: 1,   // 1 * 6 = 6
    fum_lost: 0,
  };
  // Published total: 0 + 8.5 + 6 = 14.5
  const publishedTotal = 14.5;
  const result = scoreStatLine(wrStatLine, { platform: "espn", leagueSettings: espnStandard });
  assert.equal(result.points, publishedTotal);
  assert.deepEqual(result.unknown, []);
});

test("B13 scorer: ESPN custom fixture league scores stat line to published total", () => {
  const espnCustom = {
    scoringSettings: {
      scoringItems: [
        { statId: 3, points: 0.04 }, // pass_yd
        { statId: 4, points: 6 },    // pass_td (custom 6-pt passing TD)
        { statId: 20, points: -2 },  // pass_int
        { statId: 24, points: 0.1 }, // rush_yd
        { statId: 25, points: 6 },   // rush_td
        { statId: 42, points: 0.1 }, // rec_yd
        { statId: 43, points: 6 },   // rec_td
        { statId: 53, points: 1.5 }, // rec (custom 1.5 PPR)
        { statId: 72, points: -2 },  // fum_lost
      ],
    },
  };
  const qbStatLine = {
    pass_yd: 325, // 325 * 0.04 = 13.0
    pass_td: 3,   // 3 * 6 = 18.0 (custom 6-pt passing TD)
    pass_int: 2,  // 2 * -2 = -4.0
    rush_yd: 40,  // 40 * 0.1 = 4.0
    rush_td: 1,   // 1 * 6 = 6.0
  };
  // Published total: 13 + 18 - 4 + 4 + 6 = 37.0
  const qbPublishedTotal = 37.0;
  const qbResult = scoreStatLine(qbStatLine, { platform: "espn", leagueSettings: espnCustom });
  assert.equal(qbResult.points, qbPublishedTotal);
  assert.deepEqual(qbResult.unknown, []);

  const wrStatLine = {
    rec: 8,       // 8 * 1.5 = 12.0
    rec_yd: 110,  // 110 * 0.1 = 11.0
    rec_td: 1,    // 1 * 6 = 6.0
    fum_lost: 1,  // 1 * -2 = -2.0
  };
  // Published total: 12 + 11 + 6 - 2 = 27.0
  const wrPublishedTotal = 27.0;
  const wrResult = scoreStatLine(wrStatLine, { platform: "espn", leagueSettings: espnCustom });
  assert.equal(wrResult.points, wrPublishedTotal);
  assert.deepEqual(wrResult.unknown, []);
});

test("B13 scorer: Yahoo fixture league scores stat line to published total", () => {
  const yahooLeague = {
    stat_modifiers: {
      stats: [
        { stat: { stat_id: 4, value: "0.04" } },  // pass_yd
        { stat: { stat_id: 5, value: "4" } },     // pass_td
        { stat: { stat_id: 6, value: "-1" } },    // pass_int (Yahoo standard -1)
        { stat: { stat_id: 9, value: "0.1" } },   // rush_yd
        { stat: { stat_id: 10, value: "6" } },    // rush_td
        { stat: { stat_id: 11, value: "0.5" } },  // rec (Half-PPR)
        { stat: { stat_id: 12, value: "0.1" } },  // rec_yd
        { stat: { stat_id: 13, value: "6" } },    // rec_td
        { stat: { stat_id: 18, value: "-2" } },   // fum_lost
      ],
    },
  };
  const rbStatLine = {
    rush_yd: 65, // 65 * 0.1 = 6.5
    rush_td: 1,  // 1 * 6 = 6.0
    rec: 4,      // 4 * 0.5 = 2.0
    rec_yd: 35,  // 35 * 0.1 = 3.5
    rec_td: 0,
    fum_lost: 1, // 1 * -2 = -2.0
  };
  // Published total: 6.5 + 6.0 + 2.0 + 3.5 - 2.0 = 16.0
  const publishedTotal = 16.0;
  const result = scoreStatLine(rbStatLine, { platform: "yahoo", leagueSettings: yahooLeague });
  assert.equal(result.points, publishedTotal);
  assert.deepEqual(result.unknown, []);
});

test("B13 scorer: returns explicit per-rule unknown result and never silently skips a stat", () => {
  const sleeperLeague = {
    pass_yd: 0.04,
    pass_td: 4,
    pass_int: -2,
    rush_yd: 0.1,
    rush_td: 6,
    rec: 1,
    rec_yd: 0.1,
    rec_td: 6,
    fum_lost: -2,
  };
  // Stat line with an unmapped stat (bonus_rec_te)
  const lineWithUnknownStat = {
    rec: 5,
    rec_yd: 60,
    bonus_rec_te: 2, // unknown stat with quantity 2
  };
  const result = scoreStatLine(lineWithUnknownStat, { platform: "sleeper", leagueSettings: sleeperLeague });
  assert.equal(result.points, 11.0); // 5 + 6.0 = 11.0
  assert.deepEqual(result.unknown, ["bonus_rec_te"]);

  // League with an unknown rule (Yahoo stat 57)
  const yahooWithUnknown = {
    stat_modifiers: {
      stats: [
        { stat: { stat_id: 11, value: "1" } },
        { stat: { stat_id: 12, value: "0.1" } },
        { stat: { stat_id: 57, value: "2" } }, // unmapped offensive rule
      ],
    },
  };
  const yahooResult = scoreStatLine({ rec: 4, rec_yd: 50 }, yahooWithUnknown);
  assert.equal(yahooResult.points, 9.0); // 4 + 5.0 = 9.0
  assert.deepEqual(yahooResult.unknown, ["stat_57"]);
});
