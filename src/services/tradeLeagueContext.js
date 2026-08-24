"use strict";

/**
 * Trade personalization context.
 *
 * Turns a connected league into the `scoringConfig` shape `compareTrade()`
 * already consumes, so "personalized" means real league and roster math
 * rather than a scoring-format label.
 *
 * Three things actually change the answer:
 *
 *   1. Scoring format, read from the provider's own settings rather than
 *      trusted from the client.
 *   2. Roster construction. A league that starts three WRs drains the WR
 *      pool deeper than one that starts two, so the best freely available
 *      WR is worse and every WR is worth more. That moves replacement
 *      level, which moves VORP, which moves the verdict.
 *   3. The user's own positional surplus. An incoming RB is worth less to
 *      a manager already three deep at RB than to one starting a bye-week
 *      hole. That moves the scarcity weight.
 *
 * Pure functions first, provider I/O last and injectable, so the maths is
 * testable without a network or a credential.
 */

const { REPLACEMENT_LEVELS, normalizePosition } = require("./vorp");

const DEFAULT_TEAM_COUNT = 12;

// The 12-team baseline the shipped REPLACEMENT_LEVELS were calibrated against
// (see vorp.js). Demand is measured as a ratio against this, never in the
// abstract.
const DEFAULT_STARTERS = Object.freeze({
  QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1,
});

const FLEX_ELIGIBLE = Object.freeze(["RB", "WR", "TE"]);

const FLEX_SLOTS = new Set(["FLEX", "W/R", "W/R/T", "WR/RB", "WR/RB/TE", "WRT", "REC_FLEX"]);
const SUPER_FLEX_SLOTS = new Set(["SUPER_FLEX", "SFLEX", "QB/WR/RB/TE", "OP"]);
const NON_STARTING_SLOTS = new Set(["BN", "BE", "BENCH", "IR", "IL", "IR+", "NA", "TAXI"]);

// v1 heuristic, deliberately bounded. A league's shape may move a replacement
// baseline by at most 35% in either direction — enough to change a close
// verdict, never enough for roster construction alone to invert a lopsided
// offer. Calibrate against real league outcomes before widening; the same
// posture as tradeValue.js's DEPTH_DISCOUNT_CURVE and B-weight.
const MAX_DEMAND_ADJUSTMENT = 0.35;
const DEMAND_SENSITIVITY = 0.5;

// Positional surplus moves a scarcity weight within these bounds. The engine
// itself rejects anything outside 0-10 (tradeValue.js scarcityWeightsFor).
const NEED_WEIGHT_MIN = 0.5;
const NEED_WEIGHT_MAX = 1.6;
const NEED_WEIGHT_STEP = 0.2;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Provider roster-slot arrays into a starter shape.
 * Unknown slot names are ignored rather than guessed at.
 */
function parseRosterSlots(rosterPositions) {
  const slots = Array.isArray(rosterPositions) ? rosterPositions : [];
  const starters = {};
  let flex = 0;
  let superFlex = 0;
  let bench = 0;

  for (const raw of slots) {
    if (raw == null) continue;
    const slot = String(raw).toUpperCase().trim();
    if (!slot) continue;

    if (NON_STARTING_SLOTS.has(slot)) { bench += 1; continue; }
    if (FLEX_SLOTS.has(slot)) { flex += 1; continue; }
    if (SUPER_FLEX_SLOTS.has(slot)) { superFlex += 1; continue; }

    const position = normalizePosition(slot);
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_STARTERS, position)) continue;
    starters[position] = (starters[position] || 0) + 1;
  }

  const totalStarters = Object.values(starters).reduce((sum, n) => sum + n, 0) + flex + superFlex;
  return { starters, flex, superFlex, bench, totalStarters };
}

/**
 * Fold flex slots into the positions that actually fill them, proportionally
 * to how many direct starters each already carries. A 3WR/2RB league spends
 * its flex mostly on WR; a 2WR/3RB league spends it mostly on RB. Super-flex
 * lands on QB.
 */
