"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

// W1-A league discovery. `fanLeaguesFromPreferences` is the pure half of the only mechanism
// ESPN offers for "which leagues does this user play in" — `lm-api-reads` can only answer about
// a league you already name, which is why the app previously had to ask the user to type an id.
//
// The payload shape is undocumented and ESPN has changed it before, so the parser is written
// defensively and these fixtures pin the behavior that matters: football only, no duplicates,
// nothing invented when a field is missing.

const assert = require("node:assert/strict");
const test = require("node:test");

const { fanLeaguesFromPreferences } = require("../src/adapters/espn.js");

function teamPreference({
  gameId = 1,
  leagueId = "13338821",
  leagueName = "Slops Saloon FF Showdown",
  teamId = 3,
  teamName = "The Titans of Slopsilonia",
  seasonId = 2026,
  typeId = 9,
} = {}) {
  return {
    typeId,
    metaData: {
      entry: {
        gameId,
        entryId: teamId,
        name: teamName,
        seasonId,
        groups: [{ groupId: leagueId, groupName: leagueName }],
      },
    },
  };
}

test("maps a fan payload into the league rows the picker needs", () => {
  const leagues = fanLeaguesFromPreferences({ preferences: [teamPreference()] });

  assert.deepEqual(leagues, [{
    league_id: "13338821",
    league_name: "Slops Saloon FF Showdown",
    season: 2026,
    team_id: "3",
    team_name: "The Titans of Slopsilonia",
  }]);
});

test("returns every football league, so a multi-league manager sees all of them", () => {
  // The founder's own account has three. A picker that silently showed one would look like it
  // worked while quietly dropping two leagues.
  const leagues = fanLeaguesFromPreferences({
    preferences: [
      teamPreference({ leagueId: "1", leagueName: "Slops Saloon FF Showdown" }),
      teamPreference({ leagueId: "2", leagueName: "Everything Backwards" }),
      teamPreference({ leagueId: "3", leagueName: "Las Vegas Pro H2H Points PPR League" }),
    ],
  });

  assert.equal(leagues.length, 3);
  assert.deepEqual(leagues.map((l) => l.league_id), ["1", "2", "3"]);
});

test("ignores non-football fantasy teams on the same account", () => {
  // The fan payload spans every fantasy sport the account plays. Without the game-id filter a
  // basketball team is offered as a football league and the connect then fails confusingly.
  const leagues = fanLeaguesFromPreferences({
    preferences: [
      teamPreference({ gameId: 2, leagueId: "hoops" }),
      teamPreference({ gameId: 1, leagueId: "ffl" }),
    ],
  });

  assert.deepEqual(leagues.map((l) => l.league_id), ["ffl"]);
});

test("ignores preference rows that are not fantasy teams", () => {
  const leagues = fanLeaguesFromPreferences({
    preferences: [teamPreference({ typeId: 1 }), teamPreference({ typeId: 9, leagueId: "keep" })],
  });

  assert.deepEqual(leagues.map((l) => l.league_id), ["keep"]);
});

test("drops a preference with no resolvable league id rather than inventing one", () => {
  const broken = teamPreference();
  broken.metaData.entry.groups = [];

  assert.deepEqual(fanLeaguesFromPreferences({ preferences: [broken] }), []);
});

test("keeps the league when optional labels are missing, with nulls rather than placeholders", () => {
  const sparse = teamPreference({ leagueName: null, teamName: null, seasonId: null });

  const [league] = fanLeaguesFromPreferences({ preferences: [sparse] });
  assert.equal(league.league_id, "13338821");
  assert.equal(league.league_name, null);
  assert.equal(league.team_name, null);
  assert.equal(league.season, null);
});

test("de-duplicates a league that appears more than once", () => {
  const leagues = fanLeaguesFromPreferences({
    preferences: [teamPreference(), teamPreference()],
  });

  assert.equal(leagues.length, 1);
});

test("filters to the requested season when one is given", () => {
  const leagues = fanLeaguesFromPreferences({
    preferences: [
      teamPreference({ leagueId: "old", seasonId: 2025 }),
      teamPreference({ leagueId: "now", seasonId: 2026 }),
    ],
  }, { season: 2026 });

  assert.deepEqual(leagues.map((l) => l.league_id), ["now"]);
});

test("survives an empty or malformed payload without throwing", () => {
  for (const payload of [null, {}, { preferences: null }, { preferences: [null, {}] }]) {
    assert.deepEqual(fanLeaguesFromPreferences(payload), []);
  }
});
