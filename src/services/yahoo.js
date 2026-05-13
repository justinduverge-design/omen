"use strict";

/**
 * =================================================================
 * Yahoo Fantasy Sports client
 * -----------------------------------------------------------------
 * OAuth 2.0 + PKCE handshake (authorize URL, code exchange,
 * refresh) plus typed data fetchers (roster, current week,
 * standings, player stats).
 *
 * Yahoo's response shape is famously deep + array-positional
 * (e.g. team[0] holds metadata, team[1] holds standings stats).
 * Parsers are intentionally defensive - any path that's missing
 * returns a sensible default rather than throwing, so a partial
 * Yahoo outage degrades gracefully instead of breaking the API.
 * =================================================================
 */

const { getYahooAuthUrl, exchangeYahooCode, refreshYahooToken } = require("../middleware/yahooOAuth");

const BASE = "https://fantasysports.yahooapis.com/fantasy/v2";

class YahooClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  // ---- OAuth helpers (static) ----------------------------------

  static generatePKCE() {
    return { verifier: null, challenge: null };
  }

  static getAuthUrl(state) {
    return getYahooAuthUrl(state);
  }

  static async exchangeCode(code) {
    return exchangeYahooCode(code);
  }

  static async refreshToken(refreshToken) {
    return refreshYahooToken(refreshToken);
  }

  // ---- Low-level GET --------------------------------------------

  async get(path) {
    const res = await fetch(`${BASE}${path}?format=json`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (res.status === 401) throw new Error("yahoo_token_expired");
    if (!res.ok) throw new Error(`Yahoo API error: ${res.status}`);
    return res.json();
  }

  // ---- High-level data fetchers ---------------------------------

  /** Get the user's team_key inside a given league (league_key like 'nfl.l.12345'). */
  async getMyTeamKey(leagueKey) {
    const d = await this.get(`/users;use_login=1/games;game_keys=nfl/leagues;league_keys=${leagueKey}/teams`);
    // Walk: fantasy_content.users[0].user[1].games[0].game[1].leagues[0].league[1].teams[0].team[0]
    const u   = d?.fantasy_content?.users?.[0]?.user;
    const lg  = u?.[1]?.games?.[0]?.game?.[1]?.leagues?.[0]?.league;
    const tm  = lg?.[1]?.teams?.[0]?.team?.[0];
    if (!tm) return null;
    const keyEntry = Array.isArray(tm) ? tm.find(x => x?.team_key) : null;
    return keyEntry?.team_key || null;
  }

  /** Get the current league week (used when /roster?week= isn't passed). */
  async getCurrentWeek(leagueKey) {
    const d = await this.get(`/league/${leagueKey}`);
    const meta = d?.fantasy_content?.league?.[0];
    if (Array.isArray(meta)) {
      const wEntry = meta.find(x => x?.current_week);
      if (wEntry?.current_week) return parseInt(wEntry.current_week, 10);
    }
    return null;
  }

  /** Roster for a team at a given week. Returns raw Yahoo response. */
  async getRoster(teamKey, week) {
    const path = week
      ? `/team/${teamKey}/roster;week=${week}`
      : `/team/${teamKey}/roster`;
    return this.get(path);
  }

  /**
   * Fetch available (waiver/free agent) players for a league.
   * Yahoo paginates at 25 max; we'll request `count` (capped at 50) sorted
   * by Average Rank ('AR') so the highest-value players come first.
   *
   * Returns: raw Yahoo response. Use rosterSvc.normalizeYahooWaivers()
   * to flatten into the shape the optimizer expects.
   */
  async getAvailablePlayers(leagueKey, opts = {}) {
    const count = Math.min(opts.count || 50, 50);
    const sort  = opts.sort  || "AR";    // AR = Average Rank
    return this.get(`/league/${leagueKey}/players;status=A;sort=${sort};count=${count};start=0`);
  }

  /** Standings (used elsewhere, kept for compat). */
  async getLeagueStandings(leagueKey) {
    const d = await this.get(`/league/${leagueKey}/standings`);
    const standings = d?.fantasy_content?.league?.[1]?.standings?.[0]?.teams;
    if (!standings) return [];
    return Object.values(standings)
      .filter(t => t?.team)
      .map((t, i) => {
        const info  = t.team[0];
        const stats = t.team[2]?.team_standings;
        return {
          rank:    parseInt(stats?.rank) || i + 1,
          name:    info?.find?.(x => x?.name)?.name || "Unknown",
          rec:     `${stats?.outcome_totals?.wins || 0}-${stats?.outcome_totals?.losses || 0}`,
          pts:     stats?.points_for?.toFixed?.(2) || "0.00",
          pts_num: parseFloat(stats?.points_for) || 0,
          me:      false,
        };
      });
  }
}

module.exports = YahooClient;
