"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  UNAVAILABLE,
  canonicalFactsFromFootballData,
  coverageSummary,
  reported,
} = require("../src/services/footballDataFacts");
const { deriveScoringSnapshot } = require("../src/services/scoringRuleSnapshot");
const { RECONCILIATION_STATES, reconcileMoveScoring } = require("../src/services/scoringReconciliation");
const { EVENT_KEYS } = require("../src/services/scoringContract");

/** An A7B player row: 9 catches, 104 yards, 1 TD, nothing else. */
function playerRow(overrides = {}) {
  return {
    passing_yards: 0, passing_tds: 0, passing_interceptions: 0,
    sack_fumbles_lost: 0, passing_2pt_conversions: 0,
    rushing_yards: 0, rushing_tds: 0, rushing_fumbles_lost: 0, rushing_2pt_conversions: 0,
    receptions: 9, receiving_yards: 104, receiving_tds: 1,
    receiving_fumbles_lost: 0, receiving_2pt_conversions: 0,
    special_teams_tds: 0,
    fg_made: 0, fg_missed: 0,
    fg_made_0_19: 0, fg_made_20_29: 0, fg_made_30_39: 0,
    fg_made_40_49: 0, fg_made_50_59: 0, fg_made_60_: 0,
    pat_made: 0, pat_missed: 0,
    ...overrides,
  };
}

function teamRow(overrides = {}) {
  return {
    def_sacks: 3, def_interceptions: 1, fumble_recovery_opp: 1, def_tds: 0,
    def_safeties: 0, special_teams_tds: 0,
    def_punt_blocks: 0, def_pat_blocks: 0, def_fg_blocks: 1,
    ...overrides,
  };
}

function sleeperLeague(rec) {
  return { rec, rec_yd: 0.1, rec_td: 6, rush_yd: 0.1, rush_td: 6, pass_yd: 0.04, pass_td: 4, pass_int: -2, fum_lost: -2 };
}

// --- The thing A6 was waiting for -------------------------------------------

test("an A7B row scores differently under standard, half-PPR and PPR — which is the whole point", () => {
  const { facts, missing } = canonicalFactsFromFootballData(playerRow());
  assert.deepEqual(missing, [], "a complete A7B row should leave nothing missing");

  const score = (rec) => {
    const snapshot = deriveScoringSnapshot({ platform: "sleeper", leagueSettings: sleeperLeague(rec) });
    return reconcileMoveScoring({
      contract: snapshot.contract,
      snapshotCoverageState: snapshot.coverage_state,
      facts,
      providerFinalPoints: null,
    }).omen_points;
  };

  assert.equal(score(0), 16.4);
  assert.equal(score(0.5), 20.9);
  assert.equal(score(1), 25.4);
  // Nine receptions is a 9-point spread. Before this seam existed the engine had no facts
  // and every league was graded as PPR — handing a standard-league manager 9 points their
  // rules do not award.
  assert.equal(Number((score(1) - score(0)).toFixed(2)), 9);
});

test("a complete row reconciles exact against its own league's provider total", () => {
  const { facts } = canonicalFactsFromFootballData(playerRow());
  const snapshot = deriveScoringSnapshot({ platform: "sleeper", leagueSettings: sleeperLeague(0.5) });

  const result = reconcileMoveScoring({
    contract: snapshot.contract,
    snapshotCoverageState: snapshot.coverage_state,
    facts,
    providerFinalPoints: 20.9,
  });

  assert.equal(result.state, RECONCILIATION_STATES.EXACT);
  assert.equal(result.league_exact, true);
});

// --- The three safety rules -------------------------------------------------

test("an absent column is missing, never zero", () => {
  const { facts, missing } = canonicalFactsFromFootballData(playerRow({ receptions: null }));

  assert.equal(Object.hasOwn(facts, "receiving_receptions"), false);
  assert.ok(missing.includes("receiving_receptions"));
  // Number(null) is 0 and 0 is finite. A bare isFinite guard would have made an unreported
  // reception count into a real zero — the trap this codebase has hit three times.
  assert.equal(reported(null), null);
  assert.equal(reported(""), null);
  assert.equal(reported(0), 0, "a reported zero is still a real zero");
});

