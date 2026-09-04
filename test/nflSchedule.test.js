"use strict";

const assert = require("node:assert/strict");
const { describe, it, before, beforeEach, afterEach, after } = require("node:test");

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
  isOffSeason,
  suppressLiveFootballData,
  week1PreviewEnabled,
  __clearCache,
} = require("../src/services/nflSchedule");

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
  it("clamps to week 1 during the offseason but SAYS it is the offseason", () => {
    // This test previously asserted only `{season, week: 1, season_type: "regular"}` — and
    // passed, under the name "returns upcoming season week 1 during offseason". It encoded
    // the trap: a caller reading that object sees Week 1 of a regular season. On 2026-08-27
    // exactly that reading was written into facts-of-record #10 as "the season floor is
    // cleared", nine days before kickoff.
    //
    // The clamp stays — downstream callers need a usable week — but `is_off_season` now
    // travels with it, and it is the authority.
    const context = getCurrentNflWeekContext(new Date("2026-05-26T12:00:00Z"));

    assert.deepEqual(context, {
      season: 2026,
      week: 1,
      season_type: "regular",
      is_off_season: true,
      raw_week: -14,
    });
    assert.equal(context.is_off_season, isOffSeason(new Date("2026-05-26T12:00:00Z")));
  });

  it("agrees with isOffSeason at every boundary", () => {
    // The two disagreeing is the defect class. Assert they cannot.
    for (const iso of [
      "2026-05-26T12:00:00Z", "2026-08-27T12:00:00Z", "2026-09-04T12:00:00Z",
      "2026-09-05T12:00:00Z", "2026-09-15T12:00:00Z", "2027-01-20T12:00:00Z",
    ]) {
      const when = new Date(iso);
      assert.equal(
        getCurrentNflWeekContext(when).is_off_season,
        isOffSeason(when),
        `disagreement at ${iso}`
      );
    }
  });

  it("returns the prior season during January playoff window", () => {
    assert.deepEqual(getCurrentNflWeekContext(new Date("2027-01-20T12:00:00Z")), {
      season: 2026,
      week: 18,
      season_type: "postseason",
      is_off_season: true,
      raw_week: 20,
    });
  });
});

describe("nflSchedule.isOffSeason", () => {
  it("returns true before the regular season opens", () => {
    assert.equal(isOffSeason(new Date("2026-07-04T12:00:00Z")), true);
  });

  it("returns false during the regular season", () => {
    assert.equal(isOffSeason(new Date("2026-09-10T12:00:00Z")), false);
  });

  it("returns true after the regular season window closes", () => {
    assert.equal(isOffSeason(new Date("2027-01-20T12:00:00Z")), true);
  });
});

describe("nflSchedule.suppressLiveFootballData — the Week-1 preview kill switch", () => {
  const OFF = new Date("2026-08-28T12:00:00Z"); // real off-season: raw_week -1
  const IN  = new Date("2026-09-10T12:00:00Z"); // real regular season
  let prior;
  beforeEach(() => { prior = process.env.OMEN_WEEK1_PREVIEW; });
  afterEach(() => {
    if (prior === undefined) delete process.env.OMEN_WEEK1_PREVIEW;
    else process.env.OMEN_WEEK1_PREVIEW = prior;
  });

  it("is on by default, so the off-season no longer suppresses live data", () => {
    delete process.env.OMEN_WEEK1_PREVIEW;
    assert.equal(isOffSeason(OFF), true, "precondition: this date is genuinely off-season");
    assert.equal(week1PreviewEnabled(), true);
    assert.equal(suppressLiveFootballData(OFF), false);
  });

  it("OMEN_WEEK1_PREVIEW=false restores the previous off-season suppression", () => {
    process.env.OMEN_WEEK1_PREVIEW = "false";
    assert.equal(week1PreviewEnabled(), false);
    assert.equal(suppressLiveFootballData(OFF), true, "kill switch must restore suppression");
  });

  it("never suppresses during the regular season, switch either way", () => {
    delete process.env.OMEN_WEEK1_PREVIEW;
    assert.equal(suppressLiveFootballData(IN), false);
    process.env.OMEN_WEEK1_PREVIEW = "false";
    assert.equal(suppressLiveFootballData(IN), false);
  });

  it("only the exact string \"false\" disables it — no accidental truthiness", () => {
    for (const v of ["0", "no", "FALSE", "", "true"]) {
      process.env.OMEN_WEEK1_PREVIEW = v;
      assert.equal(week1PreviewEnabled(), true, `${JSON.stringify(v)} must not disable the preview`);
    }
  });

  it("leaves isOffSeason itself untouched — it is still the honest season answer", () => {
    process.env.OMEN_WEEK1_PREVIEW = "false";
    assert.equal(isOffSeason(OFF), true);
    delete process.env.OMEN_WEEK1_PREVIEW;
    assert.equal(isOffSeason(OFF), true);
  });
});

