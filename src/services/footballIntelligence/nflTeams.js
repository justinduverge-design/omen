"use strict";

/**
 * The 32 NFL teams by the abbreviations nflverse and the providers use, with Omen's stable team ids.
 * One id per franchise as it plays today (`omen:team:<abbreviation>`). The relocated franchises keep
 * their current abbreviation (LV, LAC, LA); historical seasons under the old name map to the same id,
 * because nflverse already reports those seasons under today's abbreviation.
 */

const TEAMS = Object.freeze({
  ARI: "Arizona", ATL: "Atlanta", BAL: "Baltimore", BUF: "Buffalo", CAR: "Carolina", CHI: "Chicago",
  CIN: "Cincinnati", CLE: "Cleveland", DAL: "Dallas", DEN: "Denver", DET: "Detroit", GB: "Green Bay",
  HOU: "Houston", IND: "Indianapolis", JAX: "Jacksonville", KC: "Kansas City", LA: "the Rams",
  LAC: "the Chargers", LV: "Las Vegas", MIA: "Miami", MIN: "Minnesota", NE: "New England", NO: "New Orleans",
  NYG: "the Giants", NYJ: "the Jets", PHI: "Philadelphia", PIT: "Pittsburgh", SEA: "Seattle", SF: "San Francisco",
  TB: "Tampa Bay", TEN: "Tennessee", WAS: "Washington",
});

// Provider spellings that differ from nflverse's.
const ALIASES = Object.freeze({ JAC: "JAX", WSH: "WAS", LAR: "LA", OAK: "LV", SD: "LAC", STL: "LA", ARZ: "ARI", BLT: "BAL", CLV: "CLE", HST: "HOU", SL: "LA", GNB: "GB", KAN: "KC", NWE: "NE", NOR: "NO", SFO: "SF", TAM: "TB" });

// ESPN's proTeamId and Yahoo's team number share one numbering (verified on live leagues 2026-10-16):
// ESPN defenses are -16000 - n, Yahoo defenses 100000 + n. Mirrors football.team_ids (migration 0011).
const PROVIDER_TEAM_NUMBERS = Object.freeze({"ARI": 22, "ATL": 1, "BAL": 33, "BUF": 2, "CAR": 29, "CHI": 3, "CIN": 4, "CLE": 5, "DAL": 6, "DEN": 7, "DET": 8, "GB": 9, "HOU": 34, "IND": 11, "JAX": 30, "KC": 12, "LA": 14, "LAC": 24, "LV": 13, "MIA": 15, "MIN": 16, "NE": 17, "NO": 18, "NYG": 19, "NYJ": 20, "PHI": 21, "PIT": 23, "SEA": 26, "SF": 25, "TB": 27, "TEN": 10, "WAS": 28});
const ABBR_BY_NUMBER = Object.freeze(Object.fromEntries(Object.entries(PROVIDER_TEAM_NUMBERS).map(([abbr, n]) => [n, abbr])));

/** Team abbreviation for an ESPN proTeamId or Yahoo team number, or null. */
function abbreviationForProviderNumber(value) {
  const n = Number(value);
  return Number.isInteger(n) ? ABBR_BY_NUMBER[n] || null : null;
}

function canonicalAbbreviation(value) {
  const upper = String(value || "").trim().toUpperCase();
  const abbr = ALIASES[upper] || upper;
  return TEAMS[abbr] ? abbr : null;
}

function teamIdFor(value) {
  const abbr = canonicalAbbreviation(value);
  return abbr ? `omen:team:${abbr.toLowerCase()}` : null;
}

function teamName(value) {
  const abbr = canonicalAbbreviation(value);
  return abbr ? TEAMS[abbr] : null;
}

function coachIdFor(name) {
  const slug = String(name || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug ? `omen:coach:${slug}` : null;
}

module.exports = {
  PROVIDER_TEAM_NUMBERS,
  abbreviationForProviderNumber, TEAMS, canonicalAbbreviation, teamIdFor, teamName, coachIdFor };
