"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  attachOmenProjectionBreakdown,
  breakdownEvidence,
  breakdownStatement,
  espnProjectionBreakdown,
  rosterProjectionBreakdowns,
  sleeperProjectionBreakdown,
  unavailableBreakdown,
} = require("../src/services/projectionBreakdown");

const PPR = { rec: 1, rec_yd: 0.1, rec_td: 6, rush_yd: 0.1, rush_td: 6, fum_lost: -2, pass_yd: 0.04, pass_td: 4, pass_int: -1 };
const HALF = { ...PPR, rec: 0.5 };

// A receiver's Sleeper stat line. pts_ppr is Sleeper's own number for it:
// 6.1 + 7.2 + 2.4 + 0.12 - 0.1 = 15.72.
const OLAVE = { rec: 6.1, rec_yd: 72, rec_td: 0.4, rec_tgt: 8.5, rush_yd: 1.2, fum_lost: 0.05, pts_ppr: 15.72, pts_half_ppr: 12.67 };

test("Sleeper: points by source under the league's scoring sum to Sleeper's projection", () => {
  const result = sleeperProjectionBreakdown({ statLine: OLAVE, scoringSettings: PPR });

  assert.equal(result.status, "available");
  assert.equal(result.label, "Projected");
  assert.equal(result.provider, "sleeper");
  assert.equal(result.provider_points, 15.72);
  assert.equal(result.total, 15.72);
  // Largest sources first; targets are tracked but not scored, so they are not a source.
  assert.deepEqual(result.lines.map((line) => [line.stat, line.quantity, line.points_per, line.points]), [
    ["rec_yd", 72, 0.1, 7.2],
    ["rec", 6.1, 1, 6.1],
    ["rec_td", 0.4, 6, 2.4],
  ]);
  // Small sources are folded into "other", never dropped: the parts still add up.
  assert.equal(result.other_points, 0.02);
  const parts = result.lines.reduce((sum, line) => sum + line.points, 0) + result.other_points;
  assert.ok(Math.abs(parts - result.provider_points) < 0.011);
});

