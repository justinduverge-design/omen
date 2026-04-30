/**
 * ════════════════════════════════════════════════════════════════
 * Slops Saloon Fantasy Football MVP (SSFFMVP)
 * Platform Integration Layer — ssffmvp_api_v2.js
 * ════════════════════════════════════════════════════════════════
 * Handles OAuth and live data for:
 *   - Sleeper  (no OAuth — public API by username)
 *   - Yahoo    (OAuth 2.0 with PKCE)
 *   - ESPN     (cookie-based ESPN_S2 + SWID)
 *
 * Routes:
 *   POST /api/auth/sleeper/connect
 *   GET  /api/auth/yahoo/authorize
 *   GET  /api/auth/yahoo/callback
 *   POST /api/auth/espn/connect
 *   GET  /api/league/standings
 *   GET  /api/league/roster
 *   GET  /api/health
 * ════════════════════════════════════════════════════════════════
 */

"use strict";

// ════════════════════════════════════════════════════════════════
// IMPORTS
// ════════════════════════════════════════════════════════════════

const express          = require("express");
const crypto           = require("crypto");
const os               = require("os");
const { createClient } = require("@supabase/supabase-js");
const { Redis }        = require("@upstash/redis");

// ════════════════════════════════════════════════════════════════
// INITIALISATION
// ════════════════════════════════════════════════════════════════

