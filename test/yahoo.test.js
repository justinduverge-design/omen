"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");
const YahooClient = require("../src/services/yahoo");

function leagueAttrs({ leagueKey, name, season }) {
  return [[
    { league_key: leagueKey },
    { name },
    { season: String(season) },
  ]];
}

/**
 * Captured from real Yahoo traffic on 2026-08-28 (owner@slopssaloon.com,
 * two 2026 NFL leagues), trimmed to the fields the parser reads.
 *
 * This is the shape `/users;use_login=1/games;game_keys=nfl/leagues` actually
 * returns: league[0] is a FLAT OBJECT. `leagueAttrs()` below builds the OTHER
 * shape (an array of single-key objects), which is what `/league/{key}`
 * returns. The parser rejected this one outright and returned [], which made
 * every `POST /api/yahoo/league` bind fail. Do not "simplify" these two
 * fixtures into one — they are different on purpose, because Yahoo is.
 */
function leagueAttrsFlat({ leagueKey, name, season }) {
  return [{ league_key: leagueKey, league_id: leagueKey.split(".").pop(), name, season: String(season) }];
}

test("getUserLeagues parses the flat-object league shape this endpoint really returns", async () => {
  const client = new YahooClient("token");
  client.get = async () => ({
    fantasy_content: {
      users: {
        0: {
          user: [
            { guid: "user-guid" },
            {
              games: {
                0: {
                  game: [
                    { game_key: "470" },
                    {
                      leagues: {
                        0: { league: leagueAttrsFlat({ leagueKey: "470.l.1255365", name: "Yahoo H2H-Pts 1255365", season: 2026 }) },
                        1: { league: leagueAttrsFlat({ leagueKey: "470.l.1358570", name: "Fantasy Madness", season: 2026 }) },
                        count: 2,
                      },
                    },
                  ],
                },
                count: 1,
              },
            },
          ],
        },
        count: 1,
      },
    },
  });

  const leagues = await client.getUserLeagues();
  assert.deepEqual(leagues, [
    { league_id: "470.l.1255365", name: "Yahoo H2H-Pts 1255365", season: 2026 },
    { league_id: "470.l.1358570", name: "Fantasy Madness", season: 2026 },
  ]);
});

test("getUserLeagues returns each league's league_key aliased as league_id", async () => {
  const client = new YahooClient("token");
  client.get = async (path) => {
    assert.equal(path, "/users;use_login=1/games;game_keys=nfl/leagues");
    return {
      fantasy_content: {
        users: {
          0: {
            user: [
              { guid: "user-guid" },
              {
                games: {
                  0: {
                    game: [
                      { game_key: "449" },
                      {
                        leagues: {
                          0: { league: leagueAttrs({ leagueKey: "449.l.123", name: "Legends League", season: 2026 }) },
                          1: { league: leagueAttrs({ leagueKey: "449.l.456", name: "Dynasty Dudes", season: 2026 }) },
                          count: 2,
                        },
                      },
                    ],
                  },
                  count: 1,
                },
              },
            ],
          },
          count: 1,
        },
      },
    };
  };

  const leagues = await client.getUserLeagues();

  assert.deepEqual(leagues, [
    { league_id: "449.l.123", name: "Legends League", season: 2026 },
    { league_id: "449.l.456", name: "Dynasty Dudes", season: 2026 },
  ]);
});

test("getUserLeagues returns [] when the user has no leagues", async () => {
  const client = new YahooClient("token");
  client.get = async () => ({
    fantasy_content: {
      users: {
        0: {
          user: [
            { guid: "user-guid" },
            { games: { count: 0 } },
          ],
        },
        count: 1,
      },
    },
  });

  assert.deepEqual(await client.getUserLeagues(), []);
});

test("getUserLeagues never throws on a malformed or empty response", async () => {
  const client = new YahooClient("token");

  client.get = async () => ({});
  assert.deepEqual(await client.getUserLeagues(), []);

  client.get = async () => null;
  assert.deepEqual(await client.getUserLeagues(), []);

  client.get = async () => ({ fantasy_content: { users: { 0: { user: [{}, {}] } } } });
  assert.deepEqual(await client.getUserLeagues(), []);
});

test("getUserLeagues propagates a real fetch/auth failure instead of swallowing it", async () => {
  const client = new YahooClient("token");
  client.get = async () => { throw new Error("yahoo_token_expired"); };

  await assert.rejects(() => client.getUserLeagues(), /yahoo_token_expired/);
});

/**
 * `/league/{key}` — captured live 2026-08-28 (470.l.1255365), trimmed to the
 * fields the parsers read. league[0] is a FLAT OBJECT here, not the array of
 * single-key objects the parsers used to require.
 *
 * Both `getLeagueMetadata()` and `getCurrentWeek()` had zero direct coverage
 * before this, which is how one wrong shape assumption survived across three
 * methods. They degrade silently by design ({} and null), so nothing upstream
 * raised a signal — a bound league simply served no metadata.
 */
function leagueFlatResponse() {
  return {
    fantasy_content: {
      league: [{
        league_key: "470.l.1255365",
        league_id: "1255365",
        name: "Yahoo H2H-Pts 1255365",
        season: "2026",
        current_week: 1,
        num_teams: 10,
        scoring_type: "head",
      }],
    },
  };
}

