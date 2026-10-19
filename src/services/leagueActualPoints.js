"use strict";

/**
 * The fantasy points a player actually scored in a given week, as THE LEAGUE scored them: read from the
 * connected provider, so the league's own rules decide the number, not an estimate from public stat lines.
 *
 *   Sleeper  /league/{id}/matchups/{week}: players_points per roster (public).
 *   ESPN     mMatchup for the week, each roster entry's applied actual total (the user's connection).
 *   Yahoo    /league/{key}/players;player_keys=.../stats;type=week;week=N player_points (the user's connection).
 *
 * Returns Map(providerPlayerId -> points). A player the league does not report is absent, never 0.
 */

const sleeperAdapter = require("../adapters/sleeper");
const espnAdapter = require("../adapters/espn");

async function sleeperPoints({ leagueId, week, fetchMatchups = sleeperAdapter.fetchSleeperMatchups }) {
  const rows = await fetchMatchups(leagueId, week);
  const out = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    for (const [id, points] of Object.entries(row?.players_points || {})) {
      const value = Number(points);
      if (Number.isFinite(value)) out.set(String(id), value);
    }
  }
  return out;
}

async function espnPoints({ leagueId, week, credentials, fetchRosters = espnAdapter.fetchEspnLeagueRosters }) {
  const rosters = await fetchRosters(leagueId, credentials.espn_s2, credentials.swid, { week });
  const out = new Map();
  for (const team of rosters?.teams || []) {
    for (const player of team?.players || []) {
      const value = Number(player?.actual_points);
      if (player?.player_id && player.actual_points != null && Number.isFinite(value))
        out.set(String(player.player_id), value);
    }
  }
  return out;
}

/** Walk Yahoo's nested arrays for each player's key and week points. */
function yahooPointsFromResponse(data) {
  const out = new Map();
  const players = data?.fantasy_content?.league?.[1]?.players || {};
  for (const [k, entry] of Object.entries(players)) {
    if (k === "count") continue;
    let key = null;
    let total = null;
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (typeof node.player_key === "string") key = node.player_key;
      if (node.player_points && node.player_points.total != null) total = Number(node.player_points.total);
      Object.values(node).forEach(walk);
    };
    walk(entry?.player);
    if (key && Number.isFinite(total)) out.set(key, total);
  }
  return out;
}

async function yahooPoints({ leagueKey, week, playerKeys, client }) {
  const keys = [...new Set(playerKeys)].filter((key) => /^\d+\.p\.\d+$/.test(key));
  if (!keys.length) return new Map();
  const out = new Map();
  for (let i = 0; i < keys.length; i += 25) {
    const batch = keys.slice(i, i + 25);
    const data = await client.get(
      `/league/${leagueKey}/players;player_keys=${batch.join(",")}/stats;type=week;week=${week}`,
    );
    for (const [key, value] of yahooPointsFromResponse(data)) out.set(key, value);
  }
  return out;
}

module.exports = { sleeperPoints, espnPoints, yahooPoints, yahooPointsFromResponse };
