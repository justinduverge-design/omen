"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { reasonsFor } = require("../src/services/moveReasons");

const evans = {
  name: "Mike Evans",
  status: "Questionable",
  projected_points_by_week: { 7: 0, 8: 0, 9: 17.5, 10: 19.9 },
  sight: {
    grade: 62,
    injury: { status: "IR", body_part: "Hamstring" },
    drivers: [{ name: "target_share", points: 0.9 }],
  },
};
const kc = {
  name: "KC Concepcion Jr.",
  projected_points_by_week: { 7: 9.7, 8: 9.1, 9: 9.4, 10: 9.4 },
  sight: { grade: 55, drivers: [{ name: "production_ppg", points: 1.2 }] },
};

test("reasons lead with who misses which weeks, then Omen's read, and points only as the lineup change", () => {
  const reasons = reasonsFor({ gain: kc, lose: evans, weeks: [7, 8, 9, 10], lineupGain: 4.3 });
  assert.deepEqual(reasons, [
    "Mike Evans is on injured reserve (hamstring) and projected to miss weeks 7–8.",
    "Mike Evans is the better player when healthy (Omen 62 to 55), but not while he's out.",
    "Your best lineup gains 4.3 points a week over weeks 7–10.",
  ]);
  assert.equal(
    reasons.some((r) => /projects/.test(r)),
    false,
  );
});

test("a bye is named by its week", () => {
  const nix = { name: "Bo Nix", projected_points_by_week: { 7: 19, 8: 15, 9: 15, 10: 0 } };
  assert.deepEqual(reasonsFor({ gain: { name: "Other QB" }, lose: nix }), ["Bo Nix is projected not to play week 10."]);
});

test("knowing nothing returns nothing, so a caller keeps its own line", () => {
  assert.deepEqual(reasonsFor({ gain: { name: "A" }, lose: { name: "B" } }), []);
  assert.deepEqual(reasonsFor(), []);
});

test("a higher grade leads with what drives it", () => {
  const allen = { name: "Josh Allen", sight: { grade: 83, drivers: [{ name: "designed_rush_share", points: 5.1 }] } };
  const maye = { name: "Drake Maye", sight: { grade: 70 } };
  assert.deepEqual(reasonsFor({ gain: allen, lose: maye }), [
    "Omen grades Josh Allen 83 to Drake Maye's 70: Josh Allen has designed runs near the goal line and in the open field.",
  ]);
});
