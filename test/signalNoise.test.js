"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { THRESHOLDS: CP } = require("../src/services/confidencePolicy");
const { START_SIT } = require("../src/services/evidenceVocabulary");
const { THRESHOLDS, gapNoise, usageStability, signalNoiseSummary } = require("../src/services/signalNoise");

const wk = (week, snap_share, targets, extra = {}) => ({ week, snap_share, targets, ...extra });

test("gap threshold is the confidence policy coin-flip line", () => {
  assert.equal(THRESHOLDS.GAP_NOISE_BELOW, CP.COIN_FLIP_BELOW);
});

test("gapNoise boundaries", () => {
  const cases = [
    [0, "inside_noise"], [1.49, "inside_noise"], [-1.49, "inside_noise"],
    [1.5, "real_edge"], [-3, "real_edge"], [7.99, "real_edge"],
    [8, "large_edge"], [-12, "large_edge"], ["9", "large_edge"],
    [NaN, null], [null, null], [undefined, null], ["", null], ["abc", null], [Infinity, null],
  ];
  for (const [input, want] of cases) assert.equal(gapNoise(input).classification, want, String(input));
  assert.match(gapNoise(0.8).sentence, /0\.8 pts\) is inside normal projection variance/);
  assert.equal(gapNoise(null).sentence, null);
});

test("sentences never say predictive", () => {
  for (const g of [0.5, 3, 9]) assert.doesNotMatch(gapNoise(g).sentence, /predict/i);
});

test("usageStability: stable, volatile, boundaries", () => {
  const stable = usageStability([wk(1, 0.7, 6), wk(2, 0.72, 7), wk(3, 0.69, 6), wk(4, 0.71, 7)]);
  assert.equal(stable.stability, "stable");
  assert.equal(stable.games, 4);
  assert.equal(stable.change_since_last_week.metric, "snap_share");
  assert.equal(stable.change_since_last_week.from_week, 3);
  assert.equal(stable.change_since_last_week.to_week, 4);
  assert.match(stable.sentence, /held between 69% and 72% over the last 4 games/);

  const volatile = usageStability([wk(1, 0.9, 10), wk(2, 0.4, 3), wk(3, 0.85, 9), wk(4, 0.45, 2)]);
  assert.equal(volatile.stability, "volatile");
  assert.match(volatile.sentence, /swung/);

  // 0.4/0.7 alternating: MAD 0.15 -> volatile; 0.5/0.6 alternating: MAD 0.05 -> stable.
  assert.equal(usageStability([wk(1, 0.4), wk(2, 0.7), wk(3, 0.4), wk(4, 0.7)]).stability, "volatile");
  assert.equal(usageStability([wk(1, 0.5), wk(2, 0.6), wk(3, 0.5), wk(4, 0.6)]).stability, "stable");
});

test("usageStability: volume metrics without snap share", () => {
  const r = usageStability([{ week: 1, carries: 20 }, { week: 2, carries: 10 }, { week: 3, carries: 21 }]);
  assert.equal(r.stability, "volatile");
  assert.equal(r.change_since_last_week.metric, "carries");
});

test("usageStability: insufficient data, never guesses", () => {
  const cases = [
    undefined, null, [], "x", [wk(1, 0.7, 5)], [wk(1, 0.7, 5), wk(2, 0.6, 4)],
    [wk(1, NaN, null), wk(2, "", undefined), wk(3, null, null)], [null, 5, {}],
  ];
  for (const c of cases) {
    const r = usageStability(c);
    assert.equal(r.stability, "insufficient_data");
    assert.equal(r.change_since_last_week, null);
  }
  assert.match(usageStability([wk(1, 0.7, 5)]).sentence, /Only 1 game of usage/);
});

test("usageStability: bye weeks, missing weeks and zero rows are not volatility", () => {
  const rows = [wk(1, 0.7, 6), wk(2, 0, 0), wk(3, 0.72, 7), { week: 4, bye: true }, wk(5, 0.7, 6), wk(7, 0.71, 6)];
  const r = usageStability(rows);
  assert.equal(r.stability, "stable");
  assert.equal(r.games, 4);
});

test("usageStability: injury-shortened games are excluded when flagged", () => {
  const rows = [wk(1, 0.7, 6), wk(2, 0.71, 6), wk(3, 0.2, 1, { injury_shortened: true }), wk(4, 0.7, 7)];
  const r = usageStability(rows);
  assert.equal(r.stability, "stable");
  assert.equal(r.excluded_injury_games, 1);
  assert.equal(r.change_since_last_week.from_week, 2);
  assert.match(r.sentence, /1 injury-shortened game was left out/);
  rows[2] = wk(3, 0.2, 1); // same week unflagged reads as volatile
  assert.equal(usageStability(rows).stability, "volatile");
});

test("usageStability: accepts offense_pct and percent values, window caps at 6", () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ week: i + 1, offense_pct: i < 4 ? 20 : 0.7 }));
  const r = usageStability(rows);
  assert.equal(r.games, 6);
  assert.equal(r.stability, "stable");
  assert.equal(usageStability([wk(1, 150), wk(2, 140), wk(3, 130)]).stability, "insufficient_data");
});

test("signalNoiseSummary: max 2, vocabulary kinds, numbers from inputs", () => {
  const s = signalNoiseSummary({ gapPts: 0.8, usageRows: [wk(1, 0.7, 6), wk(2, 0.7, 6), wk(3, 0.7, 6)], name: "Smith" });
  assert.equal(s.statements.length, 2);
  assert.deepEqual(s.statements.map((x) => x.kind), ["projection", "observed_context"]);
  for (const st of s.statements) assert.ok(START_SIT.kinds.includes(st.kind));
  assert.match(s.statements[1].text, /Smith's recent usage is steady/);
  assert.equal(signalNoiseSummary({ gapPts: NaN }).statements.length, 0);
  assert.equal(signalNoiseSummary({ usageRows: [] }).statements[0].classification, "insufficient_data");
  assert.equal(signalNoiseSummary().statements.length, 0);
});
