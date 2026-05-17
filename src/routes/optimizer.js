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
const agents                  = require("../services/agents");

const router = express.Router();
const VALID_SCORING_FORMATS = ["standard", "half_ppr", "ppr"];
const VALID_RECORD_PATTERN = /^\d{1,2}-\d{1,2}(?:-\d{1,2})?$/;

function parseWeek(week) {
  if (week == null || week === "") return null;
  const parsed = Number(week);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 18) return undefined;
  return parsed;
}

// All optimizer endpoints require both auth AND a Pro subscription.
router.use(requireAuth);
router.use(requireSubscription);

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

// POST /api/optimizer/mvp-move
// Returns the single highest-value weekly move for this user's team.
// Requires Pro subscription. Uses Gemma + 6-agent pipeline.
router.post("/mvp-move", async (req, res, next) => {
  try {
    const { leagueKey, week, scoringFormat, record } = req.body;
    if (!leagueKey) {
      return res.status(400).json({ error: "leagueKey required" });
    }
    if (scoringFormat && !VALID_SCORING_FORMATS.includes(scoringFormat)) {
      return res.status(400).json({ error: "Invalid scoringFormat" });
    }
    const safeRecord = typeof record === "string" ? record.trim() : "";
    if (safeRecord && !VALID_RECORD_PATTERN.test(safeRecord)) {
      return res.status(400).json({ error: "Invalid record" });
    }

    const wk = parseWeek(week);
    if (wk === undefined) {
      return res.status(400).json({ error: "week must be between 1 and 18" });
    }

    const { client: yahoo } = await getAuthenticatedYahooClient(req.user.id);
    const cacheKey = `ssff:roster:${req.user.id}:${leagueKey}:${wk || "current"}`;
    const roster   = await rosterSvc.fetchAndNormalizeRoster(yahoo, leagueKey, wk, cacheKey);

    const players  = [
      ...roster.slots.starters,
      ...roster.slots.bench,
    ].filter(Boolean);

    const result = await agents.getMVPMove(players, {
      scoringFormat: scoringFormat || "ppr",
      record:        safeRecord || null,
    });

    res.json({
      week:       roster.week,
      league_key: roster.league_key,
      team_key:   roster.team_key,
      ...result,
    });
  } catch (e) {
    if (e.message === "yahoo_token_expired") {
      return res.status(401).json({ error: "Yahoo token expired - re-authenticate" });
    }
    next(e);
  }
});

module.exports = router;
