"use strict";

/**
 * =================================================================
 * Yahoo data routes
 * -----------------------------------------------------------------
 * GET /api/yahoo/roster?leagueKey=...&week=...  (auth required)
 *
 * Returns the authenticated user's normalized Yahoo roster for the
 * given league. If `week` is omitted, uses the league's current week.
 *
 * Roster is table-stakes data (free + pro), so this only requires
 * auth - subscription gating goes on the optimizer routes.
 *
 * Token plumbing (decrypt, refresh-if-expired, persist) lives in
 * src/services/yahooAuth.js so the optimizer router can reuse it.
 * =================================================================
 */

const express = require("express");
const { logger }              = require("../middleware/logging");
const { requireAuth }         = require("../middleware/auth");
const { getAuthenticatedYahooClient } = require("../services/yahooAuth");
const rosterSvc               = require("../services/roster");

const router = express.Router();

router.get("/roster", requireAuth, async (req, res, next) => {
  try {
    const { leagueKey, week } = req.query;
    if (!leagueKey) {
      return res.status(400).json({ error: "leagueKey query param required (e.g. nfl.l.12345)" });
    }
    const wk = week ? parseInt(week, 10) : null;

    const yahoo    = await getAuthenticatedYahooClient(req.user.id);
    const cacheKey = `ssff:roster:${req.user.id}:${leagueKey}:${wk || "current"}`;
    const roster   = await rosterSvc.fetchAndNormalizeRoster(yahoo, leagueKey, wk, cacheKey);

    res.json(roster);
  } catch (e) {
    if (e.message === "yahoo_token_expired") {
      return res.status(401).json({ error: "Yahoo token expired - re-authenticate" });
    }
    next(e);
  }
});

module.exports = router;
