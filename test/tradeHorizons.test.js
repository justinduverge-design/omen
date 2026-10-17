"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { horizonRows, scoreTradeHorizons } = require("../src/services/tradeHorizons");

const line = (ppr, receptions = 0) => ({ resolved: true, hasLine: true, ppr, receptions });
const decision = { id: "d1", user_id: "u1", week: 4, scoring_format: "ppr",
  recommendation: { primary_player: { id: "sleeper:1" }, comparison_player: { id: "sleeper:2" } } };

test("a trade is graded on its week, the next four weeks and the season so far", () => {
  const weeks = new Map([[4, { received: line(20), given: line(10) }], [5, { received: line(5), given: line(18) }], [6, { received: line(12), given: line(12) }]]);
  const rows = horizonRows({ decision, weeks, lastFinishedWeek: 6 });
  const by = Object.fromEntries(rows.map((r) => [r.horizon, r]));
  assert.equal(by.week.margin, 10);
  assert.equal(by.week.complete, true);
  assert.equal(by.next_4.margin, -3);
  assert.equal(by.next_4.result, "loss");
  assert.equal(by.next_4.complete, false);
  assert.equal(by.next_4.through_week, 6);
  assert.equal(by.season.weeks_counted, 3);
  assert.equal(by.season.complete, false);
});

test("a week without lines stops the count; it is never two zeros", () => {
  const weeks = new Map([[4, { received: line(9), given: line(3) }], [5, { received: undefined, given: line(4) }]]);
  const by = Object.fromEntries(horizonRows({ decision, weeks, lastFinishedWeek: 5 }).map((r) => [r.horizon, r]));
  assert.equal(by.next_4.through_week, 4);
  assert.equal(by.next_4.weeks_counted, 1);
});

test("Half PPR subtracts half a point per catch; a declined trade is not graded", async () => {
  const half = { ...decision, scoring_format: "half_ppr" };
  const [week] = horizonRows({ decision: half, weeks: new Map([[4, { received: line(20, 6), given: line(10, 0) }]]), lastFinishedWeek: 4 });
  assert.equal(week.received_points, 17);

  const upserts = [];
  const from = (table) => {
    const q = { select: () => q, eq: () => q, lte: () => q, in: () => q, upsert: async (rows) => { upserts.push(rows); return {}; } };
    q.then = (resolve) => resolve(table === "ledger_current_calls" ? { data: [decision] }
      : table === "decision_actions" ? { data: [{ decision_id: "d1", followed: false }] } : { data: [] });
    return q;
  };
  const tally = await scoreTradeHorizons({ from }, { season: 2026, lastFinishedWeek: 6, repository: { readWeekOutcomes: async () => new Map() } });
  assert.equal(tally.trades, 0);
  assert.equal(upserts.length, 0);
});
