"use strict";

/**
 * ESPN data routes.
 *
 * GET /api/espn/roster?leagueId=...&week=...&espn_s2=...&swid=...
 * Returns a normalized ESPN roster. Auth is required; subscription is not.
 */

const express = require("express");
const { logger } = require("../middleware/logging");
const { requireAuth } = require("../middleware/auth");
const espnAdapter = require("../adapters/espn");

const router = express.Router();

function sanitizedError(err) {
  return {
    message: err?.message,
    status: err?.status,
    code: err?.code,
  };
}

function isAuthError(err) {
  const status = err?.status || err?.response?.status;
  const message = String(err?.message || "").toLowerCase();
  return status === 401 || status === 403 || message.includes("unauthorized") || message.includes("forbidden");
}

router.get("/roster", requireAuth, async (req, res, next) => {
  try {
    const { leagueId, week, espn_s2, swid } = req.query;
    if (!leagueId) return res.status(400).json({ error: "leagueId query param required" });
    if (!week) return res.status(400).json({ error: "week query param required" });
    if (!espn_s2) return res.status(400).json({ error: "espn_s2 query param required" });
    if (!swid) return res.status(400).json({ error: "swid query param required" });

    const wk = parseInt(week, 10);
    if (!Number.isFinite(wk) || wk < 1) {
      return res.status(400).json({ error: "week must be a positive number" });
    }

    const roster = await espnAdapter.buildNormalizedRoster(leagueId, espn_s2, swid, wk);
    return res.json(roster);
  } catch (e) {
    if (isAuthError(e)) {
      return res.status(401).json({ error: "ESPN authentication failed" });
    }
    if (e.status === 404) {
      return res.status(404).json({ error: e.message });
    }

    logger.error("ESPN roster fetch failed", { err: sanitizedError(e) });
    return next(new Error("ESPN roster fetch failed"));
  }
});

module.exports = router;
