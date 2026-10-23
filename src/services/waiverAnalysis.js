"use strict";

const { reasonsFor } = require("./moveReasons");

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
const { SIGHT_WEIGHT, blendWithSight, isLocked, effectiveStatus } = require("./sightDecision");
const { solveOptimalLineup } = require("./tradeLineup");

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
  return Number.isFinite(points)
    ? { points, grade: Number.isFinite(Number(block.grade)) ? Number(block.grade) : null }
    : null;
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
  FLEX: ["RB", "WR", "TE"],
  "W/R/T": ["RB", "WR", "TE"],
  WRT: ["RB", "WR", "TE"],
  "W/R": ["RB", "WR"],
  "W/T": ["WR", "TE"],
  REC_FLEX: ["WR", "TE"],
  SUPER_FLEX: ["QB", "RB", "WR", "TE"],
  "Q/W/R/T": ["QB", "RB", "WR", "TE"],
  OP: ["QB", "RB", "WR", "TE"],
  UTIL: ["QB", "RB", "WR", "TE"],
};

function realPositionOf(value) {
  const token = String(value || "")
    .trim()
    .toUpperCase();
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
  const slot = String(starter?.selected_position || "")
    .trim()
    .toUpperCase();
  if (FLEX_SLOT_POSITIONS[slot]) return FLEX_SLOT_POSITIONS[slot];
  const own = realPositionOf(slot);
  return own ? [own] : realPositions(starter);
}

/** A player on a bye contributes nothing this week by schedule, not by quality. */
function isBye(player) {
  return (
    player?.projection_basis === "bye_week" ||
    String(player?.status || "")
      .trim()
      .toUpperCase() === "BYE"
  );
}

function isOut(player) {
  return OUT_STATUSES.has(
    String(effectiveStatus(player) || "")
      .trim()
      .toUpperCase(),
  );
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
  const matches = starters.filter(
    (starter) => !isLocked(starter) && slotPositions(starter).some((pos) => eligible.has(pos)),
  );
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
    .sort(
      (a, b) =>
        // An OUT starter is a hole, not an upgrade. Solve it first.
        Number(b.solves_out_starter) - Number(a.solves_out_starter) ||
        b.improvement - a.improvement ||
        String(a.player.player_key).localeCompare(String(b.player.player_key)),
    );
}

/**
 * §6.2/§6.3 "If no defensible low-cost drop exists, say so plainly ... never
 * force a drop." The drop is the weakest bench player whose projection is known;
 * an unprojected bench player is not evidence of low cost, so it is never
 * offered as one.
 */
/**
 * League-GM planning: starters whose bye is one or two weeks out, by real position. Read from the bye week
 * Sight carries; without it this is empty and nothing changes.
 */
function upcomingByes(starters, week) {
  const now = Number(week);
  if (!Number.isInteger(now)) return [];
  return (Array.isArray(starters) ? starters : [])
    .filter(
      (starter) =>
        Number.isInteger(starter?.sight?.bye_week) && starter.sight.bye_week > now && starter.sight.bye_week <= now + 2,
    )
    .map((starter) => ({ starter, week: starter.sight.bye_week, positions: realPositions(starter) }));
}

function chooseDrop(bench, addedPositions, { starters = null, week = null } = {}) {
  const all = Array.isArray(bench) ? bench : [];
  // Players who can actually play this week at each position, across the whole roster. A player on a
  // bye or out for the week is rostered but is not depth for this week's lineup.
  const rostered = [...(Array.isArray(starters) ? starters : []), ...all];
  const available = (player) => !isOut(player) && !isBye(player);
  const requiredAt = (position) =>
    Array.isArray(starters)
      ? starters.filter((starter) => slotPositions(starter).length === 1 && slotPositions(starter)[0] === position)
          .length
      : 0;
  const healthyAt = (position) =>
    rostered.filter((player) => available(player) && realPositions(player).includes(position)).length;

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
    .filter(({ player }) => !isSeasonStrong(player))
    // Never drop the last bench cover for a starter whose bye is one or two weeks out (unless the add covers it).
    .filter(
      ({ player }) =>
        !upcomingByes(starters, week).some((bye) => {
          const positions = realPositions(player);
          if (
            !bye.positions.some((pos) => positions.includes(pos)) ||
            bye.positions.some((pos) => addedPositions.includes(pos))
          )
            return false;
          const covers = all.filter(
            (other) =>
              available(other) &&
              other.sight?.bye_week !== bye.week &&
              realPositions(other).some((pos) => bye.positions.includes(pos)),
          );
          return covers.length <= 1 && covers.includes(player);
        }),
    );

  if (!droppable.length) return null;

  const sorted = [...droppable].sort(
    (a, b) => a.points - b.points || String(a.player.player_key).localeCompare(String(b.player.player_key)),
  );
  const weakest = sorted[0];

  // Depth at the dropped player's real position (never the bench as a whole), so the cost statement is
  // specific rather than a generic "you lose depth".
  const positions = realPositions(weakest.player);
  const samePosition = rostered.filter(
    (player) => available(player) && realPositions(player).some((pos) => positions.includes(pos)),
  );

  return {
    player: weakest.player,
    projected_points: weakest.points,
    remaining_same_position_depth: Math.max(0, samePosition.length - 1),
    fills_added_position: positions.some((pos) => addedPositions.includes(pos)),
  };
}

