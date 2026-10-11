"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
process.env.LOG_LEVEL ||= "error";

const test = require("node:test");
const assert = require("node:assert/strict");

const { playoffTeamCountFromEspnData } = require("../src/adapters/espn");
const YahooClient = require("../src/services/yahoo");

test("ESPN: playoffTeamCount is read from mSettings scheduleSettings", () => {
  assert.equal(playoffTeamCountFromEspnData({ settings: { scheduleSettings: { playoffTeamCount: 6 } } }), 6);
  assert.equal(playoffTeamCountFromEspnData({ settings: { scheduleSettings: { playoffTeamCount: "4" } } }), 4);
});

test("ESPN: absent, zero, fractional or junk counts read as not known", () => {
  for (const bad of [undefined, null, "", 0, -1, 2.5, "six", NaN]) {
    assert.equal(playoffTeamCountFromEspnData({ settings: { scheduleSettings: { playoffTeamCount: bad } } }), null);
  }
  assert.equal(playoffTeamCountFromEspnData({}), null);
  assert.equal(playoffTeamCountFromEspnData(null), null);
});

function yahooWith(leagueSettings, { fail = false } = {}) {
  const client = new YahooClient("token");
  client.getLeagueSettings = async () => {
    if (fail) throw new Error("Yahoo API error: 403");
    return leagueSettings;
  };
  return client;
}

test("Yahoo: num_playoff_teams from the verified league[1].settings[0] shape", async () => {
  const league = [{ league_key: "nfl.l.1" }, { settings: [{ num_playoff_teams: "6", uses_faab: "0" }] }];
  assert.equal(await yahooWith(league).getPlayoffTeamCount("nfl.l.1"), 6);
});

test("Yahoo: settings container as a flat object or an array of single-key objects", async () => {
  assert.equal(await yahooWith([{}, { settings: { num_playoff_teams: 4 } }]).getPlayoffTeamCount("k"), 4);
  assert.equal(
    await yahooWith([{}, { settings: [[{ uses_faab: "0" }, { num_playoff_teams: "8" }]] }]).getPlayoffTeamCount("k"),
    8
  );
});

test("Yahoo: missing, empty, junk or failing settings read as not known", async () => {
  assert.equal(await yahooWith(null).getPlayoffTeamCount("k"), null);
  assert.equal(await yahooWith([{ league_key: "x" }]).getPlayoffTeamCount("k"), null);
  assert.equal(await yahooWith([{}, { settings: [{ num_playoff_teams: "" }] }]).getPlayoffTeamCount("k"), null);
  assert.equal(await yahooWith([{}, { settings: [{ num_playoff_teams: "0" }] }]).getPlayoffTeamCount("k"), null);
  assert.equal(await yahooWith(null, { fail: true }).getPlayoffTeamCount("k"), null);
});
