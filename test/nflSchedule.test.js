"use strict";

const assert = require("node:assert/strict");
const { describe, it, before, beforeEach, after } = require("node:test");

let _mockResponse = null;
let _mockFetch = null;
const _originalFetch = global.fetch;

function installMockFetch() {
  _mockFetch = async () => ({
    ok:   true,
    json: async () => _mockResponse,
  });
  global.fetch = _mockFetch;
}

installMockFetch();

const {
  getGameInfo,
  getCurrentNflWeekContext,
  getLastCompletedNflWeek,
  __clearCache,
} = require("../src/services/nflSchedule");

function completedEvent(date) {
  return { date, competitions: [{ status: { type: { completed: true } } }] };
}

function inProgressEvent(date) {
  return { date, competitions: [{ status: { type: { completed: false } } }] };
}

function installUrlMockFetch(responsesByWeek) {
  global.fetch = async (url) => {
    const match = /[?&]week=(\d+)/.exec(url);
    const week = match ? Number(match[1]) : null;
    const events = responsesByWeek[week] || [];
    return { ok: true, json: async () => ({ events }) };
  };
}

const MOCK_SCOREBOARD = {
  events: [
    {
      date: "2026-09-10T17:00:00Z",
      name: "Kansas City Chiefs at Baltimore Ravens",
      competitions: [{
        venue: { fullName: "M&T Bank Stadium", indoor: false },
        competitors: [
          { team: { abbreviation: "BAL", displayName: "Baltimore Ravens" }, homeAway: "home" },
          { team: { abbreviation: "KC",  displayName: "Kansas City Chiefs" }, homeAway: "away" },
        ],
      }],
    },
  ],
};

describe("nflSchedule.getGameInfo", () => {
  before(() => {
    installMockFetch();
  });

  beforeEach(() => {
    __clearCache();
    _mockResponse = MOCK_SCOREBOARD;
    global.fetch = _mockFetch;
  });

  after(() => {
    if (_originalFetch) global.fetch = _originalFetch;
    else delete global.fetch;
  });

  it("returns home/away correctly for the home team", async () => {
    const info = await getGameInfo("BAL");
    assert.equal(info.home_away, "Home");
    assert.equal(info.opponent_abbr, "KC");
    assert.equal(info.travel_miles, 0);
  });

  it("returns away game with non-zero travel for the away team", async () => {
    const info = await getGameInfo("KC");
    assert.equal(info.home_away, "Away");
    assert.equal(info.opponent_abbr, "BAL");
    assert.ok(info.travel_miles > 0, "travel_miles should be > 0 for away game");
  });

  it("returns null when team has no game this week", async () => {
    const info = await getGameInfo("SF");
    assert.equal(info, null);
  });

  it("returns null gracefully when ESPN API fails", async () => {
    global.fetch = async () => { throw new Error("Network error"); };
    const info = await getGameInfo("KC");
    assert.equal(info, null);
  });
});

describe("nflSchedule.getCurrentNflWeekContext", () => {
  it("returns upcoming season week 1 during offseason", () => {
    assert.deepEqual(getCurrentNflWeekContext(new Date("2026-05-26T12:00:00Z")), {
      season: 2026,
      week: 1,
      season_type: "regular",
    });
  });

  it("returns the prior season during January playoff window", () => {
    assert.deepEqual(getCurrentNflWeekContext(new Date("2027-01-20T12:00:00Z")), {
      season: 2026,
      week: 18,
      season_type: "postseason",
    });
  });
});

describe("nflSchedule.getLastCompletedNflWeek", () => {
  beforeEach(() => {
    __clearCache();
  });

  after(() => {
    if (_originalFetch) global.fetch = _originalFetch;
    else delete global.fetch;
  });

  it("returns the current week when every game has finished", async () => {
    installUrlMockFetch({
      4: [completedEvent("2026-09-28T17:00:00Z"), completedEvent("2026-09-24T00:15:00Z")],
    });

    const result = await getLastCompletedNflWeek(new Date("2026-09-29T12:00:00Z"));

    assert.deepEqual(result, { season: 2026, week: 4, kickoff_utc: "2026-09-24T00:15:00Z" });
  });

  it("falls back to the prior week when the current week is still in progress", async () => {
    installUrlMockFetch({
      4: [inProgressEvent("2026-09-28T17:00:00Z")],
      3: [completedEvent("2026-09-17T00:15:00Z")],
    });

    const result = await getLastCompletedNflWeek(new Date("2026-09-29T12:00:00Z"));

    assert.deepEqual(result, { season: 2026, week: 3, kickoff_utc: "2026-09-17T00:15:00Z" });
  });

  it("returns null week when neither the current nor prior week has fully completed", async () => {
    installUrlMockFetch({
      4: [inProgressEvent("2026-09-28T17:00:00Z")],
      3: [],
    });

    const result = await getLastCompletedNflWeek(new Date("2026-09-29T12:00:00Z"));

    assert.deepEqual(result, { season: 2026, week: null, kickoff_utc: null });
  });

  it("returns null week during week 1 with nothing to fall back to", async () => {
    installUrlMockFetch({
      1: [inProgressEvent("2026-09-10T17:00:00Z")],
    });

    const result = await getLastCompletedNflWeek(new Date("2026-09-06T12:00:00Z"));

    assert.deepEqual(result, { season: 2026, week: null, kickoff_utc: null });
  });
});
