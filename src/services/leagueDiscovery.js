"use strict";

/**
 * "Which leagues does this account actually play in, and which team is the user in
 * each" — asked of a provider, in one call, for verification rather than display.
 *
 * Two callers need exactly this and would otherwise drift apart:
 *
 *   - `src/routes/leagues.js` verifies a multiselect before storing follows;
 *   - `src/routes/league.js` verifies `?leagueId=` before serving an overview for a
 *     league that is not the one bound on the connection row.
 *
 * That second caller is the whole reason this exists. `platform_connections` holds one
 * `league_id` per provider, so `selectConnections` could only ever serve the bound
 * league — asking for any other league the user genuinely plays in returned 404. But a
 * provider's credentials are per-ACCOUNT, not per-league: the adapters can read any
 * league the account belongs to. The 404 was a limit of the row shape leaking into the
 * API, not a limit of the provider.
 *
 * Returns a Map keyed by league id so the caller gets the per-league team id along with
 * the membership check. That team id matters for ESPN specifically, where
 * `platform_connections.espn_team_id` can only describe one league and would be wrong
 * for every other.
 *
 * SECURITY: credentials are read to make the call and never returned or logged
 * (facts-of-record #6).
 */

const { getAuthenticatedYahooClient } = require("./yahooAuth");
const { getAuthenticatedEspnCredentials } = require("./espnAuth");
const sleeperAdapter = require("../adapters/sleeper");
const espnAdapter = require("../adapters/espn");
const { usableLeagueId } = require("./activeSelection");

/** `Map<league_id, { league_id, league_name, season, team_id, team_name }>` */
async function discoverLeagues(row, userId, season) {
  const platform = row?.platform;

  if (platform === "yahoo") {
    const { client } = await getAuthenticatedYahooClient(userId);
    const leagues = await client.getUserLeagues();
    return toMap((leagues || []).map((league) => ({
      league_id: String(league.league_id),
      league_name: league.name || null,
      season: league.season == null ? null : Number(league.season),
      team_id: null,
      team_name: null,
    })));
  }

  if (platform === "sleeper") {
    const sleeperUserId = row.platform_user_id
      || (row.platform_username
        ? (await sleeperAdapter.fetchSleeperUser(row.platform_username)).user_id
        : null);
    if (!sleeperUserId) return new Map();
    const leagues = await sleeperAdapter.fetchSleeperLeagues(sleeperUserId, season);
    return toMap((leagues || []).map((league) => ({
      league_id: String(league.league_id || league.id),
      league_name: league.name || null,
      season: league.season == null ? null : Number(league.season),
      team_id: null,
      team_name: null,
    })).filter((league) => league.league_id && league.league_id !== "undefined"));
  }

  if (platform === "espn") {
    try {
      const credentials = await getAuthenticatedEspnCredentials(userId);
      const leagues = await espnAdapter.fetchEspnFanLeagues(credentials.espn_s2, credentials.swid, { season });
      if (leagues.length) return toMap(leagues.map((league) => ({ ...league, league_id: String(league.league_id) })));
    } catch {
      // Discovery is best-effort. The bound league below is still a true answer, and
      // rejecting it would break a connection that works.
    }
    if (!usableLeagueId(row)) return new Map();
    return toMap([{
      league_id: String(row.league_id),
      league_name: null,
      season: season == null ? null : Number(season),
      team_id: row.espn_team_id == null ? null : String(row.espn_team_id),
      team_name: null,
    }]);
  }

  return new Map();
}

function toMap(leagues) {
  return new Map(leagues.map((league) => [league.league_id, league]));
}

/**
 * A connection row rewritten to point at a league the user asked for.
 *
 * Returns `null` when no connected provider claims that league — which the caller must
 * treat as "not yours", not as "provider down". Never fabricates a connection: the row
 * it returns is a real one, with its real credentials, aimed at a league the provider
 * itself just confirmed.
 *
 * For ESPN the per-league `team_id` from discovery replaces `espn_team_id`, because that
 * column describes the bound league and is simply wrong for any other.
 */
async function connectionForLeague(rows, { platform, leagueId, userId, season, isUsable }) {
  const wanted = String(leagueId);
  const candidates = (rows || [])
    .filter((row) => (isUsable ? isUsable(row) : true))
    .filter((row) => !platform || row.platform === platform);

  for (const row of candidates) {
    let leagues;
    try {
      leagues = await discoverLeagues(row, userId, season);
    } catch {
      continue;
    }
    const match = leagues.get(wanted);
    if (!match) continue;

    return {
      ...row,
      league_id: wanted,
      espn_team_id: row.platform === "espn"
        ? (match.team_id ?? row.espn_team_id ?? null)
        : row.espn_team_id,
    };
  }
  return null;
}

module.exports = { discoverLeagues, connectionForLeague };
