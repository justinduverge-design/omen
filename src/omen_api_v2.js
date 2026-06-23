/**
 * ════════════════════════════════════════════════════════════════
 * Slops Saloon Fantasy Football MVP (Omen)
 * Platform Integration Layer — omen_api_v2.js
 * ════════════════════════════════════════════════════════════════
 */

"use strict";

const express          = require("express");
const crypto           = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { Redis }        = require("@upstash/redis");
const { getYahooAuthUrl, exchangeYahooCode, refreshYahooToken } = require("./middleware/yahooOAuth");
const { requireAuth }  = require("./middleware/auth");

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
  return data; 
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

        return {
          roster_id: r.roster_id,
          user_id:   r.owner_id,
          name:      user.metadata?.team_name || user.display_name || "Unknown",
          rec:       `${wins}-${losses}`,
          wins,
          losses,
          pts:       `${fpts}.${String(fptsD).padStart(2, "0")}`,
          pts_num:   fpts + fptsD / 100,
          me:        r.owner_id === myUserId,
        };
      })
      .sort((a, b) => b.wins - a.wins || b.pts_num - a.pts_num)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }
}

// ════════════════════════════════════════════════════════════════
// CLASS: YahooClient (OAuth 2.0)
// ════════════════════════════════════════════════════════════════

class YahooClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.base        = "https://fantasysports.yahooapis.com/fantasy/v2";
  }

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

  async get(path) {
    const res = await fetch(`${this.base}${path}?format=json`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (res.status === 401) throw new Error("yahoo_token_expired");
    if (!res.ok) throw new Error(`Yahoo API error: ${res.status}`);
    return res.json();
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
// ROUTES — AUTH
// ════════════════════════════════════════════════════════════════

const sleeper = new SleeperClient();

function retiredLegacyRoute({ deprecatedEndpoint, canonicalEndpoint = null }) {
  return (_req, res) => {
    res.set("Deprecation", "true");
    if (canonicalEndpoint) {
      res.set("Link", `<${canonicalEndpoint}>; rel="canonical"`);
    }
    return res.status(410).json({
      error: "Legacy endpoint retired",
      code: "legacy_route_retired",
      deprecated_endpoint: deprecatedEndpoint,
      canonical_endpoint: canonicalEndpoint,
    });
  };
}

function redirectLegacyRoute({ canonicalEndpoint }) {
  return (req, res) => {
    const queryIndex = req.originalUrl.indexOf("?");
    const query = queryIndex === -1 ? "" : req.originalUrl.slice(queryIndex);
    res.set("Deprecation", "true");
    res.set("Link", `<${canonicalEndpoint}>; rel="canonical"`);
    return res.redirect(302, `${canonicalEndpoint}${query}`);
  };
}

router.post("/auth/sleeper/connect", retiredLegacyRoute({
  deprecatedEndpoint: "/api/auth/sleeper/connect",
  canonicalEndpoint: "/api/platforms/sleeper/connect",
}));

router.get("/auth/yahoo/authorize", retiredLegacyRoute({
  deprecatedEndpoint: "/api/auth/yahoo/authorize",
  canonicalEndpoint: "/api/yahoo/auth",
}));

router.get("/auth/yahoo/callback", redirectLegacyRoute({
  canonicalEndpoint: "/api/yahoo/callback",
}));

router.post("/auth/espn/connect", retiredLegacyRoute({
  deprecatedEndpoint: "/api/auth/espn/connect",
  canonicalEndpoint: "/api/platforms/espn/connect",
}));

router.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: `${Math.floor((Date.now() - START_TIME) / 1000)}s` });
});

module.exports = router;