function effectiveStarters(slotShape) {
  const effective = { ...slotShape.starters };
  const eligible = FLEX_ELIGIBLE.filter((position) => (effective[position] || 0) > 0);
  const directTotal = eligible.reduce((sum, position) => sum + effective[position], 0);

  if (slotShape.flex > 0 && directTotal > 0) {
    for (const position of eligible) {
      effective[position] = round2(
        effective[position] + slotShape.flex * (effective[position] / directTotal)
      );
    }
  }
  if (slotShape.superFlex > 0) {
    effective.QB = round2((effective.QB || 0) + slotShape.superFlex);
  }
  return effective;
}

/**
 * Replacement baseline for one position under this league's shape.
 *
 * More total demand for a position means the best freely available player at
 * it is worse, so the baseline drops and every player at that position gains
 * value. Bounded by MAX_DEMAND_ADJUSTMENT.
 */
function baselineForPosition(position, { scoringFormat, effective, teamCount }) {
  const levels = REPLACEMENT_LEVELS[scoringFormat] || REPLACEMENT_LEVELS.ppr;
  const base = finiteOrNull(levels[position]);
  if (base == null) return null;

  const defaultStarters = DEFAULT_STARTERS[position];
  const leagueStarters = finiteOrNull(effective[position]);
  if (!defaultStarters || leagueStarters == null || leagueStarters <= 0) return round2(base);

  const demandRatio = (leagueStarters / defaultStarters) * (teamCount / DEFAULT_TEAM_COUNT);
  const raw = 1 / (1 + DEMAND_SENSITIVITY * (demandRatio - 1));
  const factor = clamp(raw, 1 - MAX_DEMAND_ADJUSTMENT, 1 + MAX_DEMAND_ADJUSTMENT);
  return round2(base * factor);
}

/**
 * Count the user's startable bodies per position. Injured-reserve and taxi
 * players are not startable depth and are excluded.
 */
function rosterDepth(players) {
  const depth = {};
  for (const player of Array.isArray(players) ? players : []) {
    const slot = String(player?.selected_position || "").toUpperCase();
    if (NON_STARTING_SLOTS.has(slot) && slot !== "BN" && slot !== "BE" && slot !== "BENCH") continue;
    const position = normalizePosition(player?.position);
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_STARTERS, position)) continue;
    depth[position] = (depth[position] || 0) + 1;
  }
  return depth;
}

/**
 * Surplus at a position lowers the value of receiving another one; a hole
 * raises it. Returns 1 (neutral) for any position we cannot measure.
 */
function needWeightForPosition(position, { depth, effective }) {
  const required = finiteOrNull(effective[position]);
  const have = finiteOrNull(depth[position]);
  if (required == null || have == null) return 1;

  const surplus = have - Math.ceil(required);
  return round2(clamp(1 - NEED_WEIGHT_STEP * surplus, NEED_WEIGHT_MIN, NEED_WEIGHT_MAX));
}

/**
 * The scoringConfig `compareTrade()` consumes, plus a human-readable list of
 * what was actually applied so the screen can name it instead of claiming
 * "personalized" with nothing behind the word.
 */