test("a summed fact is unknown when any single component is unknown", () => {
  // Fumbles lost is three columns. Two of three is not a fumble count — it is a smaller
  // wrong number that looks entirely plausible.
  const { facts, missing } = canonicalFactsFromFootballData(
    playerRow({ rushing_fumbles_lost: null })
  );

  assert.equal(Object.hasOwn(facts, "fumbles_lost"), false);
  assert.ok(missing.includes("fumbles_lost"));
});

test("a missing priced fact makes the whole grade unsupported and names the gap", () => {
  const { facts } = canonicalFactsFromFootballData(playerRow({ receptions: null }));
  const snapshot = deriveScoringSnapshot({ platform: "sleeper", leagueSettings: sleeperLeague(0.5) });

  const result = reconcileMoveScoring({
    contract: snapshot.contract,
    snapshotCoverageState: snapshot.coverage_state,
    facts,
    providerFinalPoints: 20.9,
  });

  assert.equal(result.state, RECONCILIATION_STATES.UNSUPPORTED);
  assert.deepEqual(result.missing_facts, ["receiving_receptions"]);
  assert.equal(result.league_exact, false);
});

// --- Kickers and defence ----------------------------------------------------

test("six A7B distance bands collapse into the three canonical bands", () => {
  const { facts } = canonicalFactsFromFootballData(playerRow({
    fg_made_0_19: 1, fg_made_20_29: 1, fg_made_30_39: 1,
    fg_made_40_49: 2, fg_made_50_59: 1, fg_made_60_: 1, fg_made: 7,
  }));

  assert.equal(facts.field_goals_made_0_39, 3);
  assert.equal(facts.field_goals_made_40_49, 2);
  assert.equal(facts.field_goals_made_50_plus, 2);
  assert.equal(facts.field_goals_made, 7);
});

test("a team row supplies the defence facts, including summed blocks", () => {
  const { facts, missing } = canonicalFactsFromFootballData(playerRow(), teamRow());

  assert.equal(facts.defense_sacks, 3);
  assert.equal(facts.defense_interceptions, 1);
  assert.equal(facts.defense_fumble_recoveries, 1);
  assert.equal(facts.defense_blocks, 1);
  assert.deepEqual(missing, []);
});

// --- Honest coverage --------------------------------------------------------

test("coverage is derived from the mapping, and the gaps are named with reasons", () => {
  const coverage = coverageSummary();

  assert.equal(coverage.total, EVENT_KEYS.size);
  assert.equal(coverage.supplied.length, 25);
  assert.equal(coverage.unavailable.length, 12);
  // Every unavailable key carries a stated reason rather than being silently absent.
  for (const key of coverage.unavailable) {
    assert.ok(UNAVAILABLE[key], `${key} must state why it is unavailable`);
  }
  // The two team-defence gaps and the ten IDP events, specifically.
  assert.ok(coverage.unavailable.includes("defense_points_allowed"));
  assert.ok(coverage.unavailable.includes("defense_yards_allowed"));
  assert.equal(coverage.unavailable.filter((k) => k.startsWith("idp_")).length, 10);
});

test("a league scoring an unavailable event cannot reach exact", () => {
  // An IDP league. Omen has no facts for it and must say so rather than score the rest and
  // call the result league-exact.
  const { facts } = canonicalFactsFromFootballData(playerRow());
  const snapshot = deriveScoringSnapshot({
    platform: "sleeper",
    leagueSettings: { ...sleeperLeague(0.5), idp_sack: 2, idp_int: 4 },
  });

  const result = reconcileMoveScoring({
    contract: snapshot.contract,
    snapshotCoverageState: snapshot.coverage_state,
    facts,
    providerFinalPoints: 20.9,
  });

  assert.notEqual(result.state, RECONCILIATION_STATES.EXACT);
  assert.equal(result.league_exact, false);
});

test("the mapping reads A7B's output and never writes to it", () => {
  const row = playerRow();
  const before = JSON.stringify(row);
  canonicalFactsFromFootballData(row, teamRow());
  assert.equal(JSON.stringify(row), before, "the source row must not be mutated");
});
