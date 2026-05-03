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
 * Both gated by requireAuth + requireSubscription.
 * SY0-701 5.4: privilege isolation - free users get 402.
 * =================================================================
 */

const express = require("express");
const config  = require("../config");
const { logger }              = require("../middleware/logging");
const { requireAuth }         = require("../middleware/auth");
const { requireSubscription } = require("../middleware/subscription");
const { getAuthenticatedYahooClient } = require("../services/yahooAuth");
const rosterSvc               = require("../services/roster");
const optimizer               = require("../services/optimizer");

const router = express.Router();

// All optimizer endpoints require both auth AND a Pro subscription.
router.use(requireAuth);
router.use(requireSubscription);

router.get("/lineup", async (req, res, next) => {
  try {
    const { leagueKey, week } = req.query;
    if (!leagueKey) {
      return res.status(400).json({ error: "leagueKey query param required" });
    }
    const wk = week ? parseInt(week, 10) : null;

    const yahoo    = await getAuthenticatedYahooClient(req.user.id);
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
    const wk = week ? parseInt(week, 10) : null;

    const yahoo    = await getAuthenticatedYahooClient(req.user.id);
    const cacheKey = `ssff:roster:${req.user.id}:${leagueKey}:${wk || "current"}`;
    const roster   = await rosterSvc.fetchAndNormalizeRoster(yahoo, leagueKey, wk, cacheKey);

    // TODO (task 2C): fetch real waiver pool via
    //   yahoo.getAvailablePlayers(leagueKey, { count: 50, sort: 'AR' })
    // For now return an empty pool so the route shape is stable.
    const waiverPool = [];

    const recommendations = optimizer.findWaiverMoves(roster, waiverPool);

    res.json({
      week: roster.week,
      league_key: roster.league_key,
      pool_size: waiverPool.length,
      recommendations,
      note: waiverPool.length === 0
        ? "Waiver pool fetching is wired in task 2C - returning empty for now"
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

module.exports = router;