const router     = express.Router();
const START_TIME = Date.now();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const redis = new Redis({
  url:   process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

const YAHOO_CLIENT_ID     = process.env.YAHOO_CLIENT_ID;
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET;
const YAHOO_REDIRECT_URI  = process.env.YAHOO_REDIRECT_URI;
const APP_BASE_URL        = process.env.APP_BASE_URL;

const SLEEPER_BASE = "https://api.sleeper.app/v1";

// ════════════════════════════════════════════════════════════════
// VAULT HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════

async function vaultDecrypt(secretId) {
  if (!secretId) return null;
  const { data, error } = await supabase.rpc("vault_decrypt_secret", { secret_id: secretId });
  if (error) throw new Error(`Vault decrypt failed (${secretId}): ${error.message}`);
  return data?.decrypted_secret ?? null;
}

async function vaultCreate(secret, name, description = "") {
  const { data, error } = await supabase.rpc("vault_create_secret", { secret, name, description });
  if (error) throw new Error(`Vault create failed (${name}): ${error.message}`);
  return data; // UUID of the new secret
}

async function vaultUpdate(secretId, newSecret) {
  const { error } = await supabase.rpc("vault_update_secret", {
    secret_id:  secretId,
    new_secret: newSecret,
  });
  if (error) throw new Error(`Vault update failed (${secretId}): ${error.message}`);
}

// ════════════════════════════════════════════════════════════════
// CLASS: SleeperClient
// ════════════════════════════════════════════════════════════════

class SleeperClient {
  async getUser(username) {
    const res = await fetch(`${SLEEPER_BASE}/user/${username}`);
    if (!res.ok) throw new Error(`Sleeper user not found: ${username}`);
    return res.json();
  }

  async getUserLeagues(userId, season = new Date().getFullYear()) {
    const res = await fetch(`${SLEEPER_BASE}/user/${userId}/leagues/nfl/${season}`);
    if (!res.ok) throw new Error("Could not fetch Sleeper leagues");
    return res.json();
  }

  async getLeagueRosters(leagueId) {
    const res = await fetch(`${SLEEPER_BASE}/league/${leagueId}/rosters`);
    if (!res.ok) throw new Error("Could not fetch rosters");
    return res.json();
  }

  async getLeagueUsers(leagueId) {
    const res = await fetch(`${SLEEPER_BASE}/league/${leagueId}/users`);
    if (!res.ok) throw new Error("Could not fetch league users");
    return res.json();
  }

  async getLeagueMatchups(leagueId, week) {
    const res = await fetch(`${SLEEPER_BASE}/league/${leagueId}/matchups/${week}`);
    if (!res.ok) throw new Error("Could not fetch matchups");
    return res.json();
  }

  async getPlayerInfo() {
    const res = await fetch(`${SLEEPER_BASE}/players/nfl`);
    if (!res.ok) throw new Error("Could not fetch player data");
    return res.json();
  }

  async buildStandings(leagueId, myUserId) {
    const [rosters, users] = await Promise.all([
      this.getLeagueRosters(leagueId),
      this.getLeagueUsers(leagueId),
    ]);

    const userMap = Object.fromEntries(users.map(u => [u.user_id, u]));

    return rosters
      .map(r => {
        const user   = userMap[r.owner_id] || {};
        const wins   = r.settings?.wins          || 0;
        const losses = r.settings?.losses        || 0;
        const fpts   = r.settings?.fpts          || 0;
        const fptsD  = r.settings?.fpts_decimal  || 0;

        // FIX [1] + [2]: single pts key, correct backtick template literal
        return {
          roster_id: r.roster_id,
          user_id:   r.owner_id,
          name:      user.metadata?.team_name || user.display_name || "Unknown",
          rec:       `${wins}-${losses}`,
          wins,
          losses,
          pts:       `${fpts}.${String(fptsD).padStart(2, "0")}`,   // ← single, clean definition
          pts_num:   fpts + fptsD / 100,
          me:        r.owner_id === myUserId,
        };
      })
      .sort((a, b) => b.wins - a.wins || b.pts_num - a.pts_num)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }
}

// ════════════════════════════════════════════════════════════════
// CLASS: YahooClient
// ════════════════════════════════════════════════════════════════

class YahooClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.base        = "https://fantasysports.yahooapis.com/fantasy/v2";
  }

  static generatePKCE() {
    const verifier  = crypto.randomBytes(32).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    return { verifier, challenge };
  }

  static getAuthUrl(state, codeChallenge) {
    const params = new URLSearchParams({
      client_id:             YAHOO_CLIENT_ID,
      redirect_uri:          YAHOO_REDIRECT_URI,
      response_type:         "code",
      scope:                 "fspt-r",
      code_challenge:        codeChallenge,
      code_challenge_method: "S256",
      state,
    });
    return `https://api.login.yahoo.com/oauth2/request_auth?${params}`;
  }

  static async exchangeCode(code, verifier) {
    const res = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
      method: "POST",
      headers: {
        "Content-Type":  "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${YAHOO_CLIENT_ID}:${YAHOO_CLIENT_SECRET}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type:    "authorization_code",
        code,
        redirect_uri:  YAHOO_REDIRECT_URI,
        code_verifier: verifier,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Yahoo token exchange failed: ${err}`);
    }
    return res.json();
  }

  static async refreshToken(refreshToken) {
    const res = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
      method: "POST",
      headers: {
        "Content-Type":  "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${YAHOO_CLIENT_ID}:${YAHOO_CLIENT_SECRET}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type:    "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) throw new Error("Yahoo token refresh failed");
    return res.json();
  }

  async get(path) {
    const res = await fetch(`${this.base}${path}?format=json`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (res.status === 401) throw new Error("yahoo_token_expired");
    if (!res.ok) throw new Error(`Yahoo API error: ${res.status}`);
    return res.json();
  }

  async getUserLeagues(season = new Date().getFullYear()) {
    const d     = await this.get(`/users;use_login=1/games;game_codes=nfl;seasons=${season}/leagues`);
    const games = d?.fantasy_content?.users?.[0]?.user?.[1]?.games;
    if (!games) return [];
    return Object.values(games)
      .filter(g => g?.leagues)
      .flatMap(g => Object.values(g.leagues).filter(l => l?.league));
  }

  async getLeagueStandings(leagueKey) {
    const d         = await this.get(`/league/${leagueKey}/standings`);
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
          pts:     stats?.points_for?.toFixed(2) || "0.00",
          pts_num: parseFloat(stats?.points_for) || 0,
          me:      false,
        };
      });
  }
}

// ════════════════════════════════════════════════════════════════
// CLASS: ESPNClient
// ════════════════════════════════════════════════════════════════

class ESPNClient {
  constructor(espnS2, swid) {
    this.cookies = `espn_s2=${espnS2}; SWID=${swid}`;
    this.base    = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl";
  }

  async getLeague(leagueId, season = new Date().getFullYear()) {
    const url = `${this.base}/seasons/${season}/segments/0/leagues/${leagueId}`;
    const res = await fetch(`${url}?view=mStandings&view=mTeam`, {
      headers: { Cookie: this.cookies, "X-Fantasy-Source": "kona" },
    });
    if (!res.ok) throw new Error(`ESPN API error: ${res.status}`);
    return res.json();
  }

  async buildStandings(leagueId, myTeamId, season) {
    const data  = await this.getLeague(leagueId, season);
    const teams = data?.teams || [];
    return teams
      .map(t => ({
        rank:    t.rankCalculatedFinal || t.rankFinal || 99,
        name:    t.name || t.abbrev || "Team",
        rec:     `${t.record?.overall?.wins || 0}-${t.record?.overall?.losses || 0}`,
        pts:     (t.points || 0).toFixed(2),
        pts_num: t.points || 0,
        me:      t.id === myTeamId,
      }))
      .sort((a, b) => a.rank - b.rank);
  }
}

// ════════════════════════════════════════════════════════════════
// SHARED CLIENT INSTANCE
// ════════════════════════════════════════════════════════════════

const sleeper = new SleeperClient();

// ════════════════════════════════════════════════════════════════
// ROUTES — AUTH
// ════════════════════════════════════════════════════════════════

// ── Sleeper Connect ───────────────────────────────────────────
router.post("/auth/sleeper/connect", async (req, res) => {
  const { username, userId: appUserId } = req.body;
  if (!username) return res.status(400).json({ error: "username required" });

  try {
    const sleeperUser = await sleeper.getUser(username);
    const leagues     = await sleeper.getUserLeagues(sleeperUser.user_id);
    if (!leagues.length) return res.status(404).json({ error: "No NFL leagues found for this user" });

    await supabase.from("platform_connections").upsert({
      user_id:           appUserId,
      platform:          "sleeper",
      platform_user_id:  sleeperUser.user_id,
      platform_username: sleeperUser.username,
      updated_at:        new Date().toISOString(),
    });

    res.json({
      ok:           true,
      sleeperUserId: sleeperUser.user_id,
      displayName:   sleeperUser.display_name,
      leagues:       leagues.map(l => ({
        id:      l.league_id,
        name:    l.name,
        size:    l.total_rosters,
        scoring: l.scoring_settings?.rec > 0
          ? (l.scoring_settings.rec === 1 ? "PPR" : "Half PPR")
          : "Standard",
      })),
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Yahoo Authorize ───────────────────────────────────────────
router.get("/auth/yahoo/authorize", async (req, res) => {
  const { userId } = req.query;
  const { verifier, challenge } = YahooClient.generatePKCE();
  const state = crypto.randomBytes(16).toString("hex");

  await supabase.from("oauth_state").upsert({
    state,
    platform:   "yahoo",
    user_id:    userId,
    verifier,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  res.redirect(YahooClient.getAuthUrl(state, challenge));
});

// ── Yahoo Callback ────────────────────────────────────────────
router.get("/auth/yahoo/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send("Missing code or state");

  try {
    const { data: oauthRow, error } = await supabase
      .from("oauth_state")
      .select("*")
      .eq("state", state)
      .eq("platform", "yahoo")
      .single();

    if (error || !oauthRow)                    return res.status(400).send("Invalid or expired OAuth state");
    if (new Date(oauthRow.expires_at) < new Date()) return res.status(400).send("OAuth state expired");

    const tokens = await YahooClient.exchangeCode(code, oauthRow.verifier);

    const [accessSecretId, refreshSecretId] = await Promise.all([
      vaultCreate(tokens.access_token,  `yahoo_access_${oauthRow.user_id}_${Date.now()}`,  `Yahoo access token — user ${oauthRow.user_id}`),
      vaultCreate(tokens.refresh_token, `yahoo_refresh_${oauthRow.user_id}_${Date.now()}`, `Yahoo refresh token — user ${oauthRow.user_id}`),
    ]);

    await supabase.from("platform_connections").upsert({
      user_id:           oauthRow.user_id,
      platform:          "yahoo",
      token_secret_id:   accessSecretId,
      refresh_secret_id: refreshSecretId,
      token_expires_at:  new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at:        new Date().toISOString(),
    });

    await supabase.from("oauth_state").delete().eq("state", state);

    res.redirect(`${APP_BASE_URL}/dashboard?connected=yahoo`);
  } catch (e) {
    res.status(500).send(`OAuth error: ${e.message}`);
  }
});

// ── ESPN Connect ──────────────────────────────────────────────
router.post("/auth/espn/connect", async (req, res) => {
  const { espnS2, swid, leagueId, userId } = req.body;
  if (!espnS2 || !swid || !leagueId) {
    return res.status(400).json({ error: "espnS2, swid, and leagueId required" });
  }

  try {
    const espn = new ESPNClient(espnS2, swid);
    const data = await espn.getLeague(leagueId);
    if (!data?.id) return res.status(401).json({ error: "Invalid ESPN credentials or league ID" });

    const espnSecretId = await vaultCreate(
      espnS2,
      `espn_s2_${userId}_${Date.now()}`,
      `ESPN_S2 cookie — user ${userId}`
    );

    await supabase.from("platform_connections").upsert({
      user_id:        userId,
      platform:       "espn",
      espn_secret_id: espnSecretId,
      espn_swid:      swid,
      league_id:      String(leagueId),
      updated_at:     new Date().toISOString(),
    });

    res.json({ ok: true, leagueName: data.settings?.name || "ESPN League" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════
// ROUTES — LEAGUE DATA
// ════════════════════════════════════════════════════════════════

// ── Live Standings ────────────────────────────────────────────
router.get("/league/standings", async (req, res) => {
  const { userId, leagueId } = req.query;

  try {
    const cacheKey = `ssff:standings:${leagueId}`;
    const cached   = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
      return res.json({ standings: parsed, source: "cache", cachedAt: parsed._cachedAt });
    }

    const { data: conn } = await supabase
      .from("platform_connections")
      .select("platform, token_secret_id, refresh_secret_id, token_expires_at, espn_secret_id, espn_swid, espn_team_id, league_id, platform_user_id")
      .eq("user_id", userId)
      .single();

    if (!conn) return res.status(404).json({ error: "No platform connected" });

    let standings = [];

    switch (conn.platform) {
      case "sleeper": {
        standings = await sleeper.buildStandings(leagueId, conn.platform_user_id);
        break;
      }

      case "yahoo": {
        let accessToken = await vaultDecrypt(conn.token_secret_id);
        if (!accessToken) throw new Error("Yahoo token not found in Vault");

        if (new Date(conn.token_expires_at) < new Date()) {
          const refreshToken = await vaultDecrypt(conn.refresh_secret_id);
          if (!refreshToken) throw new Error("Yahoo refresh token not found in Vault");

          const refreshed = await YahooClient.refreshToken(refreshToken);
          accessToken     = refreshed.access_token;

          await vaultUpdate(conn.token_secret_id, refreshed.access_token);
          await supabase.from("platform_connections").update({
            token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            updated_at:       new Date().toISOString(),
          }).eq("user_id", userId);
        }

        const yahoo = new YahooClient(accessToken);
        standings   = await yahoo.getLeagueStandings(leagueId);
        break;
      }

      case "espn": {
        const espnS2 = await vaultDecrypt(conn.espn_secret_id);
        if (!espnS2) throw new Error("ESPN_S2 not found in Vault");

        const espn = new ESPNClient(espnS2, conn.espn_swid);
        standings  = await espn.buildStandings(leagueId, conn.espn_team_id, new Date().getFullYear());
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown platform: ${conn.platform}` });
    }

    const toCache = { ...standings, _cachedAt: new Date().toISOString() };
    await redis.set(cacheKey, JSON.stringify(toCache), { ex: 300 }).catch(() => null);

    res.json({ standings, source: conn.platform, liveAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Live Roster ───────────────────────────────────────────────
router.get("/league/roster", async (req, res) => {
  const { userId, leagueId } = req.query;

  try {
    const cacheKey = `ssff:roster:${userId}:${leagueId}`;
    const cached   = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
      return res.json({ roster: parsed, source: "cache" });
    }

    const { data: conn } = await supabase
      .from("platform_connections")
      .select("platform, platform_user_id, espn_secret_id, espn_swid, token_secret_id, refresh_secret_id, token_expires_at")
      .eq("user_id", userId)
      .single();

    if (!conn) return res.status(404).json({ error: "No platform connected" });

    let roster = [];

    if (conn.platform === "sleeper") {
      const playerCacheKey = "ssff:players:nfl";
      let players = await redis.get(playerCacheKey).catch(() => null);
      if (players) {
        players = typeof players === "string" ? JSON.parse(players) : players;
      } else {
        players = await sleeper.getPlayerInfo();
        await redis.set(playerCacheKey, JSON.stringify(players), { ex: 86400 }).catch(() => null);
      }

      const rosters  = await sleeper.getLeagueRosters(leagueId);
      const myRoster = rosters.find(r => r.owner_id === conn.platform_user_id);
      if (!myRoster) return res.status(404).json({ error: "Roster not found" });

      roster = (myRoster.players || []).map(pid => {
        const p = players[pid] || {};
        return {
          id:       pid,
          name:     p.full_name || pid,
          position: p.position,
          team:     p.team,
          status:   p.injury_status || "active",
          starter:  myRoster.starters?.includes(pid),
        };
      });
    }

    if (conn.platform === "espn") {
      const espnS2 = await vaultDecrypt(conn.espn_secret_id);
      if (!espnS2) return res.status(401).json({ error: "ESPN credentials not found" });
      // ESPN roster fetch: same ESPNClient pattern as standings
    }

    if (conn.platform === "yahoo") {
      const token = await vaultDecrypt(conn.token_secret_id);
      if (!token) return res.status(401).json({ error: "Yahoo token not found" });
      // Yahoo roster fetch: YahooClient.get(/team/.../roster)
    }

    await redis.set(cacheKey, JSON.stringify(roster), { ex: 120 }).catch(() => null);

    res.json({ roster, source: conn.platform });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════
// ROUTE — HEALTH CHECK
// FIX [3]: top-level route, not nested inside /league/roster
// ════════════════════════════════════════════════════════════════

router.get("/health", (req, res) => {
  res.json({
    status:  "ok",
    service: "ssffmvp-api",
    uptime:  `${Math.floor((Date.now() - START_TIME) / 1000)}s`,
    memory:  `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    node:    process.version,
    env:     process.env.NODE_ENV,
    ts:      new Date().toISOString(),
  });
});

// ════════════════════════════════════════════════════════════════
// EXPORT
// FIX [4]: single module.exports at the very bottom
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// SERVER INITIALIZATION
// ════════════════════════════════════════════════════════════════

// Create the main app instance
const app = express();

// Middleware to handle JSON data
app.use(express.json());

// Mount your routes (this connects the 'router' defined above to the app)
app.use('/', router); 

// Choose a port (Docker usually expects 3000)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 SSFFMVP API is live on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Keep this here so other files can still import the router if needed
module.exports = router;