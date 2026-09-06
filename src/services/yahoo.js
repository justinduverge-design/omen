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
const { captureProviderError } = require("../middleware/providerErrors");

const BASE = "https://fantasysports.yahooapis.com/fantasy/v2";

/**
 * Read attributes off a Yahoo entity, whichever of its TWO serialisations
 * Yahoo used. Both shapes are real and the choice is per-endpoint, so the
 * only safe move is to accept either.
 *
 * Measured against live traffic 2026-08-28:
 *
 *   FLAT OBJECT  { league_key: "470.l.1255365", current_week: 1, … }
 *     - /league/{key}                                    -> league[0]
 *     - /users;use_login=1/games;game_keys=nfl/leagues   -> league[0]
 *
 *   ARRAY of single-key objects  [ {team_key}, {team_id}, {name}, … ]
 *     - /users;…/leagues;league_keys={key}/teams         -> team[0]
 *
 * Returns a `key => value | null` reader, or null if there is nothing to read.
 *
 * Why this exists: three parsers here independently did
 * `if (!Array.isArray(x)) return {}` and so returned empty for every
 * flat-object endpoint — silently, because every one of them is written to
 * degrade rather than throw. `getUserLeagues()` returning [] meant no Yahoo
 * league could ever be bound; `getLeagueMetadata()`/`getCurrentWeek()`
 * returning {}/null meant a bound league served no metadata. All three were
 * found on 2026-08-28, the first day the entitlement allowed these calls to
 * run for real.
 *
 * The unit tests passed throughout, because their fixtures were hand-built
 * from the assumed array shape. Fixtures for anything Yahoo returns must come
 * from captured traffic, not from what the parser expects.
 */
