"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { canonicalLeagueContext } = require("../src/services/leagueContext");

test("canonical league context makes season instance explicit", () => {
  assert.deepEqual(canonicalLeagueContext({
    platform: "ESPN",
    leagueId: " 123 ",
    season: "2026",
    teamId: 7,
    memberId: "manager-1",
  }), {
    contract_version: "league-context.v1",
    state: "live",
    platform: "espn",
    league_id: "123",
    season: 2026,
    season_instance_key: "espn:123:2026",
    team_id: "7",
    member_id: "manager-1",
  });
});

test("incomplete context fails closed instead of inventing a season", () => {
  assert.deepEqual(canonicalLeagueContext({ platform: "sleeper", league_id: "league-1" }), {
    contract_version: "league-context.v1",
    state: "unavailable",
    reason_code: "league_context_incomplete",
  });
  assert.deepEqual(canonicalLeagueContext({ platform: "unknown", league_id: "league-1", season: 2026 }).state, "unavailable");
});
