"use strict";

/**
 * =================================================================
 * Optimizer service - Start/Sit + Waiver math
 * -----------------------------------------------------------------
 * Pure functions over a normalized roster. No I/O, no side effects.
 * Routes call into here after fetching the roster + waiver pool.
 *
 * Two engines:
 *   evaluateLineup(roster)     - per-position swap recommendations
 *   findWaiverMoves(roster, p) - top waiver pickups by need
 *
 * Both use status-adjusted projections: an OUT player projects 0,
 * a QUESTIONABLE player gets a 15% haircut, etc. So a healthy
 * benchmate beats an injured starter even before the projection
 * delta crosses the threshold.
 *
 * Confidence scoring is a function of (delta, status of both sides).
 * Bigger delta = higher confidence; risky receiver of swap drops it;
 * obviously-broken sender of swap raises it (the swap is justified).
 * =================================================================
 */

// Position-group compatibility for swaps. A starter at slot X can
// be replaced by any benched player whose eligible_positions
// intersect with this group.
const POSITION_GROUPS = {
  QB:    ["QB"],
  RB:    ["RB", "FLEX", "W/R/T", "W/R", "W/T"],
  WR:    ["WR", "FLEX", "W/R/T", "W/R"],
  TE:    ["TE", "FLEX", "W/R/T", "W/T"],
  FLEX:  ["RB", "WR", "TE", "FLEX", "W/R/T", "W/R", "W/T"],
  "W/R": ["WR", "RB", "W/R", "FLEX"],
  "W/R/T": ["WR", "RB", "TE", "W/R/T", "FLEX"],
  K:     ["K"],
  DEF:   ["DEF", "D/ST", "DST"],
};

const HEALTHY = new Set([null, undefined, "", "P", "PROBABLE"]);
const RISKY   = new Set(["Q", "QUESTIONABLE", "GTD", "DTD"]);
const OUT     = new Set(["O", "OUT", "IR", "IR-R", "PUP", "DOUBTFUL", "SUSP"]);

const DEFAULT_OPTIMIZER_CONFIG = Object.freeze({
  lineupMinDelta: 0.5,
  waiverMinDelta: 0,
  waiverLimit: 5,
});

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function looksLikeScoringConfig(value) {
  return value != null
    && typeof value === "object"
    && !Array.isArray(value)
    && (
      Object.prototype.hasOwnProperty.call(value, "default_scoring_rules")
      || Object.prototype.hasOwnProperty.call(value, "scoring_format")
      || Object.prototype.hasOwnProperty.call(value, "league_roster_slots")
      || Object.prototype.hasOwnProperty.call(value, "league_scarcity_weights")
      || Object.prototype.hasOwnProperty.call(value, "scarcity_weights")
    );
}

function resolveScoringConfig(opts, scoringConfig) {
  if (looksLikeScoringConfig(scoringConfig)) return scoringConfig;
  if (looksLikeScoringConfig(opts?.scoringConfig)) return opts.scoringConfig;
  return looksLikeScoringConfig(opts) ? opts : {};
}

function resolveOptimizerConfig(opts = {}, scoringConfig = {}) {
  const config = resolveScoringConfig(opts, scoringConfig);
  const rules = config?.default_scoring_rules?.optimizer;
  const optimizerRules = rules && typeof rules === "object" && !Array.isArray(rules)
    ? rules
    : {};
  const explicitOpts = looksLikeScoringConfig(opts) ? {} : opts;
  const explicitMinDelta = typeof explicitOpts.minDelta === "number"
    && !Number.isNaN(explicitOpts.minDelta)
    ? explicitOpts.minDelta
    : null;
  const configuredLineupMinDelta = finiteNumber(
    optimizerRules.lineup_min_delta ?? optimizerRules.min_delta
  );
  const configuredWaiverMinDelta = finiteNumber(optimizerRules.waiver_min_delta);
  const configuredWaiverLimit = finiteNumber(optimizerRules.waiver_limit);
  const explicitLimit = finiteNumber(explicitOpts.limit);

  return {
    lineupMinDelta: explicitMinDelta
      ?? configuredLineupMinDelta
      ?? DEFAULT_OPTIMIZER_CONFIG.lineupMinDelta,
    waiverMinDelta: finiteNumber(explicitOpts.minDelta)
      ?? configuredWaiverMinDelta
      ?? DEFAULT_OPTIMIZER_CONFIG.waiverMinDelta,
    waiverLimit: Math.max(1, Math.floor(
      explicitLimit
      ?? configuredWaiverLimit
      ?? DEFAULT_OPTIMIZER_CONFIG.waiverLimit
    )),
  };
}

function statusPenalty(status) {
  if (status == null) return 0;
  const s = String(status).toUpperCase();
  if (HEALTHY.has(s)) return 0;
  if (RISKY.has(s))   return 0.15;   // 15% haircut for questionable
  if (OUT.has(s))     return 1.0;    // 100% haircut - treat as zero
  return 0.05;                       // unknown status, small haircut
}

function adjustedProjection(player) {
  const proj = Number(player.projected_points) || 0;
  return proj * (1 - statusPenalty(player.status));
}

function compatibleSlots(slot) {
  if (!slot) return [];
  return POSITION_GROUPS[slot] || [slot];
}

