"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  fetchFFC,
  fetchMFL,
  fetchYahoo,
} = require("../src/services/adp");

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

test("fetchFFC maps FFC ADP players from the documented endpoint", async () => {
  const calls = [];
  const players = await fetchFFC("half-ppr", 12, 2026, async (url) => {
    calls.push(url);
    return jsonResponse({
      players: [
        {
          player_id: 101,
          name: "FFC Example RB",
          position: "RB",
          team: "EXA",
          adp: 14.2,
          stdev: 2.1,
          high: 9,
          low: 22,
          times_drafted: 88,
        },
      ],
    });
  });

  assert.deepEqual(calls, [
    "https://fantasyfootballcalculator.com/api/v1/adp/half-ppr?teams=12&year=2026",
  ]);
  assert.deepEqual(players, [
    {
      name: "FFC Example RB",
      position: "RB",
      team: "EXA",
      adp: 14.2,
      player_id: "ffc_101",
    },
  ]);
});

test("fetchYahoo batches draft_analysis requests at 25 player keys max", async () => {
  const gameKeyCalls = [];
  const playerPageCalls = [];
  const draftAnalysisCalls = [];

  const yahooClient = {
    async getGameKeyForSeason(year) {
      gameKeyCalls.push(year);
      return { fantasy_content: { games: [{ game: [{ game_key: "449" }] }] } };
    },
    async getNFLPlayerPage({ count, start }) {
      playerPageCalls.push({ count, start });
      return {
        fantasy_content: {
          game: [
            {},
            {
              players: Array.from({ length: count }, (_unused, index) => ({
                player: [{ player_key: `449.p.${start + index + 1}` }],
              })),
            },
          ],
        },
      };
    },
    async getDraftAnalysis(playerKeys) {
      draftAnalysisCalls.push([...playerKeys]);
      return {
        fantasy_content: {
          players: playerKeys.map((key, index) => ({
            player_key: key,
            name: { full: `Yahoo Example ${key}` },
            display_position: index % 2 === 0 ? "RB" : "WR",
            editorial_team_abbr: "YHO",
            draft_analysis: { average_pick: String(10 + index + 0.5) },
          })),
        },
      };
    },
  };

  const players = await fetchYahoo(yahooClient, 2026);

  assert.deepEqual(gameKeyCalls, [2026]);
  assert.equal(playerPageCalls.length, 8);
  assert.deepEqual(playerPageCalls[0], { count: 25, start: 0 });
  assert.deepEqual(playerPageCalls[7], { count: 25, start: 175 });
  assert.equal(draftAnalysisCalls.length, 8);
  for (const batch of draftAnalysisCalls) {
    assert.ok(batch.length <= 25);
  }
  assert.equal(players.length, 200);
  assert.equal(typeof players[0].adp, "number");
  assert.equal(players[0].player_id, "yahoo_449.p.1");
});

test("fetchMFL coerces string ADP values to numbers and joins player details", async () => {
  const calls = [];
  const players = await fetchMFL(10, 2026, async (url) => {
    calls.push(url);
    if (url.includes("TYPE=adp")) {
      return jsonResponse({
        adp: {
          player: [
            { id: "1001", averagePick: "18.6" },
            { id: "1002", adp: "42" },
          ],
        },
      });
    }
    return jsonResponse({
      players: {
        player: [
          { id: "1001", name: "MFL Example RB", position: "RB", team: "MFL" },
          { id: "1002", name: "MFL Example WR", position: "WR", team: "MFL" },
        ],
      },
    });
  });

  assert.equal(calls[0], "https://api.myfantasyleague.com/2026/export?TYPE=adp&FCOUNT=10&PERIOD=ADP&JSON=1");
  assert.equal(calls[1], "https://api.myfantasyleague.com/2026/export?TYPE=players&DETAILS=1&JSON=1");
  assert.equal(players.length, 2);
  assert.deepEqual(players[0], {
    name: "MFL Example RB",
    position: "RB",
    team: "MFL",
    adp: 18.6,
    player_id: "mfl_1001",
  });
  assert.equal(typeof players[1].adp, "number");
  assert.equal(players[1].adp, 42);
});
