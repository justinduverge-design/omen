"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { computeSight, phaseOf, weightsFor } = require("../src/services/footballWarehouse/sightV1");
const { aggregateSkillPlays } = require("../src/services/footballWarehouse/ratSkillMetric");

test("phases follow the season: early, pre-deadline, post-deadline", () => {
  assert.equal(phaseOf(2), "early");
  assert.equal(phaseOf(7), "pre_deadline");
  assert.equal(phaseOf(14), "post_deadline");
});

test("each season uses weights learned from the five seasons before it", () => {
  const w = weightsFor(2026, "WR", "pre_deadline");
  assert.deepEqual(w.fitted_on, [2021, 2025]);
  assert.ok(w.weights.target_share > 0 && w.weights.production_ppg > 0);
  assert.deepEqual(
    weightsFor(2030, "TE", "early").season <= 2030,
    true,
    "a future season falls back to the latest fit",
  );
});

test("Sight gives an expected points total and a grade, with every input's contribution", () => {
  const plays = [];
  const positions = new Map();
  const ppg = new Map();
  for (let i = 0; i < 10; i += 1) {
    const id = `omen:player:wr${i}`;
    positions.set(id, { position: "WR" });
    ppg.set(id, 5 + i * 1.5);
    for (let g = 0; g < 6; g += 1)
      for (let t = 0; t < 30; t += 1) {
        const mine = t < 4 + i;
        plays.push({
          gameId: `g${g}_${i}`,
          posteamId: `T${i}`,
          receiverId: mine ? id : `x${i}`,
          epa: mine ? i * 0.05 : 0,
          passAttempt: "1",
          completePass: mine && t % 2 ? "1" : "0",
          cp: "0.6",
          yardsGained: 9,
          airYards: 7,
          yardline100: 40,
        });
      }
  }
  const out = computeSight({
    season: 2026,
    week: 6,
    aggregates: aggregateSkillPlays(plays, positions),
    positions,
    ppgToDate: ppg,
  });
  const wr9 = out.values.find((v) => v.entityId === "omen:player:wr9");
  const wr2 = out.values.find((v) => v.entityId === "omen:player:wr2");
  assert.ok(wr9.value > wr2.value);
  assert.equal(wr9.components.phase, "pre_deadline");
  assert.ok(wr9.components.grade > wr2.components.grade);
  const sum = wr9.components.intercept + Object.values(wr9.components.contributions).reduce((s, c) => s + c.points, 0);
  assert.ok(Math.abs(sum - wr9.value) < 0.01, "contributions add up to the number");
});

test("grading compares Sight with what happened, beside points-per-game and the provider", () => {
  const { gradeSight } = require("../src/services/footballWarehouse/sightAccuracy");
  const sight = [10, 12, 8, 15].map((v, i) => ({
    entityId: `p${i}`,
    value: v,
    components: { position: "WR", production_ppg: 11 },
  }));
  const actual = new Map([
    ["p0", 11],
    ["p1", 14],
    ["p2", 6],
    ["p3", 18],
  ]);
  const out = gradeSight(
    sight,
    actual,
    new Map([
      ["p0", 12],
      ["p1", 12],
      ["p2", 12],
      ["p3", 12],
    ]),
  );
  assert.equal(out.summary.positions.WR.n, 4);
  assert.ok(out.summary.positions.WR.sight.corr > 0.9);
  assert.equal(out.summary.positions.WR.provider.n, 4);
  assert.equal(out.values.find((v) => v.entityId === "p3").value, 3);
});

test("a player who did not play is not graded", () => {
  const { gradeSight } = require("../src/services/footballWarehouse/sightAccuracy");
  const out = gradeSight([{ entityId: "p0", value: 10, components: { position: "RB" } }], new Map());
  assert.equal(out.values.length, 0);
});

