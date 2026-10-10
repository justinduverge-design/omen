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

module.exports = { TEAMS, canonicalAbbreviation, teamIdFor, teamName, coachIdFor };
