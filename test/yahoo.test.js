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
