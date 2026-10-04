"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { validateGroundedText } = require("../src/services/narrationGrounding");

const FACTS = {
  title: "Start Tyreek Hill over Josh Allen",
  primary_player: { name: "Tyreek Hill", position: "WR", team: "MIA" },
  comparison_player: { name: "Josh Allen", position: "QB", team: "BUF" },
  expected_value_delta: { points: 4.65, label: "meaningful" },
  confidence: { score: 82, label: "confident" },
  risk: { level: "medium", reasons: ["Josh Allen is questionable."] },
  data_used: ["connected roster", "weekly projection"],
};

const OPTS = { disallowNumbers: [82] };

const cases = [
  ["grounded rephrase passes", "Tyreek Hill is projected ahead of Josh Allen this week.", true],
  ["rounded to one decimal passes", "The projection edge is 4.7 points.", true],
  ["rounded to integer passes", "That is roughly a 5 point edge.", true],
  ["exact number passes", "The edge is 4.65 points.", true],
  ["team abbreviation from facts passes", "Tyreek Hill of MIA is the start.", true],
  ["possessive name passes", "Tyreek Hill's projection is higher.", true],
  ["invented stat fails", "Tyreek Hill has a big target share.", false, "ungrounded_stat:target share"],
  ["invented stat word fails", "He is trending up with more snaps.", false, "ungrounded_stat:snaps"],
  ["invented number fails", "The edge is 7.2 points.", false, "ungrounded_number:7.2"],
  ["invented number word fails", "He scored in three straight weeks.", false, "ungrounded_number_word:three"],
  ["invented player fails", "Start Tyreek Hill over Patrick Mahomes.", false, "ungrounded_name:Patrick"],
  ["invented team fails", "Tyreek Hill faces the Cowboys.", false, "ungrounded_name:Cowboys"],
  ["invented team abbreviation fails", "Tyreek Hill plays DAL.", false, "ungrounded_name:DAL"],
  ["numeric confidence fails", "Omen is 82 out of 100 on this.", false],
  ["percent fails", "There is a 70% chance he wins.", false, "banned:numeric_confidence"],
  ["quoting the confidence score fails", "Confidence score 82 backs it.", false, "ungrounded_number:82"],
  ["guarantee fails", "This is a guaranteed win.", false, "banned:guarantee"],
  ["beating projections fails", "Our pick beats the projections.", false, "banned:beats_projections"],
  ["own prediction fails", "Omen predicts a big game.", false, "banned:own_prediction"],
  ["too many sentences fails", "Hill is ahead. Allen is behind. That is it.", false, "too_many_sentences"],
  ["too many words fails", `Tyreek Hill ${"is ahead ".repeat(30)}.`, false, "too_many_words"],
  ["empty fails", "   ", false, "empty"],
];

for (const [name, text, ok, reason] of cases) {
  test(`grounding: ${name}`, () => {
    const result = validateGroundedText(text, FACTS, OPTS);
    assert.equal(result.ok, ok, JSON.stringify(result));
    if (reason) assert.ok(result.reasons.includes(reason), JSON.stringify(result));
  });
}

test("grounding: non-string input is rejected", () => {
  assert.equal(validateGroundedText(null, FACTS).ok, false);
  assert.equal(validateGroundedText({ a: 1 }, FACTS).ok, false);
});