test("getLeagueMetadata reads the flat-object shape /league/{key} really returns", async () => {
  const client = new YahooClient("token");
  client.get = async (path) => {
    assert.equal(path, "/league/470.l.1255365");
    return leagueFlatResponse();
  };

  assert.deepEqual(await client.getLeagueMetadata("470.l.1255365"), {
    league_id: "470.l.1255365",
    league_name: "Yahoo H2H-Pts 1255365",
    season: 2026,
    week: 1,
  });
});

test("getCurrentWeek reads the flat-object shape /league/{key} really returns", async () => {
  const client = new YahooClient("token");
  client.get = async () => leagueFlatResponse();
  assert.equal(await client.getCurrentWeek("470.l.1255365"), 1);
});

test("getLeagueMetadata and getCurrentWeek still read the array-of-single-key-objects shape", async () => {
  // The other serialisation Yahoo uses. Kept so the reader cannot regress to
  // handling only whichever shape was fixed most recently.
  const arrayShape = {
    fantasy_content: {
      league: [[
        { league_key: "470.l.1358570" },
        { name: "Fantasy Madness" },
        { season: "2026" },
        { current_week: 3 },
      ]],
    },
  };
  const client = new YahooClient("token");
  client.get = async () => arrayShape;

  assert.deepEqual(await client.getLeagueMetadata("470.l.1358570"), {
    league_id: "470.l.1358570",
    league_name: "Fantasy Madness",
    season: 2026,
    week: 3,
  });
  assert.equal(await client.getCurrentWeek("470.l.1358570"), 3);
});

test("getLeagueMetadata returns {} and getCurrentWeek null on a malformed response", async () => {
  const client = new YahooClient("token");
  client.get = async () => ({ fantasy_content: {} });
  assert.deepEqual(await client.getLeagueMetadata("470.l.1"), {});
  assert.equal(await client.getCurrentWeek("470.l.1"), null);
});

// Yahoo rows in the switcher carried no team at all until 2026-09-05, so every Yahoo league
// showed its league title where a team name belongs. `/leagues/teams` carries the team, but it
// is a different endpoint and Yahoo returns materially different shapes from related endpoints
// — the two fixtures above exist because exactly that assumption once emptied the league list
// and broke every Yahoo bind. Hence: ask for more, fall back to what is verified.

test("getUserLeaguesWithTeams reads the team the /teams sub-resource nests in each league", async () => {
  const client = new YahooClient("token");
  client.get = async (path) => {
    assert.equal(path, "/users;use_login=1/games;game_keys=nfl/leagues/teams");
    return {
      fantasy_content: {
        users: {
          0: {
            user: [
              { guid: "user-guid" },
              {
                games: {
                  0: {
                    game: [
                      { game_key: "470" },
                      {
                        leagues: {
                          0: {
                            league: [
                              ...leagueAttrsFlat({ leagueKey: "470.l.1255365", name: "Yahoo H2H-Pts", season: 2026 }),
                              { teams: { 0: { team: [[{ team_key: "470.l.1255365.t.4" }, { team_id: "4" }, { name: "Gravediggers" }]] }, count: 1 } },
                            ],
                          },
                          count: 1,
                        },
                      },
                    ],
                  },
                  count: 1,
                },
              },
            ],
          },
          count: 1,
        },
      },
    };
  };

  const leagues = await client.getUserLeaguesWithTeams();
  assert.equal(leagues.length, 1);
  assert.equal(leagues[0].league_id, "470.l.1255365");
  assert.equal(leagues[0].team_name, "Gravediggers");
  assert.equal(leagues[0].team_id, "4");
});

test("getUserLeaguesWithTeams falls back to the verified endpoint rather than losing the leagues", async () => {
  const client = new YahooClient("token");
  const asked = [];
  client.get = async (path) => {
    asked.push(path);
    // The richer endpoint answers with a shape this parser cannot read.
    if (path.endsWith("/teams")) return { fantasy_content: { users: {} } };
    return {
      fantasy_content: {
        users: {
          0: {
            user: [
              { guid: "user-guid" },
              {
                games: {
                  0: {
                    game: [
                      { game_key: "470" },
                      { leagues: { 0: { league: leagueAttrsFlat({ leagueKey: "470.l.1", name: "Fallback League", season: 2026 }) }, count: 1 } },
                    ],
                  },
                  count: 1,
                },
              },
            ],
          },
          count: 1,
        },
      },
    };
  };

  const leagues = await client.getUserLeaguesWithTeams();

  assert.deepEqual(asked, [
    "/users;use_login=1/games;game_keys=nfl/leagues/teams",
    "/users;use_login=1/games;game_keys=nfl/leagues",
  ]);
  // The league survives; only the team name is lost, which is the correct trade.
  assert.equal(leagues.length, 1);
  assert.equal(leagues[0].name, "Fallback League");
  assert.equal(leagues[0].team_name, undefined);
});

test("a throwing /teams request still yields the user's leagues", async () => {
  const client = new YahooClient("token");
  client.get = async (path) => {
    if (path.endsWith("/teams")) throw new Error("Yahoo 999");
    return {
      fantasy_content: {
        users: {
          0: {
            user: [
              { guid: "g" },
              { games: { 0: { game: [{ game_key: "470" }, { leagues: { 0: { league: leagueAttrsFlat({ leagueKey: "470.l.2", name: "Still Here", season: 2026 }) }, count: 1 } }] }, count: 1 } },
            ],
          },
          count: 1,
        },
      },
    };
  };

  const leagues = await client.getUserLeaguesWithTeams();
  assert.equal(leagues[0].name, "Still Here");
});
