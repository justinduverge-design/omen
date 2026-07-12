"use strict";

/**
 * =================================================================
 * Optimizer routes (Pro-gated)
 * -----------------------------------------------------------------
 * GET /api/optimizer/lineup?leagueKey=...&week=...
 *   - Per-position start/sit recommendations
 *
 * GET /api/optimizer/waivers?leagueKey=...&week=...
 *   - Top waiver pickups for weakest rostered positions
 *   - Currently returns empty recommendations until Yahoo waiver
 *     fetching is wired in 2C; route is structurally complete.
 *
 * Both gated by requireAuth. Omen is free — no subscription gate.
 * =================================================================
 */

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config  = require("../config");
const { logger }              = require("../middleware/logging");
const { requireAuth }         = require("../middleware/auth");
const { getAuthenticatedYahooClient } = require("../services/yahooAuth");
const rosterSvc               = require("../services/roster");
const optimizer               = require("../services/optimizer");
const { vorpForPlayer }       = require("../services/vorp");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
const VALID_SCORING_FORMATS = ["standard", "half_ppr", "ppr"];
const MOCK_WAIVER_CANDIDATES = Object.freeze([
  Object.freeze({
    name: "Mock RB Pickup",
    position: "RB",
    team: "EXA",
    projected_points: 11.0,
    vorp_delta: 3.5,
    reason: "Mock: high-volume back in a favorable matchup. Addresses your weakest roster spot.",
    available: true,
  }),
  Object.freeze({
    name: "Sample WR Add",
    position: "WR",
    team: "SAM",
    projected_points: 10.2,
    vorp_delta: 2.8,
    reason: "Mock: target-volume receiver with a useful short-term role.",
    available: true,
  }),
  Object.freeze({
    name: "Example TE Stream",
    position: "TE",
    team: "COR",
    projected_points: 8.1,
    vorp_delta: 1.9,
    reason: "Mock: matchup-based tight end option for teams thin at TE.",
    available: true,
  }),
]);

function parseWeek(week) {
  if (week == null || week === "") return null;
  const parsed = Number(week);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 18) return undefined;
  return parsed;
}

function hasUsableYahooLeague(connection) {
  const leagueId = String(connection?.league_id || "").trim();
  return Boolean(leagueId) && leagueId !== "yahoo";
}

async function resolveActiveYahooLeagueId(userId) {
  const { data, error } = await supabase
    .from("platform_connections")
    .select("league_id,is_active,token_secret_id,updated_at")
    .eq("user_id", userId)
    .eq("platform", "yahoo")
    .eq("is_active", true);

  if (error) throw new Error(`platform_connections lookup failed: ${error.message}`);

  const rows = Array.isArray(data) ? data : [];
  return rows
    .filter((row) => row.token_secret_id && hasUsableYahooLeague(row))
    .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
    .map((row) => row.league_id)
    .find(Boolean) || null;
}

function projectedPoints(player = {}) {
  const value = Number(player.projected_points);
  return Number.isFinite(value) ? value : null;
}

function rosterBaselineVorpByPosition(roster, scoringFormat) {
  const starters = Array.isArray(roster?.slots?.starters) ? roster.slots.starters : [];
  const baselines = {};

  for (const player of starters) {
    const scored = vorpForPlayer(player, { scoringFormat });
    if (baselines[scored.position] == null || scored.vorp < baselines[scored.position]) {
      baselines[scored.position] = scored.vorp;
    }
  }

  return baselines;
}

function buildWaiverRecommendations(roster, waiverPool, scoringFormat) {
  const baselines = rosterBaselineVorpByPosition(roster, scoringFormat);

  return (waiverPool || [])
    .map((player) => {
      const scored = vorpForPlayer(player, { scoringFormat });
      const baseline = baselines[scored.position] ?? 0;
      const vorpDelta = Number((scored.vorp - baseline).toFixed(2));
      const projection = projectedPoints(player);

      return {
        name: player.name || "Unknown",
        position: scored.position,
        team: player.team || "UNK",
        projected_points: projection,
        vorp_delta: vorpDelta,
        reason:
          `Adds ${scored.position} depth against your weakest starter baseline ` +
          `with a ${vorpDelta >= 0 ? "+" : ""}${vorpDelta.toFixed(2)} VORP edge.`,
        available: true,
      };
    })
    .sort((a, b) => b.vorp_delta - a.vorp_delta)
    .slice(0, 5);
}

function mockWaiverResponse(roster) {
  return {
    week: roster.week,
    platform: "yahoo",
    pool_size: 0,
    is_mock: true,
    note: "Player availability API not connected. Returning mock waiver candidates for UI integration.",
    recommendations: MOCK_WAIVER_CANDIDATES.map((candidate) => ({ ...candidate })),
    generated_at: new Date().toISOString(),
  };
}

