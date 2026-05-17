"use strict";

/**
 * NFL stadium coordinates and metadata.
 * Used to look up venue location for weather calls and dome status.
 * Updated for 2026 season. Revisit each August.
 *
 * Keys are ESPN team abbreviations (matching the scoreboard API).
 * Teams sharing a stadium (LAC/LAR, NYG/NYJ) have separate entries.
 */
const NFL_STADIUMS = Object.freeze({
  ARI: { lat: 33.5276,  lng: -112.2626, name: "State Farm Stadium",       is_dome: true  },
  ATL: { lat: 33.7554,  lng: -84.4010,  name: "Mercedes-Benz Stadium",    is_dome: true  },
  BAL: { lat: 39.2779,  lng: -76.6227,  name: "M&T Bank Stadium",         is_dome: false },
  BUF: { lat: 42.7738,  lng: -78.7870,  name: "Highmark Stadium",         is_dome: false },
  CAR: { lat: 35.2258,  lng: -80.8529,  name: "Bank of America Stadium",  is_dome: false },
  CHI: { lat: 41.8623,  lng: -87.6167,  name: "Soldier Field",            is_dome: false },
  CIN: { lat: 39.0954,  lng: -84.5160,  name: "Paycor Stadium",           is_dome: false },
  CLE: { lat: 41.5061,  lng: -81.6995,  name: "Cleveland Browns Stadium", is_dome: false },
  DAL: { lat: 32.7480,  lng: -97.0929,  name: "AT&T Stadium",             is_dome: true  },
  DEN: { lat: 39.7439,  lng: -105.0200, name: "Empower Field",            is_dome: false },
  DET: { lat: 42.3400,  lng: -83.0456,  name: "Ford Field",               is_dome: true  },
  GB:  { lat: 44.5013,  lng: -88.0622,  name: "Lambeau Field",            is_dome: false },
  HOU: { lat: 29.6847,  lng: -95.4107,  name: "NRG Stadium",              is_dome: true  },
  IND: { lat: 39.7601,  lng: -86.1639,  name: "Lucas Oil Stadium",        is_dome: true  },
  JAX: { lat: 30.3239,  lng: -81.6375,  name: "EverBank Stadium",         is_dome: false },
  KC:  { lat: 39.0489,  lng: -94.4839,  name: "Arrowhead Stadium",        is_dome: false },
  LAC: { lat: 33.9534,  lng: -118.3392, name: "SoFi Stadium",             is_dome: true  },
  LAR: { lat: 33.9534,  lng: -118.3392, name: "SoFi Stadium",             is_dome: true  },
  LV:  { lat: 36.0909,  lng: -115.1833, name: "Allegiant Stadium",        is_dome: true  },
  MIA: { lat: 25.9579,  lng: -80.2389,  name: "Hard Rock Stadium",        is_dome: false },
  MIN: { lat: 44.9736,  lng: -93.2575,  name: "U.S. Bank Stadium",        is_dome: true  },
  NE:  { lat: 42.0909,  lng: -71.2643,  name: "Gillette Stadium",         is_dome: false },
  NO:  { lat: 29.9511,  lng: -90.0812,  name: "Caesars Superdome",        is_dome: true  },
  NYG: { lat: 40.8135,  lng: -74.0745,  name: "MetLife Stadium",          is_dome: false },
  NYJ: { lat: 40.8135,  lng: -74.0745,  name: "MetLife Stadium",          is_dome: false },
  PHI: { lat: 39.9008,  lng: -75.1675,  name: "Lincoln Financial Field",  is_dome: false },
  PIT: { lat: 40.4468,  lng: -80.0158,  name: "Acrisure Stadium",         is_dome: false },
  SEA: { lat: 47.5952,  lng: -122.3316, name: "Lumen Field",              is_dome: false },
  SF:  { lat: 37.4033,  lng: -121.9694, name: "Levi's Stadium",           is_dome: false },
  TB:  { lat: 27.9759,  lng: -82.5033,  name: "Raymond James Stadium",    is_dome: false },
  TEN: { lat: 36.1665,  lng: -86.7713,  name: "Nissan Stadium",           is_dome: false },
  WAS: { lat: 38.9078,  lng: -76.8645,  name: "Northwest Stadium",        is_dome: false },
});

/**
 * Get stadium data for a team abbreviation.
 * Returns null if not found.
 */
function getStadium(teamAbbr) {
  if (!teamAbbr) return null;
  return NFL_STADIUMS[String(teamAbbr).toUpperCase()] || null;
}

/**
 * Rough straight-line distance between two stadiums in miles.
 * Used for travel burden calculation.
 */
function stadiumDistanceMiles(teamAbbr1, teamAbbr2) {
  const s1 = getStadium(teamAbbr1);
  const s2 = getStadium(teamAbbr2);
  if (!s1 || !s2) return null;

  const R = 3958.8; // Earth radius in miles
  const lat1 = (s1.lat * Math.PI) / 180;
  const lat2 = (s2.lat * Math.PI) / 180;
  const dlat = lat2 - lat1;
  const dlng = ((s2.lng - s1.lng) * Math.PI) / 180;
  const a = Math.sin(dlat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng / 2) ** 2;

  return Math.round(R * 2 * Math.asin(Math.sqrt(a)));
}

module.exports = { NFL_STADIUMS, getStadium, stadiumDistanceMiles };
