"use strict";

const assert = require("node:assert/strict");
const { describe, test } = require("node:test");

const tradeValue = require("../src/services/tradeValue");

test("compares a one-for-one trade by replacement-level value", () => {
  const result = tradeValue.compareTrade({
    send: [{ name: "Bench RB", position: "RB", projected_points: 10 }],
    receive: [{ name: "Starter WR", position: "WR", projected_points: 14 }],
  });

  assert.equal(result.send.total_value, 3.5); // recalibrated 2026-05-13
  assert.equal(result.receive.total_value, 6); // recalibrated 2026-05-13
  assert.equal(result.net_value, 2.5); // recalibrated 2026-05-13
  assert.equal(result.verdict, "accept");
  assert.equal(result.confidence, "medium");
  assert.equal(result.scoring_format, "ppr");
  assert.equal(result.a_score, 2.5); // recalibrated 2026-05-13
  assert.equal(result.combined_score, 2.5); // recalibrated 2026-05-13
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
  assert.equal(result.send.total_value, 5.5); // recalibrated 2026-05-13
  assert.equal(result.receive.total_value, 5); // recalibrated 2026-05-13
  assert.equal(result.net_value, 0); // recalibrated 2026-05-13
  assert.equal(result.verdict, "neutral");
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
  assert.equal(outPlayer.value, -8); // recalibrated 2026-05-13
  assert.equal(questionablePlayer.adjusted_projection, 15.3);
  assert.equal(questionablePlayer.value, 7.3); // recalibrated 2026-05-13
});

test("scarcity can move a neutral net-value trade to accept for an elite TE", () => {
  const result = tradeValue.compareTrade({
    send: [{ name: "Starter RB", position: "RB", projected_points: 12.8 }],
    receive: [{ name: "Elite TE", position: "TE", projected_points: 12 }],
  });

  assert.equal(result.net_value, 1.2); // recalibrated 2026-05-13
  assert.equal(result.a_score, 1.2); // recalibrated 2026-05-13
  assert.equal(result.b_score, 1.5);
  assert.equal(result.combined_score, 2.1); // recalibrated 2026-05-13
  assert.equal(result.verdict, "accept");
  assert.equal(result.scarcity_analysis.receive[0].tier, "elite");
});

test("scarcity favors decline when equal net value sends an elite QB", () => {
  const result = tradeValue.compareTrade({
    send: [{ name: "Elite QB", position: "QB", projected_points: 25 }],
    receive: [
      { name: "Starter QB", position: "QB", projected_points: 21 },
      { name: "Starter RB", position: "RB", projected_points: 12.5 },
      { name: "Starter WR", position: "WR", projected_points: 12 },
    ],
  });

  assert.equal(result.net_value, 0); // recalibrated 2026-05-13
  assert.equal(result.b_score, -0.5);
  assert.equal(result.combined_score, -0.3); // recalibrated 2026-05-13
  assert.equal(["decline", "neutral"].includes(result.verdict), true);
});

describe("depth discount", () => {
  test("1-for-1 trades are not depth discounted", () => {
    const result = tradeValue.compareTrade({
      send: [{ name: "RB Seven", position: "RB", projected_points: 13.5 }],
      receive: [{ name: "WR Nine", position: "WR", projected_points: 17 }],
    });

    assert.equal(result.depth_discounted, false);
    assert.equal(result.send.players[0].value, 7);
    assert.equal(result.receive.players[0].value, 9);
    assert.equal(result.net_value, 2);
  });

  test("1-for-3 trades discount surplus received depth", () => {
    const result = tradeValue.compareTrade({
      send: [{ name: "RB Seven", position: "RB", projected_points: 13.5 }],
      receive: [
        { name: "RB Five", position: "RB", projected_points: 11.5 },
        { name: "WR Three", position: "WR", projected_points: 11 },
        { name: "TE One", position: "TE", projected_points: 5.5 },
      ],
    });

    assert.equal(result.depth_discounted, true);
    assert.equal(result.receive.players[0].value, 5);
    assert.equal(result.receive.players[1].value, 3);
    assert.equal(result.receive.players[2].value, 1);
    assert.equal(result.net_value, -0.25);
  });

  test("3-for-1 trades discount surplus sent depth", () => {
    const result = tradeValue.compareTrade({
      send: [
        { name: "RB Five", position: "RB", projected_points: 11.5 },
        { name: "WR Three", position: "WR", projected_points: 11 },
        { name: "TE One", position: "TE", projected_points: 5.5 },
      ],
      receive: [{ name: "RB Seven", position: "RB", projected_points: 13.5 }],
    });

    assert.equal(result.depth_discounted, true);
    assert.equal(result.send.players[0].value, 5);
    assert.equal(result.send.players[1].value, 3);
    assert.equal(result.send.players[2].value, 1);
    assert.equal(result.net_value, 0.25);
  });
});
