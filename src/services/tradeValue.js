"use strict";

/**
 * Trade valuation service.
 *
 * Pure functions only: no API calls, no Supabase, no Stripe, no auth.
 * The first MVP uses replacement-level adjusted projection as a defensible
 * baseline until richer historical projections and league settings are wired.
 */

const { adjustedProjection } = require("./optimizer");

const DEFAULT_REPLACEMENT_LEVEL = Object.freeze({
  QB: 14,
  RB: 8,
  WR: 8,
  TE: 6,
  FLEX: 8,
  "W/R": 8,
  "W/R/T": 8,
  K: 5,
  DEF: 5,
  DST: 5,
  "D/ST": 5,
  UNK: 0,
});

function primaryPosition(player = {}) {
  if (player.position) return String(player.position).toUpperCase();
  if (Array.isArray(player.eligible_positions) && player.eligible_positions.length) {
    return String(player.eligible_positions[0]).toUpperCase();
  }
  return "UNK";
}

function replacementFor(position, replacementLevel = DEFAULT_REPLACEMENT_LEVEL) {
  return Number(replacementLevel[position]) || replacementLevel.UNK || 0;
}

function playerValue(player = {}, opts = {}) {
  const position = primaryPosition(player);
  const projected = Number(player.projected_points);
  const hasProjection = Number.isFinite(projected);
  const adjusted = adjustedProjection(player);
  const replacement = replacementFor(position, opts.replacementLevel);
  const value = adjusted - replacement;

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
  };
}

function sideValue(players = [], opts = {}) {
  const valuedPlayers = players.map((player) => playerValue(player, opts));
  const total = valuedPlayers.reduce((sum, player) => sum + player.value, 0);
  const missingProjectionCount = valuedPlayers.filter((player) => (
    player.notes.includes("missing_projection")
  )).length;

  return {
    total_value: Number(total.toFixed(2)),
    player_count: valuedPlayers.length,
    missing_projection_count: missingProjectionCount,
    players: valuedPlayers,
  };
}

function confidenceFor(sendSide, receiveSide) {
  const totalPlayers = sendSide.player_count + receiveSide.player_count;
  const missing = sendSide.missing_projection_count + receiveSide.missing_projection_count;
  if (!totalPlayers || missing === totalPlayers) return "low";
  if (missing > 0) return "low";
  return "medium";
}

function verdictFor(netValue, neutralBand = 1.5) {
  if (netValue > neutralBand) return "accept";
  if (netValue < -neutralBand) return "decline";
  return "neutral";
}

function compareTrade({ send = [], receive = [] } = {}, opts = {}) {
  const sendSide = sideValue(send, opts);
  const receiveSide = sideValue(receive, opts);
  const netValue = Number((receiveSide.total_value - sendSide.total_value).toFixed(2));

  return {
    send: sendSide,
    receive: receiveSide,
    net_value: netValue,
    verdict: verdictFor(netValue, opts.neutralBand),
    confidence: confidenceFor(sendSide, receiveSide),
    generated_at: new Date().toISOString(),
  };
}

module.exports = {
  DEFAULT_REPLACEMENT_LEVEL,
  primaryPosition,
  playerValue,
  sideValue,
  compareTrade,
};
