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
const { SIGHT_WEIGHT, blendWithSight, isLocked } = require("./sightDecision");

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

// Sight (Omen's own read, attached before ranking when SIGHT_ENABLED) moves the decision value, it does not
// replace the provider: the provider projection leads and Sight pulls it toward what Omen sees. A low-confidence
// Sight (kickers) never moves anything. Where the provider has no projection (Yahoo gaps), a normal-confidence
// Sight fills it, labeled as Omen's.
// A season-strong player (cohort grade at or above this) is not "the cheapest to lose" because of one weak week.
const PROTECTED_GRADE = 70;

function sightOf(player) {
  const block = player?.sight;
  if (!block || block.confidence === "low") return null;
  const points = Number(block.sight_points);
  return Number.isFinite(points) ? { points, grade: Number.isFinite(Number(block.grade)) ? Number(block.grade) : null } : null;
}

/** The number decisions use: provider projection blended with Sight, or Sight alone when the provider is silent. */
function decisionValue(player) {
  const provider = projection(player);
  const sight = sightOf(player);
  if (provider == null) return sight ? sight.points : null;
  return blendWithSight(provider, player);
}

function isSeasonStrong(player) {
  const grade = sightOf(player)?.grade;
  return grade != null && grade >= PROTECTED_GRADE;
}

function positionsOf(player) {
  const eligible = Array.isArray(player?.eligible_positions) ? player.eligible_positions.filter(Boolean) : [];
  return eligible.length ? eligible : [player?.position].filter(Boolean);
}

// Real playing positions. Yahoo (and ESPN) list slot names in a player's eligible positions too
// (BN, IR, W/R/T...). Matching on those made every bench player "eligible" for every starter's slot,
// so a TE could be offered for an injured RB's slot and "RB depth" counted the whole bench.
const REAL_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);
const POSITION_ALIASES = { DST: "DEF", "D/ST": "DEF", D: "DEF", PK: "K" };
const FLEX_SLOT_POSITIONS = {
  FLEX: ["RB", "WR", "TE"], "W/R/T": ["RB", "WR", "TE"], WRT: ["RB", "WR", "TE"],
  "W/R": ["RB", "WR"], "W/T": ["WR", "TE"], REC_FLEX: ["WR", "TE"],
  SUPER_FLEX: ["QB", "RB", "WR", "TE"], "Q/W/R/T": ["QB", "RB", "WR", "TE"], OP: ["QB", "RB", "WR", "TE"],
  UTIL: ["QB", "RB", "WR", "TE"],
};

function realPositionOf(value) {
  const token = String(value || "").trim().toUpperCase();
  const position = POSITION_ALIASES[token] || token;
  return REAL_POSITIONS.has(position) ? position : null;
}

function realPositions(player) {
  const found = new Set();
  for (const value of [player?.position, ...positionsOf(player)]) {
    const position = realPositionOf(value);
    if (position) found.add(position);
  }
  return [...found];
}

/** What a starter's SLOT accepts: the flex set for a flex slot, else its own position. */
function slotPositions(starter) {
  const slot = String(starter?.selected_position || "").trim().toUpperCase();
  if (FLEX_SLOT_POSITIONS[slot]) return FLEX_SLOT_POSITIONS[slot];
  const own = realPositionOf(slot);
  return own ? [own] : realPositions(starter);
}

/** A player on a bye contributes nothing this week by schedule, not by quality. */
function isBye(player) {
  return player?.projection_basis === "bye_week" || String(player?.status || "").trim().toUpperCase() === "BYE";
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
  const eligible = new Set(realPositions(candidate));
  const matches = starters.filter((starter) => !isLocked(starter) && slotPositions(starter).some((pos) => eligible.has(pos)));
  if (!matches.length) return null;

  return matches.reduce((weakest, starter) => {
    const current = isOut(starter) ? 0 : (decisionValue(starter) ?? 0);
    const best = isOut(weakest) ? 0 : (decisionValue(weakest) ?? 0);
    return current < best ? starter : weakest;
  });
}

