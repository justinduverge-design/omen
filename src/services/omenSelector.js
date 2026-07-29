"use strict";

/**
 * B2-D4 — deterministic recommendation selector.
 *
 * Contract: `Blueprints/specs/b2d-canonical-omen-context-and-capability-contract-v1.md`
 * § Deterministic selection. For one verified context the engine runs an
 * order of operations, NOT a provider or type priority:
 *
 *   1. build the selected team's normalized roster + verified league settings
 *   2. build only capabilities available and live for that exact context
 *   3. generate candidates for supported types
 *   4. reject candidates with missing, mock, stub, stale, or cross-context inputs
 *   5. choose the highest decision_score; documented stable tie-break only
 *      after equal numeric scores
 *   6. if no eligible candidate remains, return an honest empty/no-advice
 *      envelope — do not substitute a different type to fill the screen
 *
 * This module owns steps 4-6 and nothing else. It is pure: no network, no
 * clock, no provider knowledge. Candidate construction stays in the engine so
 * that ranking can be tested without a provider.
 *
 * Supersedes the S2 rule that "the waiver path opens only when start/sit finds
 * nothing". That was a priority short-circuit. A waiver add that replaces an
 * OUT starter is frequently worth more than a two-point lineup tweak, and the
 * contract asks for a comparison, not an ordering. The eligibility
 * preconditions from S2 are preserved unchanged — they are what keeps the
 * comparison honest.
 */

/**
 * Every decision type the canonical route may return. Declared here so a type
 * with no provider capability still reports as explicitly unavailable rather
 * than silently not existing.
 */
const DECISION_TYPES = ["start_sit", "waiver_pickup", "trade_suggestion"];

/**
 * Documented stable tie-break order, applied ONLY after equal numeric scores.
 * Ordered by how much of the user's roster the move disturbs: starting a
 * player you already own is less disruptive than adding one, which is less
 * disruptive than trading one away. On a true tie, prefer the smaller
 * disturbance.
 */
const TIE_BREAK_ORDER = ["start_sit", "waiver_pickup", "trade_suggestion"];

const REJECTION = {
  NO_CANDIDATE: "no_candidate",
  NO_PROVIDER_CAPABILITY: "no_provider_capability",
  SIGNAL_NOT_LIVE: "required_signal_not_live",
  NON_LIVE_INPUT: "non_live_input",
  CONTEXT_MISMATCH: "context_mismatch",
  SCORE_NOT_FINITE: "decision_score_not_finite",
  NO_EDGE: "no_positive_edge",
};

/** Inputs that must never reach a live recommendation. Contract step 4. */
const DISALLOWED_INPUT_KINDS = ["mock", "stub", "stale", "fixture", "sample"];

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Step 4. A candidate is eligible only if every required input is live for the
 * verified context and the move has a real positive edge.
 *
 * Returns a reason rather than a bare boolean so the engine can report why a
 * type produced nothing without inventing a recommendation to explain it.
 */
function evaluateEligibility(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return { eligible: false, reason: REJECTION.NO_CANDIDATE };
  }
  if (candidate.available === false) {
    return { eligible: false, reason: candidate.reason || REJECTION.NO_PROVIDER_CAPABILITY };
  }
  if (candidate.contextVerified === false) {
    return { eligible: false, reason: REJECTION.CONTEXT_MISMATCH };
  }
  if (candidate.requiredSignalsLive !== true) {
    return { eligible: false, reason: REJECTION.SIGNAL_NOT_LIVE };
  }

  const kinds = Array.isArray(candidate.inputKinds) ? candidate.inputKinds : [];
  const bad = kinds.find((kind) => DISALLOWED_INPUT_KINDS.includes(String(kind).toLowerCase()));
  if (bad) return { eligible: false, reason: REJECTION.NON_LIVE_INPUT };

  const score = finite(candidate.decisionScore);
  // null is "unknown", not zero. An unscored candidate is not evidence-backed.
  // Number(null) is 0 and finite, so the explicit null check above must stay —
  // same trap the S0 projection fix exists to prevent.
  if (candidate.decisionScore == null || score === null) {
    return { eligible: false, reason: REJECTION.SCORE_NOT_FINITE };
  }
  // A zero-or-negative edge is not a move. Presenting one to fill the screen is
  // exactly what contract step 6 forbids.
  if (score <= 0) return { eligible: false, reason: REJECTION.NO_EDGE };

  return { eligible: true, reason: null };
}

function tieBreakIndex(type) {
  const index = TIE_BREAK_ORDER.indexOf(type);
  // An unknown type sorts last rather than throwing. Ranking must stay total.
  return index === -1 ? TIE_BREAK_ORDER.length : index;
}

/**
 * Steps 5 and 6. Pure and total: the same candidate array always produces the
 * same selection, including across ties.
 *
 * @param {Array} candidates
 * @returns {{selected: object|null, ranked: Array, rejected: Array}}
 */
function selectDecision(candidates = []) {
  const list = Array.isArray(candidates) ? candidates : [];

  const eligible = [];
  const rejected = [];

  for (const candidate of list) {
    const verdict = evaluateEligibility(candidate);
    if (verdict.eligible) {
      eligible.push(candidate);
    } else {
      rejected.push({ type: candidate?.type || null, reason: verdict.reason });
    }
  }

  const ranked = eligible.slice().sort((a, b) => {
    const scoreDelta = finite(b.decisionScore) - finite(a.decisionScore);
    if (scoreDelta !== 0) return scoreDelta;

    const orderDelta = tieBreakIndex(a.type) - tieBreakIndex(b.type);
    if (orderDelta !== 0) return orderDelta;

    // Final tie-break on a stable identifier so ranking is deterministic even
    // for two same-type candidates with identical scores. Array.prototype.sort
    // is stable in Node, but relying on input order would make the result
    // depend on provider response ordering, which is not guaranteed.
    return String(a.id || "").localeCompare(String(b.id || ""));
  });

  return {
    selected: ranked.length ? ranked[0] : null,
    ranked,
    rejected,
  };
}

module.exports = {
  DECISION_TYPES,
  TIE_BREAK_ORDER,
  REJECTION,
  evaluateEligibility,
  selectDecision,
};
