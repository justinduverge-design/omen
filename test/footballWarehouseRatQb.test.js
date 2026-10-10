"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  METRIC_NAME, FORMULA_VERSION, QUALIFICATION_MIN_DROPBACKS, MIN_QUALIFIED_COHORT, COMPONENTS,
  aggregateQbPlays, computeQbGrades, metricConstants,
} = require("../src/services/footballWarehouse/ratQbMetric");
const { createMetricRunWriter } = require("../src/services/footballWarehouse/metricRunWriter");

const QB = "omen:player:qb-a";
const OTHER = "omen:player:wr-b";
const gsis = new Map([[QB, "00-0000001"]]);

function play(overrides) {
  return {
    passerId: null, rusherId: null, epa: 0, cpoe: null, qbDropback: "0", qbScramble: "0", qbSpike: "0",
    qbKneel: "0", sack: "0", passAttempt: "0", rushAttempt: "0", interception: "0", fumbleLost: "0",
    fumbledGsisId: null, ...overrides,
  };
}

test("metric identity matches the warehouse naming rule and is unfitted v0", () => {
  assert.match(METRIC_NAME, /^omen_[a-z0-9_]+$/);
  assert.equal(METRIC_NAME, "omen_qb_grade");
  assert.equal(FORMULA_VERSION, "v0");
  const constants = metricConstants();
  assert.equal(constants.fitted, false);
  assert.equal(constants.opponent_adjusted, false);
  assert.ok(Math.abs(COMPONENTS.reduce((sum, c) => sum + c.weight, 0) - 1) < 1e-12);
  assert.deepEqual(COMPONENTS.map((c) => c.key), ["epa_per_dropback", "cpoe", "sack_avoidance_rate", "turnover_rate", "rush_epa"]);
});

test("aggregation counts dropbacks, sacks, scrambles, turnovers and designed rushes", () => {
  const agg = aggregateQbPlays([
    play({ passerId: QB, qbDropback: "1", passAttempt: "1", epa: 0.5, cpoe: 4 }),
    play({ passerId: QB, qbDropback: "1", sack: "1", epa: -2 }),
    // scramble: passer null, rusher is the QB; still a dropback, not a designed rush
    play({ rusherId: QB, qbDropback: "1", qbScramble: "1", rushAttempt: "1", epa: 1 }),
    play({ passerId: QB, qbDropback: "1", passAttempt: "1", interception: "1", epa: -4, cpoe: -30 }),
    // fumble lost by the QB on a sack counts; a fumble lost by someone else does not
    play({ passerId: QB, qbDropback: "1", sack: "1", fumbleLost: "1", fumbledGsisId: "00-0000001", epa: -5 }),
    play({ passerId: QB, qbDropback: "1", passAttempt: "1", fumbleLost: "1", fumbledGsisId: "00-0000099", epa: -3, cpoe: 0 }),
    // designed QB run
    play({ rusherId: QB, rushAttempt: "1", epa: 0.25 }),
    // excluded: spike, kneel, null epa, non-QB entity, run by a non-QB
    play({ passerId: QB, qbDropback: "1", qbSpike: "1", epa: -0.1 }),
    play({ rusherId: QB, qbKneel: "1", rushAttempt: "1", epa: -0.5 }),
    play({ passerId: QB, qbDropback: "1", epa: null }),
    play({ passerId: OTHER, qbDropback: "1", epa: 9 }),
    play({ rusherId: OTHER, rushAttempt: "1", epa: 9 }),
  ], gsis);
  assert.deepEqual([...agg.keys()], [QB]);
  const a = agg.get(QB);
  assert.equal(a.dropbacks, 6);
  assert.ok(Math.abs(a.epaSum - (0.5 - 2 + 1 - 4 - 5 - 3)) < 1e-12);
  assert.equal(a.sacks, 2);
  assert.equal(a.cpoeN, 3);
  assert.equal(a.cpoeSum, 4 - 30 + 0);
  assert.equal(a.interceptions, 1);
  assert.equal(a.fumblesLost, 1);
  assert.equal(a.rushes, 1);
  assert.equal(a.rushEpaSum, 0.25);
});

// Build a cohort of n synthetic QBs directly as aggregates.
function cohort(count, mutate = () => ({})) {
  const map = new Map();
  for (let i = 0; i < count; i += 1) {
    const base = {
      dropbacks: 400, epaSum: 400 * (0.05 + 0.01 * i), sacks: 28 - i, cpoeSum: 380 * (-2 + i * 0.5), cpoeN: 380,
      interceptions: 12 - Math.floor(i / 2), fumblesLost: 3, rushes: 30 + i, rushEpaSum: (30 + i) * (-0.05 + 0.01 * i),
    };
    map.set(`omen:player:qb-${String(i).padStart(2, "0")}`, { ...base, ...mutate(i) });
  }
  return map;
}

test("grades center on 50 with a population standard deviation of 10 across the qualified cohort", () => {
  const { values, summary } = computeQbGrades(cohort(12));
  assert.equal(summary.outcome, "graded");
  assert.equal(values.length, 12);
  const grades = values.map((v) => v.value);
  const mean = grades.reduce((a, b) => a + b, 0) / grades.length;
  const sd = Math.sqrt(grades.reduce((a, b) => a + (b - mean) ** 2, 0) / grades.length);
  assert.ok(Math.abs(mean - 50) < 1e-4, `mean ${mean}`);
  assert.ok(Math.abs(sd - 10) < 1e-3, `sd ${sd}`);
  for (const v of values) {
    assert.equal(v.entityType, "player");
    assert.ok(v.value >= 0 && v.value <= 100);
    assert.equal(v.components.fitted, false);
    assert.equal(v.components.components.turnover_rate.sign, -1);
  }
  // monotone construction: higher index is better on every component here
  assert.ok(values[11].value > values[0].value);
});