function rankCandidates(pool, starters) {
  return (Array.isArray(pool) ? pool : [])
    .map((player) => {
      const points = decisionValue(player);
      if (points == null) return null;
      const starter = displacedStarter(player, starters);
      if (!starter) return null;
      const starterPoints = isOut(starter) ? 0 : (decisionValue(starter) ?? 0);
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
function chooseDrop(bench, addedPositions, { starters = null } = {}) {
  const all = Array.isArray(bench) ? bench : [];
  // Players who can actually play this week at each position, across the whole roster. A player on a
  // bye or out for the week is rostered but is not depth for this week's lineup.
  const rostered = [...(Array.isArray(starters) ? starters : []), ...all];
  const available = (player) => !isOut(player) && !isBye(player);
  const requiredAt = (position) => (Array.isArray(starters)
    ? starters.filter((starter) => slotPositions(starter).length === 1 && slotPositions(starter)[0] === position).length
    : 0);
  const healthyAt = (position) => rostered.filter((player) => available(player) && realPositions(player).includes(position)).length;

  const droppable = all
    // A bye week is not a reason to drop someone: his projection is 0 by schedule, not by value.
    .filter((player) => !isOut(player) && !isBye(player) && !isLocked(player))
    .map((player) => ({ player, points: decisionValue(player) }))
    // 0.0 is a schedule or availability signal (bye, inactive), not evidence of low value; only a
    // positive projection can say a player is the cheapest to lose.
    .filter((entry) => entry.points != null && entry.points > 0)
    // Never drop into a hole: if the lineup needs N at this position, keep at least N healthy ones.
    .filter(({ player }) => realPositions(player).every((position) => healthyAt(position) - 1 >= requiredAt(position)))
    // Omen's season read outranks one low week: a player Sight grades strong is not the cheap drop.
    .filter(({ player }) => !isSeasonStrong(player));

  if (!droppable.length) return null;

  const sorted = [...droppable].sort((a, b) =>
    a.points - b.points || String(a.player.player_key).localeCompare(String(b.player.player_key)));
  const weakest = sorted[0];

  // Depth at the dropped player's real position (never the bench as a whole), so the cost statement is
  // specific rather than a generic "you lose depth".
  const positions = realPositions(weakest.player);
  const samePosition = rostered.filter((player) => available(player) && realPositions(player).some((pos) => positions.includes(pos)));

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

  const sight = sightOf(best.player);
  if (sight) {
    const provider = projection(best.player);
    evidence.push({
      category: "omen_read",
      statement: provider == null
        ? `Omen's Sight reads ${nameOf(best.player)} at ${round2(sight.points)} points; the provider has no projection.`
        : `Omen's Sight reads ${nameOf(best.player)} at ${round2(sight.points)} points against the provider's ${round2(provider)}${sight.grade != null ? `, a ${sight.grade} grade at the position` : ""}.`,
      kind: "omen_sight",
    });
  }
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
      drop.player?.sight
        ? `${nameOf(drop.player)} is the lowest-valued player on your bench who can play this week (${round2(drop.projected_points)} points with Omen's Sight).`
        : `${nameOf(drop.player)} projects ${round2(drop.projected_points)} points, the lowest on your bench among players who can play this week.`,
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
    ...(player?.sight ? { sight: player.sight } : {}),
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
  const faab = mayShowFaab(model);
  const priority = mayShowPriority(model);
  const total = faab ? model.budget_total : null;
  const remaining = faab ? model.budget_remaining : null;
  const position = priority ? model.priority_position : null;
  const money = (n) => `$${Number.isInteger(n) ? n : Number(n.toFixed(2))}`;
  return {
    system: model.system,
    determined_from: model.determined_from,
    budget_total: total,
    budget_remaining: remaining,
    priority_position: position,
    // Composed here because the client cannot know whether a zero balance means "spent" or "unread".
    // Emitted only when every number it names is known: a FAAB line with an unread remaining balance
    // is null, never "$0 of $100". Before these two fields existed the native League screen, which
    // requires them to render a budget or claim order, showed every FAAB and priority league as
    // "not determined" (found by the S0 contract probe, 2026-09-30).
    budget_text: isFiniteNumber(total) && isFiniteNumber(remaining) ? `Your budget ${money(remaining)} of ${money(total)}` : null,
    order_text: isFiniteNumber(position) ? `Claim order ${position}` : null,
  };
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
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
  const drop = chooseDrop(bench, realPositions(best.player), { starters });
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
  evidenceFor,
  displacedStarter,
  projection,
  decisionValue,
  SIGHT_WEIGHT,
  rankCandidates,
};
