"use strict";

/**
 * T4 — saved trade queue with tracked outcomes.
 *
 * Pure record-shape and staleness logic, composed on top of already-shipped
 * exports the same way `tradeFind.js` (T2, read-only reference) composes
 * `tradeLineup.js`/`tradeValue.js`/`tradeLeagueContext.js` — this file adds
 * no new roster-fetch logic and no new scoring model. Route wiring (auth,
 * storage, the actual provider read) lives in `src/routes/trade.js`, exactly
 * where `/roster`, `/find`-equivalent, and `/share` already live.
 *
 * ## The open question this file makes explicit rather than silently papering over
 *
 * The save-action interface T3 already shipped and this item must match
 * exactly (`Blueprints/specs/design/screen-contracts/TradeFindReview-v1.md`,
 * `TradeFindReviewViewModel.save()`) is `save_action(candidate_id, reasoning)`
 * — two arguments. `reasoning` (`buildReasoning()` in T2's `tradeFind.js`) is
 * `{ fills_need_for, user_receives: {position, need}, opponent_receives:
 * {position, need}, evidence }`. It never carries player identity (no
 * `player_key`, no player name) — only *position-level* need evidence.
 *
 * The spec's staleness requirement is written in terms of "a referenced
 * player's roster status has changed materially since save." Taken literally
 * that requires knowing *which player*, which this endpoint is never told.
 * Rather than inventing a wider save-action interface (which would break the
 * "small, mechanical swap" T3 already built against, and isn't this item's
 * job to redesign), this module answers the question the payload actually
 * lets it answer honestly: whether the *position-level need context that
 * justified this candidate* — `user_receives.need`, live-recomputed off the
 * same `rosterDepth`/`needWeightForPosition` math T2 uses — has moved since
 * save. That is a real, defensible reading of "materially changed," not the
 * literal one. See this task's session report for the explicit callback.
 *
 * A richer future save call (one that also sends `give`/`receive`/
 * `platform`/`league_id`/`team_id`) gets a more precise check for free here —
 * `currentNeedFor` only needs a position and a live roster read, and the
 * route layer already accepts those fields as optional extras.
 */

const {
  parseRosterSlots,
  effectiveStarters,
  rosterDepth,
  needWeightForPosition,
} = require("./tradeLeagueContext");

const VALID_OUTCOMES = Object.freeze(["accepted", "rejected", "countered"]);
const VALID_OUTCOME_SET = new Set(VALID_OUTCOMES);

const STALE_STATUS = Object.freeze({
  FRESH: "fresh",
  STALE: "stale",
  UNKNOWN: "unknown",
});

// Same scale tradeFind.js's needStatus() uses — no new math, just applied to
// a freshly-read roster instead of the one read at save time.
function needStatus(weight) {
  if (weight > 1.0) return "hole";
  if (weight < 1.0) return "surplus";
  return "balanced";
}

/**
 * A position's need profile against a live roster read, in the exact shape
 * `reasoning.user_receives.need`/`reasoning.opponent_receives.need` already
 * use (`{ status, have, required }`) so the two are directly comparable.
 * Reuses `tradeLeagueContext.js`'s existing exports verbatim — no new
 * roster-fetch or need-scoring logic.
 */
function currentNeedFor({ position, rosterPositions, players } = {}) {
  if (!position) return null;
  const slotShape = parseRosterSlots(rosterPositions);
  const effective = effectiveStarters(slotShape);
  const depth = rosterDepth(players);

  if (!(position in effective)) {
    return { status: "not_tracked", have: depth[position] || 0, required: null };
  }

  const weight = needWeightForPosition(position, { depth, effective });
  return {
    status: needStatus(weight),
    have: depth[position] || 0,
    required: effective[position] != null ? Math.ceil(effective[position]) : null,
  };
}

/**
 * Compares the need snapshot recorded at save time against a freshly-derived
 * one. Never returns "fresh" or "stale" without both sides actually measured
 * — the honest default when context is missing is `unknown`, not an inferred
 * guess in either direction (same "never infer, `null` is the only honest
 * default" rule this item's spec states for `outcome`).
 */
function staleness({ savedNeed, liveNeed } = {}) {
  if (!savedNeed || !liveNeed) {
    return { status: STALE_STATUS.UNKNOWN, reason: "insufficient_context_for_staleness_check" };
  }
  if (savedNeed.status !== liveNeed.status) {
    return { status: STALE_STATUS.STALE, reason: "needs_profile_changed" };
  }
  if ((savedNeed.have ?? null) !== (liveNeed.have ?? null)
    || (savedNeed.required ?? null) !== (liveNeed.required ?? null)) {
    return { status: STALE_STATUS.STALE, reason: "roster_depth_changed" };
  }
  return { status: STALE_STATUS.FRESH, reason: null };
}

module.exports = {
  VALID_OUTCOMES,
  VALID_OUTCOME_SET,
  STALE_STATUS,
  currentNeedFor,
  staleness,
};