function buildTradeScoringConfig({
  scoringFormat = "ppr",
  rosterPositions = [],
  teamCount = DEFAULT_TEAM_COUNT,
  rosterPlayers = [],
} = {}) {
  const format = REPLACEMENT_LEVELS[scoringFormat] ? scoringFormat : "ppr";
  const slotShape = parseRosterSlots(rosterPositions);
  const effective = effectiveStarters(slotShape);
  const depth = rosterDepth(rosterPlayers);
  const resolvedTeamCount = finiteOrNull(teamCount) || DEFAULT_TEAM_COUNT;

  const positions = Object.keys(DEFAULT_STARTERS);
  const rows = [];
  for (const position of positions) {
    const baseline = baselineForPosition(position, {
      scoringFormat: format,
      effective,
      teamCount: resolvedTeamCount,
    });
    if (baseline == null) continue;
    rows.push({
      position,
      baseline_points: baseline,
      scarcity_weight: needWeightForPosition(position, { depth, effective }),
    });
  }

  const applied = ["scoring_format"];
  if (slotShape.totalStarters > 0) applied.push("roster_construction");
  if (Object.keys(depth).length > 0) applied.push("roster_depth");
  if (resolvedTeamCount !== DEFAULT_TEAM_COUNT) applied.push("league_size");

  return {
    scoringConfig: {
      scoring_format: format,
      league_scarcity_weights: rows,
    },
    applied,
    detail: {
      scoring_format: format,
      team_count: resolvedTeamCount,
      starting_slots: slotShape.totalStarters,
      effective_starters: effective,
      roster_depth: depth,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Provider resolution. I/O is injected so the maths above stays
 * testable without a network call or a credential.
 * ------------------------------------------------------------------ */

const UNRESOLVED = Object.freeze({
  no_connection: "no_connected_league",
  provider_unsupported: "provider_unsupported",
  provider_failed: "league_context_unavailable",
});

function usableConnection(row) {
  if (!row?.is_active || !row?.league_id) return false;
  if (row.platform === "sleeper") return Boolean(row.platform_username || row.platform_user_id);
  if (row.platform === "espn") return Boolean(row.espn_secret_id && row.swid_secret_id);
  // Yahoo is refused at the app-entitlement level (facts-of-record #11); it
  // cannot supply league context and is not offered as a personalization source.
  return false;
}

function selectContextConnection(rows, { platform, leagueId } = {}) {
  const candidates = (Array.isArray(rows) ? rows : [])
    .filter(usableConnection)
    .filter((row) => !platform || row.platform === platform)
    .filter((row) => !leagueId || String(row.league_id) === String(leagueId));
  // Sleeper first: it needs no credential and is the cheapest reliable read.
  return candidates.sort((a, b) => (
    (a.platform === "sleeper" ? 0 : 1) - (b.platform === "sleeper" ? 0 : 1)
  ))[0] || null;
}

function sleeperScoringFormat(league) {
  const rec = Number(league?.scoring_settings?.rec);
  if (rec === 0) return "standard";
  if (rec === 0.5) return "half_ppr";
  return "ppr";
}

/**
 * Resolve a personalization context for one user.
 *
 * Never trusts client-supplied roster or scoring input — everything here is
 * read from the provider through the user's own stored connection. Returns a
 * neutral-fallback reason rather than throwing, because §8.3 requires that an
 * unverifiable league quietly retains neutral analysis.
 */
async function resolveTradeLeagueContext({
  userId,
  platform = null,
  leagueId = null,
  deps = {},
} = {}) {
  const {
    getConnections,
    fetchSleeperLeague,
    buildSleeperRoster,
    logger = { warn() {} },
  } = deps;

  if (!userId || typeof getConnections !== "function") {
    return { status: "unavailable", reason: UNRESOLVED.no_connection };
  }

  let rows = [];
  try {
    rows = await getConnections(userId);
  } catch (e) {
    logger.warn("Trade league context: connection lookup failed", { err: e.message });
    return { status: "unavailable", reason: UNRESOLVED.provider_failed };
  }

  const connection = selectContextConnection(rows, { platform, leagueId });
  if (!connection) {
    return { status: "unavailable", reason: UNRESOLVED.no_connection };
  }

  if (connection.platform !== "sleeper") {
    // ESPN carries the data but needs its credential path and its own
    // provider proof before it may claim personalization. Named, not faked.
    return {
      status: "unavailable",
      reason: UNRESOLVED.provider_unsupported,
      platform: connection.platform,
    };
  }

  try {
    const league = await fetchSleeperLeague(String(connection.league_id));
    const roster = await buildSleeperRoster(
      String(connection.league_id),
      connection.platform_username,
      league
    );
    const built = buildTradeScoringConfig({
      scoringFormat: sleeperScoringFormat(league),
      rosterPositions: league?.roster_positions,
      teamCount: finiteOrNull(league?.total_rosters) || DEFAULT_TEAM_COUNT,
      rosterPlayers: roster,
    });

    return {
      status: "personalized",
      platform: connection.platform,
      league_id: String(connection.league_id),
      league_name: league?.name || null,
      ...built,
    };
  } catch (e) {
    logger.warn("Trade league context: provider read failed", { err: e.message });
    return {
      status: "unavailable",
      reason: UNRESOLVED.provider_failed,
      platform: connection.platform,
    };
  }
}

module.exports = {
  DEFAULT_STARTERS,
  DEFAULT_TEAM_COUNT,
  MAX_DEMAND_ADJUSTMENT,
  UNRESOLVED,
  parseRosterSlots,
  effectiveStarters,
  baselineForPosition,
  rosterDepth,
  needWeightForPosition,
  buildTradeScoringConfig,
  selectContextConnection,
  sleeperScoringFormat,
  resolveTradeLeagueContext,
};