function retiredCompatRoute({ deprecatedEndpoint, canonicalEndpoint }) {
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

router.post("/mvp-move", retiredCompatRoute({
  deprecatedEndpoint: "/api/optimizer/mvp-move",
  canonicalEndpoint: "/api/omen/mvp-move",
}));

// All optimizer endpoints require auth. Omen is free — no subscription gate.
router.use(requireAuth);

router.get("/lineup", async (req, res, next) => {
  try {
    const { leagueKey, week } = req.query;
    if (!leagueKey) {
      return res.status(400).json({ error: "leagueKey query param required" });
    }
    const wk = parseWeek(week);
    if (wk === undefined) {
      return res.status(400).json({ error: "week must be between 1 and 18" });
    }

    const { client: yahoo } = await getAuthenticatedYahooClient(req.user.id);
    const cacheKey = `ssff:roster:${req.user.id}:${leagueKey}:${wk || "current"}`;
    const roster   = await rosterSvc.fetchAndNormalizeRoster(yahoo, leagueKey, wk, cacheKey);

    const recommendations = optimizer.evaluateLineup(roster);

    res.json({
      week:  roster.week,
      league_key: roster.league_key,
      team_key:   roster.team_key,
      starter_count: roster.slots.starters.length,
      bench_count:   roster.slots.bench.length,
      recommendations,
      generated_at:  new Date().toISOString(),
    });
  } catch (e) {
    if (e.message === "yahoo_token_expired") {
      return res.status(401).json({ error: "Yahoo token expired - re-authenticate" });
    }
    next(e);
  }
});

router.get("/waivers", async (req, res, next) => {
  try {
    const { leagueKey, week } = req.query;
    if (!leagueKey) {
      return res.status(400).json({ error: "leagueKey query param required" });
    }
    const wk = parseWeek(week);
    if (wk === undefined) {
      return res.status(400).json({ error: "week must be between 1 and 18" });
    }

    const { client: yahoo } = await getAuthenticatedYahooClient(req.user.id);
    const cacheKey = `ssff:roster:${req.user.id}:${leagueKey}:${wk || "current"}`;
    const roster   = await rosterSvc.fetchAndNormalizeRoster(yahoo, leagueKey, wk, cacheKey);

    // Fetch waiver pool via Yahoo and normalize.
    const rawWaivers = await yahoo.getAvailablePlayers(leagueKey, { count: 50, sort: "AR" });
    const waiverPool = rosterSvc.normalizeYahooWaivers(rawWaivers);

    const recommendations = optimizer.findWaiverMoves(roster, waiverPool);

    res.json({
      week:        roster.week,
      league_key:  roster.league_key,
      pool_size:   waiverPool.length,
      recommendations,
      note:        waiverPool.every(p => p.projected_points == null)
        ? "Yahoo /players;status=A doesn't include projections - delta uses 0 for waiver players. Recommendations will fire only against OUT/IR rostered players until we wire the projections sub-resource."
        : undefined,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    if (e.message === "yahoo_token_expired") {
      return res.status(401).json({ error: "Yahoo token expired - re-authenticate" });
    }
    next(e);
  }
});

router.get("/waiver", async (req, res, next) => {
  try {
    const wk = parseWeek(req.query.week);
    if (wk === undefined) {
      return res.status(400).json({ error: "week must be between 1 and 18" });
    }

    const leagueId = await resolveActiveYahooLeagueId(req.user.id);
    if (!leagueId) {
      return res.status(400).json({ error: "Yahoo league connection required" });
    }

    const scoringFormat = VALID_SCORING_FORMATS.includes(req.query.scoringFormat)
      ? req.query.scoringFormat
      : "ppr";
    const { client: yahoo } = await getAuthenticatedYahooClient(req.user.id);
    const cacheKey = `ssff:waiver:${req.user.id}:${leagueId}:${wk || "current"}`;
    const roster = await rosterSvc.fetchAndNormalizeRoster(yahoo, leagueId, wk, cacheKey);

    let waiverPool = [];
    try {
      const rawWaivers = await yahoo.getAvailablePlayers(leagueId, { count: 50, sort: "AR" });
      waiverPool = rosterSvc.normalizeYahooWaivers(rawWaivers);
    } catch (e) {
      if (e.message === "yahoo_token_expired") throw e;
      return res.json(mockWaiverResponse(roster));
    }

    if (!waiverPool.length) {
      return res.json(mockWaiverResponse(roster));
    }

    return res.json({
      week: roster.week,
      platform: "yahoo",
      pool_size: waiverPool.length,
      is_mock: false,
      recommendations: buildWaiverRecommendations(roster, waiverPool, scoringFormat),
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    if (e.message === "yahoo_token_expired") {
      return res.status(401).json({ error: "Yahoo token expired - re-authenticate" });
    }
    return next(e);
  }
});

module.exports = router;
