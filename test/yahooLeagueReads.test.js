"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { readYahooLeaguesShared, clearYahooLeagueReads } = require("../src/services/yahooLeagueReads");

test("a shared Yahoo league read is reused, and cleared when the tokens change", async () => {
  let calls = 0;
  const read = async () => {
    calls += 1;
    return [{ league_id: `account-${calls}` }];
  };
  assert.deepEqual(await readYahooLeaguesShared("u1", read), [{ league_id: "account-1" }]);
  assert.deepEqual(await readYahooLeaguesShared("u1", read), [{ league_id: "account-1" }], "reused within a minute");
  clearYahooLeagueReads("u1"); // reconnect with another Yahoo account
  assert.deepEqual(await readYahooLeaguesShared("u1", read), [{ league_id: "account-2" }]);
  assert.equal(calls, 2);
});

test("a failed shared read is not kept", async () => {
  let calls = 0;
  const flaky = async () => {
    calls += 1;
    if (calls === 1) throw new Error("yahoo down");
    return [];
  };
  await assert.rejects(readYahooLeaguesShared("u2", flaky));
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(await readYahooLeaguesShared("u2", flaky), []);
  assert.equal(calls, 2);
});
