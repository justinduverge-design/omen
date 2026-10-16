"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { aggregateSkillPlays, computeSkillGrades, SPECS } = require("../src/services/footballWarehouse/ratSkillMetric");

// A synthetic season: 10 WRs on 10 teams. WR i gets more targets and better outcomes as i grows.
function season() {
  const plays = [];
  const players = new Map();
  for (let i = 0; i < 10; i += 1) {
    const id = `omen:player:wr${i}`;
    players.set(id, { position: "WR", gsis: `00-${i}` });
    for (let g = 0; g < 5; g += 1) {
      const gameId = `g${g}_${i}`;
      for (let t = 0; t < 30; t += 1) {
        const mine = t < 3 + i; // target share grows with i
        const complete = mine && t % 3 !== 0;
        plays.push({
          gameId, posteamId: `T${i}`, receiverId: mine ? id : `omen:player:other${i}`, epa: mine ? -0.2 + i * 0.08 : 0,
          yacEpa: complete ? 0.1 * i : 0, passAttempt: "1", completePass: complete ? "1" : "0", cp: "0.65",
          yardsGained: complete ? 8 + i * 2 : 0, airYards: 6 + i, yardline100: t % 10 === 0 ? 15 : 50,
        });
      }
    }
  }
  return { plays, players };
}

test("receivers are graded from role and efficiency, every component shown", () => {
  const { plays, players } = season();
  const out = computeSkillGrades("WR", aggregateSkillPlays(plays, players), players);
  assert.equal(out.summary.outcome, "graded");
  assert.equal(out.values.length, 8, "wr0 and wr1 are under the 25-target minimum");
  const byId = new Map(out.values.map((v) => [v.entityId, v]));
  assert.ok(byId.get("omen:player:wr9").value > byId.get("omen:player:wr2").value, "more role and better efficiency grades higher");
  const parts = byId.get("omen:player:wr9").components;
  assert.equal(parts.metric, "RAT-WR");
  assert.deepEqual(Object.keys(parts.components), SPECS.WR.components.map((c) => c.key));
  assert.ok(parts.components.target_share.raw > 0 && parts.components.target_share.raw < 1);
  for (const v of out.values) assert.ok(v.value >= 0 && v.value <= 100);
});

test("a thin cohort is not graded rather than graded on noise", () => {
  const { plays, players } = season();
  const out = computeSkillGrades("TE", aggregateSkillPlays(plays, players), players);
  assert.equal(out.values.length, 0);
  assert.equal(out.summary.outcome, "no_qualified_entities");
});

test("a receiver below the target minimum gets no grade, not a low one", () => {
  const players = new Map([["omen:player:x", { position: "WR", gsis: "00-x" }]]);
  const plays = [{ gameId: "g", posteamId: "T", receiverId: "omen:player:x", epa: 3, passAttempt: "1", completePass: "1", cp: "0.5", yardsGained: 60 }];
  const out = computeSkillGrades("WR", aggregateSkillPlays(plays, players), players);
  assert.equal(out.values.length, 0);
});