test("Sleeper: a stat line that does not add up to the provider's number is unavailable, not shown", () => {
  // A half-PPR league: Sleeper's projected number is full PPR, so the league-scored parts
  // (12.67) cannot add up to it. Omen says so instead of showing a split that misleads.
  const result = sleeperProjectionBreakdown({ statLine: OLAVE, scoringSettings: HALF });

  assert.equal(result.status, "unavailable");
  assert.equal(result.reason_code, "does_not_reconcile");
  assert.equal(result.lines, undefined);
  assert.match(result.reason, /does not add up to Sleeper's projection/);
});

test("Sleeper: an explicit provider number is the one reconciled against", () => {
  const result = sleeperProjectionBreakdown({ statLine: OLAVE, scoringSettings: PPR, providerPoints: 15.7 });
  assert.equal(result.status, "available");
  assert.equal(result.provider_points, 15.7);

  const off = sleeperProjectionBreakdown({ statLine: OLAVE, scoringSettings: PPR, providerPoints: 14 });
  assert.equal(off.status, "unavailable");
  assert.equal(off.reason_code, "does_not_reconcile");
});

test("Sleeper: a missing stat line, missing scoring, or missing projection is named", () => {
  assert.equal(sleeperProjectionBreakdown({ statLine: null, scoringSettings: PPR }).reason_code, "no_stat_line");
  assert.equal(sleeperProjectionBreakdown({ statLine: OLAVE, scoringSettings: null }).reason_code, "no_league_scoring");
  assert.equal(sleeperProjectionBreakdown({ statLine: OLAVE, scoringSettings: {} }).reason_code, "no_league_scoring");
  const { pts_ppr: _drop, ...noPoints } = OLAVE;
  assert.equal(sleeperProjectionBreakdown({ statLine: noPoints, scoringSettings: PPR }).reason_code, "no_projection");
});

test("ESPN: the projected stat line under the league's own stat-id rules sums to appliedTotal", () => {
  const rules = {
    byStatId: new Map([
      ["53", { points: 1, overrides: {} }],
      ["42", { points: 0.1, overrides: {} }],
      ["43", { points: 6, overrides: {} }],
      ["58", { points: 0, overrides: {} }],
      // An id Omen cannot name still scores: it is shown as "other", never hidden.
      ["212", { points: 0.5, overrides: {} }],
    ]),
    ruleCount: 5,
  };
  const projection = {
    position_id: 3,
    applied_total: 16.2,
    stats: { 53: 6.1, 42: 72, 43: 0.4, 58: 8.5, 212: 1 },
  };
  const result = espnProjectionBreakdown({ projection, rules });

  assert.equal(result.status, "available");
  assert.equal(result.provider, "espn");
  assert.equal(result.provider_points, 16.2);
  assert.deepEqual(result.lines.map((line) => line.stat), ["42", "53", "43"]);
  assert.equal(result.other_points, 0.5);
});

test("ESPN: a per-position override is honoured, and a mismatch is unavailable", () => {
  const rules = { byStatId: new Map([["53", { points: 1, overrides: { 4: 1.5 } }]]), ruleCount: 1 };
  const tightEnd = espnProjectionBreakdown({ projection: { position_id: 4, applied_total: 7.5, stats: { 53: 5 } }, rules });
  assert.equal(tightEnd.status, "available");
  assert.equal(tightEnd.lines[0].points_per, 1.5);

  const wrong = espnProjectionBreakdown({ projection: { position_id: 3, applied_total: 7.5, stats: { 53: 5 } }, rules });
  assert.equal(wrong.status, "unavailable");
  assert.equal(wrong.reason_code, "does_not_reconcile");

  assert.equal(espnProjectionBreakdown({ projection: null, rules }).reason_code, "no_stat_line");
  assert.equal(espnProjectionBreakdown({ projection: { stats: { 53: 5 }, applied_total: 5 }, rules: null }).reason_code, "no_league_scoring");
});

test("the statement shows each source as quantity × rule = points, labelled with the provider", () => {
  const result = sleeperProjectionBreakdown({ statLine: OLAVE, scoringSettings: PPR });
  assert.equal(
    breakdownStatement("Chris Olave", result),
    "Chris Olave's 15.72 from Sleeper: 72 rec yds × 0.1 = 7.2; 6.1 receptions × 1 = 6.1; 0.4 rec TD × 6 = 2.4.",
  );
});

test("evidence: one projected line per available player, one shared line for a shared gap", () => {
  const available = sleeperProjectionBreakdown({ statLine: OLAVE, scoringSettings: PPR });
  const yahoo = unavailableBreakdown("yahoo", "no_stat_line");
  const evidence = breakdownEvidence([
    { name: "Chris Olave", breakdown: available },
    { name: "DeVonta Smith", breakdown: yahoo },
  ]);
  assert.deepEqual(evidence.map((line) => [line.category, line.kind]), [
    ["points_breakdown", "projected"],
    ["points_breakdown", "limitation"],
  ]);
  assert.match(evidence[1].statement, /^Points breakdown unavailable for DeVonta Smith: /);

  const shared = breakdownEvidence([
    { name: "A", breakdown: unavailableBreakdown("yahoo", "no_stat_line") },
    { name: "B", breakdown: unavailableBreakdown("yahoo", "no_stat_line") },
  ]);
  assert.equal(shared.length, 1);
  assert.match(shared[0].statement, /^Points breakdown unavailable: Yahoo does not give Omen a projected stat line\.$/);

  // No breakdown computed at all (a read failed) degrades to no line.
  assert.deepEqual(breakdownEvidence([{ name: "A", breakdown: null }]), []);
});

test("no breakdown line claims a cause or a forecast", () => {
  const lines = breakdownEvidence([
    { name: "A", breakdown: sleeperProjectionBreakdown({ statLine: OLAVE, scoringSettings: PPR }) },
    { name: "B", breakdown: sleeperProjectionBreakdown({ statLine: OLAVE, scoringSettings: HALF }) },
    { name: "C", breakdown: unavailableBreakdown("yahoo", "no_stat_line") },
    { name: "D", breakdown: sleeperProjectionBreakdown({ statLine: null, scoringSettings: PPR }) },
    { name: "E", breakdown: sleeperProjectionBreakdown({ statLine: OLAVE, scoringSettings: null }) },
  ]);
  for (const line of lines) {
    assert.doesNotMatch(line.statement, /\b(because|will|should)\b/i, line.statement);
  }
});

function omenResponse(platform, playerId) {
  return {
    state: "success",
    platform: { name: platform },
    league: { id: "L1", season: 2026, week: 5 },
    recommendation: { primary_player: { id: playerId, name: "Chris Olave" } },
  };
}

test("Omen call: a Sleeper primary player gets a projection_breakdown with its statement", async () => {
  const response = omenResponse("sleeper", "sleeper:4046");
  const calls = [];
  await attachOmenProjectionBreakdown({
    response,
    loadSleeperInputs: async (input) => {
      calls.push(input);
      return { statLines: { 4046: OLAVE }, scoringSettings: PPR };
    },
  });

  assert.deepEqual(calls, [{ leagueId: "L1", season: 2026, week: 5 }]);
  assert.equal(response.projection_breakdown.status, "available");
  assert.equal(response.projection_breakdown.label, "Projected");
  assert.equal(response.projection_breakdown.player_id, "sleeper:4046");
  assert.equal(
    response.projection_breakdown.statement,
    "Chris Olave's 15.72 from Sleeper: 72 rec yds × 0.1 = 7.2; 6.1 receptions × 1 = 6.1; 0.4 rec TD × 6 = 2.4.",
  );
});

test("Omen call: other providers are named unavailable without a provider read", async () => {
  const loadSleeperInputs = async () => { throw new Error("must not be called"); };
  const yahoo = omenResponse("yahoo", "yahoo:1");
  await attachOmenProjectionBreakdown({ response: yahoo, loadSleeperInputs });
  assert.equal(yahoo.projection_breakdown.status, "unavailable");
  assert.equal(yahoo.projection_breakdown.statement, "Points breakdown unavailable: Yahoo does not give Omen a projected stat line.");

  const espn = omenResponse("espn", "espn:1");
  await attachOmenProjectionBreakdown({ response: espn, loadSleeperInputs });
  assert.equal(espn.projection_breakdown.reason_code, "not_read_here");

  const empty = { state: "empty", recommendation: null };
  await attachOmenProjectionBreakdown({ response: empty, loadSleeperInputs });
  assert.equal("projection_breakdown" in empty, false);
});

test("rosterProjectionBreakdowns keys each player's breakdown by player_key per provider", () => {
  const roster = { slots: {
    starters: [{ player_key: "sleeper:1", projected_points: 15.72 }],
    bench: [{ player_key: "sleeper:2", projected_points: 3 }],
  } };
  const sleeper = rosterProjectionBreakdowns({
    platform: "sleeper", roster, sleeper: { statLines: { 1: OLAVE }, scoringSettings: PPR },
  });
  assert.equal(sleeper.get("sleeper:1").status, "available");
  assert.equal(sleeper.get("sleeper:2").reason_code, "no_stat_line");

  const yahoo = rosterProjectionBreakdowns({ platform: "yahoo", roster: { slots: { starters: [{ player_key: "y:1" }], bench: [] } } });
  assert.equal(yahoo.get("y:1").reason_code, "no_stat_line");
  assert.equal(yahoo.get("y:1").provider, "yahoo");
});
