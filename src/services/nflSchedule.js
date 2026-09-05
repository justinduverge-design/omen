"use strict";

/**
 * NFL Schedule Service
 * Fetches current week game info from the ESPN public scoreboard API.
 * No API key required. Rate limit: be reasonable (cache results).
 *
 * API: https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard
 *
 * Returns null gracefully on any failure; callers must handle.
 */

const { getStadium, stadiumDistanceMiles } = require("../data/nflStadiums");

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

const FETCH_TIMEOUT_MS = 5000;

// Simple in-process cache, expires after 4 hours.
// Prevents hammering the ESPN API on every MVP Move request.
const _cache = new Map();
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Calendar day in the league's timezone, as a UTC-midnight Date so date math is clean. */
function easternCalendarDay(now) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

/** First Monday in September of `year`, as a UTC-midnight Date. */
function laborDay(year) {
  const first = new Date(Date.UTC(year, 8, 1));
  // getUTCDay: 0=Sun, 1=Mon. Advance to the first Monday.
  const offset = (8 - first.getUTCDay()) % 7;
  return new Date(Date.UTC(year, 8, 1 + offset));
}

/**
 * When week 1 of `season` begins: the **Tuesday after Labor Day**.
 *
 * THE SINGLE ANCHOR. Every week number and every seasonality answer in this module derives
 * from this one function, because for a while they did not, and the two disagreed:
 *
 *   `getSeasonWeekInfo` used a fixed `Date.UTC(season, 8, 5)` while `getNflGameWeek` used
 *   this Tuesday. Measured across the 2026 regular season the two returned **different week
 *   numbers on 42% of in-season days** — specifically every Saturday, Sunday and Monday,
 *   which is to say every day games are actually played. On 2026-09-05 the fixed anchor also
 *   reported `is_off_season: false` **five days before kickoff**, so the A4 gate whose entire
 *   job is "grading before kickoff would score games that have not happened" reported PASS.
 *   That is the second time that class of error reached a recorded conclusion; see
 *   `Direction/facts-of-record.md` #10 and its 2026-08-27 correction.
 *
 * Two properties matter and a fixed calendar date has neither:
 *
 *   1. **An NFL week ends on Tuesday, not Sunday.** Sunday's games belong to the week that
 *      is ending, so a boundary that rolls on any other weekday mis-attributes game day
 *      itself. Anchoring on a Tuesday makes every subsequent 7-day boundary a Tuesday.
 *   2. **It has to move with the calendar.** September 5 is a Saturday in 2026 and a Sunday
 *      in 2027, so a fixed date rolls the week on a different weekday every year — a bug
 *      that silently re-arrives each season rather than staying fixed.
 *
 * Labor Day is the first Monday in September and the league has opened on the Thursday
 * after it since 2002, so the Tuesday before that opener is a stable, derivable start.
 *
 * Known and deliberate: weeks 1's Tuesday and Wednesday precede Thursday kickoff, so this
 * reports "in season" up to two days before the first game. No games exist in that window,
 * so nothing can be graded from it. Closing those two days requires asserting a real
 * kickoff timestamp, which is a schedule-data dependency, not a calendar rule.
 */
function seasonOpensAt(season) {
  return new Date(laborDay(season).getTime() + DAY_MS);
}

function getSeasonWeekInfo(now = new Date()) {
  // The league's own calendar day, not UTC. A UTC day boundary rolls the week at 8pm
  // Eastern the evening before, which is mid-Sunday-night-game for the whole west coast.
  const today = easternCalendarDay(now);
  const year = today.getUTCFullYear();
  const season = today.getUTCMonth() <= 1 ? year - 1 : year;

  // One anchor, shared with `getNflGameWeek`. See `seasonOpensAt`.
  const opensAt = seasonOpensAt(season);
  const rawWeek = Math.floor((today.getTime() - opensAt.getTime()) / WEEK_MS) + 1;
  const week = Math.min(18, Math.max(1, rawWeek));
  const seasonType = rawWeek > 18 ? "postseason" : "regular";

  return {
    season,
    week,
    season_type: seasonType,
    raw_week: rawWeek,
  };
}

