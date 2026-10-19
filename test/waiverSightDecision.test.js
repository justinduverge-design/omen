"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildWaiverAnalysis, decisionValue, SIGHT_WEIGHT } = require("../src/services/waiverAnalysis");

const p = (key, position, projected, extra = {}) => ({
  player_key: `sleeper:${key}`,
  name: key,
  position,
  projected_points: projected,
  ...extra,
});
const sight = (points, grade = 50, confidence = "normal") => ({ sight_points: points, grade, confidence });

test("decision value blends provider with Sight, ignores low confidence, fills a missing projection", () => {
  assert.equal(decisionValue(p("a", "WR", 10)), 10);
  assert.equal(decisionValue(p("a", "WR", 10, { sight: sight(20) })), 10 + SIGHT_WEIGHT * 10);
  assert.equal(decisionValue(p("k", "K", 8, { sight: sight(2, 50, "low") })), 8);
  assert.equal(decisionValue(p("y", "WR", null, { sight: sight(12) })), 12);
  assert.equal(decisionValue(p("n", "WR", null)), null);
});

test("Sight can change which add wins and is named in the evidence", () => {
  const roster = {
    slots: {
      starters: [p("s1", "WR", 8, { selected_position: "WR" })],
      bench: [p("b1", "WR", 3), p("b2", "RB", 4), p("b3", "RB", 5)],
    },
  };
  const pool = [p("x", "WR", 12, { sight: sight(6) }), p("z", "WR", 11, { sight: sight(18) })];
  const out = buildWaiverAnalysis({ roster, pool, platform: "sleeper", leagueId: "1", availabilityConfirmed: true });
  assert.equal(out.best_move.add.player_key, "sleeper:z");
  assert.ok(out.evidence.some((e) => e.category === "omen_read"));
});

test("a season-strong bench player is not the drop because of one low week", () => {
  const roster = {
    slots: {
      starters: [p("s1", "WR", 8, { selected_position: "WR" })],
      bench: [p("star", "WR", 2, { sight: sight(3, 85) }), p("b1", "WR", 4), p("b2", "WR", 5)],
    },
  };
  const out = buildWaiverAnalysis({
    roster,
    pool: [p("x", "WR", 14)],
    platform: "sleeper",
    leagueId: "1",
    availabilityConfirmed: true,
  });
  assert.equal(out.best_move.drop.player_key, "sleeper:b1");
});

test("locked players are never swapped, displaced or dropped", () => {
  const { evaluateLineup } = require("../src/services/optimizer");
  const starter = p("s", "WR", 2, { selected_position: "WR", eligible_positions: ["WR"], lineup_locked: true });
  const bench = p("b", "WR", 15, { selected_position: "BN", eligible_positions: ["WR"] });
  assert.equal(evaluateLineup({ slots: { starters: [starter], bench: [bench] } }).length, 0);
  const openStarter = { ...starter, lineup_locked: false };
  assert.equal(
    evaluateLineup({ slots: { starters: [openStarter], bench: [{ ...bench, is_editable: false }] } }).length,
    0,
  );
  assert.equal(evaluateLineup({ slots: { starters: [openStarter], bench: [bench] } }).length, 1);

  const roster = { slots: { starters: [starter], bench: [] } };
  const out = buildWaiverAnalysis({
    roster,
    pool: [p("x", "WR", 14)],
    platform: "espn",
    leagueId: "1",
    availabilityConfirmed: true,
  });
  assert.equal(out.best_move, null);
});

test("ESPN market movement on the add is named as a signal, not a verdict", () => {
  const roster = {
    slots: { starters: [p("s1", "WR", 8, { selected_position: "WR" })], bench: [p("b1", "WR", 3), p("b2", "WR", 4)] },
  };
  const pool = [p("x", "WR", 14, { owned_pct: 41.2, owned_pct_change: 18.5 })];
  const out = buildWaiverAnalysis({ roster, pool, platform: "espn", leagueId: "1", availabilityConfirmed: true });
  const row = out.evidence.find((e) => e.category === "market_signal");
  assert.match(row.statement, /41\.2% of ESPN leagues, up 18\.5/);
});

test("Sleeper's injury status fills in only when the league provider reports none", () => {
  const { effectiveStatus } = require("../src/services/sightDecision");
  const { evaluateLineup } = require("../src/services/optimizer");
  assert.equal(effectiveStatus({ status: "Q", sight: { injury: { status: "Out" } } }), "Q");
  assert.equal(effectiveStatus({ status: null, sight: { injury: { status: "Out" } } }), "OUT");
  assert.equal(effectiveStatus({ status: "", sight: { injury: { status: "NA" } } }), null);
  const starter = p("s", "WR", 12, {
    selected_position: "WR",
    eligible_positions: ["WR"],
    status: null,
    sight: { injury: { status: "IR" } },
  });
  const bench = p("b", "WR", 6, { selected_position: "BN", eligible_positions: ["WR"] });
  assert.equal(evaluateLineup({ slots: { starters: [starter], bench: [bench] } })[0]?.to.player_key, "sleeper:b");
});

test("League GM: the last cover for a starter's upcoming bye is not the drop, and an add that covers it says so", () => {
  const starter = p("rb1", "RB", 15, {
    selected_position: "RB",
    sight: { sight_points: 15, grade: 60, confidence: "normal", bye_week: 8 },
  });
  const wrStarter = p("wr1", "WR", 12, { selected_position: "WR" });
  const roster = {
    slots: { starters: [starter, wrStarter], bench: [p("rbBack", "RB", 2), p("wrA", "WR", 3), p("wrB", "WR", 4)] },
  };
  const out = buildWaiverAnalysis({
    roster,
    pool: [p("wrX", "WR", 16)],
    platform: "sleeper",
    leagueId: "1",
    week: 7,
    availabilityConfirmed: true,
  });
  assert.notEqual(out.best_move.drop.player_key, "sleeper:rbBack");

  const rbAdd = buildWaiverAnalysis({
    roster: { slots: { starters: [{ ...starter, projected_points: 3 }, wrStarter], bench: roster.slots.bench } },
    pool: [p("rbX", "RB", 14)],
    platform: "sleeper",
    leagueId: "1",
    week: 7,
    availabilityConfirmed: true,
  });
  assert.ok(rbAdd.evidence.some((e) => e.category === "upcoming_need" && /week 8 bye/.test(e.statement)));
});
