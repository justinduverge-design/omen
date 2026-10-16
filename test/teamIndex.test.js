"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { PROVIDER_TEAM_NUMBERS, abbreviationForProviderNumber, TEAMS } = require("../src/services/footballIntelligence/nflTeams");

test("every team has one provider number; ESPN and Yahoo resolve the same way", () => {
  assert.deepEqual(Object.keys(PROVIDER_TEAM_NUMBERS).sort(), Object.keys(TEAMS).sort());
  assert.equal(new Set(Object.values(PROVIDER_TEAM_NUMBERS)).size, 32);
  assert.equal(abbreviationForProviderNumber(12), "KC");
  assert.equal(abbreviationForProviderNumber("33"), "BAL");
  assert.equal(abbreviationForProviderNumber(31), null);
});

test("the team-index migration agrees with the code's team numbers, for teams and defenses", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../warehouse/migrations/0011_team_index.sql"), "utf8");
  for (const [abbr, n] of Object.entries(PROVIDER_TEAM_NUMBERS)) {
    const id = `omen:team:${abbr.toLowerCase()}`;
    assert.match(sql, new RegExp(`\\('espn', '${n}', '${id}', 'team'\\)`));
    assert.match(sql, new RegExp(`\\('espn', '${-16000 - n}', '${id}', 'defense'\\)`));
    assert.match(sql, new RegExp(`\\('yahoo', '${100000 + n}', '${id}', 'defense'\\)`));
  }
  assert.match(sql, /\('sleeper', 'LAR', 'omen:team:la', 'defense'\)/);
});

test("ESPN roster players carry their NFL team from proTeamId", () => {
  const { leagueRostersFromEspnSchedule } = require("../src/adapters/espn");
  const data = { teams: [{ id: 1 }], schedule: [{ matchupPeriodId: 5, home: { teamId: 1, rosterForCurrentScoringPeriod: { entries: [
    { playerId: 7, lineupSlotId: 4, playerPoolEntry: { player: { id: 7, fullName: "W R", defaultPositionId: 3, proTeamId: 16 } } },
  ] } } }] };
  assert.equal(leagueRostersFromEspnSchedule(data, 5).teams[0].players[0].team, "MIN");
});