/** §6.3 categories, emitted only where the data genuinely supports one. */
function evidenceFor(best, scoringFormat, { starters = [], week = null } = {}) {
  const evidence = [
    {
      category: "immediate_need",
      statement: best.solves_out_starter
        ? `${nameOf(best.displaced)} is unavailable this week, leaving the slot empty.`
        : `${nameOf(best.player)} projects ${best.improvement} points above ${nameOf(best.displaced)}, your weakest eligible starter.`,
      kind: "roster_math",
    },
  ];

  if (scoringFormat) {
    evidence.push({
      category: "league_fact",
      statement: `This comparison uses your league's ${scoringFormat} scoring.`,
      kind: "league_context",
    });
  }

  // League-GM planning: the add covers a starter's bye one or two weeks out.
  const addPositions = realPositions(best.player);
  const bye = upcomingByes(starters, week).find(
    (b) => b.positions.some((pos) => addPositions.includes(pos)) && best.player?.sight?.bye_week !== b.week,
  );
  if (bye) {
    evidence.push({
      category: "upcoming_need",
      statement: `${nameOf(best.player)} also covers ${nameOf(bye.starter)}'s week ${bye.week} bye.`,
      kind: "roster_math",
    });
  }

  // The market: how many ESPN leagues roster the add and how fast that is moving. A signal, never the verdict.
  const owned = Number(best.player?.owned_pct);
  const change = Number(best.player?.owned_pct_change);
  if (
    best.player?.owned_pct != null &&
    Number.isFinite(owned) &&
    best.player?.owned_pct_change != null &&
    Number.isFinite(change) &&
    Math.abs(change) >= 1
  ) {
    evidence.push({
      category: "market_signal",
      statement: `${nameOf(best.player)} is rostered in ${round2(owned)}% of ESPN leagues, ${change > 0 ? "up" : "down"} ${round2(Math.abs(change))} points this week.`,
      kind: "provider_ownership",
    });
  }

  const sight = sightOf(best.player);
  if (sight) {
    const provider = projection(best.player);
    evidence.push({
      category: "omen_read",
      statement:
        provider == null
          ? `Omen's Sight reads ${nameOf(best.player)} at ${round2(sight.points)} points; the provider has no projection.`
          : `Omen's Sight reads ${nameOf(best.player)} at ${round2(sight.points)} points against the provider's ${round2(provider)}${sight.grade != null ? `, a ${sight.grade} grade at the position` : ""}.`,
      kind: "omen_sight",
    });
  }
  return evidence;
}

