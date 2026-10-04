"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  assessConfidence, bandFromScore, scoreForBand, usageCorroboration, THRESHOLDS,
} = require("../src/services/confidencePolicy");
const { evaluateLineup } = require("../src/services/optimizer");
const { bandedConfidence } = require("../src/services/decisionBriefV2");

const USAGE = { kind: "recent_usage" };

const CASES = [
  { name: "projection-only 3.75pt gap is a lean, never Confident", input: { gap: 3.75 }, band: "leaning" },
  { name: "projection-only 10pt gap is still capped at a lean", input: { gap: 10 }, band: "leaning" },
  { name: "corroborated big gap is Confident", input: { gap: 5, corroboration: [USAGE] }, band: "confident" },
  { name: "corroborated but gap under the Confident minimum is a lean", input: { gap: 3, corroboration: [USAGE] }, band: "leaning" },
  { name: "string corroboration kinds count", input: { gap: 4, corroboration: ["usage_trend"] }, band: "confident" },
  { name: "blank corroboration entries do not count", input: { gap: 9, corroboration: ["", {}, null] }, band: "leaning" },
  { name: "gap just under the close-call line is a coin flip", input: { gap: 1.49 }, band: "coin_flip" },
  { name: "negative gap is a coin flip", input: { gap: -2, corroboration: [USAGE] }, band: "coin_flip" },
  { name: "explicit close call overrides a large gap", input: { gap: 6, corroboration: [USAGE], closeCall: true }, band: "coin_flip" },
  { name: "out starter with a healthy replacement is Confident", input: { gap: 2, sitStatus: "OUT", startStatus: null }, band: "confident" },
  { name: "out starter, replacement questionable, is a lean", input: { gap: 9, sitStatus: "OUT", startStatus: "Q" }, band: "leaning" },
  { name: "recommended player out is a coin flip", input: { gap: 9, startStatus: "OUT" }, band: "coin_flip" },
  { name: "questionable starter label alone is not corroboration", input: { gap: 4.5, sitStatus: "Q" }, band: "leaning" },
  { name: "explicit injury_status corroboration with a questionable starter is Confident", input: { gap: 4.5, sitStatus: "Q", corroboration: ["injury_status"] }, band: "confident" },
  { name: "questionable replacement caps at a lean", input: { gap: 9, corroboration: [USAGE], startStatus: "Q" }, band: "leaning" },
  { name: "maxBand is a hard ceiling", input: { gap: 9, corroboration: [USAGE], maxBand: "leaning" }, band: "leaning" },
  { name: "missing gap yields no band", input: {}, band: null },
];

for (const c of CASES) {
  test(`policy: ${c.name}`, () => {
    const verdict = assessConfidence(c.input);
    assert.equal(verdict.band, c.band);
    assert.equal(typeof verdict.reason, "string");
    assert.ok(verdict.reason.length > 0);
  });
}

test("policy reasons never carry a numeric confidence", () => {
  for (const c of CASES) {
    const { reason } = assessConfidence(c.input);
    assert.doesNotMatch(reason, /\d\s*(?:%|out of|\/\s*100)|confidence[^.!?]*\d/i);
  }
});

test("score representatives round-trip to their band and the thresholds are the documented ones", () => {
  for (const band of ["confident", "leaning", "coin_flip"]) assert.equal(bandFromScore(scoreForBand(band)), band);
  assert.equal(THRESHOLDS.COIN_FLIP_BELOW, 1.5);
  assert.equal(THRESHOLDS.CONFIDENT_MIN_GAP, 4);
  assert.equal(bandFromScore(null), null);
});

test("usageCorroboration needs a favoring edge and no contradiction", () => {
  assert.deepEqual(usageCorroboration({ snap_share: 0.9 }, { snap_share: 0.6 }), USAGE);
  assert.equal(usageCorroboration({ snap_share: 0.62 }, { snap_share: 0.6 }), null);
  assert.equal(usageCorroboration({ snap_share: 0.9, target_share: 0.1 }, { snap_share: 0.6, target_share: 0.3 }), null);
  assert.equal(usageCorroboration(null, { snap_share: 0.6 }), null);
});

test("optimizer and brief share the scale: a 3.75pt projection gap never reaches the Confident band", () => {
  const p = (key, proj, status = null) => ({
    player_key: key, name: key, position: "WR", selected_position: "WR", eligible_positions: ["WR"], projected_points: proj, status,
  });
  const roster = { slots: { starters: [p("a", 10)], bench: [p("b", 13.75)] } };
  const [swap] = evaluateLineup(roster);
  assert.equal(swap.delta, 3.75);
  assert.equal(swap.confidence_band, "leaning");
  assert.equal(bandedConfidence(swap.confidence).band, "leaning");

  const out = evaluateLineup({ slots: { starters: [p("a", 10, "OUT")], bench: [p("b", 11)] } })[0];
  assert.equal(out.confidence_band, "confident");
  assert.equal(bandedConfidence(out.confidence).band, "confident");
});
