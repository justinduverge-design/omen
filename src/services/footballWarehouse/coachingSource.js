"use strict";

// Coaching staffs by team and season, from Wikipedia's "<season> <franchise> season" pages, whose staff section
// lists "* Role – [[Coach page|Name]]". Facts only (who held which role); every row keeps its page title and
// revision for attribution (CC BY-SA). The coach's page title is his stable id, so one coach links across teams.

const crypto = require("node:crypto");

const API = "https://en.wikipedia.org/w/api.php";
// Wikimedia's API policy wants "<name>/<version> (<contact URL or email>) <library>"; a request without a
// reachable contact is rate-limited (429) far sooner. Api-User-Agent carries the same for browser-like clients.
const USER_AGENT = "OmenFootballWarehouse/1.0 (https://slopssaloon.com/; football data research) node";

// Franchise names as Wikipedia titles them, by season (relocations and renames since 1999).
function franchiseName(abbr, season) {
  const names = {
    ARI: "Arizona Cardinals",
    ATL: "Atlanta Falcons",
    BAL: "Baltimore Ravens",
    BUF: "Buffalo Bills",
    CAR: "Carolina Panthers",
    CHI: "Chicago Bears",
    CIN: "Cincinnati Bengals",
    CLE: "Cleveland Browns",
    DAL: "Dallas Cowboys",
    DEN: "Denver Broncos",
    DET: "Detroit Lions",
    GB: "Green Bay Packers",
    HOU: "Houston Texans",
    IND: "Indianapolis Colts",
    JAX: "Jacksonville Jaguars",
    KC: "Kansas City Chiefs",
    MIA: "Miami Dolphins",
    MIN: "Minnesota Vikings",
    NE: "New England Patriots",
    NO: "New Orleans Saints",
    NYG: "New York Giants",
    NYJ: "New York Jets",
    PHI: "Philadelphia Eagles",
    PIT: "Pittsburgh Steelers",
    SEA: "Seattle Seahawks",
    SF: "San Francisco 49ers",
    TB: "Tampa Bay Buccaneers",
    TEN: "Tennessee Titans",
  };
  if (names[abbr]) return abbr === "HOU" && season < 2002 ? null : names[abbr];
  if (abbr === "LV") return season >= 2020 ? "Las Vegas Raiders" : "Oakland Raiders";
  if (abbr === "LA") return season >= 2016 ? "Los Angeles Rams" : "St. Louis Rams";
  if (abbr === "LAC") return season >= 2017 ? "Los Angeles Chargers" : "San Diego Chargers";
  if (abbr === "WAS")
    return season >= 2022
      ? "Washington Commanders"
      : season >= 2020
        ? "Washington Football Team"
        : "Washington Redskins";
  return null;
}

const ROLE_PATTERNS = [
  ["head_coach", /^head coach$/i],
  ["assistant_head_coach", /assistant head coach/i],
  ["offensive_coordinator", /offensive coordinator/i],
  ["defensive_coordinator", /defensive coordinator/i],
  ["special_teams_coordinator", /special teams coordinator|^special teams$/i],
  ["passing_game_coordinator", /pass(ing)? game coordinator/i],
  ["run_game_coordinator", /run(ning)? game coordinator/i],
];

/** Roles in one staff title ("Assistant head coach/defensive coordinator" -> two roles). */
function rolesOf(title) {
  const parts = String(title)
    .split(/\s*\/\s*|\s+and\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const roles = new Set();
  for (const part of parts) for (const [role, re] of ROLE_PATTERNS) if (re.test(part)) roles.add(role);
  if (/^head coach$/i.test(String(title).trim())) roles.add("head_coach");
  return [...roles];
}

/** [{ role, coachTitle, coachName }] from a team-season page's wikitext; only lines naming a linked coach. */
function parseStaff(wikitext) {
  const out = [];
  const seen = new Set();
  for (const line of String(wikitext || "").split("\n")) {
    const m = /^\s*\*\s*([^–—\-\[\]]+?)\s*[–—-]\s*\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/.exec(line);
    if (!m) continue;
    const roles = rolesOf(m[1]);
    if (!roles.length) continue;
    const coachTitle = m[2].trim().replace(/_/g, " ");
    const coachName = (m[3] || m[2]).trim();
    for (const role of roles) {
      const key = `${role}|${coachTitle}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ role, coachTitle, coachName });
    }
  }
  return out;
}

function coachIdFor(title) {
  const slug = String(title)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
  return `omen:coach:${slug}`;
}

/** Fetch and parse one team-season page. Returns null when the page does not exist. */
async function fetchTeamSeason({ abbr, season, fetchImpl = globalThis.fetch }) {
  const name = franchiseName(abbr, season);
  if (!name) return null;
  const title = `${season} ${name} season`;
  const url = new URL(API);
  for (const [k, v] of Object.entries({
    action: "parse",
    page: title,
    prop: "wikitext|revid",
    format: "json",
    redirects: "1",
  }))
    url.searchParams.set(k, v);
  const response = await fetchImpl(url, {
    headers: { "User-Agent": USER_AGENT, "Api-User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok)
    throw Object.assign(new Error("wikipedia fetch failed"), { code: `source_http_${response.status}` });
  const body = await response.json();
  if (body?.error) return null;
  const wikitext = body?.parse?.wikitext?.["*"] || "";
  return {
    title,
    revisionId: Number(body?.parse?.revid) || null,
    sourceRef: `sha256:${crypto.createHash("sha256").update(wikitext).digest("hex")}`,
    staff: parseStaff(wikitext),
  };
}

module.exports = { franchiseName, rolesOf, parseStaff, coachIdFor, fetchTeamSeason, USER_AGENT };
