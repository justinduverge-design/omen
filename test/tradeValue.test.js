"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const tradeValue = require("../src/services/tradeValue");

test("compares a one-for-one trade by replacement-level value", () => {
  const result = tradeValue.compareTrade({
    send: [{ name: "Bench RB", position: "RB", projected_points: 10 }],
    receive: [{ name: "Starter WR", position: "WR", projected_points: 14 }],
  });

  assert.equal(result.send.total_value, 2);
  assert.equal(result.receive.total_value, 6);
  assert.equal(result.net_value, 4);
  assert.equal(result.verdict, "accept");
  assert.equal(result.confidence, "medium");
});

test("supports uneven player-count trades without hidden roster assumptions", () => {
  const result = tradeValue.compareTrade({
    send: [
      { name: "RB A", position: "RB", projected_points: 11 },
      { name: "WR A", position: "WR", projected_points: 9 },
    ],
    receive: [{ name: "QB A", position: "QB", projected_points: 20 }],
  });

  assert.equal(result.send.player_count, 2);
  assert.equal(result.receive.player_count, 1);
  assert.equal(result.send.total_value, 4);
  assert.equal(result.receive.total_value, 6);
  assert.equal(result.net_value, 2);
  assert.equal(result.verdict, "accept");
});

test("marks missing projections as low confidence instead of inventing value", () => {
  const result = tradeValue.compareTrade({
    send: [{ name: "Known WR", position: "WR", projected_points: 12 }],
    receive: [{ name: "Unknown RB", position: "RB" }],
  });

  assert.equal(result.receive.players[0].projected_points, null);
  assert.equal(result.receive.players[0].notes.includes("missing_projection"), true);
  assert.equal(result.confidence, "low");
  assert.equal(result.verdict, "decline");
});

test("uses injury/status-adjusted projection through the optimizer baseline", () => {
  const outPlayer = tradeValue.playerValue({
    name: "Out WR",
    position: "WR",
    projected_points: 18,
    status: "OUT",
  });

  const questionablePlayer = tradeValue.playerValue({
    name: "Questionable WR",
    position: "WR",
    projected_points: 18,
    status: "Q",
  });

  assert.equal(outPlayer.adjusted_projection, 0);
  assert.equal(outPlayer.value, -8);
  assert.equal(questionablePlayer.adjusted_projection, 15.3);
  assert.equal(questionablePlayer.value, 7.3);
});
