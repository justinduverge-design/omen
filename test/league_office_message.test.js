"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildLeagueOfficeLine } = require("../src/league_office_sync_worker");
const { leagueOfficeTransactionsFromEspnData } = require("../src/adapters/espn");

test("League Office chooses the closest projected matchup and derives stable lines", () => {
  const line = buildLeagueOfficeLine([
    { game_id:"1", home_team_id:"1", away_team_id:"2", home_projected:130, away_projected:110 },
    { game_id:"2", home_team_id:"3", away_team_id:"4", home_projected:121.5, away_projected:120 },
  ]);
  assert.equal(line.game_id, "2");
  assert.equal(line.favorite_team_id, "3");
  assert.equal(line.spread, -1.5);
  assert.equal(line.over_under, 241.5);
  assert.ok(Number.isInteger(line.favorite_moneyline));
  assert.ok(Number.isInteger(line.underdog_moneyline));
});

test("League Office transaction normalizer keeps executed adds and drops only", () => {
  const rows = leagueOfficeTransactionsFromEspnData({ transactions: [
    { status:"EXECUTED", processDate:123, items:[
      { type:"ADD", playerId:10, toTeamId:2, fromTeamId:0, player:{id:10,fullName:"Added Player"} },
      { type:"DROP", playerId:11, fromTeamId:2, toTeamId:0, player:{id:11,fullName:"Dropped Player"} },
    ]},
    { status:"CANCELLED", items:[{type:"ADD",playerId:12,toTeamId:3,fromTeamId:0}]}
  ]});
  assert.deepEqual(rows.map(r=>r.action), ["ADD","DROP"]);
  assert.equal(rows[0].player_name, "Added Player");
  assert.equal(rows[1].team_id, "2");
});
