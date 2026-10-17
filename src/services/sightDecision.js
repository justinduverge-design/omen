"use strict";

/**
 * How a decision weighs Omen's Sight and the league's lock state. Shared by Start/Sit (optimizer) and Waivers.
 *
 * The provider projection leads; Sight pulls it toward what Omen sees by SIGHT_WEIGHT. A low-confidence Sight
 * (kickers) never moves a number. A player without Sight is decided exactly as before.
 */

const SIGHT_WEIGHT = 0.3;

function sightPoints(player) {
  const block = player?.sight;
  if (!block || block.confidence === "low") return null;
  const points = Number(block.sight_points);
  return Number.isFinite(points) ? points : null;
}

function blendWithSight(providerPoints, player) {
  const sight = sightPoints(player);
  if (sight == null || providerPoints == null) return providerPoints;
  return providerPoints + SIGHT_WEIGHT * (sight - providerPoints);
}

/** The provider says this player cannot be moved now (game started, roster or lineup locked). */
function isLocked(player) {
  return player?.lineup_locked === true || player?.roster_locked === true || player?.is_editable === false;
}

module.exports = { SIGHT_WEIGHT, sightPoints, blendWithSight, isLocked };
