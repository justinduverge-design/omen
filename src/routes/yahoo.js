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
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { logger }              = require("../middleware/logging");
const { requireAuth }         = require("../middleware/auth");
const { getYahooAuthUrl, exchangeYahooCode } = require("../middleware/yahooOAuth");
const { getAuthenticatedYahooClient, persistYahooTokens } = require("../services/yahooAuth");
const yahooAdapter            = require("../adapters/yahoo");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

router.get("/auth", async (req, res, next) => {
  try {
    const userId = req.query.userId || req.query.user_id;
    const leagueId = req.query.leagueId || req.query.league_id || null;
    if (!userId) return res.status(400).json({ error: "userId query param required" });

    const state = crypto.randomBytes(16).toString("hex");
    const { error } = await supabase.from("oauth_state").upsert({
      state,
      platform: "yahoo",
      user_id: userId,
      verifier: leagueId,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (error) throw new Error(`OAuth state persistence failed: ${error.message}`);

    return res.redirect(getYahooAuthUrl(state));
  } catch (e) {
    logger.error("Yahoo OAuth authorize failed", { err: e.message });
    return next(e);
  }
});

router.get("/callback", async (req, res, next) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).json({ error: "Missing code or state" });

    const { data: oauthRow, error } = await supabase
      .from("oauth_state")
      .select("*")
      .eq("state", state)
      .eq("platform", "yahoo")
      .maybeSingle();

    if (error) throw new Error(`OAuth state lookup failed: ${error.message}`);
    if (!oauthRow) return res.status(400).json({ error: "Invalid or expired OAuth state" });
    if (oauthRow.expires_at && new Date(oauthRow.expires_at).getTime() < Date.now()) {
      await supabase.from("oauth_state").delete().eq("state", state);
      return res.status(400).json({ error: "Invalid or expired OAuth state" });
    }

    const tokens = await exchangeYahooCode(code);
    await persistYahooTokens(oauthRow.user_id, tokens, oauthRow.verifier || null);
    await supabase.from("oauth_state").delete().eq("state", state);

    return res.redirect(`${config.appBaseUrl}/football?connected=yahoo`);
  } catch (e) {
    logger.error("Yahoo OAuth callback failed", { err: e.message });
    return next(e);
  }
});

router.get("/roster", requireAuth, async (req, res, next) => {
  try {
    const { leagueKey, week } = req.query;
    if (!leagueKey) {
      return res.status(400).json({ error: "leagueKey query param required (e.g. nfl.l.12345)" });
    }
    const wk = week ? parseInt(week, 10) : null;

    const { accessToken } = await getAuthenticatedYahooClient(req.user.id);
    const roster = await yahooAdapter.buildNormalizedRoster(leagueKey, accessToken, wk, {
      cacheScope: req.user.id,
    });

    res.json(roster);
  } catch (e) {
    if (e.message === "yahoo_token_expired") {
      return res.status(401).json({ error: "Yahoo token expired - re-authenticate" });
    }
    next(e);
  }
});

module.exports = router;
