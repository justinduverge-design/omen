"use strict";

/**
 * The HOLD call: what Omen says when no move clears its bar.
 *
 * Before this, a week with no qualifying swap answered "Nothing to recommend", which reads as
 * "Omen has nothing to say" when the truth is "Omen looked at three kinds of move and standing pat
 * is the answer". A hold names what was weighed and why each lost, using only numbers the engine
 * already computed (the optimizer's own status-adjusted projections and threshold, the roster's
 * injury statuses, the waiver and trade evaluations). It never invents a number: where there is no
 * projection, the hold says so instead of producing a delta.
 *
 * Pure: no I/O. `buildHold` returns the object attached to the response as `hold`.
 *
 * Shape (all strings are plain English for the card, all numbers are real):
 *   {
 *     kind: "hold",
 *     headline, summary,
 *     reasons: [{ code, text }],              // ranked: most decisive first
 *     best_alternative: null | {
 *       kind: "start_sit", slot, start: {name, position, projected}, sit: {...},
 *       delta, threshold, margin_to_threshold, why_not
 *     },
 *     considered: [{ kind, outcome, detail }],// start_sit / waiver_pickup / trade_suggestion
 *     projections: { available, players_with_projection, players_total },
 *     threshold_points
 *   }
 */

const optimizer = require("./optimizer");

const BUILD_FAILURE_COPY = Object.freeze({
  timed_out: "the projection sources were too slow",
  provider_error: "the projection sources could not be reached",
  scoring_unreadable: "the league's scoring rules could not be read",
  no_matching_projections: "none of your players could be matched to a projection",
});

function round2(value) {
  return Number(Number(value).toFixed(2));
}

function rosterPlayers(roster) {
  return [
    ...(Array.isArray(roster?.slots?.starters) ? roster.slots.starters : []),
    ...(Array.isArray(roster?.slots?.bench) ? roster.slots.bench : []),
  ];
}

function hasProjection(player) {
  const raw = player?.projected_points;
  return raw !== null && raw !== undefined && raw !== "" && Number.isFinite(Number(raw));
}

/**
 * The strongest bench-for-starter swap the optimizer saw, including ones below its threshold.
 * `minDelta: -Infinity` asks the optimizer for each starter's best bench option without applying
 * its bar, so the losing alternative is the engine's own number, not a recomputation.
 */
function bestLineupAlternative(roster, { usage = null } = {}) {
  let rows = [];
  try {
    rows = optimizer.evaluateLineup(roster, { minDelta: -Infinity, ...(usage ? { usage } : {}) });
  } catch {
    return null;
  }
  return rows.length ? rows[0] : null;
}

function describeAlternative(row, threshold) {
  const delta = round2(row.delta);
  const margin = round2(threshold - delta);
  const startName = row.to?.name || "the bench player";
  const sitName = row.from?.name || "your starter";
  const whyNot = delta >= 0
    ? `${startName} projects ${Math.abs(delta).toFixed(1)} points above ${sitName} (${row.to.projected} vs ${row.from.projected}), under the ${threshold}-point bar Omen needs before it suggests a swap.`
    : `${sitName} already projects ${Math.abs(delta).toFixed(1)} points above ${startName} (${row.from.projected} vs ${row.to.projected}), so benching ${sitName} would cost you.`;
  return {
    kind: "start_sit",
    slot: row.slot || null,
    start: { name: startName, projected: row.to?.projected ?? null },
    sit: { name: sitName, projected: row.from?.projected ?? null },
    delta,
    threshold,
    margin_to_threshold: margin,
    why_not: whyNot,
  };
}

function outStarterNames(roster, isOut) {
  const starters = Array.isArray(roster?.slots?.starters) ? roster.slots.starters : [];
  return starters.filter((player) => isOut(player?.status)).map((player) => player.name).filter(Boolean);
}

/**
 * @param {object} input
 * @param {object} input.roster              normalized roster (slots.starters / slots.bench)
 * @param {string} input.platformLabel       "ESPN" | "Sleeper" | "Yahoo"
 * @param {object} [input.waiver]            { signalMessage, signalStatus }
 * @param {object} [input.trade]             result of evaluateTradeForConnection (status/reason/message/teams_checked)
 * @param {Map}    [input.usage]             observed usage, passed through to the optimizer
 * @param {function} input.isOut             the engine's OUT-status test
 * @param {number} [input.threshold]         lineup bar in points (defaults to the optimizer's)
 */
