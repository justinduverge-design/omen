"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { gradeMove, tradeBalance, bestFreeAgentChange } = require("../evals/decision-cases/grade");
const { cases } = require("../evals/decision-cases/coverage");

// Phase 0 of the player-value plan (founder-approved 2026-10-23): the saved cases every later phase must pass.
// Here they pin the grader itself; Omen's own answers are checked against them as each phase lands.

for (const c of cases) {
  test(`coverage: ${c.id}`, () => {
    if (c.move.type === "waiver") {
      const { owner } = gradeMove(c.snapshot, c.move);
      if (c.expect.owner_change_at_most != null)
        assert.ok(owner.change <= c.expect.owner_change_at_most, `${c.why} Got ${owner.change}.`);
      if (c.expect.owner_change_at_least != null)
        assert.ok(owner.change >= c.expect.owner_change_at_least, `${c.why} Got ${owner.change}.`);
    } else {
      const balance = tradeBalance(c.snapshot, c.move);
      assert.ok(balance.gap >= c.expect.value_gap_at_least, `${c.why} Gap ${balance.gap}.`);
    }
  });
}

const manifest = require("../evals/decision-cases/cases/real-founder-leagues.json");
for (const c of manifest.cases) {
  const file = path.join(__dirname, "../evals/decision-cases/private", `${c.snapshot}.json`);
  test(`founder league: ${c.id}`, { skip: !fs.existsSync(file) && "private snapshot not captured here" }, () => {
    const snapshot = JSON.parse(fs.readFileSync(file, "utf8"));
    if (c.check.claim_must_beat_best_free_agent) {
      const claim = gradeMove(snapshot, c.move).owner.change;
      const free = bestFreeAgentChange(snapshot, { position: null, drop: c.move.drop });
      assert.ok(
        free.change >= claim,
        `the claim (${claim}) should not beat the best free add (${free.name}, ${free.change})`,
      );
    }
    if (c.check.max_value_gap_per_week != null) {
      const balance = tradeBalance(snapshot, c.move);
      assert.ok(balance.gap > c.check.max_value_gap_per_week, `expected a lopsided trade, gap ${balance.gap}`);
    }
    if (c.check.owner_change_at_most != null) {
      const { owner } = gradeMove(snapshot, c.move);
      assert.ok(owner.change <= c.check.owner_change_at_most, `${c.why} Got ${owner.change}.`);
    }
    if (c.check.start_must_be_projected_to_play) {
      const own = snapshot.teams.find((t) => t.own);
      const start = own.players.find((p) => p.name === c.move.start);
      const week = snapshot.weeks[0];
      assert.equal(start.projected_points_by_week[week], 0, "the case records the start as projected not to play");
    }
  });
}

// Phase 1: Omen's own Find a Trade, run on the saved league, must no longer propose a rejected trade.
const { omenTrades } = require("../evals/decision-cases/omen");
for (const c of manifest.cases.filter((x) => x.move.type === "trade" && x.verdict === "reject")) {
  const file = path.join(__dirname, "../evals/decision-cases/private", `${c.snapshot}.json`);
  test(`Omen does not propose: ${c.id}`, { skip: !fs.existsSync(file) && "private snapshot not captured here" }, () => {
    const snapshot = JSON.parse(fs.readFileSync(file, "utf8"));
    const proposed = omenTrades(snapshot).trades;
    const same = proposed.find((t) => c.move.give.includes(t.give) && c.move.receive.includes(t.receive));
    assert.equal(same, undefined, `${c.why}`);
  });
}
