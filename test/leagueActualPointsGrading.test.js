"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");
const cron = require("../src/omen_tuesday_cron");
const { yahooPointsFromResponse, sleeperPoints } = require("../src/services/leagueActualPoints");

const decision = (over = {}) => ({
  id: "d1", user_id: "u1", league_id: "lg", season: 2026, week: 5, call_type: "start_sit",
  recommendation: { primary_player: { id: "sleeper:1", name: "Starter" }, comparison_player: { id: "sleeper:2", name: "Benched" } },
  ...over,
});
const supabase = {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { provider: "sleeper", provider_league_id: "L" } }) }) }) }),
};

test("a call is graded on the points the league itself scored, and that grade is exact", async () => {
  const leagueActualPoints = { sleeperPoints: async () => new Map([["1", 14.3], ["2", 9.1]]) };
  const found = await cron.resolveLeagueOutcomes(supabase, [{ decision: decision() }], { leagueActualPoints });
  const graded = cron.gradeFromLeaguePoints(decision(), found.get("d1"));
  assert.equal(graded.result, "win");
  assert.equal(graded.provenance, "verified");
  assert.equal(graded.reconciliation_state, "exact");
  assert.match(graded.summary, /Started Starter: 14\.3; sat Benched: 9\.1 \(your league's scoring\)\. The call gained 5\.2\./);
});

test("a player the league did not report means no league grade (falls back), never a 0", async () => {
  const leagueActualPoints = { sleeperPoints: async () => new Map([["1", 14.3]]) };
  const found = await cron.resolveLeagueOutcomes(supabase, [{ decision: decision() }], { leagueActualPoints });
  assert.equal(cron.gradeFromLeaguePoints(decision(), found.get("d1")), null);
});

test("a provider failure never fails grading", async () => {
  const leagueActualPoints = { sleeperPoints: async () => { throw new Error("sleeper down"); } };
  const found = await cron.resolveLeagueOutcomes(supabase, [{ decision: decision() }], { leagueActualPoints });
  assert.equal(found.size, 0);
});

test("Sleeper players_points and Yahoo player_points are read as scored", async () => {
  const s = await sleeperPoints({ leagueId: "L", week: 5, fetchMatchups: async () => [{ players_points: { 1: 14.3, 2: 0 } }] });
  assert.deepEqual([...s], [["1", 14.3], ["2", 0]]);
  const y = yahooPointsFromResponse({ fantasy_content: { league: [{}, { players: { count: 1, 0: { player: [[{ player_key: "470.p.30123" }], { player_points: { coverage_type: "week", week: "5", total: "11.6" } }] } } }] } });
  assert.deepEqual([...y], [["470.p.30123", 11.6]]);
});