function buildHold({ roster, platformLabel, waiver = {}, trade = null, usage = null, isOut, threshold } = {}) {
  const bar = Number.isFinite(Number(threshold))
    ? Number(threshold)
    : optimizer.DEFAULT_OPTIMIZER_CONFIG.lineupMinDelta;
  const players = rosterPlayers(roster);
  const withProjection = players.filter(hasProjection).length;
  const projectionsAvailable = withProjection > 0;

  const reasons = [];
  const considered = [];
  let bestAlternative = null;

  // 1. Start/sit.
  // A roster Omen tried to fill in itself (Yahoo) says why that did not work, instead of blaming the
  // provider for something Omen was supposed to build.
  const buildFailure = BUILD_FAILURE_COPY[roster?.projection_meta?.reason] || null;
  if (!projectionsAvailable) {
    reasons.push({
      code: "projections_unavailable",
      text: buildFailure
        ? `${platformLabel} does not publish weekly projections and Omen could not build them for this league this time (${buildFailure}), so it cannot rank lineup swaps or trades. Holding is the only call it can stand behind.`
        : `Omen could not build enough usable weekly projections for this ${platformLabel} league, so it cannot rank lineup swaps or trades. Holding is the only call it can stand behind.`,
    });
    considered.push({
      kind: "start_sit",
      outcome: "unavailable",
      detail: `No weekly projections from ${platformLabel}, so no swap could be scored.`,
    });
  } else {
    const best = bestLineupAlternative(roster, { usage });
    if (best) {
      bestAlternative = describeAlternative(best, bar);
      reasons.push({ code: "best_swap_below_bar", text: bestAlternative.why_not });
      considered.push({
        kind: "start_sit",
        outcome: "below_threshold",
        detail: bestAlternative.why_not,
      });
    } else {
      const text = "No bench player is eligible for any of your starting slots, so there is no lineup swap to weigh.";
      reasons.push({ code: "no_eligible_bench", text });
      considered.push({ kind: "start_sit", outcome: "none_found", detail: text });
    }
    // Partial coverage: a player with no projection is never compared, so the hold must not read as
    // if every swap was weighed.
    if (roster?.projection_meta && withProjection < players.length) {
      reasons.push({
        code: "projections_partial",
        text: `Omen could project ${withProjection} of your ${players.length} lineup players, so any player without a projection was left out of the comparison.`,
      });
    }
  }

  // 2. Waivers.
  const outNames = isOut ? outStarterNames(roster, isOut) : [];
  if (outNames.length) {
    const who = outNames.length === 1 ? `${outNames[0]} is OUT` : `${outNames.join(" and ")} are OUT`;
    const poolUnread = waiver.signalStatus === "unavailable";
    const detail = poolUnread
      ? `${who}, but the waiver pool could not be read, so Omen is not guessing at a pickup.`
      : `${who}, and Omen found no projected same-position pickup that improves your lineup.`;
    reasons.push({ code: poolUnread ? "waiver_pool_unavailable" : "no_waiver_fix", text: detail });
    considered.push({ kind: "waiver_pickup", outcome: poolUnread ? "unavailable" : "none_found", detail });
  } else {
    considered.push({
      kind: "waiver_pickup",
      outcome: "not_needed",
      detail: "None of your starters is ruled out, so no waiver pickup was needed.",
    });
  }

  // 3. Trade.
  if (trade) {
    if (trade.status === "none_found") {
      const teams = Number(trade.teams_checked) || 0;
      const detail = teams > 0
        ? `Omen searched ${teams} other roster${teams === 1 ? "" : "s"} in this league for a one-for-one trade that improves both lineups and keeps the value fair. None cleared both.`
        : "Omen searched the other rosters in this league for a one-for-one trade that improves both lineups. None cleared the bar.";
      reasons.push({ code: "no_fair_trade", text: detail });
      considered.push({ kind: "trade_suggestion", outcome: "none_found", detail });
    } else if (trade.status === "unavailable") {
      const detail = trade.message || `A trade could not be weighed (${trade.reason || "unavailable"}).`;
      // The projection reason is already the headline reason above; do not say it twice.
      if (trade.reason !== "projections_unavailable") {
        reasons.push({ code: `trade_${trade.reason || "unavailable"}`, text: detail });
      }
      considered.push({ kind: "trade_suggestion", outcome: "unavailable", reason: trade.reason || null, detail });
    }
  }

  // Only claim what was actually weighed: a trade that could not be evaluated, or a lineup with no
  // projections, was not weighed.
  const weighed = [];
  if (projectionsAvailable) weighed.push("lineup swaps");
  weighed.push("waivers");
  if (trade && trade.status === "none_found") weighed.push("trades");

  const summary = bestAlternative
    ? "Hold your lineup. The best alternative Omen found does not beat what you already have by enough to be worth the risk."
    : `Hold your lineup. Omen weighed ${weighed.join(", ").replace(/, ([^,]*)$/, " and $1")} and none is worth making this week.`;

  return {
    kind: "hold",
    headline: "Hold your lineup this week",
    summary,
    reasons,
    best_alternative: bestAlternative,
    considered,
    projections: {
      available: projectionsAvailable,
      players_with_projection: withProjection,
      players_total: players.length,
    },
    threshold_points: bar,
  };
}

module.exports = { buildHold, bestLineupAlternative, describeAlternative };