/**
 * Season/week context for callers that need a usable week number.
 *
 * `week` is CLAMPED to 1-18. During the off-season `raw_week` is zero or negative and this
 * still reports `week: 1`, which is deliberate — downstream callers need a valid week — but
 * it is actively misleading on its own, and it has already caused real harm:
 *
 *   On 2026-08-27 a session read `GET /api/system/current-week` reporting
 *   `{season: 2026, week: 1, season_type: "regular"}` nine days BEFORE kickoff and recorded
 *   in facts-of-record #10 that "the 2026 floor is cleared; F6-F8 are no longer
 *   season-blocked". That was false. `isOffSeason()` was correct the whole time; the
 *   clamped week made the off-season look like Week 1.
 *
 * `is_off_season` is therefore returned alongside, so no caller has to infer seasonality
 * from a clamped number. **`is_off_season` is the authority; `week` is a usable default.**
 */
function getCurrentNflWeekContext(now = new Date()) {
  const { season, week, season_type: seasonType, raw_week: rawWeek } = getSeasonWeekInfo(now);

  return {
    season,
    week,
    season_type: seasonType,
    // Additive. `season_type` still reads "regular" before kickoff because it is derived
    // from the same clamp; correcting that is a contract change and is flagged rather than
    // made silently here.
    is_off_season: rawWeek < 1 || rawWeek > 18,
    raw_week: rawWeek,
  };
}

function isOffSeason(now = new Date()) {
  const { raw_week: rawWeek } = getSeasonWeekInfo(now);
  return rawWeek < 1 || rawWeek > 18;
}

/**
 * Week-1 preview switch.
 *
 * `isOffSeason()` was used as a single gate on six surfaces, and it was too
 * blunt: it suppressed **real provider data** — league standings, drafted
 * rosters, connected-league identity — alongside the recommendations it was
 * actually meant to hold back. Measured 2026-08-28 against real connected
 * leagues, all three providers return complete standings before kickoff
 * (Yahoo 10 teams, Sleeper 8, ESPN 12, every team 0-0), and the Omen engine
 * produces a genuine start/sit recommendation from a drafted Sleeper roster.
 * None of that needed to be hidden.
 *
 * The honest states survive: a pre-draft league still returns `empty` with
 * "Omen resumes for this league once the draft is complete", because that
 * comes from the provider's own draft status, not from this gate.
 *
 * `OMEN_WEEK1_PREVIEW=false` restores the previous behaviour on every surface
 * at once, by environment variable, with no redeploy. That is the kill switch.
 */
function week1PreviewEnabled() {
  return process.env.OMEN_WEEK1_PREVIEW !== "false";
}

/**
 * True when a surface should withhold live football data. Prefer this over
 * `isOffSeason()` at any user-facing surface. `isOffSeason()` remains the
 * honest answer to "has the season started" and must keep being used wherever
 * that is the actual question.
 */
function suppressLiveFootballData(now = new Date()) {
  return isOffSeason(now) && !week1PreviewEnabled();
}

function _logger() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return { info() {}, warn() {} };
  }
  return require("../middleware/logging").logger;
}

function _cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return entry.value;
}

function _cacheSet(key, value) {
  _cache.set(key, { value, ts: Date.now() });
}

/**
 * Fetch the ESPN scoreboard. Returns the raw events array or null.
 */
