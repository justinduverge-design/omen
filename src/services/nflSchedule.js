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

function getCurrentNflWeekContext(now = new Date()) {
  const current = new Date(now);
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const season = month <= 1 ? year - 1 : year;
  const regularSeasonStart = Date.UTC(season, 8, 5);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const rawWeek = Math.floor((current.getTime() - regularSeasonStart) / weekMs) + 1;
  const week = Math.min(18, Math.max(1, rawWeek));
  const seasonType = rawWeek > 18 ? "postseason" : "regular";

  return {
    season,
    week,
    season_type: seasonType,
  };
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

/**
 * Fetch the real ESPN scoreboard for one specific NFL week (not just "now").
 * Returns the raw events array or null on failure.
 */
async function _fetchWeekScoreboard(season, week) {
  const cacheKey = `weekscore:${season}:${week}`;
  const cached = _cacheGet(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `${ESPN_SCOREBOARD_URL}?week=${week}&seasontype=2&dates=${season}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      _logger().warn("nflSchedule: week scoreboard returned non-OK", { status: res.status, season, week });
      return null;
    }
    const data = await res.json();
    const events = Array.isArray(data?.events) ? data.events : [];
    _cacheSet(cacheKey, events);
    return events;
  } catch (err) {
    _logger().warn("nflSchedule: week scoreboard unavailable", { message: err?.message, season, week });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function _isWeekComplete(events) {
  if (!Array.isArray(events) || !events.length) return false;
  return events.every((event) => Boolean(event?.competitions?.[0]?.status?.type?.completed));
}

function _earliestKickoff(events) {
  const dates = (Array.isArray(events) ? events : [])
    .map((event) => event?.date)
    .filter(Boolean)
    .sort();
  return dates[0] || null;
}

/**
 * Determine the most recently *completed* NFL week (every game final),
 * confirmed against the real ESPN schedule rather than assumed from
 * calendar math. Returns { season, week, kickoff_utc }; `week` and
 * `kickoff_utc` are null when no week has fully completed yet
 * (e.g. preseason, or the season's first week still in progress).
 */
async function getLastCompletedNflWeek(now = new Date()) {
  const context = getCurrentNflWeekContext(now);

  const currentEvents = await _fetchWeekScoreboard(context.season, context.week);
  if (_isWeekComplete(currentEvents)) {
    return { season: context.season, week: context.week, kickoff_utc: _earliestKickoff(currentEvents) };
  }

  const priorWeek = context.week - 1;
  if (priorWeek < 1) {
    return { season: context.season, week: null, kickoff_utc: null };
  }

  const priorEvents = await _fetchWeekScoreboard(context.season, priorWeek);
  if (!_isWeekComplete(priorEvents)) {
    return { season: context.season, week: null, kickoff_utc: null };
  }

  return { season: context.season, week: priorWeek, kickoff_utc: _earliestKickoff(priorEvents) };
}

function __clearCache() {
  _cache.clear();
}

module.exports = {
  getGameInfo,
  getCurrentNflWeekContext,
  getLastCompletedNflWeek,
  __clearCache,
};
