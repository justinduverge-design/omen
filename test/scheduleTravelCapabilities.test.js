"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const nflSchedule = require("../src/services/nflSchedule");
const { resolveScheduleTravelCapabilities } = require("../src/services/scheduleTravelCapabilities");

const IN_SEASON = new Date("2026-09-10T16:00:00Z");
const OFF_SEASON = new Date("2026-08-20T16:00:00Z");
const originalGetGameInfoDetails = nflSchedule.getGameInfoDetails;

function availableGame(overrides = {}) {
  return {
    status: "available",
    observed_at: "2026-09-10T16:00:00.000Z",
    fresh_until: "2026-09-10T20:00:00.000Z",
    game: {
      kickoff_utc: "2026-09-10T17:00:00.000Z",
      kickoff_local: "1:00 PM ET",
      tv_slate: "Early 1PM",
      home_away: "Away",
      opponent_abbr: "BAL",
      opponent_name: "Baltimore Ravens",
      travel_miles: 951,
      ...overrides,
    },
  };
}

test.afterEach(() => {
  nflSchedule.getGameInfoDetails = originalGetGameInfoDetails;
});

test("schedule capabilities preserve verified game facts separately from inferred TV window and modelled travel", async () => {
  nflSchedule.getGameInfoDetails = async (team) => {
    assert.equal(team, "KC");
    return availableGame();
  };

  const result = await resolveScheduleTravelCapabilities({ nflTeam: "KC", now: IN_SEASON });
  const kickoff = result.game_time_tv;
  const travel = result.travel_home_away;

  assert.equal(kickoff.status, "live");
  assert.equal(kickoff.resolution, "available");
  assert.equal(kickoff.source, "espn_scoreboard");
  assert.equal(kickoff.used, false);
  assert.equal(kickoff.observed_at, "2026-09-10T16:00:00.000Z");
  assert.equal(kickoff.fresh_until, "2026-09-10T20:00:00.000Z");
  assert.deepEqual(kickoff.facts.map((fact) => [fact.name, fact.kind]), [
    ["kickoff", "verified"],
    ["opponent", "verified"],
    ["home_away", "verified"],
    ["kickoff_window", "inference"],
  ]);
  assert.match(kickoff.message, /No broadcaster is claimed/i);

  assert.equal(travel.status, "live");
  assert.equal(travel.source, "omen_stadium_distance");
  assert.equal(travel.facts.at(-1).kind, "model");
  assert.match(travel.facts.at(-1).statement, /straight-line miles/);
});

test("an away game with unknown stadium coordinates does not turn distance into zero", async () => {
  nflSchedule.getGameInfoDetails = async () => availableGame({ travel_miles: null });

  const result = await resolveScheduleTravelCapabilities({ nflTeam: "KC", now: IN_SEASON });
  const distance = result.travel_home_away.facts.at(-1);
  assert.equal(distance.value, null);
  assert.match(distance.statement, /cannot estimate travel distance/i);
  assert.doesNotMatch(result.travel_home_away.message, /0 (?:mile|mi)/i);
});

test("missing normalized team is insufficient context and does not query a schedule source", async () => {
  let called = false;
  nflSchedule.getGameInfoDetails = async () => { called = true; return availableGame(); };

  const result = await resolveScheduleTravelCapabilities({ nflTeam: "not an nfl team", now: IN_SEASON });
  assert.equal(called, false);
  assert.equal(result.game_time_tv.status, "unavailable");
  assert.equal(result.game_time_tv.resolution, "insufficient_context");
  assert.equal(result.travel_home_away.resolution, "insufficient_context");
});

test("off-season is not applicable and does not query the current scoreboard", async () => {
  let called = false;
  nflSchedule.getGameInfoDetails = async () => { called = true; return availableGame(); };

  const result = await resolveScheduleTravelCapabilities({ nflTeam: "KC", now: OFF_SEASON });
  assert.equal(called, false);
  assert.equal(result.game_time_tv.resolution, "not_applicable");
  assert.equal(result.travel_home_away.resolution, "not_applicable");
});

test("a source outage remains failed instead of looking like a normal bye", async () => {
  nflSchedule.getGameInfoDetails = async () => ({ status: "failed", reason: "scoreboard_request_failed" });

  const result = await resolveScheduleTravelCapabilities({ nflTeam: "KC", now: IN_SEASON });
  assert.equal(result.game_time_tv.status, "unavailable");
  assert.equal(result.game_time_tv.resolution, "failed");
  assert.match(result.game_time_tv.message, /Try again shortly/);
});

test("no scheduled game is unavailable rather than a source failure", async () => {
  nflSchedule.getGameInfoDetails = async () => ({
    status: "unavailable",
    reason: "team_has_no_game_on_scoreboard",
    observed_at: "2026-09-10T16:00:00.000Z",
    fresh_until: "2026-09-10T20:00:00.000Z",
  });

  const result = await resolveScheduleTravelCapabilities({ nflTeam: "KC", now: IN_SEASON });
  assert.equal(result.game_time_tv.resolution, "unavailable");
  assert.equal(result.travel_home_away.resolution, "unavailable");
  assert.equal(result.game_time_tv.observed_at, "2026-09-10T16:00:00.000Z");
});
