"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { weeklyLines, toDate, pointsAllowedTier, fgPoints } = require("../src/services/footballWarehouse/kdefMetric");

test("standard kicker and defense scoring", () => {
  assert.deepEqual([fgPoints(25), fgPoints(44), fgPoints(55)], [3, 4, 5]);
  assert.deepEqual([0, 3, 10, 17, 24, 30, 41].map(pointsAllowedTier), [10, 7, 4, 1, 0, -1, -4]);
  const kickers = new Map([["00-k", "omen:player:k"]]);
  const plays = [
    { week: 1, posteamId: "omen:team:buf", defteamId: "omen:team:mia", kickerGsis: "00-k", fieldGoalAttempt: "1", fieldGoalResult: "made", kickDistance: "52" },
    { week: 1, posteamId: "omen:team:buf", defteamId: "omen:team:mia", kickerGsis: "00-k", fieldGoalAttempt: "1", fieldGoalResult: "missed", kickDistance: "48" },
    { week: 1, posteamId: "omen:team:buf", defteamId: "omen:team:mia", kickerGsis: "00-k", extraPointAttempt: "1", extraPointResult: "good" },
    { week: 1, posteamId: "omen:team:mia", defteamId: "omen:team:buf", sack: "1", qbDropback: "1", playType: "pass", epa: "-2" },
    { week: 1, posteamId: "omen:team:mia", defteamId: "omen:team:buf", interception: "1", touchdown: "1", tdTeam: "BUF", playType: "pass", epa: "-6" },
  ];
  const games = [{ week: 1, homeTeamId: "omen:team:buf", awayTeamId: "omen:team:mia", homeScore: 24, awayScore: 3 }];
  const lines = weeklyLines(plays, games, kickers);
  assert.equal(lines.kickers.get("omen:player:k").get(1).fp, 5 - 1 + 1);
  // BUF defense: sack 1 + INT 2 + TD 6 + 3 points allowed (7)
  assert.equal(lines.defenses.get("omen:team:buf").get(1).fp, 1 + 2 + 6 + 7);
  const td = toDate(lines, 1);
  assert.equal(td.defenses.get("omen:team:buf").takeaways, 1);
  assert.equal(td.kickers.get("omen:player:k").fga, 2);
});
