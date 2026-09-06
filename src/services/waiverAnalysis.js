"use strict";

/**
 * Waiver Analysis (visual briefs §6).
 *
 * Command Center's Waiver Watch answers "is there something out there". This
 * answers the whole decision: the best move, the drop it costs, why that cost is
 * acceptable, and two or three credible alternatives.
 *
 * Provider-neutral on purpose. `GET /api/optimizer/waivers` was Yahoo-only, so a
 * Sleeper-only or ESPN-only user had no waiver surface at all. (Yahoo's
 * entitlement was also refused when that was written; it has been live since
 * 2026-08-28 — facts-of-record #11.) Everything here
 * is a pure function over an already-normalized roster and pool, so provider
 * differences stay in the route and the maths stays testable without a network.
 *
 * FAAB amount and waiver priority ARE now produced, but only for a league whose
 * waiver system was positively verified by `waiverSystem.js` (Phase 2 of
 * league-aware-waiver-system-v1). A league that was not determined keeps the
 * original system-blind output, unchanged.
 *
 * Claim probability remains deliberately NOT produced. §6.2 still forbids it
 * for every league, determined or not.
 */

const { mayShowFaab, mayShowPriority } = require("./waiverSystem");
const { recommendBid } = require("./waiverBid");

const CONTRACT_VERSION = "waiver-analysis.v1";
const MAX_ALTERNATIVES = 3;

// §6.4 "Rank only after availability and roster relevance are verified." A
// candidate has to beat the starter it would replace by a real margin, not by
// projection noise.
const MIN_IMPROVEMENT = 0.5;

const OUT_STATUSES = new Set(["O", "OUT", "IR", "IR-R", "PUP", "SUSP", "DOUBTFUL"]);

const STATES = Object.freeze({
  CONFIRMED: "confirmed_opportunity",
  AVAILABILITY_UNKNOWN: "availability_unknown",
  NO_LOW_COST_DROP: "no_low_cost_drop",
  NO_CREDIBLE_MOVE: "no_credible_move",
  ENGINE_LIMITATION: "engine_limitation",
  OFF_SEASON: "off_season",
});

/**
 * null projection means "unknown", not zero. Number(null) is 0 and 0 is finite,
 * so a bare Number.isFinite guard silently admits every unprojected player —
 * the same null-vs-zero trap the B2-D-S0 projection fix exists to prevent.
 */
