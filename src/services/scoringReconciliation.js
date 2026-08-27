"use strict";

/**
 * A6 — reconcile Omen's own contract-calculated result against the provider's
 * final score, and name the outcome honestly.
 *
 * The `Done when:` requires seven distinguishable states. The important one is
 * the negative case: **a league-exact result fails closed** when any material
 * rule or adjustment cannot be reproduced. `exact` is the only state that
 * entitles Omen to say it graded a recommendation by the league's own rules.
 */

const { calculateContractScore, inspectScoringContract } = require("./scoringContract");

const RECONCILIATION_STATES = Object.freeze({
  EXACT: "exact",
  PROVIDER_ADJUSTED: "provider_adjusted",
  PROVIDER_RESTRICTED: "provider_restricted",
  UNSUPPORTED: "unsupported",
  AMBIGUOUS: "ambiguous",
  MISMATCH: "mismatch",
  PENDING: "pending",
});

// Providers round to two decimals and Omen carries eight. A difference smaller
// than this is float noise, not a rule disagreement.
const EXACT_TOLERANCE = 0.011;

// A provider may apply a stat correction after publication. A small, explained
// difference is `provider_adjusted`; a large one is a real `mismatch` and must
// not be waved through as a correction.
const ADJUSTMENT_TOLERANCE = 0.5;

/**
 * null/undefined/"" mean "not reported", not zero. Number(null) is 0 and 0 is
 * finite, so a bare Number.isFinite guard would turn an unreported provider
 * score into a real zero and report a mismatch against it.
 */
function finite(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Every event key the contract prices must be present in the facts. A missing
 * fact is not zero — it is an unknown, and scoring it as zero is precisely the
 * silent-default failure A6 exists to end.
 */
function missingFactsFor(contract, facts) {
  const rules = Array.isArray(contract?.rules) ? contract.rules : [];
  return [...new Set(rules
    .map((rule) => rule.event_key)
    .filter((key) => facts?.[key] == null))].sort();
}

/**
 * @param {object} input
 * @param {object|null} input.contract canonical contract captured at issue time
 * @param {string} input.snapshotCoverageState coverage recorded on the snapshot
 * @param {object|null} input.facts lawful event facts for the scoring period
 * @param {number|null} input.providerFinalPoints the provider's own final score
 * @returns {{state: string, omen_points: number|null, provider_points: number|null,
 *   difference: number|null, league_exact: boolean, reason: string,
 *   missing_facts: string[]}}
 */
function reconcileMoveScoring({
  contract = null,
  snapshotCoverageState = null,
  facts = null,
  providerFinalPoints = null,
} = {}) {
  const providerPoints = finite(providerFinalPoints);

  const outcome = (state, reason, extra = {}) => ({
    state,
    omen_points: null,
    provider_points: providerPoints,
    difference: null,
    league_exact: state === RECONCILIATION_STATES.EXACT,
    reason,
    missing_facts: [],
    ...extra,
  });

  // A restricted provider can never reach `exact`, regardless of what else is
  // available. That is a rights boundary, not a data gap.
  if (snapshotCoverageState === "provider_restricted") {
    return outcome(
      RECONCILIATION_STATES.PROVIDER_RESTRICTED,
      "This provider has not granted Omen a path to its complete private scoring rules, so a league-exact result is not available."
    );
  }
  if (snapshotCoverageState === "ambiguous") {
    return outcome(
      RECONCILIATION_STATES.AMBIGUOUS,
      "At least one of this league's scoring rules could not be reproduced, so Omen will not claim a league-exact result."
    );
  }
  if (snapshotCoverageState === "pending" || !contract) {
    return outcome(
      RECONCILIATION_STATES.PENDING,
      "This league's scoring rules have not been captured yet."
    );
  }

  const inspection = inspectScoringContract(contract);
  if (inspection.coverage_state !== "supported") {
    return outcome(
      RECONCILIATION_STATES.UNSUPPORTED,
      `The captured contract is not usable for scoring (${inspection.coverage_state}).`
    );
  }

  if (!facts) {
    return outcome(RECONCILIATION_STATES.PENDING, "Event facts for this scoring period are not available yet.");
  }

  const missing = missingFactsFor(contract, facts);
  if (missing.length) {
    return outcome(
      RECONCILIATION_STATES.UNSUPPORTED,
      `Omen is missing lawful event facts for ${missing.length} priced rule${missing.length === 1 ? "" : "s"}, and will not score a missing fact as zero.`,
      { missing_facts: missing }
    );
  }

  let calculated;
  try {
    calculated = calculateContractScore(contract, facts);
  } catch (error) {
    return outcome(RECONCILIATION_STATES.UNSUPPORTED, `Contract evaluation failed: ${error.message}`);
  }

  const omenPoints = Number(calculated.points.toFixed(2));
  if (providerPoints == null) {
    return {
      ...outcome(RECONCILIATION_STATES.PENDING, "The provider's final score for this scoring period is not available yet."),
      omen_points: omenPoints,
    };
  }

  const difference = Number((omenPoints - providerPoints).toFixed(2));
  const magnitude = Math.abs(difference);

  if (magnitude <= EXACT_TOLERANCE) {
    return {
      state: RECONCILIATION_STATES.EXACT,
      omen_points: omenPoints,
      provider_points: providerPoints,
      difference,
      league_exact: true,
      reason: "Omen reproduced the provider's final score from this league's own rules.",
      missing_facts: [],
    };
  }

  if (magnitude <= ADJUSTMENT_TOLERANCE) {
    return {
      state: RECONCILIATION_STATES.PROVIDER_ADJUSTED,
      omen_points: omenPoints,
      provider_points: providerPoints,
      difference,
      league_exact: false,
      reason: "The provider's final score differs slightly from Omen's calculation, consistent with a post-publication stat adjustment.",
      missing_facts: [],
    };
  }

  return {
    state: RECONCILIATION_STATES.MISMATCH,
    omen_points: omenPoints,
    provider_points: providerPoints,
    difference,
    league_exact: false,
    reason: "Omen's calculation and the provider's final score disagree by more than a stat adjustment explains.",
    missing_facts: [],
  };
}

module.exports = {
  ADJUSTMENT_TOLERANCE,
  EXACT_TOLERANCE,
  RECONCILIATION_STATES,
  missingFactsFor,
  reconcileMoveScoring,
};