function scoreSwapConfidence(delta, fromStatus, toStatus) {
  // Floor: 40, ceiling: 95. Each point of delta adds 8 to base 50.
  let score = 50 + delta * 8;
  if (RISKY.has(String(toStatus || "").toUpperCase()))   score -= 10;
  if (OUT.has(String(toStatus   || "").toUpperCase()))   score -= 30;
  if (RISKY.has(String(fromStatus || "").toUpperCase())) score += 5;
  if (OUT.has(String(fromStatus   || "").toUpperCase())) score += 15;
  return Math.max(40, Math.min(95, Math.round(score)));
}

function buildReasoning(from, to, delta) {
  const parts = [`${to.name} projects ${delta.toFixed(2)} pts higher than ${from.name}`];
  const fStat = String(from.status || "").toUpperCase();
  const tStat = String(to.status   || "").toUpperCase();
  if (OUT.has(fStat))   parts.push(`(${from.name} is OUT)`);
  else if (RISKY.has(fStat)) parts.push(`(${from.name} is questionable)`);
  if (RISKY.has(tStat)) parts.push(`(${to.name} is questionable - some risk)`);
  return parts.join(" ");
}

/**
 * For each starter, find the strongest benchmate at a compatible
 * position. If projection delta >= threshold, recommend the swap.
 *
 * Returns: array of { slot, from, to, delta, confidence, reasoning }
 * Sorted by delta (biggest swing first).
 */
function evaluateLineup(roster, opts = {}, scoringConfig = {}) {
  const { lineupMinDelta: minDelta } = resolveOptimizerConfig(opts, scoringConfig);
  const recs = [];

  for (const starter of roster.slots.starters) {
    const slot   = starter.selected_position || starter.position;
    const compat = compatibleSlots(slot);
    const sProj  = adjustedProjection(starter);

    const candidates = roster.slots.bench
      .filter(b => Array.isArray(b.eligible_positions)
                && b.eligible_positions.some(p => compat.includes(p)))
      .map(b => ({ player: b, adj: adjustedProjection(b) }))
      .sort((a, b) => b.adj - a.adj);

    if (!candidates.length) continue;
    const best  = candidates[0];
    const delta = best.adj - sProj;

    if (delta < minDelta) continue;

    recs.push({
      slot,
      from: {
        player_key: starter.player_key,
        name:       starter.name,
        status:     starter.status,
        projected:  Number(sProj.toFixed(2)),
      },
      to: {
        player_key: best.player.player_key,
        name:       best.player.name,
        status:     best.player.status,
        projected:  Number(best.adj.toFixed(2)),
      },
      delta:      Number(delta.toFixed(2)),
      confidence: scoreSwapConfidence(delta, starter.status, best.player.status),
      reasoning:  buildReasoning(starter, best.player, delta),
    });
  }

  return recs.sort((a, b) => b.delta - a.delta);
}

/**
 * For each position, identify the rostered player with the lowest
 * adjusted projection ("weakest link") and find the best waiver
 * player at the same position. Recommend a drop/add if delta > 0.
 *
 * waiverPool: [{ player_key, name, position, projected_points, status }]
 * Returns: array of { position, drop, add, delta, confidence }
 */
function findWaiverMoves(roster, waiverPool, opts = {}, scoringConfig = {}) {
  const {
    waiverLimit: limit,
    waiverMinDelta: minDelta,
  } = resolveOptimizerConfig(opts, scoringConfig);

  // Index waiver pool by primary position, sorted by projection desc.
  const byPos = {};
  for (const wp of waiverPool || []) {
    const pos = wp.position;
    if (!pos) continue;
    if (!byPos[pos]) byPos[pos] = [];
    byPos[pos].push(wp);
  }
  for (const pos of Object.keys(byPos)) {
    byPos[pos].sort((a, b) => (Number(b.projected_points) || 0) - (Number(a.projected_points) || 0));
  }

  // Find weakest rostered player at each position.
  const allRostered = [...roster.slots.starters, ...roster.slots.bench];
  const weakestByPos = {};
  for (const p of allRostered) {
    const pos = p.position;
    if (!pos) continue;
    const adj = adjustedProjection(p);
    if (!weakestByPos[pos] || adj < adjustedProjection(weakestByPos[pos])) {
      weakestByPos[pos] = p;
    }
  }

  const recs = [];
  for (const pos of Object.keys(byPos)) {
    const weakest = weakestByPos[pos];
    if (!weakest) continue;
    const top = byPos[pos][0];
    if (!top) continue;

    const topProj = Number(top.projected_points) || 0;
    const delta   = topProj - adjustedProjection(weakest);
    if (delta <= minDelta) continue;

    recs.push({
      position: pos,
      drop: {
        player_key: weakest.player_key,
        name:       weakest.name,
        projected:  Number(adjustedProjection(weakest).toFixed(2)),
      },
      add: {
        player_key: top.player_key,
        name:       top.name,
        projected:  Number(topProj.toFixed(2)),
      },
      delta:      Number(delta.toFixed(2)),
      confidence: Math.max(40, Math.min(95, Math.round(50 + delta * 5))),
    });
  }

  return recs.sort((a, b) => b.delta - a.delta).slice(0, limit);
}

module.exports = {
  evaluateLineup,
  findWaiverMoves,
  adjustedProjection,
  statusPenalty,
  compatibleSlots,
  resolveOptimizerConfig,
  DEFAULT_OPTIMIZER_CONFIG,
  POSITION_GROUPS,
};
