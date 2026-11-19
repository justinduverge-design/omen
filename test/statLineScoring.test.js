"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  scoreStatLine,
  scoreSleeperStatLine,
  sleeperStatLineToFacts,
  statLineToFacts,
  toSleeperStatLine,
} = require("../src/services/scoring/statLineScoring");

// Synthetic player lines; expected totals are calculated from the preset event values.
const fixtures = [
  { position: "QB", line: { passing_yards: 250, passing_tds: 2, passing_interceptions: 1, rushing_yards: 30, rushing_tds: 1, fumbles_lost: 1 }, standard: 23, half_ppr: 23, ppr: 23 }, // 10 + 8 - 2 + 3 + 6 - 2
  { position: "RB", line: { rushing_yards: 80, rushing_tds: 1, receptions: 4, receiving_yards: 30, fumbles_lost: 1 }, standard: 15, half_ppr: 17, ppr: 19 }, // 8 + 6 + 3 - 2, plus receptions
  { position: "WR", line: { rushing_yards: 10, receptions: 6, receiving_yards: 90, receiving_tds: 1 }, standard: 16, half_ppr: 19, ppr: 22 }, // 1 + 9 + 6, plus receptions
  { position: "TE", line: { receptions: 5, receiving_yards: 60, receiving_tds: 1 }, standard: 12, half_ppr: 14.5, ppr: 17 }, // 6 + 6, plus receptions
];

for (const { position, line, ...expected } of fixtures) {
  for (const [scoring, points] of Object.entries(expected)) {
    test(`${position} stat line scores ${scoring}`, () => {
      assert.equal(scoreStatLine(line, scoring), points);
    });
  }
}

test("Sleeper lines use stat events, not provider point totals", () => {
  const line = { pass_yd: 250, pass_td: 2, pass_int: 1, rush_yd: 30, rush_td: 1, fum_lost: 1, pts_ppr: 999 };
  assert.equal(scoreSleeperStatLine(line), 23);
  assert.equal(scoreSleeperStatLine({ rec: 4, rec_yd: 30, rush_yd: 80, rush_td: 1, fum_lost: 1 }, "half_ppr"), 17);
});

test("nflverse to Sleeper to facts preserves scoring facts", () => {
  const line = { attempts: 30, completions: 20, passing_yards: 250, passing_tds: 2, passing_interceptions: 1, carries: 4, rushing_yards: 30, rushing_tds: 1, targets: 6, receptions: 4, receiving_yards: 40, receiving_tds: 1, fumbles_lost: 1 };
  const sleeper = toSleeperStatLine(line);
  assert.deepEqual(sleeper, { pass_att: 30, pass_cmp: 20, pass_yd: 250, pass_td: 2, pass_int: 1, rush_att: 4, rush_yd: 30, rush_td: 1, rec_tgt: 6, rec: 4, rec_yd: 40, rec_td: 1, fum_lost: 1 });
  assert.deepEqual(sleeperStatLineToFacts(sleeper), statLineToFacts(line));
  assert.equal(scoreSleeperStatLine(sleeper), scoreStatLine(line));
});

test("Sleeper conversion combines two-point events and ignores points and unknown or invalid stats", () => {
  assert.deepEqual(sleeperStatLineToFacts({ pass_2pt: 1, rush_2pt: "2", rec_2pt: 1, rec: 3, pts_ppr: 100, unknown: 9, pass_yd: "invalid" }), {
    two_point_conversions: 4,
    receiving_receptions: 3,
  });
});

test("missing stats score zero; position does not filter stat lines", () => {
  assert.equal(scoreStatLine(), 0);
  assert.equal(scoreSleeperStatLine(), 0);
  assert.deepEqual(toSleeperStatLine({}), {});
  assert.equal(scoreStatLine({ position: "unsupported", rushing_yards: 50 }), 5);
  assert.equal(scoreStatLine({ passing_yards: "invalid", receptions: 2 }), 2);
  assert.throws(() => scoreStatLine({}, "unknown"), /unknown scoring preset/);
});