function costFor(drop, best) {
  if (!drop) return null;
  const removes =
    drop.remaining_same_position_depth > 0
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
    // Additive (G6): only when the provider read supplied them. Yahoo splits free agents from
    // players on waivers and reports percent owned; absent means "not read", never a default.
    ...(player?.availability ? { availability: player.availability } : {}),
    ...(Number.isFinite(player?.percent_owned) ? { percent_owned: player.percent_owned } : {}),
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
    budget_text:
      isFiniteNumber(total) && isFiniteNumber(remaining) ? `Your budget ${money(remaining)} of ${money(total)}` : null,
    order_text: isFiniteNumber(position) ? `Claim order ${position}` : null,
  };
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function envelope({
  platform,
  leagueId,
  week,
  season,
  scoringFormat,
  availability,
  deadline,
  state,
  waiverSystem = null,
  extra = {},
}) {
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
// Phase 1 of the player-value plan (founder-approved 2026-10-23): a waiver move is judged by what the whole move does
// to the team's best legal lineup (the add, the drop, the bench, flex and superflex) over this week and the next two,
// not by whether the add beats one starter this week. "Beats your 16-point starter" is no upgrade when a 24-point QB
// already sits on the bench.
// The window follows the league's calendar: through its last playoff week when the caller knows it (see
// lineupHorizon), playoff weeks weighted by playoffWeekWeight; three weeks is only the fallback. Dynasty value
// beyond this season is phase 3.
const DEFAULT_LINEUP_WEEKS = 3;
// Weeks the projections actually cover (this one and comingWeeks.js's three). Judging further would repeat this
// week's number, and cost a lineup solve per week for nothing.
const MAX_LINEUP_WEEKS = 4;

/** Weeks to judge from `week`: up to MAX_LINEUP_WEEKS, never past the league's final playoff week when it is known. */
function lineupHorizon({ week, lastPlayoffWeek = null } = {}) {
  const now = Number(week);
  const last = Number(lastPlayoffWeek);
  if (Number.isInteger(now) && Number.isInteger(last) && last >= now) return Math.min(MAX_LINEUP_WEEKS, last - now + 1);
  return DEFAULT_LINEUP_WEEKS;
}
const CANDIDATES_CHECKED = 15;
const SEASON_OUT = new Set(["IR", "IR-R", "PUP", "SUSP"]);
// A claim must add more than the best player anyone can pick up now, by at least this much a week, to be worth a
// claim (and maybe a bid) instead of the free add.
const CLAIM_EDGE = 0.5;

function acquisitionOf(player) {
  const raw = String(player?.acquisition || player?.availability || "")
    .trim()
    .toLowerCase();
  if (["w", "waivers", "waiver", "waiver_claim", "claim"].includes(raw)) return "claim";
  if (["fa", "a", "free_agent", "free agent", "free"].includes(raw)) return "free";
  return "unknown";
}

function weekValue(player, week, currentWeek) {
  const status = String(effectiveStatus(player) || "")
    .trim()
    .toUpperCase();
  if (SEASON_OUT.has(status)) return 0;
  if (week === currentWeek && (isOut(player) || isBye(player))) return 0;
  if (Number.isInteger(player?.sight?.bye_week) && player.sight.bye_week === week) return 0;
  // A coming week the provider read (comingWeeks.js) uses that week's number; any other week keeps this week's.
  const ahead = player?.projected_points_by_week?.[week];
  if (week !== currentWeek && ahead != null && Number.isFinite(Number(ahead)))
    return decisionValue({ ...player, projected_points: Number(ahead) });
  return decisionValue(player);
}

/** The team's best legal lineup, summed over the coming weeks. */
function lineupOver(players, rosterPositions, currentWeek, weeks = DEFAULT_LINEUP_WEEKS, weekWeight = () => 1) {
  const first = Number.isInteger(Number(currentWeek)) ? Number(currentWeek) : 0;
  let total = 0;
  for (let i = 0; i < weeks; i += 1) {
    const week = first + i;
    const rows = players.map((player) => ({
      ...player,
      selected_position: SEASON_OUT.has(String(player?.selected_position || "").toUpperCase())
        ? player.selected_position
        : "BN",
      projected_points: weekValue(player, week, first),
    }));
    total += weekWeight(week) * solveOptimalLineup({ players: rows, rosterPositions }).total;
  }
  return total;
}

function sameKey(a, b) {
  return String(a?.player_key ?? a?.player_id ?? a?.name) === String(b?.player_key ?? b?.player_id ?? b?.name);
}

/**
 * Re-judges the top candidates by the whole move: for each, the drop chooseDrop would make, and the lineup change over
 * the coming weeks. Keeps only moves that really raise the lineup; a claim must beat the best free add.
 */
function judgeByLineup(ranked, { starters, bench, week, weeks = DEFAULT_LINEUP_WEEKS, weekWeight = () => 1 }) {
  const rosterPositions = starters.map((s) => String(s?.selected_position || "").toUpperCase()).filter(Boolean);
  // A roster read with no slot names can't be solved as a lineup; it keeps the one-starter comparison.
  if (!rosterPositions.length)
    return ranked.map((entry) => ({
      ...entry,
      drop: chooseDrop(bench, realPositions(entry.player), { starters, week }),
      lineup_gain: null,
      acquisition: acquisitionOf(entry.player),
    }));
  const roster = [...starters, ...bench];
  const before = lineupOver(roster, rosterPositions, week, weeks, weekWeight);
  const judged = [];
  for (const entry of ranked.slice(0, CANDIDATES_CHECKED)) {
    // Every player chooseDrop allows (never into a hole, never a season-strong one), tried in turn: the drop is the
    // one whose loss costs the lineup least over the window, not just the lowest projection this week.
    let drop = null;
    let after = -Infinity;
    let remaining = bench;
    for (let tries = 0; tries < 6; tries += 1) {
      const option = chooseDrop(remaining, realPositions(entry.player), { starters, week });
      if (!option) break;
      const total = lineupOver(
        [...roster.filter((p) => !sameKey(p, option.player)), entry.player],
        rosterPositions,
        week,
        weeks,
        weekWeight,
      );
      if (total > after) {
        after = total;
        drop = option;
      }
      remaining = remaining.filter((p) => !sameKey(p, option.player));
    }
    // Nobody the add can replace (an open roster spot, or no bench player chooseDrop allows): judge the add alone and
    // leave the drop empty, which the analysis reports as no low-cost drop, as it did before.
    if (!drop) after = lineupOver([...roster, entry.player], rosterPositions, week, weeks, weekWeight);
    const gain = round2((after - before) / weeks);
    if (gain < MIN_IMPROVEMENT) continue;
    judged.push({ ...entry, drop, lineup_gain: gain, acquisition: acquisitionOf(entry.player) });
  }
  judged.sort(
    (a, b) => b.lineup_gain - a.lineup_gain || String(a.player.player_key).localeCompare(String(b.player.player_key)),
  );
  const bestFree = judged.find((entry) => entry.acquisition === "free");
  return judged.filter(
    (entry) => entry.acquisition !== "claim" || !bestFree || entry.lineup_gain >= bestFree.lineup_gain + CLAIM_EDGE,
  );
}

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
  // The league's final fantasy playoff week, when the caller read it; it sets how far ahead the move is judged.
  lastPlayoffWeek = null,
  // Weight per week (playoff weeks by the team's chance to be there); 1 when not known.
  playoffWeekWeight = () => 1,
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
    return envelope({
      ...base,
      state: STATES.OFF_SEASON,
      extra: {
        message: "Waiver analysis returns with the regular season.",
      },
    });
  }

  if (pool == null) {
    return envelope({
      ...base,
      state: STATES.ENGINE_LIMITATION,
      extra: {
        message: "Omen could not read this league's available players, so it will not guess at a waiver move.",
      },
    });
  }

  const starters = Array.isArray(roster?.slots?.starters) ? roster.slots.starters : [];
  const bench = Array.isArray(roster?.slots?.bench) ? roster.slots.bench : [];

  if (!starters.length) {
    return envelope({
      ...base,
      state: STATES.ENGINE_LIMITATION,
      extra: {
        message: "Omen needs a drafted roster before it can weigh a waiver move.",
      },
    });
  }

  const weeks = lineupHorizon({ week: base.week, lastPlayoffWeek });
  const ranked = judgeByLineup(rankCandidates(pool, starters), {
    starters,
    bench,
    week: base.week,
    weeks,
    weekWeight: playoffWeekWeight,
  });
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
  const drop = best.drop;
  const alternatives = alternativesFrom(ranked, scoringFormat);

  const judgedWeeks = Array.from({ length: weeks }, (_, k) => Number(base.week) + k).filter(Number.isInteger);
  const moveReasons = reasonsFor({
    gain: best.player,
    lose: drop?.player ?? best.displaced,
    weeks: judgedWeeks,
    lineupGain: best.lineup_gain,
  });
  return envelope({
    ...base,
    state: drop ? STATES.CONFIRMED : STATES.NO_LOW_COST_DROP,
    extra: {
      message: drop ? null : "No low-cost drop is clear on this roster. Omen will not force a move.",
      best_move: {
        add: playerView(best.player),
        drop: drop ? playerView(drop.player) : null,
        improvement: best.improvement,
        // Points a week the whole move (add and drop) adds to the best lineup over the coming weeks.
        lineup_gain: best.lineup_gain ?? null,
        solves_unavailable_starter: best.solves_out_starter,
        displaces: playerView(best.displaced),
        // Reasons first (moveReasons.js): who is out or on bye in which weeks, Omen's read, then the lineup change.
        reasons: moveReasons,
        why_now: best.solves_out_starter
          ? `${nameOf(best.displaced)} is unavailable, and ${nameOf(best.player)} is the strongest available option for that slot.`
          : moveReasons.length
            ? moveReasons.join(" ")
            : `${nameOf(best.player)} projects above your weakest eligible starter for this week.`,
        // Phase 3. Null unless the league was verified FAAB and every input is
        // present. Never zero, never invented, never a claim forecast.
        bid: recommendBid({
          waiverSystem,
          improvement: best.lineup_gain ?? best.improvement,
          week: base.week,
          minBid: waiverSystem?.bid_min ?? null,
        }),
      },
      cost: costFor(drop, best),
      evidence: evidenceFor(best, scoringFormat, { starters, week: base.week }),
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
  lineupHorizon,
  evidenceFor,
  displacedStarter,
  projection,
  decisionValue,
  SIGHT_WEIGHT,
  rankCandidates,
};
