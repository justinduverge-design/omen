"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { scheduleEspnLateLeagueSync } = require("../src/services/espnLateLeagueSync");

test("late ESPN leagues are followed by bounded background checks and stop at the provider count", async () => {
  const callbacks = [];
  const writes = [];
  let read = 0;
  scheduleEspnLateLeagueSync({
    userId: "u1",
    connectionId: "c1",
    season: 2026,
    delays: [1, 2, 3],
    schedule: (callback) => { callbacks.push(callback); return { unref() {} }; },
    fetchDirectory: async () => {
      read += 1;
      return read === 1
        ? { leagues: [{ league_id: "1" }], espn_nfl_league_count: 2 }
        : { leagues: [{ league_id: "1" }, { league_id: "2", team_id: "unsafe-entry-id" }], espn_nfl_league_count: 2 };
    },
    syncMemberships: async (options) => writes.push(options),
  });

  await callbacks[0]();
  await callbacks[1]();
  await callbacks[2]();
  assert.equal(read, 2);
  assert.deepEqual(writes.at(-1).leagues, [
    { league_id: "1", team_id: null, team_name: null },
    { league_id: "2", team_id: null, team_name: null },
  ]);
  assert.equal(writes.at(-1).source, "connect");
});

test("late ESPN checks never throw into the server and never log credential material", async () => {
  const callbacks = [];
  const warnings = [];
  scheduleEspnLateLeagueSync({
    userId: "u1",
    delays: [1],
    schedule: (callback) => { callbacks.push(callback); return null; },
    fetchDirectory: async () => { const error = new Error("secret cookie value"); error.status = 503; throw error; },
    syncMemberships: async () => assert.fail("must not write after a failed discovery"),
    log: { warn: (...args) => warnings.push(args) },
  });
  await callbacks[0]();
  assert.deepEqual(warnings, [["ESPN late league sync failed", { http_status: 503 }]]);
});
