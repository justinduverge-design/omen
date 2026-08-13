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