async function _fetchScoreboard() {
  const cached = _cacheGet("scoreboard");
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(ESPN_SCOREBOARD_URL, { signal: controller.signal });
    if (!res.ok) {
      _logger().warn("nflSchedule: ESPN API returned non-OK", { status: res.status });
      return null;
    }
    const data = await res.json();
    const events = data?.events || [];
    _cacheSet("scoreboard", events);
    return events;
  } catch (err) {
    _logger().warn("nflSchedule: ESPN API unavailable", { message: err?.message });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Find this week's game for a given team abbreviation.
 * teamAbbr: e.g. "KC", "SF", "NE"
 *
 * Returns:
 * {
 *   kickoff_utc:    ISO string,
 *   kickoff_local:  "1:00PM ET",
 *   tv_slate:       "Early 1PM" | "Late 4:25PM" | "Sunday Night" | "Monday Night" | "Thursday Night",
 *   home_away:      "Home" | "Away",
 *   opponent_abbr:  "BAL",
 *   opponent_name:  "Baltimore Ravens",
 *   venue_name:     "M&T Bank Stadium",
 *   is_dome:        false,
 *   venue_lat:      39.2779,
 *   venue_lng:      -76.6227,
 *   travel_miles:   0 (if home) or distance,
 * }
 * Returns null if no game found (bye week, offseason).
 */
async function getGameInfo(teamAbbr) {
  if (!teamAbbr) return null;
  const abbr = String(teamAbbr).toUpperCase();

  const cacheKey = `game:${abbr}`;
  const cached = _cacheGet(cacheKey);
  if (cached) return cached;

  const events = await _fetchScoreboard();
  if (!events || !events.length) return null;

  for (const event of events) {
    const competition = event?.competitions?.[0];
    if (!competition) continue;

    const competitors = competition?.competitors || [];
    const myTeam = competitors.find(
      c => String(c?.team?.abbreviation || "").toUpperCase() === abbr
    );
    if (!myTeam) continue;

    const oppTeam = competitors.find(
      c => String(c?.team?.abbreviation || "").toUpperCase() !== abbr
    );

    const homeAway    = myTeam.homeAway === "home" ? "Home" : "Away";
    const oppAbbr     = String(oppTeam?.team?.abbreviation || "").toUpperCase();
    const oppName     = oppTeam?.team?.displayName || oppAbbr;
    const kickoffUtc  = event?.date || null;
    const venueData   = competition?.venue || {};

    const homeTeamComp = competitors.find(c => c.homeAway === "home");
    const homeTeamAbbr = String(homeTeamComp?.team?.abbreviation || "").toUpperCase();
    const stadium      = getStadium(homeTeamAbbr);

    const travelMiles = homeAway === "Away"
      ? (stadiumDistanceMiles(abbr, homeTeamAbbr) || 0)
      : 0;

    const result = {
      kickoff_utc:   kickoffUtc,
      kickoff_local: _formatKickoff(kickoffUtc),
      tv_slate:      _getTvSlate(kickoffUtc, event?.name || ""),
      home_away:     homeAway,
      opponent_abbr: oppAbbr,
      opponent_name: oppName,
      venue_name:    stadium?.name || venueData?.fullName || "Unknown Venue",
      is_dome:       stadium?.is_dome ?? (venueData?.indoor || false),
      venue_lat:     stadium?.lat || null,
      venue_lng:     stadium?.lng || null,
      travel_miles:  travelMiles,
    };

    _cacheSet(cacheKey, result);
    return result;
  }

  _logger().info("nflSchedule: no game found for team", { team: abbr });
  return null;
}

function _formatKickoff(isoString) {
  if (!isoString) return "TBD";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour:     "numeric",
      minute:   "2-digit",
      hour12:   true,
    }) + " ET";
  } catch {
    return "TBD";
  }
}

function _getTvSlate(isoString, eventName) {
  if (!isoString) return "Unknown";

  const name = (eventName || "").toLowerCase();
  if (name.includes("monday night") || name.includes("mnf")) return "Monday Night";
  if (name.includes("thursday night") || name.includes("tnf")) return "Thursday Night";
  if (name.includes("sunday night") || name.includes("snf")) return "Sunday Night";

  try {
    const d = new Date(isoString);
    const hourET = Number(
      d.toLocaleString("en-US", {
        timeZone: "America/New_York",
        hour:     "numeric",
        hour12:   false,
      })
    );
    if (hourET >= 20) return "Sunday Night";
    if (hourET >= 16) return "Late 4:25PM";
    return "Early 1PM";
  } catch {
    return "Unknown";
  }
}

function __clearCache() {
  _cache.clear();
}


