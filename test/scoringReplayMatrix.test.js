"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { deriveScoringSnapshot } = require("../src/services/scoringRuleSnapshot");
const { RECONCILIATION_STATES, reconcileMoveScoring } = require("../src/services/scoringReconciliation");
const fixtures = require("./fixtures/a6-replay-weeks.json");

/**
 * A6 replay matrix — the last named engineering item on the task.
 *
 * The thesis A6 exists to prove: **the same event facts produce different points under
 * different league rules, and only the league that actually awards those points
 * reconciles as league-exact.** Grading everything as PPR — the original defect — makes
 * that impossible to see, because every league gets the same number.
 *
 * Four scoring periods x two player archetypes x three league shapes, replayed
 * deterministically with no network and no provider call.
 */

const LEAGUES = {
  standard: { rec: 0, rec_yd: 0.1, rec_td: 6, rush_yd: 0.1, rush_td: 6, pass_yd: 0.04, pass_td: 4, pass_int: -2, fum_lost: -2 },
  half_ppr: { rec: 0.5, rec_yd: 0.1, rec_td: 6, rush_yd: 0.1, rush_td: 6, pass_yd: 0.04, pass_td: 4, pass_int: -2, fum_lost: -2 },
  ppr: { rec: 1, rec_yd: 0.1, rec_td: 6, rush_yd: 0.1, rush_td: 6, pass_yd: 0.04, pass_td: 4, pass_int: -2, fum_lost: -2 },
};

/** Every rule the contract prices must have a fact. An absent fact is unknown, not zero. */
function factsFor(player) {
  return {
    passing_yards: 0, passing_touchdowns: 0, passing_interceptions: 0,
    rushing_yards: 0, rushing_touchdowns: 0,
    receiving_receptions: 0, receiving_yards: 0, receiving_touchdowns: 0,
    fumbles_lost: 0,
    ...player.facts,
  };
}

function replay(format, player) {
  const snapshot = deriveScoringSnapshot({ platform: "sleeper", leagueSettings: LEAGUES[format] });
  return reconcileMoveScoring({
    contract: snapshot.contract,
    snapshotCoverageState: snapshot.coverage_state,
    facts: factsFor(player),
    providerFinalPoints: player.provider_final[format],
  });
}

// --- The matrix -------------------------------------------------------------

for (const week of fixtures.weeks) {
  for (const player of week.players) {
    for (const format of Object.keys(LEAGUES)) {
      test(`replay ${week.season} W${week.week} · ${player.archetype} · ${format} reconciles exact`, () => {
        const result = replay(format, player);

        assert.equal(
          result.state,
          RECONCILIATION_STATES.EXACT,
          `${result.state}: ${result.reason} (omen ${result.omen_points} vs provider ${result.provider_points})`
        );
        assert.equal(result.league_exact, true);
        assert.equal(result.omen_points, player.provider_final[format]);
      });
    }
  }
}

// --- The thesis, stated as a test -------------------------------------------

test("the same facts score differently under different league rules", () => {
  const player = fixtures.weeks[0].players[0]; // 9 receptions
  const points = Object.fromEntries(
    Object.keys(LEAGUES).map((format) => [format, replay(format, player).omen_points])
  );

  assert.equal(points.standard, 16.4);
  assert.equal(points.half_ppr, 20.9);
  assert.equal(points.ppr, 25.4);
  // 9 receptions is a 9-point spread between standard and PPR. Grading every league as PPR
  // — the A6 defect — would have credited this standard-league manager 9 points their rules
  // do not award.
  assert.equal(Number((points.ppr - points.standard).toFixed(2)), 9);
});

test("a standard league graded against PPR's provider total is a mismatch, not exact", () => {
  const player = fixtures.weeks[0].players[0];
  const snapshot = deriveScoringSnapshot({ platform: "sleeper", leagueSettings: LEAGUES.standard });

  const wrong = reconcileMoveScoring({
    contract: snapshot.contract,
    snapshotCoverageState: snapshot.coverage_state,
    facts: factsFor(player),
    providerFinalPoints: player.provider_final.ppr,
  });

  // This is the defect made visible: the exact comparison A6 exists to force.
  assert.equal(wrong.state, RECONCILIATION_STATES.MISMATCH);
  assert.equal(wrong.league_exact, false);
});

test("a zero-point week reconciles exact rather than reading as missing data", () => {
  const zeroCatch = fixtures.weeks[1].players[1];
  const result = replay("ppr", zeroCatch);

  assert.equal(result.state, RECONCILIATION_STATES.EXACT);
  assert.equal(result.omen_points, 0);
  // 0 is a real score. Treating it as absent is the null-vs-zero trap this codebase has
  // already been bitten by twice.
  assert.equal(result.provider_points, 0);
});

test("a negative week reconciles exact", () => {
  const badDay = fixtures.weeks[3].players[1];
  const result = replay("standard", badDay);

  assert.equal(result.state, RECONCILIATION_STATES.EXACT);
  assert.ok(result.omen_points < 0, `expected a negative total, got ${result.omen_points}`);
});

// --- Coverage of the matrix itself ------------------------------------------

test("the matrix covers four scoring periods and every supported league shape", () => {
  assert.equal(fixtures.weeks.length, 4);
  assert.deepEqual(fixtures.weeks.map((w) => w.week), [1, 7, 14, 17]);
  for (const week of fixtures.weeks) {
    assert.ok(week.players.length >= 2, `week ${week.week} needs at least two archetypes`);
    for (const player of week.players) {
      assert.deepEqual(Object.keys(player.provider_final).sort(), ["half_ppr", "ppr", "standard"]);
    }
  }
});

test("a restricted or entitlement-blocked provider never reaches exact in replay", () => {
  const player = fixtures.weeks[0].players[0];
  for (const platform of ["espn", "yahoo"]) {
    const snapshot = deriveScoringSnapshot({ platform });
    const result = reconcileMoveScoring({
      contract: snapshot.contract,
      snapshotCoverageState: snapshot.coverage_state,
      facts: factsFor(player),
      providerFinalPoints: player.provider_final.ppr,
    });
    assert.equal(result.league_exact, false, `${platform} must not reach exact`);
    assert.notEqual(result.state, RECONCILIATION_STATES.EXACT);
  }
});
