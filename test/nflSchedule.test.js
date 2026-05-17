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

const { getGameInfo, __clearCache } = require("../src/services/nflSchedule");

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