test("the Sight switch: grading is off unless SIGHT_ENABLED=true, and the version is selectable", async () => {
  const { createDerivedStages, sightSettings } = require("../src/services/footballWarehouse/derivedStages");
  assert.deepEqual(sightSettings({}), { enabled: false, version: "v1" });
  assert.deepEqual(sightSettings({ SIGHT_ENABLED: "true", SIGHT_VERSION: "v2" }), { enabled: true, version: "v2" });
  const ok = {
    run: async () => ({ state: "succeeded", valueCount: 1 }),
    writeSeason: async () => ({ state: "succeeded", writtenRows: 1 }),
  };
  const acc = { run: async () => ({ state: "succeeded", graded_weeks: 2 }) };
  const off = await createDerivedStages({
    opportunityWriter: ok,
    qbRunner: ok,
    skillRunner: ok,
    sightRunner: ok,
    sightAccuracyRunner: acc,
    indexStage: ok,
    coachingStage: ok,
    weatherStage: ok,
    observedWeatherStage: ok,
    env: {},
  }).run({ season: 2026 });
  assert.equal(off.sightAccuracy.state, "disabled");
  const on = await createDerivedStages({
    opportunityWriter: ok,
    qbRunner: ok,
    skillRunner: ok,
    sightRunner: ok,
    sightAccuracyRunner: acc,
    indexStage: ok,
    coachingStage: ok,
    weatherStage: ok,
    observedWeatherStage: ok,
    env: { SIGHT_ENABLED: "true" },
  }).run({ season: 2026 });
  assert.equal(on.sightAccuracy.version, "v1");
  assert.deepEqual(Object.keys(on.sightAccuracy.versions), ["v1", "v2"], "every version is graded side by side");
});

test("Sight v2 adds game context; a missing line is neutral, never a penalty", () => {
  const { buildContext } = require("../src/services/footballWarehouse/sightContext");
  const ctx = buildContext(
    [
      {
        week: 5,
        player_id: "p",
        team_id: "BUF",
        opponent_team_id: "MIA",
        football_position: "WR",
        fantasy_points_ppr: 10,
      },
      {
        week: 5,
        player_id: "q",
        team_id: "NYJ",
        opponent_team_id: "KC",
        football_position: "WR",
        fantasy_points_ppr: 30,
      },
    ],
    [{ week: 6, home_team_id: "BUF", away_team_id: "KC", spread_line: 3, total_line: 50 }],
  );
  const c = ctx.contextFor("p", "WR", 5);
  assert.equal(c.implied, 26.5, "home favored by 3 in a 50 total");
  assert.equal(c.oppAllowed, 30, "KC allowed 30 to WRs so far");
  assert.equal(ctx.contextFor("q", "WR", 5), null, "no game next week: no context");
});

test("role changes: usage trend and the share vacated by teammates who are out next week", () => {
  const { buildRoleContext } = require("../src/services/footballWarehouse/sightContext");
  const agg = (targets, carries) => ({
    targets,
    carries,
    dropbacks: 0,
    teamPassAttempts: 100,
    teamRushAttempts: 100,
    teamDropbacks: 0,
  });
  const season = new Map([
    ["rb1", agg(10, 60)],
    ["rb2", agg(5, 20)],
  ]);
  const recent = new Map([
    ["rb1", agg(2, 10)],
    ["rb2", agg(3, 15)],
  ]);
  const role = buildRoleContext({
    seasonAgg: season,
    recentAgg: recent,
    positions: new Map(),
    statusNext: new Map([["rb1", "RES"]]),
    teamOf: () => "T",
  });
  const backup = role("rb2", "RB");
  assert.equal(backup.vacated, 0.35, "the starter on injured reserve leaves 70 of 200 team touches");
  assert.ok(backup.usageTrend < 0.01);
  assert.equal(role("rb1", "RB").vacated, 0);
});

test("flex grade puts RB, WR and TE on one scale; QB, K and DEF are left out", () => {
  const { withFlexGrade } = require("../src/services/footballWarehouse/sightRun");
  const mk = (id, position, value) => ({ entityId: id, value, components: { position } });
  const values = [...Array(9).keys()]
    .map((i) => mk(`p${i}`, ["RB", "WR", "TE"][i % 3], 5 + i))
    .concat([mk("q", "QB", 25), mk("k", "K", 8)]);
  withFlexGrade(values);
  assert.ok(
    values.find((v) => v.entityId === "p8").components.flex_grade >
      values.find((v) => v.entityId === "p0").components.flex_grade,
  );
  assert.equal(values.find((v) => v.entityId === "q").components.flex_grade, undefined);
  assert.equal(values.find((v) => v.entityId === "k").components.flex_grade, undefined);
});
