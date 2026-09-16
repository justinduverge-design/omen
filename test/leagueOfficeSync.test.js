"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeEspnWeekMatchups } = require("../src/services/leagueOfficeSync");

test("normalizes every ESPN matchup in the requested week without credentials or raw payload storage", () => {
  const data = {
    members: [
      { id: "u1", displayName: "Ivan" },
      { id: "u2", displayName: "Freddy" },
      { id: "u3", displayName: "Justin" },
      { id: "u4", displayName: "Bry" },
    ],
    teams: [
      { id: 1, location: "Night", nickname: "Kings", owners: ["u1"] },
      { id: 2, location: "Champ", nickname: "Squad", owners: ["u2"] },
      { id: 3, location: "Titans", nickname: "Slopsilonia", owners: ["u3"] },
      { id: 4, location: "Borough", nickname: "Boys", owners: ["u4"] },
    ],
    schedule: [
      { id: 10, matchupPeriodId: 2, winner: "HOME", home: { teamId: 1, totalPoints: 120.4, totalProjectedPoints: 118.2 }, away: { teamId: 2, totalPoints: 110.1, totalProjectedPoints: 113.6 } },
      { id: 11, matchupPeriodId: 2, winner: "AWAY", home: { teamId: 3, totalPoints: 99.5, totalProjectedPoints: 104.5 }, away: { teamId: 4, totalPoints: 102.7, totalProjectedPoints: 101.2 } },
      { id: 12, matchupPeriodId: 3, winner: "UNDECIDED", home: { teamId: 1, totalPoints: 0 }, away: { teamId: 3, totalPoints: 0 } },
    ],
  };

  const rows = normalizeEspnWeekMatchups(data, { leagueId: "13338821", season: 2026, week: 2 });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    platform: "espn",
    league_id: "13338821",
    season: 2026,
    week: 2,
    game_id: "10",
    home_team_id: "1",
    home_team_name: "Night Kings",
    home_owner_name: "Ivan",
    home_score: 120.4,
    home_projected: 118.2,
    away_team_id: "2",
    away_team_name: "Champ Squad",
    away_owner_name: "Freddy",
    away_score: 110.1,
    away_projected: 113.6,
    status: "final",
    winner_team_id: "1",
    source_verified: true,
    synced_at: rows[0].synced_at,
  });
  assert.equal(rows[1].winner_team_id, "4");
  assert.equal(rows[1].away_owner_name, "Bry");
  assert.equal(rows.some((row) => Object.hasOwn(row, "espn_s2") || Object.hasOwn(row, "swid")), false);
});
