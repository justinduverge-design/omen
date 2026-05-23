"use strict";

const assert = require("node:assert/strict");
const { describe, it, after } = require("node:test");

const _originalFetch = global.fetch;
const { getDvpContext } = require("../src/services/matchupService");

function csvFor(rows) {
  return [
    "season,week,position,opponent_team,fantasy_points,fantasy_points_ppr",
    ...rows,
  ].join("\n");
}

function mockFetchWithCsv(csv, counter) {
  global.fetch = async (url) => {
    counter.count += 1;
    counter.urls ||= [];
    counter.urls.push(String(url));
    return {
      ok:   true,
      text: async () => csv,
    };
  };
}

describe("matchupService.getDvpContext", () => {
  after(() => {
    if (_originalFetch) global.fetch = _originalFetch;
    else delete global.fetch;
  });

  it("returns null when position is K", async () => {
    const result = await getDvpContext({
      position: "K", opponentTeam: "BAL", season: 2090, week: 8,
    });
    assert.equal(result, null);
  });

  it("returns null when position is DEF", async () => {
    const result = await getDvpContext({
      position: "DEF", opponentTeam: "BAL", season: 2091, week: 8,
    });
    assert.equal(result, null);
  });

  it("returns null on fetch failure", async () => {
    global.fetch = async () => { throw new Error("Network error"); };

    const result = await getDvpContext({
      position: "WR", opponentTeam: "BAL", season: 2092, week: 8,
    });

    assert.equal(result, null);
  });

  it("returns null when nflverse CSV shape is invalid", async () => {
    const counter = { count: 0 };
    mockFetchWithCsv("season,week,position\n2096,1,WR", counter);

    const result = await getDvpContext({
      position: "WR", opponentTeam: "BAL", season: 2096, week: 8,
    });

    assert.equal(result, null);
    assert.equal(counter.count, 1);
  });

  it("returns null when sample_weeks is less than 3", async () => {
    const counter = { count: 0 };
    mockFetchWithCsv(csvFor([
      "2093,1,WR,BAL,8.5,10.5",
      "2093,2,WR,BAL,9.0,11.0",
      "2093,3,RB,BAL,15.0,16.0",
      "2093,4,WR,CIN,20.0,24.0",
    ]), counter);

    const result = await getDvpContext({
      position: "WR", opponentTeam: "BAL", season: 2093, week: 5,
    });

    assert.equal(result, null);
    assert.equal(counter.count, 1);
  });

  it("returns a valid DvP context object", async () => {
    const counter = { count: 0 };
    mockFetchWithCsv(csvFor([
      "2094,1,WR,DAL,14.0,18.0",
      "2094,2,WR,DAL,15.0,19.0",
      "2094,3,WR,DAL,16.0,20.0",
      "2094,4,WR,DAL,17.0,21.0",
      "2094,5,WR,DAL,18.0,22.0",
      "2094,6,WR,NYG,30.0,35.0",
      "2094,7,RB,DAL,10.0,11.0",
    ]), counter);

    const result = await getDvpContext({
      position: "WR", opponentTeam: "DAL", season: 2094, week: 6,
    });

    assert.deepEqual(Object.keys(result).sort(), [
      "avg_points_allowed",
      "dvp_label",
      "opponent_team",
      "position",
      "sample_weeks",
    ]);
    assert.equal(result.opponent_team, "DAL");
    assert.equal(result.position, "WR");
    assert.equal(result.avg_points_allowed, 20);
    assert.equal(result.sample_weeks, 5);
    assert.ok(["favorable", "neutral", "tough"].includes(result.dvp_label));
    assert.equal(counter.count, 1);
    assert.match(counter.urls[0], /player_stats_2094\.csv$/);
  });

  it("uses the cache for the same season and week", async () => {
    const counter = { count: 0 };
    mockFetchWithCsv(csvFor([
      "2095,1,QB,KC,20.0,20.0",
      "2095,2,QB,KC,21.0,21.0",
      "2095,3,QB,KC,22.0,22.0",
      "2095,4,QB,KC,23.0,23.0",
    ]), counter);

    const first = await getDvpContext({
      position: "QB", opponentTeam: "KC", season: 2095, week: 5,
    });
    const second = await getDvpContext({
      position: "QB", opponentTeam: "KC", season: 2095, week: 5,
    });

    assert.equal(counter.count, 1);
    assert.deepEqual(second, first);
  });
});
