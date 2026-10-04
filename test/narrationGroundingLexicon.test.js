"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { validateGroundedText, countSentences } = require("../src/services/narrationGrounding");
const startSit = require("../src/routes/startSit");
const evidence = require("../src/services/mvpEvidenceEnrichment");

const FACTS = {
  primary_player: { name: "Amon-Ra St. Brown", position: "WR", team: "DET" },
  comparison_player: { name: "D.J. Moore", position: "WR", team: "CHI" },
  expected_value_delta: { points: 2.1, label: "meaningful" },
};

const rejected = [
  "St. Brown looks dominant lately.",
  "St. Brown has a great matchup.",
  "St. Brown has elite upside.",
  "St. Brown has momentum.",
  "St. Brown has a favorable spot.",
  "St. Brown faces a soft defense.",
  "St. Brown is locked in.",
  "St. Brown is a must-start.",
  "St. Brown is in a smash spot.",
  "St. Brown has a high ceiling.",
];
for (const text of rejected) {
  test(`lexicon rejects invented reason: ${text}`, () => {
    assert.equal(validateGroundedText(text, FACTS).ok, false);
  });
}

test("lexicon term is allowed when the facts already contain it", () => {
  const facts = { ...FACTS, signal: "matchup is favorable" };
  assert.equal(validateGroundedText("The matchup is favorable for St. Brown.", facts).ok, true);
});

const counts = [
  ["Start St. Brown over D.J. Moore.", 1],
  ["Jr. is out. Start Moore.", 2],
  ["Mr. Brown is ahead by 2.1 points.", 1],
  ["Hill is ahead. Allen is behind.", 2],
  ["Is Hill ahead? Yes! Start him.", 3],
];
for (const [text, n] of counts) {
  test(`sentence count ignores abbreviation periods: ${text}`, () => {
    assert.equal(countSentences(text), n);
  });
}

test("abbreviation names do not trip the two-sentence cap", () => {
  assert.equal(validateGroundedText("Start St. Brown over D.J. Moore, a 2.1 point edge.", FACTS).ok, true);
});

test("sentence starters and position tags are accepted", () => {
  for (const text of [
    "Sitting D.J. Moore keeps St. Brown in the lineup.",
    "Go with St. Brown at WR1.",
    "Trust the 2.1 point edge for WR2.",
    "I'd start St. Brown.",
    "Choosing St. Brown at FLEX is the move.",
  ]) {
    assert.equal(validateGroundedText(text, FACTS).ok, true, text);
  }
});

test("validator never throws and treats null opts and facts as empty", () => {
  assert.doesNotThrow(() => validateGroundedText("Start St. Brown.", FACTS, null));
  assert.doesNotThrow(() => validateGroundedText("Start St. Brown.", null, null));
  assert.doesNotThrow(() => validateGroundedText("x", { get a() { throw new Error("boom"); } }));
});

test("start-sit route fails closed when the validator throws", async () => {
  const loser = { name: "Josh Allen", position: "QB", projected_points: 18.2, status: null };
  const winner = { name: "Tyreek Hill", position: "WR", projected_points: 21.7, status: null };
  const args = { loser, winner, pointsDelta: 3.5, slot: "WR" };
  const text = await startSit.explainSafely(args, {
    llmService: { explainStartSit: async () => "Tyreek Hill is 3.5 points ahead." },
    validator: () => { throw new Error("validator down"); },
  });
  assert.equal(text, startSit.deterministicExplanation(args));
});

test("MVP narration fails closed when the validator throws", async () => {
  const response = {
    state: "success", mode: "live",
    recommendation: {
      type: "start_sit", title: "Start A over B", move: "Move A in.",
      primary_player: { name: "A", position: "WR", team: "DAL" },
      comparison_player: { name: "B", position: "WR", team: "PHI" },
      expected_value_delta: { points: 2.1, label: "meaningful" },
      confidence: { score: 82, label: "confident", rationale: "ok" },
      risk: { level: "medium", reasons: [] },
      explanation: { summary: "s", why_it_matters: "w", risk: "r", confidence: "c", data_used: ["weekly projection"] },
    },
    signals: {},
  };
  const result = await evidence.generateMvpLlmNarration(response, {
    llmService: {
      explainOmenMvpMove: async () => ({ summary: "A is ahead", why_it_matters: "B is behind", risk: "r", confidence: "c", data_used: ["weekly projection"] }),
      getLlmBridgeStatus: () => ({ status: "configured_private", model: "gemma4:e2b-q4_0" }),
    },
    groundingValidator: () => { throw new Error("down"); },
  });
  assert.equal(result, null);
});