// --- The NFL game week: Tuesday-anchored, phase-aware ---
//
// This exists because `getCurrentNflWeekContext` is anchored on a fixed September 5, whose
// weekday moves every year. In 2026 it is a Saturday, so that function reports the wrong week
// on the Sunday and Monday of every NFL week. The Command Center headline names the week, so
// it cannot use a number that is wrong on the two days most people open the app.

const { getNflGameWeek } = require("../src/services/nflSchedule");

describe("NFL game week", () => {
/** Noon Eastern, so a test never straddles a day boundary in the league's timezone. */
function easternNoon(isoDate) {
  return new Date(`${isoDate}T16:00:00Z`);
}

it("the game week turns over on Tuesday, not Saturday", () => {
  // NFL 2026 Week 1 runs Thu Sep 10 through Mon Sep 14. Every one of those days is Week 1.
  for (const date of ["2026-09-10", "2026-09-11", "2026-09-13", "2026-09-14"]) {
    assert.equal(getNflGameWeek(easternNoon(date)).week, 1, date);
  }
  // Tuesday Sep 15 opens Week 2, whose games start Thursday Sep 17.
  assert.equal(getNflGameWeek(easternNoon("2026-09-15")).week, 2);
  assert.equal(getNflGameWeek(easternNoon("2026-09-20")).week, 2);
});

it("the Sunday of Week 1 is Week 1 — the case the clamped context gets wrong", () => {
  const sunday = easternNoon("2026-09-13");
  assert.equal(getNflGameWeek(sunday).week, 1);
  // Pinned deliberately: the two DO disagree, and that disagreement is a known defect in the
  // older function, not drift introduced here. If this assertion ever fails it means the
  // reconciliation landed, and this test should be deleted rather than "fixed".
  assert.equal(getCurrentNflWeekContext(sunday).week, 2);
});

it("phases follow the founder's game-week rhythm", () => {
  assert.equal(getNflGameWeek(easternNoon("2026-09-15")).phase, "preparing"); // Tuesday
  assert.equal(getNflGameWeek(easternNoon("2026-09-16")).phase, "ready");     // Wednesday
  for (const date of ["2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20", "2026-09-21"]) {
    assert.equal(getNflGameWeek(easternNoon(date)).phase, "live", date);
  }
});

it("the day is read in the league's timezone, not UTC", () => {
  // 9pm Monday in Los Angeles is already Tuesday in UTC. The league week has not turned over,
  // and a user watching Monday Night Football must not be told the week is over.
  const mondayNightPacific = new Date("2026-09-15T04:00:00Z"); // Mon Sep 14, 9pm PT / 12am ET
  const answer = getNflGameWeek(mondayNightPacific);
  assert.equal(answer.day, "tuesday");
  // Midnight ET has in fact turned over — this pins that the boundary is Eastern midnight,
  // which is the league's own boundary, rather than the caller's local one.
  assert.equal(answer.week, 2);
});

it("the off-season names no week rather than clamping to 1", () => {
  const august = getNflGameWeek(easternNoon("2026-08-30"));
  assert.equal(august.is_off_season, true);
  // The clamp on `getCurrentNflWeekContext` is what let a session record "the season floor is
  // cleared" nine days before kickoff. A headline naming a week that has not arrived is a lie
  // the user can see, so display copy gets a null and has to handle it.
  assert.equal(august.week, null);
  assert.equal(august.phase, "off_season");
});

it("the anchor is derived from Labor Day, so it needs no edit each season", () => {
  // 2027: Labor Day is Mon Sep 6, so game week 1 opens Tue Sep 7 and Week 1 kicks off Thu Sep 9.
  assert.equal(getNflGameWeek(easternNoon("2027-09-07")).week, 1);
  assert.equal(getNflGameWeek(easternNoon("2027-09-12")).week, 1);
  assert.equal(getNflGameWeek(easternNoon("2027-09-14")).week, 2);
});
});