test("direction: better EPA raises the grade; more turnovers and sacks lower it", () => {
  const base = computeQbGrades(cohort(10)).values;
  const target = "omen:player:qb-05";
  const grade = (rows) => rows.find((r) => r.entityId === target).value;
  const better = computeQbGrades(cohort(10, (i) => (i === 5 ? { epaSum: 400 * 0.4 } : {}))).values;
  const turnovers = computeQbGrades(cohort(10, (i) => (i === 5 ? { interceptions: 30 } : {}))).values;
  const sacks = computeQbGrades(cohort(10, (i) => (i === 5 ? { sacks: 60 } : {}))).values;
  assert.ok(grade(better) > grade(base));
  assert.ok(grade(turnovers) < grade(base));
  assert.ok(grade(sacks) < grade(base));
});

test("shrinkage pulls a component toward the pooled cohort mean by n/(n+k)", () => {
  const { values } = computeQbGrades(cohort(10));
  const row = values.find((v) => v.entityId === "omen:player:qb-09").components.components.epa_per_dropback;
  const all = [...cohort(10).values()];
  const prior = all.reduce((s, a) => s + a.epaSum, 0) / all.reduce((s, a) => s + a.dropbacks, 0);
  const k = COMPONENTS.find((c) => c.key === "epa_per_dropback").shrinkK;
  const expected = (400 * row.raw + k * prior) / (400 + k);
  assert.ok(Math.abs(row.shrunk - expected) < 1e-5);
  assert.ok(Math.abs(row.shrunk - prior) < Math.abs(row.raw - prior));
});

test("a QB with no designed rushes or no cpoe sits at the cohort mean on that component, not zero", () => {
  const { values } = computeQbGrades(cohort(10, (i) => (i === 3 ? { rushes: 0, rushEpaSum: 0, cpoeN: 0, cpoeSum: 0 } : {})));
  const c = values.find((v) => v.entityId === "omen:player:qb-03").components.components;
  assert.equal(c.rush_epa.raw, null);
  assert.equal(c.cpoe.raw, null);
  assert.equal(c.rush_epa.n, 0);
  assert.ok(Number.isFinite(c.rush_epa.shrunk));
});

test("qualification: under 100 dropbacks gets no grade and is counted, not stored", () => {
  const map = cohort(10);
  map.set("omen:player:qb-rookie", { ...map.get("omen:player:qb-00"), dropbacks: QUALIFICATION_MIN_DROPBACKS - 1 });
  map.set("omen:player:qb-edge", { ...map.get("omen:player:qb-00"), dropbacks: QUALIFICATION_MIN_DROPBACKS });
  const { values, summary } = computeQbGrades(map);
  assert.equal(summary.below_threshold_count, 1);
  assert.equal(summary.qualified_count, 11);
  assert.ok(!values.some((v) => v.entityId === "omen:player:qb-rookie"));
  assert.ok(values.some((v) => v.entityId === "omen:player:qb-edge"));
});

test("a cohort smaller than the minimum, or empty, stores nothing and says why", () => {
  const small = computeQbGrades(cohort(MIN_QUALIFIED_COHORT - 1));
  assert.deepEqual(small.values, []);
  assert.equal(small.summary.outcome, "cohort_too_small");
  const none = computeQbGrades(cohort(12, () => ({ dropbacks: 40 })));
  assert.deepEqual(none.values, []);
  assert.equal(none.summary.outcome, "no_qualified_entities");
  assert.equal(none.summary.below_threshold_count, 12);
});

test("an identical cohort yields identical output (deterministic, order independent)", () => {
  const forward = computeQbGrades(cohort(12));
  const reversed = computeQbGrades(new Map([...cohort(12)].reverse()));
  assert.deepEqual(forward, reversed);
});

test("a cohort with no spread grades everyone 50 without dividing by zero", () => {
  const flat = new Map();
  for (let i = 0; i < 9; i += 1) {
    flat.set(`omen:player:qb-${i}`, { dropbacks: 300, epaSum: 30, sacks: 20, cpoeSum: 0, cpoeN: 280, interceptions: 6, fumblesLost: 2, rushes: 20, rushEpaSum: 0 });
  }
  const { values } = computeQbGrades(flat);
  assert.ok(values.every((v) => v.value === 50));
});

test("metric run writer rejects bad identities before touching the pool", async () => {
  const pool = { connect: async () => { throw new Error("must not connect"); } };
  const writer = createMetricRunWriter({ pool });
  const ok = { formulaVersion: "v0", season: 2025, resolveInputs() {}, computeValues() {} };
  await assert.rejects(writer.writeRun({ ...ok, metricName: "qb_grade" }), /metricName/);
  await assert.rejects(writer.writeRun({ ...ok, metricName: "omen_qb_grade", formulaVersion: "" }), /formulaVersion/);
  await assert.rejects(writer.writeRun({ ...ok, metricName: "omen_qb_grade", season: 1990 }), /season/);
  await assert.rejects(writer.writeRun({ ...ok, metricName: "omen_qb_grade", week: 0 }), /week/);
  assert.throws(() => createMetricRunWriter({}), /pool/);
});
