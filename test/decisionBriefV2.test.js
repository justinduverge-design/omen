"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { bandedConfidence, limitationStatements, decisionBriefV2 } = require("../src/services/decisionBriefV2");

// A score maps to a band. This is a presentation policy, not a calibration — the module says
// so itself, and these tests lock the mapping rather than endorsing it as a probability.
test("a real score maps to its band and never leaks the numeral", () => {
  assert.equal(bandedConfidence({ score: 85 }).band, "confident");
  assert.equal(bandedConfidence({ score: 65 }).band, "leaning");
  assert.equal(bandedConfidence({ score: 20 }).band, "coin_flip");

  const brief = decisionBriefV2({ recommendation: { confidence: { score: 85 } }, signals: {} });
  const conf = brief.recommendation.confidence;
  assert.equal(conf.score, undefined, "the numeric score must not survive into v2");
  assert.equal(conf.unavailable_reason, undefined, "a graded call has nothing to explain away");
});

// The defect this replaced: a missing score returned "coin_flip", which asserts that Omen
// weighed the call and found it balanced. It had not weighed anything.
test("no score is not the lowest band — it produces no band at all", () => {
  const result = bandedConfidence({ score: null });
  assert.equal(result.band, null);
  assert.deepEqual(result.drivers, []);
  assert.ok(result.unavailable_reason.length > 0, "absence must be explained, not labelled");
});

test("the explanation is the engine's own signal messages, not a new vocabulary", () => {
  const signals = {
    espn_scoring: {
      status: "unavailable",
      used: false,
      message: "Omen cannot yet verify every scoring rule for this league.",
    },
    dvp: { status: "stub", used: true, message: "Matchup DvP fell back to the stub." },
    roster: { status: "live", used: true, message: "Roster is live." },
  };

  const reasons = decisionBriefV2({
    recommendation: { confidence: { score: null } },
    signals,
  }).recommendation.confidence.unavailable_reason;

  assert.deepEqual(reasons, [
    "Omen cannot yet verify every scoring rule for this league.",
    "Matchup DvP fell back to the stub.",
  ]);
  assert.ok(!reasons.some((r) => /live/i.test(r)), "a live signal is not a limitation");
});

test("with nothing to point at, the absence is still stated rather than graded", () => {
  const conf = decisionBriefV2({
    recommendation: { confidence: { score: null } },
    signals: {},
  }).recommendation.confidence;

  assert.equal(conf.band, null);
  assert.deepEqual(conf.unavailable_reason, ["Omen did not produce a confidence value for this call."]);
});

// A string-valued `confidence` field is substituted with the band's display label. With no
// band there is no label, and inventing one would reintroduce exactly the claim v2 removes.
test("a null band substitutes no label into a string confidence field", () => {
  const brief = decisionBriefV2({
    recommendation: { confidence: { score: null } },
    explanation: { confidence: "Confidence is high." },
    signals: {},
  });
  assert.equal(brief.explanation.confidence, null);
});

test("limitationStatements ignores live signals and malformed entries", () => {
  assert.deepEqual(
    limitationStatements({
      a: { status: "live", message: "fine" },
      b: { status: "stub", message: "  trimmed  " },
      c: { status: "unavailable" },
      d: null,
    }),
    ["trimmed"]
  );
});
