"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("module");

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === "@upstash/redis") return { Redis: class Redis {} };
  if (request === "../config" && parent?.filename?.endsWith("/adapters/espn.js")) {
    return { redisUrl: null, redisToken: null };
  }
  if (request === "../middleware/logging") return { logger: { info() {}, warn() {}, error() {} } };
  if (request === "../middleware/providerErrors") return { captureProviderError() {} };
  return originalLoad.call(this, request, parent, isMain);
};
const adapter = require("../src/adapters/espn");
Module._load = originalLoad;

test("leagueWeekFromEspnData keeps every matchup and no credential material", () => {
  const data = {
    teams: [
      { id: 1, location: "Alpha", nickname: "A" },
      { id: 2, location: "Beta", nickname: "B" },
      { id: 3, location: "Gamma", nickname: "C" },
      { id: 4, location: "Delta", nickname: "D" },
    ],
    schedule: [
      { id: 10, matchupPeriodId: 1, winner: "HOME", home: { teamId: 1, totalPoints: 120 }, away: { teamId: 2, totalPoints: 110 } },
      { id: 11, matchupPeriodId: 1, winner: "AWAY", home: { teamId: 3, totalPoints: 99 }, away: { teamId: 4, totalPoints: 101 } },
      { id: 12, matchupPeriodId: 2, winner: "UNDECIDED", home: { teamId: 1 }, away: { teamId: 4 } },
    ],
  };
  const rows = adapter.leagueWeekFromEspnData(data, { leagueId: "13338821", week: 1 });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => r.winner_team_id), ["1", "4"]);
  assert.deepEqual(rows.map((r) => r.status), ["final", "final"]);
  assert.equal(JSON.stringify(rows).includes("espn_s2"), false);
  assert.equal(JSON.stringify(rows).includes("SWID"), false);
});
