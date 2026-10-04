"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { THRESHOLDS: CP } = require("../src/services/confidencePolicy");
const { START_SIT } = require("../src/services/evidenceVocabulary");
const { THRESHOLDS, KIND, gapNoise, usageStability, signalNoiseSummary } = require("../src/services/signalNoise");

const wk = (week, snap_share, targets, extra = {}) => ({ week, snap_share, targets, ...extra });

test("gap threshold is the confidence policy coin-flip line, and the evidence kinds exist", () => {
  assert.ok(Number.isFinite(CP.COIN_FLIP_BELOW), "confidencePolicy must keep COIN_FLIP_BELOW");
  assert.equal(THRESHOLDS.GAP_NOISE_BELOW, CP.COIN_FLIP_BELOW);
  for (const k of Object.values(KIND)) assert.ok(START_SIT.kinds.includes(k), `${k} missing from evidenceVocabulary`);
});

test("gap classification and sentence agree on the rounded value shown", () => {
  const a = gapNoise(1.46);
  assert.equal(a.classification, "inside_noise");
  assert.match(a.sentence, /1\.46 pts/);
  const b = gapNoise(1.499); // shown as 1.5, so a real edge, never "1.5 is inside noise"
  assert.equal(b.classification, "real_edge");
  assert.match(b.sentence, /1\.5-point/);
  assert.equal(gapNoise(7.999).classification, "large_edge");
  assert.match(gapNoise(7.999).sentence, /^An 8-point/);
  assert.match(gapNoise(3.2).sentence, /^A 3\.2-point/);
  assert.match(gapNoise(11).sentence, /^An 11-point/);
  assert.match(gapNoise(1).sentence, /\(1 pt\)/);
});

test("odd values never throw and blank strings are missing", () => {
  for (const v of ["", "   ", "\t", Symbol("x"), {}, [], { valueOf() { throw new Error("no"); } }, true]) {
    assert.equal(gapNoise(v).classification, null);
  }
  const r = usageStability([wk(1, "  ", " "), wk(2, Symbol("x"), {}), wk(3, "", "")]);
  assert.equal(r.stability, "insufficient_data");
});

test("usageStability: injury count refers to the window only; 100% and identical values read sensibly", () => {
  const rows = [wk(1, 0.7, 6, { injury_shortened: true }), ...Array.from({ length: 6 }, (_, i) => wk(i + 2, 0.7, 6))];
  const r = usageStability(rows);
  assert.equal(r.excluded_injury_games, 0, "the week-1 shortened game is older than the window");
  assert.doesNotMatch(r.sentence, /injury-shortened/);
  const full = usageStability([wk(1, 1, 8), wk(2, 1, 8), wk(3, 1, 8)]);
  assert.equal(full.stability, "stable");
  assert.match(full.sentence, /Snap share held at 100% over the last 3 games/);
  assert.match(usageStability([wk(1, null, 8), wk(2, null, 8), wk(3, null, 8)]).sentence, /Targets held at 8 over/);
  assert.equal(usageStability([wk(1, 0.5), wk(2, 1), wk(3, "100")]).metrics[0].max, 1);
});

test("usageStability: float boundary and sparse-data wording", () => {
  assert.equal(usageStability([wk(1, 0.5), wk(2, 0.7), wk(3, 0.5), wk(4, 0.7)]).stability, "volatile");
  assert.equal(usageStability([wk(1, 0.7), wk(2, 0.5), wk(3, 0.7), wk(4, 0.5)]).stability, "volatile");
  assert.match(usageStability([wk(1, 0.7, 5)]).sentence, /Only 1 game of usage on record \(3 needed\)/);
  assert.match(usageStability([]).sentence, /^No usage history on record/);
  const sparse = usageStability([wk(1, 0.7, 5), wk(2, null, null, { receptions: 3 }), wk(3, 0.6, null), wk(4, null, 4)]);
  assert.equal(sparse.stability, "insufficient_data");
  assert.match(sparse.sentence, /4 games are on record, but fewer than 3 have snap share, targets or carries/);
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
