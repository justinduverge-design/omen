"use strict";

/**
 * FAAB bid recommendation (league-aware-waiver-system-v1 Phase 3).
 *
 * FOUNDER-DIRECTED into the first cut, over a recommendation to defer it.
 *
 * WHAT THIS IS, AND IS NOT.
 *
 * A bid is a claim about a market. Predicting what other managers will bid
 * requires modeling their budgets and intent, and nothing Omen reads makes that
 * knowable — which is why §6.2 gates claim probability and why this module does
 * NOT produce one.
 *
 * So the bid here is deliberately a different, smaller claim: a BUDGET
 * ALLOCATION. "This add is worth about this much of what you have left, given
 * what it projects to add to your roster over the weeks remaining." That is a
 * statement about the user's own roster and budget — both of which Omen has
 * verified — and never a statement about whether the claim clears.
 *
 * Every returned bid carries its own basis string. §6.2: "Do not imply claim
 * success." Nothing here may be rendered as a probability, a guarantee, or a
 * winning bid.
 *
 * ASSUMPTION REQUIRING FOUNDER RATIFICATION: SEASON_DEFINING_POINTS below sets
 * what counts as a maximum-value add. It is the one number that shapes the
 * whole curve and it is a judgement, not a measurement. Ratify or replace it
 * before this ships.
 */

const BID_MODEL_VERSION = "waiver-bid.v1";

// Total projected points gained, across the valuation horizon, at which an add
// is worth committing the entire remaining budget. JUDGEMENT — see above.
const SEASON_DEFINING_POINTS = 40;

// How many weeks of the edge to actually pay for.
//
// Valuing an add across the whole remaining season assumes a Week 1 projection
// holds through Week 18. It does not — roles change, injuries land, and the
// waiver pool refills weekly. Extrapolating the full season made a routine
// Week 1 upgrade recommend the ENTIRE budget, which is the confidently-wrong
// output §6.2 exists to prevent. Pay for the horizon Omen can actually see.
//
// JUDGEMENT, and it moves the whole curve. Ratify with SEASON_DEFINING_POINTS.
const VALUATION_HORIZON_WEEKS = 4;

// Regular season length. Waivers stop mattering after it.
const FINAL_REGULAR_WEEK = 18;

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function weeksRemaining(week) {
  if (!isFiniteNumber(week)) return null;
  const left = FINAL_REGULAR_WEEK - Math.floor(week) + 1;
  return left > 0 ? left : null;
}

/**
 * Recommend a FAAB bid, or null.
 *
 * Returns null — never a number — whenever any input is missing. An invented
 * bid is worse than no bid, and a zero bid is a different claim ("do not bid")
 * rather than an absent one. This mirrors the pool spec's rule that a null
 * projection stays unknown and never becomes zero.
 *
 * @param {object} args
 * @param {object} args.waiverSystem canonical model from waiverSystem.js
 * @param {number|null} args.improvement projected points gained per week
 * @param {number|null} args.week current week
 * @param {number} args.minBid league's waiver_bid_min, if known
 */
function recommendBid({ waiverSystem, improvement, week, minBid = null } = {}) {
  // Gate first. This module never decides whether FAAB applies — waiverSystem does.
  if (!waiverSystem || waiverSystem.system !== "faab") return null;
  if (waiverSystem.determined_from !== "provider_settings") return null;

  const remaining = waiverSystem.budget_remaining;
  if (!isFiniteNumber(remaining) || remaining <= 0) return null;
  if (!isFiniteNumber(improvement) || improvement <= 0) return null;

  const left = weeksRemaining(week);
  if (left == null) return null;

  // Pay for the horizon, never the whole season.
  const paidWeeks = Math.min(left, VALUATION_HORIZON_WEEKS);
  const seasonPoints = improvement * paidWeeks;
  const share = Math.min(1, seasonPoints / SEASON_DEFINING_POINTS);

  const floor = isFiniteNumber(minBid) && minBid > 0 ? minBid : 1;
  let amount = Math.round(remaining * share);
  if (amount < floor) amount = floor;
  if (amount > remaining) amount = remaining;

  return Object.freeze({
    model_version: BID_MODEL_VERSION,
    amount,
    of_budget_remaining: remaining,
    // Required by §6.2's "state what it rests on". Rendered verbatim; it is the
    // reason a number is allowed to appear at all.
    basis:
      `About ${Math.round(share * 100)}% of your remaining $${remaining}, based on roughly ` +
      `${Math.round(seasonPoints)} projected points gained over the next ` +
      `${paidWeeks} week${paidWeeks === 1 ? "" : "s"}.`,
    // Explicit, so no downstream surface can mistake this for a claim forecast.
    implies_claim_success: false,
  });
}

module.exports = {
  BID_MODEL_VERSION,
  SEASON_DEFINING_POINTS,
  VALUATION_HORIZON_WEEKS,
  FINAL_REGULAR_WEEK,
  recommendBid,
};
