"use strict";

const assert = require("node:assert/strict");
const { describe, it, after } = require("node:test");

const _originalFetch = global.fetch;
const { getDvpContext } = require("../src/services/matchupService");

function csvFor(rows) {
  return [
    "season,week,season_type,position,opponent_team,fantasy_points,fantasy_points_ppr",
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
      "2093,1,REG,WR,BAL,8.5,10.5",
      "2093,2,REG,WR,BAL,9.0,11.0",
      "2093,3,REG,RB,BAL,15.0,16.0",
      "2093,4,REG,WR,CIN,20.0,24.0",
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
      "2094,1,REG,WR,DAL,14.0,18.0",
      "2094,2,REG,WR,DAL,15.0,19.0",
      "2094,3,REG,WR,DAL,16.0,20.0",
      "2094,4,REG,WR,DAL,17.0,21.0",
      "2094,5,REG,WR,DAL,18.0,22.0",
      "2094,6,REG,WR,NYG,30.0,35.0",
      "2094,7,REG,RB,DAL,10.0,11.0",
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
    assert.match(counter.urls[0], /stats_player_week_2094\.csv$/);
  });

  it("uses the cache for the same season and week", async () => {
    const counter = { count: 0 };
    mockFetchWithCsv(csvFor([
      "2095,1,REG,QB,KC,20.0,20.0",
      "2095,2,REG,QB,KC,21.0,21.0",
      "2095,3,REG,QB,KC,22.0,22.0",
      "2095,4,REG,QB,KC,23.0,23.0",
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

  it("excludes POST rows from the average — a defense's playoff sample must not skew its regular-season DvP", async () => {
    const counter = { count: 0 };
    mockFetchWithCsv(csvFor([
      // Three REG games at a real, middling average.
      "2097,1,REG,WR,SF,10.0,12.0",
      "2097,2,REG,WR,SF,11.0,13.0",
      "2097,3,REG,WR,SF,12.0,14.0",
      // A POST-tagged blowout that would drag the average way up if it leaked in.
      "2097,20,POST,WR,SF,90.0,95.0",
    ]), counter);

    const result = await getDvpContext({
      position: "WR", opponentTeam: "SF", season: 2097, week: 21,
    });

    assert.equal(result.sample_weeks, 3, "the POST row must not count toward the sample");
    assert.equal(result.avg_points_allowed, 13, "the POST row must not pull the average up");
  });

  it("correctly parses rows with a quoted comma in an earlier column, matching nflverse's real headshot_url shape", async () => {
    const counter = { count: 0 };
    // Real nflverse rows carry a quoted headshot_url containing an unescaped comma
    // (Cloudinary transform params, e.g. "...f_auto,q_auto/...") ahead of the columns
    // this service reads. A naive split(",") shifts season/week/season_type/etc. off
    // by one for every such row — confirmed against the live file, not hypothetical.
    global.fetch = async (url) => {
      counter.count += 1;
      return {
        ok: true,
        text: async () => [
          'player_name,headshot_url,season,week,season_type,position,opponent_team,fantasy_points,fantasy_points_ppr',
          '"A. Player","https://static.www.nfl.com/image/upload/f_auto,q_auto/league/x",2099,1,REG,WR,LAR,10.0,12.0',
          '"B. Player","https://static.www.nfl.com/image/upload/f_auto,q_auto/league/y",2099,2,REG,WR,LAR,11.0,13.0',
          '"C. Player","https://static.www.nfl.com/image/upload/f_auto,q_auto/league/z",2099,3,REG,WR,LAR,12.0,14.0',
        ].join("\n"),
      };
    };

    const result = await getDvpContext({
      position: "WR", opponentTeam: "LAR", season: 2099, week: 4,
    });

    assert.equal(counter.count, 1);
    assert.ok(result, "a quoted comma in an earlier column must not shift season/week/opponent_team out of alignment");
    assert.equal(result.opponent_team, "LAR");
    assert.equal(result.sample_weeks, 3);
    assert.equal(result.avg_points_allowed, 13);
  });

  it("fails closed (returns null) when the upstream schema drops season_type", async () => {
    const counter = { count: 0 };
    // Same shape nflverse shipped before the reorganization — no season_type column.
    global.fetch = async (url) => {
      counter.count += 1;
      return {
        ok: true,
        text: async () => [
          "season,week,position,opponent_team,fantasy_points,fantasy_points_ppr",
          "2098,1,WR,SEA,10.0,12.0",
          "2098,2,WR,SEA,11.0,13.0",
          "2098,3,WR,SEA,12.0,14.0",
        ].join("\n"),
      };
    };

    const result = await getDvpContext({
      position: "WR", opponentTeam: "SEA", season: 2098, week: 4,
    });

    assert.equal(result, null);
  });
});
