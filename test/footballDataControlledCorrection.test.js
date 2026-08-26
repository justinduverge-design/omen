"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { FIXTURE_LABEL, FIXTURE_SCHEMA, mutateOneAcceptedPlayer } = require("../scripts/football-data-controlled-correction");

test("controlled correction fixture is explicit and changes one scoring-consistent accepted row", () => {
  const input = Buffer.from([
    "player_id,season,season_type,week,passing_yards,fantasy_points,fantasy_points_ppr",
    "00-001,2025,REG,1,250,10,10",
    "00-002,2025,REG,2,300,12,12",
  ].join("\n"));
  const result = mutateOneAcceptedPlayer(input);
  assert.equal(FIXTURE_SCHEMA, "omen-football-controlled-correction-rehearsal.v1");
  assert.equal(FIXTURE_LABEL, "controlled_fixture_not_upstream");
  assert.deepEqual(result.mutation, { type: "passing_yards_plus_25", season: 2025, week: 1 });
  assert.match(result.bytes.toString("utf8"), /00-001,2025,REG,1,275,11,11/);
  assert.match(result.bytes.toString("utf8"), /00-002,2025,REG,2,300,12,12/);
});

test("controlled correction fixture refuses to invent a target outside the accepted scope", () => {
  const input = Buffer.from([
    "player_id,season,season_type,week,passing_yards,fantasy_points,fantasy_points_ppr",
    "00-002,2025,REG,2,300,12,12",
  ].join("\n"));
  assert.throws(() => mutateOneAcceptedPlayer(input), /could not find an accepted passing row/);
});
