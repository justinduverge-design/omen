"use strict";

/**
 * Trade valuation service.
 *
 * Pure functions only: no API calls, no Supabase, no Stripe, no auth.
 * The first MVP uses replacement-level adjusted projection as a defensible
 * baseline until richer historical projections and league settings are wired.
 */

const { adjustedProjection } = require("./optimizer");
const { vorpForPlayer, bScore, REPLACEMENT_LEVELS, normalizePosition } = require("./vorp");

const VALID_SCORING_FORMATS = new Set(["ppr", "half_ppr", "standard", "custom"]);
const DEFAULT_SCARCITY_SIGNAL_WEIGHT = 0.6;

// Depth discount curve for uneven trades (applied symmetrically to both sides).
// When one side has more players than the other, surplus players provide diminished
// utility — they compete for limited roster/starting slots.
// Index 0 = primary players (1.0x), index 1 = 1st surplus (0.5x), index 2+ = (0.25x).
const DEPTH_DISCOUNT_CURVE = Object.freeze([1.0, 0.5, 0.25]);
const DEFAULT_REPLACEMENT_LEVEL = Object.freeze({
  ...REPLACEMENT_LEVELS.ppr,
  "W/R": REPLACEMENT_LEVELS.ppr.FLEX,
  "W/R/T": REPLACEMENT_LEVELS.ppr.FLEX,
  UNK: 0,
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

function scarcityRows(scoringConfig = {}) {
  const rows = scoringConfig.league_scarcity_weights
    ?? scoringConfig.scarcity_weights
    ?? scoringConfig.default_scoring_rules?.scarcity_weights;
  return Array.isArray(rows) ? rows : [];
}

function replacementLevelsFor(scoringFormat, rows) {
  const defaults = REPLACEMENT_LEVELS[scoringFormat] || REPLACEMENT_LEVELS.ppr;
  const replacementLevel = {
    ...defaults,
    "W/R": defaults.FLEX,
    "W/R/T": defaults.FLEX,
    UNK: 0,
  };

  for (const row of rows) {
    const baseline = finiteNumber(row?.baseline_points);
    if (baseline == null || !row?.position) continue;
    const position = normalizePosition(row.position);
    replacementLevel[position] = baseline;
    if (position === "DST") {
      replacementLevel.DEF = baseline;
      replacementLevel["D/ST"] = baseline;
    }
  }

  return replacementLevel;
}

function scarcityWeightsFor(rows) {
  const weights = {};
  for (const row of rows) {
    const weight = finiteNumber(row?.scarcity_weight);
    if (weight == null || weight < 0 || weight > 10 || !row?.position) continue;
    weights[normalizePosition(row.position)] = weight;
  }
  return weights;
}

function resolveTradeConfig(opts = {}, scoringConfig = {}) {
  const config = resolveScoringConfig(opts, scoringConfig);
  const explicitOpts = looksLikeScoringConfig(opts) ? {} : opts;
  const configuredFormat = String(config.scoring_format || "").toLowerCase();
  const scoringFormat = explicitOpts.scoringFormat
    || (VALID_SCORING_FORMATS.has(configuredFormat) ? configuredFormat : "ppr");

  if (!VALID_SCORING_FORMATS.has(scoringFormat)) {
    throw new Error("invalid_scoring_format");
  }

  const rows = scarcityRows(config);
  const rules = config.default_scoring_rules?.trade_value;
  const tradeRules = rules && typeof rules === "object" && !Array.isArray(rules)
    ? rules
    : {};
  const configuredNeutralBand = finiteNumber(tradeRules.neutral_band);
  const configuredScarcitySignalWeight = finiteNumber(tradeRules.scarcity_signal_weight);

  return {
    scoringFormat,
    replacementLevel: explicitOpts.replacementLevel
      || replacementLevelsFor(scoringFormat, rows),
    neutralBand: explicitOpts.neutralBand
      ?? (configuredNeutralBand != null && configuredNeutralBand >= 0
        ? configuredNeutralBand
        : null)
      ?? 2.0,
    scarcitySignalWeight: explicitOpts.scarcitySignalWeight
      ?? (configuredScarcitySignalWeight != null && configuredScarcitySignalWeight >= 0
        ? configuredScarcitySignalWeight
        : null)
      ?? DEFAULT_SCARCITY_SIGNAL_WEIGHT,
    scarcityWeights: scarcityWeightsFor(rows),
  };
}

function primaryPosition(player = {}) {
  if (player.position) return normalizePosition(player.position);
  if (Array.isArray(player.eligible_positions) && player.eligible_positions.length) {
    return normalizePosition(player.eligible_positions[0]);
  }
  return "UNK";
}

function replacementFor(position, replacementLevel = DEFAULT_REPLACEMENT_LEVEL) {
  return Number(replacementLevel[position]) || replacementLevel.UNK || 0;
}

function playerValue(player = {}, opts = {}, scoringConfig = {}) {
  const resolved = resolveTradeConfig(opts, scoringConfig);
  const explicitOpts = looksLikeScoringConfig(opts) ? {} : opts;
  const scoringFormat = resolved.scoringFormat;
  const position = primaryPosition(player);
  const projected = Number(player.projected_points);
  const hasProjection = Number.isFinite(projected);
  const vorp = vorpForPlayer(player, {
    scoringFormat,
    replacementLevel: explicitOpts.replacementLevel || resolved.replacementLevel,
  });
  const adjusted = adjustedProjection(player);
  const replacement = vorp.replacement_level;
  const value = vorp.vorp;

  return {
    player_key: player.player_key || null,
    name: player.name || "Unknown",
    position,
    status: player.status || null,
    projected_points: hasProjection ? projected : null,
    adjusted_projection: Number(adjusted.toFixed(2)),
    replacement_level: Number(replacement.toFixed(2)),
    value: Number(value.toFixed(2)),
    confidence: hasProjection ? "medium" : "low",
    notes: hasProjection ? [] : ["missing_projection"],
    tier: vorp.tier,
    scarcity_bonus: vorp.scarcity_bonus,
  };
}

function sideValue(players = [], opts = {}, scoringConfig = {}) {
  const valuedPlayers = players.map((player) => playerValue(player, opts, scoringConfig));
  const total = valuedPlayers.reduce((sum, player) => sum + player.value, 0);
  const missingProjectionCount = valuedPlayers.filter((player) => (
    player.notes.includes("missing_projection")
  )).length;

  return {
    total_value: Number(total.toFixed(2)),
    player_count: valuedPlayers.length,
    missing_projection_count: missingProjectionCount,
    players: valuedPlayers,
    scarcity_details: valuedPlayers.map((player) => ({
      name: player.name,
      position: player.position,
      vorp: player.value,
      tier: player.tier,
    })),
  };
}

function confidenceFor(sendSide, receiveSide) {
  const totalPlayers = sendSide.player_count + receiveSide.player_count;
  const missing = sendSide.missing_projection_count + receiveSide.missing_projection_count;
  if (!totalPlayers || missing === totalPlayers) return "low";
  if (missing > 0) return "low";
  return "medium";
}

function verdictFor(combinedScore, neutralBand = 2.0) {
  if (combinedScore > neutralBand) return "accept";
  if (combinedScore < -neutralBand) return "decline";
  return "neutral";
}

function formatTier(tier) {
  return `${tier}-tier`;
}

function articleForTier(tier) {
  return tier === "elite" ? "an" : "a";
}

function highestTier(details = []) {
  const rank = { elite: 4, starter: 3, bubble: 2, replaceable: 1 };
  return details.reduce((best, current) => {
    if (!best) return current;
    return (rank[current.tier] || 0) > (rank[best.tier] || 0) ? current : best;
  }, null);
}

// Apply depth discount to a valued player list.
// primaryCount = number of players that count at full value (1.0x).
// Surplus players are sorted by VORP descending so the best ones count more.
function applyDepthDiscount(valuedPlayers, primaryCount) {
  const sorted = [...valuedPlayers].sort((a, b) => b.value - a.value);
  return sorted.reduce((total, player, idx) => {
    const surplusIdx = idx < primaryCount ? 0 : (idx - primaryCount + 1);
    const factor = DEPTH_DISCOUNT_CURVE[Math.min(surplusIdx, DEPTH_DISCOUNT_CURVE.length - 1)];
    return total + player.value * factor;
  }, 0);
}

function weightedScarcityScore(sendPlayers, receivePlayers, scarcityWeights = {}) {
  const weightedBonus = (player) => {
    const weight = scarcityWeights[player.position] ?? 1;
    return player.scarcity_bonus * weight;
  };
  const sendBonus = sendPlayers.reduce((sum, player) => sum + weightedBonus(player), 0);
  const receiveBonus = receivePlayers.reduce((sum, player) => sum + weightedBonus(player), 0);
  return Number((receiveBonus - sendBonus).toFixed(2));
}

function buildScarcitySummary(sendDetails, receiveDetails) {
  if (!sendDetails.length || !receiveDetails.length) return "";
  const send = highestTier(sendDetails);
  const receive = highestTier(receiveDetails);
  if (!send || !receive) return "";
  return `You are sending ${articleForTier(send.tier)} ${formatTier(send.tier)} ${send.position} for ${articleForTier(receive.tier)} ${formatTier(receive.tier)} ${receive.position}.`;
}

function compareTrade({ send = [], receive = [] } = {}, opts = {}, scoringConfig = {}) {
  const resolved = resolveTradeConfig(opts, scoringConfig);
  const {
    neutralBand,
    replacementLevel,
    scarcitySignalWeight,
    scarcityWeights,
    scoringFormat,
  } = resolved;
  const explicitOpts = looksLikeScoringConfig(opts) ? {} : opts;
  const tradeOpts = { ...explicitOpts, scoringFormat, replacementLevel };
  const sendSide = sideValue(send, tradeOpts);
  const receiveSide = sideValue(receive, tradeOpts);

  // Apply depth discount symmetrically. In an uneven trade (e.g. 1-for-3),
  // surplus players on the larger side count at reduced VORP because they
  // compete for limited roster/starting slots.
  const minCount = Math.min(send.length, receive.length);
  const depthDiscounted = send.length !== receive.length;
  const effectiveSendVorp    = Number(applyDepthDiscount(sendSide.players, minCount).toFixed(2));
  const effectiveReceiveVorp = Number(applyDepthDiscount(receiveSide.players, minCount).toFixed(2));

  const netValue = Number((effectiveReceiveVorp - effectiveSendVorp).toFixed(2));
  const aScore   = netValue;
  const b = Object.keys(scarcityWeights).length
    ? weightedScarcityScore(sendSide.players, receiveSide.players, scarcityWeights)
    : bScore(send, receive, tradeOpts);
  // B weight: 0.6 — scarcity can break a near-neutral tie but cannot override
  // a substantial raw value loss. Raised from 0.4 after external calibration review.
  const combinedScore = Number((aScore + b * scarcitySignalWeight).toFixed(2));

  return {
    send: sendSide,
    receive: receiveSide,
    net_value: netValue,
    verdict: verdictFor(combinedScore, neutralBand),
    confidence: confidenceFor(sendSide, receiveSide),
    generated_at: new Date().toISOString(),
    scoring_format: scoringFormat,
    a_score: aScore,
    b_score: b,
    combined_score: combinedScore,
    depth_discounted: depthDiscounted,
    scarcity_analysis: {
      send: sendSide.scarcity_details,
      receive: receiveSide.scarcity_details,
      summary: buildScarcitySummary(sendSide.scarcity_details, receiveSide.scarcity_details),
    },
  };
}

module.exports = {
  DEFAULT_REPLACEMENT_LEVEL,
  primaryPosition,
  playerValue,
  sideValue,
  compareTrade,
  resolveTradeConfig,
};