function yahooAttrReader(raw) {
  if (!raw || typeof raw !== "object") return null;
  return Array.isArray(raw)
    ? key => raw.find(x => x?.[key])?.[key] ?? null
    : key => raw[key] ?? null;
}

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
    const separator = path.includes("?") ? "&" : "?";
    const res = await fetch(`${BASE}${path}${separator}format=json`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (res.status === 401) throw new Error("yahoo_token_expired");
    if (!res.ok) {
      /**
       * Attach Yahoo's own explanation to the error rather than discarding it.
       *
       * This line previously threw the bare status code, which is why eight
       * days of Yahoo 403 diagnosis ran on three digits and no reason. Yahoo
       * returns a JSON (sometimes HTML) body describing *which* 403 this is,
       * and at least four distinct failures share the status: missing Fantasy
       * entitlement, a blocked source IP, rate limiting, and a wrong-audience
       * token. Those have completely different remedies, and the status code
       * cannot tell them apart.
       *
       * The message prefix is unchanged so existing callers and tests that
       * match on "Yahoo API error: <status>" keep working; the detail rides
       * along on properties for diagnostics that want it.
       */
      let body = "";
      try {
        body = (await res.text()).slice(0, 2000);
      } catch {
        body = "<unreadable>";
      }
      const err = new Error(`Yahoo API error: ${res.status}`);
      err.status = res.status;
      err.body = body;
      err.wwwAuthenticate = res.headers.get("www-authenticate") || null;

      // O8: report it. The 401 above is deliberately *not* reported — it is
      // the ordinary expired-token path the refresh handles, and it is the
      // single highest-volume Yahoo error there is. Everything that reaches
      // here is a condition a human has to look at.
      captureProviderError({
        provider: "yahoo",
        operation: "api_get",
        error: err,
        context: { path: path.split("?")[0], http_status: res.status },
      });

      throw err;
    }
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
    // team[0] is the ARRAY shape here (confirmed live 2026-08-28); the reader
    // handles both so this cannot break if Yahoo flattens it later.
    const entry = yahooAttrReader(tm);
    return entry?.("team_key") || null;
  }

  /**
   * List the logged-in user's NFL leagues for the current game.
   * Returns [{league_id, name, season}] - league_id is Yahoo's league_key
   * (e.g. '449.l.123'), the same value every other method on this class
   * expects as leagueKey. No separate raw league_key field on purpose:
   * every caller in this codebase already treats league_id as the full
   * dotted key, and exposing two similarly-named fields is how a caller
   * ends up persisting the wrong one.
   */
  async getUserLeagues() {
    return this.#parseUserLeagues(await this.get("/users;use_login=1/games;game_keys=nfl/leagues"));
  }

  /**
   * Shared by both league endpoints. One parser, so the `/teams` variant cannot quietly drift
   * from the plain one — a second copy is how the two Yahoo shapes diverged before.
   */
  #parseUserLeagues(d) {
    const user = d?.fantasy_content?.users?.[0]?.user;
    const games = user?.[1]?.games;
    if (!games) return [];

    const leagues = [];
    for (const gameEntry of Object.values(games).filter(g => g?.game)) {
      const leaguesContainer = gameEntry.game?.[1]?.leagues;
      if (!leaguesContainer) continue;

      for (const leagueEntry of Object.values(leaguesContainer).filter(l => l?.league)) {
        const entry = yahooAttrReader(leagueEntry.league?.[0]);
        if (!entry) continue;
        const leagueKey = entry("league_key");
        if (!leagueKey) continue;
        // The `/teams` sub-resource puts the user's team inside each league. Read defensively:
        // this method is also used against the plain `/leagues` path, where it is simply absent.
        const team = leagueEntry.league?.[1]?.teams?.[0]?.team?.[0];
        const teamEntry = team ? yahooAttrReader(team) : null;

        leagues.push({
          league_id: leagueKey,
          name: entry("name"),
          season: Number(entry("season")) || null,
          ...(teamEntry ? {
            team_id: teamEntry("team_id") || null,
            team_name: teamEntry("name") || null,
          } : {}),
        });
      }
    }
    return leagues;
  }

  /**
   * The user's leagues **with the user's own team in each**, falling back to `getUserLeagues()`.
   *
   * Yahoo rows in the switcher carried no team at all until 2026-09-05: `yahooLeagues` built
   * them without a team id or name, so every Yahoo league showed its league title where a team
   * name belongs and a user with two Yahoo teams could not tell them apart.
   *
   * ## Why this is a separate method rather than a change to `getUserLeagues`
   *
   * The `/teams` sub-resource is a **different endpoint**, and Yahoo returns materially
   * different JSON shapes from endpoints that look related — the fixtures in `yahoo.test.js`
   * exist because `league[0]` is a flat object on one path and an array of single-key objects
   * on another, and a parser that assumed one shape returned `[]` for the other, which made
   * every Yahoo bind fail.
   *
   * That failure mode is unacceptable here: losing a team name is cosmetic, losing the league
   * list means the user cannot select a Yahoo league at all. So this asks for the richer
   * response, and **if it yields nothing it falls back to the endpoint we have verified against
   * real traffic**. The worst case is exactly today's behaviour.
   *
   * The `/teams` shape has NOT been confirmed against live Yahoo traffic — hence the fallback
   * rather than a rewrite. Once it is, this can collapse into `getUserLeagues`.
   */
  async getUserLeaguesWithTeams() {
    try {
      const leagues = await this.#parseUserLeagues(
        await this.get("/users;use_login=1/games;game_keys=nfl/leagues/teams")
      );
      if (leagues.length) return leagues;
    } catch {
      // Fall through: an unusable richer response must never cost the user their league list.
    }
    return this.getUserLeagues();
  }

  /** Get the current league week (used when /roster?week= isn't passed). */
  async getCurrentWeek(leagueKey) {
    const d = await this.get(`/league/${leagueKey}`);
    const entry = yahooAttrReader(d?.fantasy_content?.league?.[0]);
    const week = entry?.("current_week");
    return week ? parseInt(week, 10) : null;
  }

  async getLeagueMetadata(leagueKey) {
    const d = await this.get(`/league/${leagueKey}`);
    const entry = yahooAttrReader(d?.fantasy_content?.league?.[0]);
    if (!entry) return {};
    return {
      league_id: leagueKey,
      league_name: entry("name"),
      season: Number(entry("season")) || null,
      week: Number(entry("current_week")) || null,
    };
  }

  /**
   * Raw league settings, for waiver-system verification
   * (league-aware-waiver-system-v1 Phase 0, Yahoo).
   *
   * Returns the RAW settings entity rather than a parsed shape. Nothing here
   * has been seen in live traffic: Yahoo is entitlement-refused
   * (facts-of-record #11), so this call has never run for real and its shape is
   * unknown. Parsing it here would repeat the 2026-08-28 defect documented at
   * the top of this file — three parsers written against an assumed shape,
   * silently returning empty against the real one, with unit tests passing
   * throughout because the fixtures were hand-built.
   *
   * The caller maps it and fails closed. Do not add parsing here until captured
   * traffic exists.
   */
  async getLeagueSettings(leagueKey) {
    const d = await this.get(`/league/${leagueKey}/settings`);
    return d?.fantasy_content?.league ?? null;
  }

  /** Roster for a team at a given week. Returns raw Yahoo response. */
  async getRoster(teamKey, week) {
    const path = week
      ? `/team/${teamKey}/roster;week=${week}`
      : `/team/${teamKey}/roster`;
    return this.get(path);
  }

  async getProjectedStats(teamKey, week) {
    try {
      const path = `/team/${teamKey}/stats;type=projected;week=${week}`;
      const d = await this.get(path);
      const stats = d?.fantasy_content?.team?.[1]?.team_stats?.stats?.stat;
      if (!Array.isArray(stats)) return null;
      const projEntry = stats.find(s => s?.stat_id === "4");
      const val = parseFloat(projEntry?.value);
      return Number.isFinite(val) ? val : null;
    } catch {
      return null;
    }
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

  async getGameKeyForSeason(year) {
    return this.get(`/games;game_codes=nfl;seasons=${year}`);
  }

  async getNFLPlayerPage(opts = {}) {
    const count = Math.min(opts.count || 25, 25);
    const start = Math.max(parseInt(opts.start, 10) || 0, 0);
    return this.get(`/games;game_codes=nfl/players?count=${count}&start=${start}`);
  }

  async getDraftAnalysis(playerKeys) {
    const keys = Array.isArray(playerKeys) ? playerKeys : [];
    if (keys.length > 25) {
      throw new Error("Yahoo draft_analysis batch cannot exceed 25 player_keys");
    }
    return this.get(`/players;player_keys=${keys.join(",")}/draft_analysis`);
  }

  /** Standings. Includes legacy fields for old internal callers. */
  async getLeagueStandings(leagueKey, myTeamKey = null) {
    const d = await this.get(`/league/${leagueKey}/standings`);
    const standings = d?.fantasy_content?.league?.[1]?.standings?.[0]?.teams;
    if (!standings) return [];
    return Object.values(standings)
      .filter(t => t?.team)
      .map((t, i) => {
        const info  = t.team[0];
        const stats = t.team[2]?.team_standings;
        const teamKey = info?.find?.(x => x?.team_key)?.team_key || null;
        const name = info?.find?.(x => x?.name)?.name || "Unknown";
        const wins = Number(stats?.outcome_totals?.wins || 0);
        const losses = Number(stats?.outcome_totals?.losses || 0);
        const pointsFor = Number(stats?.points_for || 0);
        const pointsAgainst = Number(stats?.points_against || 0);
        return {
          rank: parseInt(stats?.rank, 10) || i + 1,
          team_id: teamKey,
          team_name: name,
          is_current_user: Boolean(myTeamKey && teamKey === myTeamKey),
          wins,
          losses,
          points_for: pointsFor,
          points_against: pointsAgainst,
          name,
          rec: `${wins}-${losses}`,
          pts: pointsFor.toFixed(2),
          pts_num: pointsFor,
          me: Boolean(myTeamKey && teamKey === myTeamKey),
        };
      });
  }

  async getLeagueScoreboard(leagueKey, week) {
    const path = week
      ? `/league/${leagueKey}/scoreboard;week=${week}`
      : `/league/${leagueKey}/scoreboard`;
    return this.get(path);
  }
}

module.exports = YahooClient;
