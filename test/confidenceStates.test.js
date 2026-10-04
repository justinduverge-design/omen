"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");

const omen = require("../src/services/omen");
const { bandedConfidence } = require("../src/services/decisionBriefV2");
const { bandFromScore, assessConfidence } = require("../src/services/confidencePolicy");
const { confidenceFlags } = require("../src/omen_tuesday_cron");

const connection = { platform: "yahoo", league_id: "L1" };
const player = (key, name, extra = {}) => ({
  player_key: key, name, position: "RB", selected_position: "RB", eligible_positions: ["RB"], projected_points: 10, status: null, ...extra,
});
const roster = { team_key: "t1", week: 5, source: "yahoo", slots: { starters: [player("a", "A", { status: "OUT", projected_points: 0 })], bench: [] } };

function band(confidence) {
  return bandedConfidence(confidence).band;
}

test("off-season, pre-draft and mock off-season states carry no band, never Confident", () => {
  const states = [
    omen.offSeasonMvpResponse().body,
    omen.preDraftMvpResponse({ connection, roster, connectedPlatforms: ["yahoo"] }).body,
    omen.buildOmenMvpMoveResponse({ platform: "yahoo", mock_state: "off_season" }).body,
  ];
  for (const body of states) {
    assert.equal(body.confidence.score, null);
    assert.equal(band(body.confidence), null);
    assert.ok(bandedConfidence(body.confidence).unavailable_reason.length > 0);
    assert.doesNotMatch(JSON.stringify(body.explanation), /\d+ out of 100|Confidence is high/);
  }
});

test("waiver, trade and stand-pat states are pinned to Leaning by policy, never Confident", () => {
  const out = player("a", "Out Starter", { status: "OUT", projected_points: 0 });
  const pickup = player("b", "Pickup", { projected_points: 25 });
  const waiver = omen.mapWaiverPickupToMvpMove({ roster, connection, connectedPlatforms: ["yahoo"], outStarter: out, pickup }).body;
  assert.equal(band(waiver.recommendation.confidence), "leaning");

  const yahoo = omen.mapYahooWaiverToMvpMove({
    roster, connection, connectedPlatforms: ["yahoo"],
    waiver: { add: player("c", "Add"), drop: player("d", "Drop", { status: "OUT" }) },
  });
  assert.equal(band(yahoo.recommendation.confidence), "leaning");

  const standPat = omen.buildOmenMvpMoveResponse({ platform: "yahoo", mock_state: "empty" }).body;
  assert.equal(band(standPat.confidence), "leaning");

  const mock = omen.buildOmenMvpMoveResponse({ platform: "yahoo" }).body;
  assert.equal(band(mock.recommendation.confidence), "leaning");
  assert.equal(mock.recommendation.confidence.label, "medium");
  assert.doesNotMatch(JSON.stringify(mock), /out of 100|medium_high/);
});

test("cron grading weights are band-aware and keep legacy rows sensible", () => {
  assert.deepEqual(confidenceFlags(85), { confident: true, coinFlip: false });
  assert.deepEqual(confidenceFlags(68), { confident: false, coinFlip: false });
  assert.deepEqual(confidenceFlags(50), { confident: false, coinFlip: true });
  assert.deepEqual(confidenceFlags(45), { confident: false, coinFlip: true }); // legacy low row
  assert.deepEqual(confidenceFlags(92), { confident: true, coinFlip: false }); // legacy high row
  assert.deepEqual(confidenceFlags(75), { confident: false, coinFlip: false }); // legacy 75-79 is now a lean
  assert.equal(bandFromScore(80), "confident");
  // Missing or non-finite confidence is neutral, never a Coin flip bonus.
  for (const missing of [null, undefined, 0, "", NaN, "abc"]) {
    assert.deepEqual(confidenceFlags(missing), { confident: false, coinFlip: false });
  }
  assert.deepEqual(confidenceFlags(55), { confident: false, coinFlip: false });
});

test("policy edge cases: exactly 4, NaN, null, out starter with a negative gap, doubtful", () => {
  const usage = [{ kind: "recent_usage" }];
  assert.equal(assessConfidence({ gap: 4, corroboration: usage }).band, "confident");
  assert.equal(assessConfidence({ gap: 3.99, corroboration: usage }).band, "leaning");
  assert.equal(assessConfidence({ gap: NaN }).band, null);
  assert.equal(assessConfidence({ gap: null }).band, null);
  assert.equal(assessConfidence({ gap: undefined }).band, null);
  assert.equal(assessConfidence({ gap: -3, sitStatus: "OUT" }).band, "coin_flip");
  assert.equal(assessConfidence({ gap: 9, sitStatus: "OUT", closeCall: true }).band, "coin_flip");
  assert.equal(assessConfidence({ gap: 0.5, sitStatus: "OUT" }).band, "coin_flip");
  // Doubtful replacement is out-like: never start him.
  assert.equal(assessConfidence({ gap: 9, startStatus: "DOUBTFUL" }).band, "coin_flip");
  // A doubtful or questionable benched player is a provider label, not corroboration by itself.
  assert.equal(assessConfidence({ gap: 9, sitStatus: "DOUBTFUL" }).band, "leaning");
  assert.equal(assessConfidence({ gap: 9, sitStatus: "Q" }).band, "leaning");
  assert.equal(assessConfidence({ gap: 9, sitStatus: "Q", corroboration: ["injury_status"] }).band, "confident");
});

test("the optimizer assesses the rounded delta it displays", () => {
  const { evaluateLineup } = require("../src/services/optimizer");
  const p = (key, proj) => ({ player_key: key, name: key, position: "WR", selected_position: "WR", eligible_positions: ["WR"], projected_points: proj, status: null });
  const [swap] = evaluateLineup({ slots: { starters: [p("a", 10)], bench: [p("b", 13.996)] } });
  assert.equal(swap.delta, 4);
  assert.equal(swap.confidence_band, "leaning"); // projection-only at exactly 4.00 is still a lean
});