/**
 * The NFL **game week** — Tuesday-anchored, and the phase within it.
 *
 * ## Why this exists beside `getCurrentNflWeekContext`
 *
 * That function anchors on a fixed `Date.UTC(season, 8, 5)` and steps in 7-day blocks, so its
 * week boundary lands on whatever weekday September 5 happens to be. In 2026 that is a
 * **Saturday**, which means it reports the wrong week on the Sunday and Monday of every NFL
 * week — the two days most people open a fantasy app:
 *
 *   Sun 2026-09-13 is the Sunday of **NFL Week 1**; `getCurrentNflWeekContext` says week 2.
 *
 * The real NFL week runs Thursday night to Monday night and turns over on Tuesday, which is
 * also when fantasy waivers clear and when Omen's own scoring cron runs. So Tuesday is the
 * correct boundary, and the Saturday one is a defect — not a second valid convention.
 *
 * **This function is deliberately NOT wired into `getCurrentNflWeekContext`.** That value feeds
 * Tuesday scoring, the Omen engine, waiver analysis and every provider matchup read; changing
 * its boundary days before Week 1 is a founder decision with real blast radius, not a drive-by
 * fix. Reconciling the two is tracked as its own task. Until then this serves display copy
 * only, and the two WILL disagree on Sat/Sun/Mon — which is stated here so nobody later reads
 * the difference as drift.
 *
 * ## The anchor
 *
 * Week 1 kicks off the Thursday after Labor Day (first Monday in September), so game week 1
 * opens on the Tuesday before it — Labor Day + 1. Derived rather than hardcoded, so it stays
 * correct every season without an edit.
 *
 * ## The timezone
 *
 * Days are read in **America/New_York**, the league's own operating timezone, not UTC and not
 * the caller's. A user in Los Angeles at 9pm Monday is still on Monday in the league's week,
 * and a UTC boundary would have already moved them to Tuesday.
 */

const GAME_WEEK_PHASES = Object.freeze({
  PREPARING: "preparing",
  READY: "ready",
  LIVE: "live",
  OFF_SEASON: "off_season",
});

const DAY_NAMES = Object.freeze([
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
]);

/**
 * `{ week, phase, day, is_off_season }`.
 *
 * - `phase` is `preparing` on Tuesday (waivers cleared, last week scored, this week's plan
 *   being built), `ready` on Wednesday, and `live` Thursday through Monday.
 * - `week` is the week the phase refers to, which on Tuesday and Wednesday is the week about
 *   to be played — the same number the user will see on Sunday.
 * - `day` is the day in the league's timezone, so copy can vary across the live window.
 *
 * Off-season returns `week: null` rather than a clamped 1. The clamp on
 * `getCurrentNflWeekContext` is exactly what let a session record "the season floor is
 * cleared" nine days before kickoff (see that function's note), and display copy has no
 * reason to repeat the mistake — a headline naming a week that has not arrived is a lie the
 * user can see.
 */
function getNflGameWeek(now = new Date()) {
  const today = easternCalendarDay(now);
  const day = DAY_NAMES[today.getUTCDay()];

  // Which season are we in? Before September, the season that started last year.
  const year = today.getUTCFullYear();
  const seasonYear = today.getUTCMonth() <= 1 ? year - 1 : year;
  const opensAt = seasonOpensAt(seasonYear);

  const rawWeek = Math.floor((today.getTime() - opensAt.getTime()) / WEEK_MS) + 1;
  const offSeason = rawWeek < 1 || rawWeek > 18;

  if (offSeason) {
    return { season: seasonYear, week: null, phase: GAME_WEEK_PHASES.OFF_SEASON, day, is_off_season: true };
  }

  let phase;
  if (day === "tuesday") phase = GAME_WEEK_PHASES.PREPARING;
  else if (day === "wednesday") phase = GAME_WEEK_PHASES.READY;
  else phase = GAME_WEEK_PHASES.LIVE;

  return { season: seasonYear, week: rawWeek, phase, day, is_off_season: false };
}

module.exports = {
  getGameInfo,
  getCurrentNflWeekContext,
  getNflGameWeek,
  GAME_WEEK_PHASES,
  isOffSeason,
  week1PreviewEnabled,
  suppressLiveFootballData,
  __clearCache,
};