function projection(player) {
  const raw = player?.projected_points;
  if (raw == null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function positionsOf(player) {
  const eligible = Array.isArray(player?.eligible_positions) ? player.eligible_positions.filter(Boolean) : [];
  return eligible.length ? eligible : [player?.position].filter(Boolean);
}

function isOut(player) {
  return OUT_STATUSES.has(String(player?.status || "").trim().toUpperCase());
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function nameOf(player) {
  return String(player?.name || "").trim() || "this player";
}

/**
 * The starter this candidate would actually displace: the weakest starter whose
 * slot the candidate is eligible for. An OUT starter counts as zero for the week
 * regardless of projection, because they will not play.
 */
function displacedStarter(candidate, starters) {
  const eligible = new Set(positionsOf(candidate));
  const matches = starters.filter((starter) => positionsOf(starter).some((pos) => eligible.has(pos)));
  if (!matches.length) return null;

  return matches.reduce((weakest, starter) => {
    const current = isOut(starter) ? 0 : (projection(starter) ?? 0);
    const best = isOut(weakest) ? 0 : (projection(weakest) ?? 0);
    return current < best ? starter : weakest;
  });
}

function rankCandidates(pool, starters) {
  return (Array.isArray(pool) ? pool : [])
    .map((player) => {
      const points = projection(player);
      if (points == null) return null;
      const starter = displacedStarter(player, starters);
      if (!starter) return null;
      const starterPoints = isOut(starter) ? 0 : (projection(starter) ?? 0);
      return {
        player,
        displaced: starter,
        improvement: round2(points - starterPoints),
        solves_out_starter: isOut(starter),
      };
    })
    .filter((entry) => entry && entry.improvement >= MIN_IMPROVEMENT)
    .sort((a, b) =>
      // An OUT starter is a hole, not an upgrade. Solve it first.
      Number(b.solves_out_starter) - Number(a.solves_out_starter)
      || b.improvement - a.improvement
      || String(a.player.player_key).localeCompare(String(b.player.player_key)));
}

/**
 * §6.2/§6.3 "If no defensible low-cost drop exists, say so plainly ... never
 * force a drop." The drop is the weakest bench player whose projection is known;
 * an unprojected bench player is not evidence of low cost, so it is never
 * offered as one.
 */
function chooseDrop(bench, addedPositions) {
  const droppable = bench
    .filter((player) => !isOut(player))
    .map((player) => ({ player, points: projection(player) }))
    .filter((entry) => entry.points != null);

  if (!droppable.length) return null;

  const sorted = [...droppable].sort((a, b) =>
    a.points - b.points || String(a.player.player_key).localeCompare(String(b.player.player_key)));
  const weakest = sorted[0];

  // Depth at the dropped player's position, so the cost statement is specific
  // rather than a generic "you lose depth".
  const positions = positionsOf(weakest.player);
  const samePosition = bench.filter((player) => positionsOf(player).some((pos) => positions.includes(pos)));

  return {
    player: weakest.player,
    projected_points: weakest.points,
    remaining_same_position_depth: Math.max(0, samePosition.length - 1),
    fills_added_position: positions.some((pos) => addedPositions.includes(pos)),
  };
}

/** §6.3 categories, emitted only where the data genuinely supports one. */
function evidenceFor(best, scoringFormat) {
  const evidence = [{
    category: "immediate_need",
    statement: best.solves_out_starter
      ? `${nameOf(best.displaced)} is unavailable this week, leaving the slot empty.`
      : `${nameOf(best.player)} projects ${best.improvement} points above ${nameOf(best.displaced)}, your weakest eligible starter.`,
    kind: "roster_math",
  }];

  if (scoringFormat) {
    evidence.push({
      category: "league_fact",
      statement: `This comparison uses your league's ${scoringFormat} scoring.`,
      kind: "league_context",
    });
  }

  // "Current role" and "Season value" (§6.3) need usage and rest-of-season data
  // Omen does not have. Naming the absence beats inventing a sentence.
  return evidence;
}

function costFor(drop, best) {
  if (!drop) return null;
  const removes = drop.remaining_same_position_depth > 0
    ? `${nameOf(drop.player)} was your ${positionsOf(drop.player)[0] || "bench"} depth; ${drop.remaining_same_position_depth} other option${drop.remaining_same_position_depth === 1 ? "" : "s"} remain${drop.remaining_same_position_depth === 1 ? "s" : ""} at that position.`
    : `${nameOf(drop.player)} was your only remaining bench option at that position.`;

  return {
    removes,
    accepted_because: [
      `${nameOf(drop.player)} projects ${round2(drop.projected_points)} points, the lowest on your bench.`,
      `${nameOf(best.player)} addresses a more immediate roster need.`,
    ],
  };
}

function alternativesFrom(ranked, scoringFormat) {
  return ranked.slice(1, 1 + MAX_ALTERNATIVES).map((entry) => ({
    player: playerView(entry.player),
    improvement: entry.improvement,
    tradeoff: entry.solves_out_starter
      ? `Also covers ${nameOf(entry.displaced)}, but projects ${round2(ranked[0].improvement - entry.improvement)} points below the recommended add.`
      : `Projects ${round2(ranked[0].improvement - entry.improvement)} points below the recommended add against ${scoringFormat ? `${scoringFormat} scoring` : "your current lineup"}.`,
  }));
}

function playerView(player) {
  return {
    player_key: player?.player_key == null ? null : String(player.player_key),
    name: player?.name || null,
    position: player?.position || null,
    team: player?.team || null,
    projected_points: projection(player),
    status: player?.status || null,
  };
}

/**
 * §6.2 surfacing gate. A value is emitted only when its system was positively
 * determined. Sleeper populates every waiver field on every league, so reading
 * the raw payload here instead of the model would emit a budget AND a priority
 * for every league in the product.
 */
function waiverSystemView(model) {
  if (!model) return null;
  return {
    system: model.system,
    determined_from: model.determined_from,
    budget_total: mayShowFaab(model) ? model.budget_total : null,
    budget_remaining: mayShowFaab(model) ? model.budget_remaining : null,
    priority_position: mayShowPriority(model) ? model.priority_position : null,
  };
}

function envelope({ platform, leagueId, week, season, scoringFormat, availability, deadline, state, waiverSystem = null, extra = {} }) {
  return {
    contract_version: CONTRACT_VERSION,
    generated_at: new Date().toISOString(),
    platform,
    league_id: leagueId == null ? null : String(leagueId),
    season: season == null ? null : Number(season),
    week: week == null ? null : Number(week),
    scoring_format: scoringFormat || null,
    // §6.2: availability and deadline appear only when confirmed for the league.
    availability_state: availability,
    deadline,
    state,
    waiver_system: waiverSystemView(waiverSystem),
    best_move: null,
    cost: null,
    evidence: [],
    alternatives: [],
    ...extra,
  };
}

/**
 * @param {object} input
 * @param {object} input.roster normalized roster with slots.starters / slots.bench
 * @param {Array|null} input.pool normalized available players; null means the
 *   provider pool could not be read, which is a different answer from an empty pool
 */
function buildWaiverAnalysis({
  roster,
  pool,
  platform,
  leagueId,
  week = null,
  season = null,
  scoringFormat = null,
  availabilityConfirmed = false,
  deadline = null,
  offSeason = false,
  waiverSystem = null,
} = {}) {
  const base = {
    platform,
    leagueId,
    week: week ?? roster?.week ?? null,
    season,
    scoringFormat,
    availability: availabilityConfirmed ? "confirmed" : "unconfirmed",
    // A deadline is only ever emitted when the provider actually confirmed one.
    deadline: availabilityConfirmed ? deadline : null,
    waiverSystem,
  };

  if (offSeason) {
    return envelope({ ...base, state: STATES.OFF_SEASON, extra: {
      message: "Waiver analysis returns with the regular season.",
    } });
  }

  if (pool == null) {
    return envelope({ ...base, state: STATES.ENGINE_LIMITATION, extra: {
      message: "Omen could not read this league's available players, so it will not guess at a waiver move.",
    } });
  }

  const starters = Array.isArray(roster?.slots?.starters) ? roster.slots.starters : [];
  const bench = Array.isArray(roster?.slots?.bench) ? roster.slots.bench : [];

  if (!starters.length) {
    return envelope({ ...base, state: STATES.ENGINE_LIMITATION, extra: {
      message: "Omen needs a drafted roster before it can weigh a waiver move.",
    } });
  }

  const ranked = rankCandidates(pool, starters);
  if (!ranked.length) {
    return envelope({
      ...base,
      state: availabilityConfirmed ? STATES.NO_CREDIBLE_MOVE : STATES.AVAILABILITY_UNKNOWN,
      extra: {
        message: availabilityConfirmed
          ? "No waiver move stands out for this roster right now."
          : "Omen cannot confirm free-agent status in this league, and no available player clears your current lineup.",
      },
    });
  }

  const best = ranked[0];
  const drop = chooseDrop(bench, positionsOf(best.player));
  const alternatives = alternativesFrom(ranked, scoringFormat);

  return envelope({
    ...base,
    state: drop ? STATES.CONFIRMED : STATES.NO_LOW_COST_DROP,
    extra: {
      message: drop
        ? null
        : "No low-cost drop is clear on this roster. Omen will not force a move.",
      best_move: {
        add: playerView(best.player),
        drop: drop ? playerView(drop.player) : null,
        improvement: best.improvement,
        solves_unavailable_starter: best.solves_out_starter,
        displaces: playerView(best.displaced),
        why_now: best.solves_out_starter
          ? `${nameOf(best.displaced)} is unavailable, and ${nameOf(best.player)} is the strongest available option for that slot.`
          : `${nameOf(best.player)} projects above your weakest eligible starter for this week.`,
        // Phase 3. Null unless the league was verified FAAB and every input is
        // present. Never zero, never invented, never a claim forecast.
        bid: recommendBid({
          waiverSystem,
          improvement: best.improvement,
          week: base.week,
          minBid: waiverSystem?.bid_min ?? null,
        }),
      },
      cost: costFor(drop, best),
      evidence: evidenceFor(best, scoringFormat),
      alternatives,
    },
  });
}

module.exports = {
  CONTRACT_VERSION,
  MIN_IMPROVEMENT,
  STATES,
  buildWaiverAnalysis,
  chooseDrop,
  displacedStarter,
  projection,
  rankCandidates,
};
