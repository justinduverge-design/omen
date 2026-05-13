"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  bScore,
  getReplacementLevel,
  scarcityTierForVorp,
  vorpForPlayer,
} = require("../src/services/vorp");

test("getReplacementLevel returns floors for all scoring formats", () => {
  assert.equal(getReplacementLevel("QB", "ppr"), 15); // recalibrated 2026-05-13
  assert.equal(getReplacementLevel("RB", "ppr"), 6.5); // recalibrated 2026-05-13
  assert.equal(getReplacementLevel("WR", "ppr"), 8); // recalibrated 2026-05-13
  assert.equal(getReplacementLevel("TE", "ppr"), 4.5); // recalibrated 2026-05-13

  assert.equal(getReplacementLevel("QB", "half_ppr"), 14); // recalibrated 2026-05-13
  assert.equal(getReplacementLevel("RB", "half_ppr"), 5.5); // recalibrated 2026-05-13
  assert.equal(getReplacementLevel("WR", "half_ppr"), 7); // recalibrated 2026-05-13
  assert.equal(getReplacementLevel("TE", "half_ppr"), 4); // recalibrated 2026-05-13

  assert.equal(getReplacementLevel("QB", "standard"), 13); // recalibrated 2026-05-13
  assert.equal(getReplacementLevel("RB", "standard"), 5); // recalibrated 2026-05-13
  assert.equal(getReplacementLevel("WR", "standard"), 6.5); // recalibrated 2026-05-13
  assert.equal(getReplacementLevel("TE", "standard"), 3.5); // recalibrated 2026-05-13
});

test("getReplacementLevel handles unknown positions and DST aliases", () => {
  assert.equal(getReplacementLevel("UNK", "ppr"), 0);
  assert.equal(getReplacementLevel("DL", "ppr"), 0);
  assert.equal(getReplacementLevel("DST", "ppr"), 6);
  assert.equal(getReplacementLevel("D/ST", "ppr"), 6);
  assert.equal(getReplacementLevel("DEF", "ppr"), 6);
});

test("scarcityTierForVorp covers QB thresholds and exact edges", () => {
  assert.equal(scarcityTierForVorp(10, "QB"), "elite"); // recalibrated 2026-05-13
  assert.equal(scarcityTierForVorp(9.99, "QB"), "starter"); // recalibrated 2026-05-13
  assert.equal(scarcityTierForVorp(0, "QB"), "starter");
  assert.equal(scarcityTierForVorp(-1, "QB"), "bubble");
  assert.equal(scarcityTierForVorp(-5, "QB"), "bubble");
  assert.equal(scarcityTierForVorp(-5.01, "QB"), "replaceable");
});

test("scarcityTierForVorp covers RB thresholds and exact edges", () => {
  assert.equal(scarcityTierForVorp(8, "RB"), "elite"); // recalibrated 2026-05-13
  assert.equal(scarcityTierForVorp(7.99, "RB"), "starter"); // recalibrated 2026-05-13
  assert.equal(scarcityTierForVorp(0, "RB"), "starter");
  assert.equal(scarcityTierForVorp(-1, "RB"), "bubble");
  assert.equal(scarcityTierForVorp(-3, "RB"), "bubble");
  assert.equal(scarcityTierForVorp(-3.01, "RB"), "replaceable");
});

test("vorpForPlayer values a player with projection", () => {
  const value = vorpForPlayer({
    player_key: "p1",
    name: "Starter RB",
    position: "RB",
    projected_points: 14,
    status: null,
  });

  assert.equal(value.player_key, "p1");
  assert.equal(value.name, "Starter RB");
  assert.equal(value.position, "RB");
  assert.equal(value.adjusted_projection, 14);
  assert.equal(value.replacement_level, 6.5); // recalibrated 2026-05-13
  assert.equal(value.vorp, 7.5); // recalibrated 2026-05-13
  assert.equal(value.tier, "starter"); // recalibrated 2026-05-13
  assert.equal(value.scarcity_bonus, 0.5); // recalibrated 2026-05-13
  assert.equal(value.confidence, "high");
});

test("vorpForPlayer marks missing projection as low confidence", () => {
  const value = vorpForPlayer({ name: "Unknown WR", position: "WR" });

  assert.equal(value.adjusted_projection, 0);
  assert.equal(value.replacement_level, 8); // recalibrated 2026-05-13
  assert.equal(value.vorp, -8); // recalibrated 2026-05-13
  assert.equal(value.tier, "replaceable");
  assert.equal(value.confidence, "low");
});

test("vorpForPlayer applies OUT status through adjustedProjection", () => {
  const value = vorpForPlayer({
    name: "Out TE",
    position: "TE",
    projected_points: 20,
    status: "OUT",
  });

  assert.equal(value.adjusted_projection, 0);
  assert.equal(value.replacement_level, 4.5); // recalibrated 2026-05-13
  assert.equal(value.vorp, -4.5); // recalibrated 2026-05-13
  assert.equal(value.tier, "replaceable");
  assert.equal(value.confidence, "high");
});

test("bScore favors the side receiving higher scarcity", () => {
  const score = bScore(
    [{ name: "Starter RB", position: "RB", projected_points: 12 }],
    [{ name: "Elite TE", position: "TE", projected_points: 12 }]
  );

  assert.equal(score, 1.5);
});

test("bScore penalizes sending higher scarcity", () => {
  const score = bScore(
    [{ name: "Elite QB", position: "QB", projected_points: 25 }],
    [{ name: "Starter RB", position: "RB", projected_points: 12 }]
  );

  assert.equal(score, -1.5);
});

test("bScore is zero when scarcity bonuses are equal", () => {
  const score = bScore(
    [{ name: "Starter RB", position: "RB", projected_points: 12 }],
    [{ name: "Starter WR", position: "WR", projected_points: 12 }]
  );

  assert.equal(score, 0);
});
