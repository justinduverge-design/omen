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

// Sleeper's injury status in the provider status vocabulary. "NA" is left out: Sleeper uses it loosely.
const SLEEPER_STATUS = {
  Questionable: "Q",
  Doubtful: "DOUBTFUL",
  Out: "OUT",
  IR: "IR",
  PUP: "PUP",
  Sus: "SUSP",
  COV: "OUT",
  DNR: "OUT",
};

/**
 * The status a decision uses: the league provider's own, or, when the provider reports none, Sleeper's injury
 * report carried on the Sight block. The provider always wins when it says anything.
 */
function effectiveStatus(player) {
  const own = player?.status;
  if (own != null && String(own).trim() !== "") return own;
  return SLEEPER_STATUS[player?.sight?.injury?.status] || own || null;
}

module.exports = { SIGHT_WEIGHT, sightPoints, blendWithSight, isLocked, effectiveStatus };
