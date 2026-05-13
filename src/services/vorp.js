"use strict";

const { adjustedProjection } = require("./optimizer");

// Weekly projected-point floors representing the best freely available player
// at each position in a typical 12-team league (waiver wire quality).
// Calibrated 2026-05-13 via external methodology review.
// Revisit each August before the season.
const REPLACEMENT_LEVELS = Object.freeze({
  ppr: Object.freeze({
    QB: 15,
    RB: 6.5,
    WR: 8,
    TE: 4.5,
    FLEX: 7.5,
    K: 6,
    DST: 6,
    DEF: 6,
    "D/ST": 6,
  }),
  half_ppr: Object.freeze({
    QB: 14,
    RB: 5.5,
    WR: 7,
    TE: 4,
    FLEX: 6.5,
    K: 6,
    DST: 6,
    DEF: 6,
    "D/ST": 6,
  }),
  standard: Object.freeze({
    QB: 13,
    RB: 5,
    WR: 6.5,
    TE: 3.5,
    FLEX: 6,
    K: 6,
    DST: 6,
    DEF: 6,
    "D/ST": 6,
  }),
});

// Elite thresholds calibrated 2026-05-13.
// With corrected (lower) replacement floors, elite must target genuinely scarce
// players — not just "good starters." Thresholds raised to reflect true positional
// scarcity: QB ≥25 ppg, RB/WR ≥15 ppg, TE ≥12 ppg.
const SCARCITY_THRESHOLDS = Object.freeze({
  QB: Object.freeze({ elite: 10, bubble: -5 }),
  RB: Object.freeze({ elite: 8,  bubble: -3 }),
  WR: Object.freeze({ elite: 8,  bubble: -3 }),
  TE: Object.freeze({ elite: 7,  bubble: -2 }),
  default: Object.freeze({ elite: 3,  bubble: -2 }),
});

const SCARCITY_BONUS = Object.freeze({
  elite: 2.0,
  starter: 0.5,
  bubble: 0.0,
  replaceable: -0.5,
});

function normalizePosition(position) {
  const normalized = String(position || "UNK").toUpperCase();
  if (normalized === "D/ST" || normalized === "DEF") return "DST";
  return normalized;
}

function primaryPosition(player = {}) {
  if (player.position) return normalizePosition(player.position);
  if (Array.isArray(player.eligible_positions) && player.eligible_positions.length) {
    return normalizePosition(player.eligible_positions[0]);
  }
  return "UNK";
}

function getReplacementLevel(position, scoringFormat = "ppr") {
  const levels = REPLACEMENT_LEVELS[scoringFormat];
  if (!levels) return 0;
  const normalized = normalizePosition(position);
  return Number(levels[normalized]) || 0;
}

function replacementFromMap(position, replacementLevel) {
  const normalized = normalizePosition(position);
  const rawPosition = String(position || "UNK").toUpperCase();
  return Number(
    replacementLevel?.[normalized]
    ?? replacementLevel?.[rawPosition]
    ?? replacementLevel?.UNK
    ?? 0
  ) || 0;
}

function scarcityTierForVorp(vorp, position) {
  const normalized = normalizePosition(position);
  const thresholds = SCARCITY_THRESHOLDS[normalized] || SCARCITY_THRESHOLDS.default;
  const value = Number(vorp) || 0;

  if (value >= thresholds.elite) return "elite";
  if (value >= 0) return "starter";
  if (value >= thresholds.bubble) return "bubble";
  return "replaceable";
}

function vorpForPlayer(player = {}, opts = {}) {
  const scoringFormat = opts.scoringFormat || "ppr";
  const position = primaryPosition(player);
  const adjusted = adjustedProjection(player);
  const replacement = opts.replacementLevel && typeof opts.replacementLevel === "object"
    ? replacementFromMap(position, opts.replacementLevel)
    : getReplacementLevel(position, scoringFormat);
  const vorp = Number((adjusted - replacement).toFixed(2));
  const tier = scarcityTierForVorp(vorp, position);
  const projected = Number(player.projected_points);

  return {
    player_key: player.player_key || null,
    name: player.name || "Unknown",
    position,
    adjusted_projection: Number(adjusted.toFixed(2)),
    replacement_level: Number(replacement.toFixed(2)),
    vorp,
    tier,
    scarcity_bonus: SCARCITY_BONUS[tier],
    confidence: Number.isFinite(projected) ? "high" : "low",
  };
}

function bScore(sendPlayers = [], receivePlayers = [], opts = {}) {
  const sendBonus = sendPlayers
    .map((player) => vorpForPlayer(player, opts).scarcity_bonus)
    .reduce((sum, bonus) => sum + bonus, 0);
  const receiveBonus = receivePlayers
    .map((player) => vorpForPlayer(player, opts).scarcity_bonus)
    .reduce((sum, bonus) => sum + bonus, 0);

  return Number((receiveBonus - sendBonus).toFixed(2));
}

module.exports = {
  REPLACEMENT_LEVELS,
  SCARCITY_THRESHOLDS,
  SCARCITY_BONUS,
  getReplacementLevel,
  scarcityTierForVorp,
  vorpForPlayer,
  bScore,
};
