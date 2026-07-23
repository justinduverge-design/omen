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
const { ensureAppUser }       = require("../services/appUser");
const { getYahooAuthUrl, exchangeYahooCode } = require("../middleware/yahooOAuth");
const { getAuthenticatedYahooClient, persistYahooTokens } = require("../services/yahooAuth");
const yahooAdapter            = require("../adapters/yahoo");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
const NATIVE_RETURN_VERIFIER_PREFIX = "omen-native-return-v1:";
const NATIVE_CALLBACK_URL = "com.slopssaloon.omen://auth/callback";

function encodeOAuthVerifier(leagueId, nativeReturn) {
  if (!nativeReturn) return leagueId;
  return `${NATIVE_RETURN_VERIFIER_PREFIX}${JSON.stringify({ league_id: leagueId || null })}`;
}

function decodeOAuthVerifier(verifier) {
  if (typeof verifier !== "string" || !verifier.startsWith(NATIVE_RETURN_VERIFIER_PREFIX)) {
    return { leagueId: verifier || null, nativeReturn: false };
  }
  try {
    const metadata = JSON.parse(verifier.slice(NATIVE_RETURN_VERIFIER_PREFIX.length));
    return { leagueId: metadata?.league_id || null, nativeReturn: true };
  } catch {
    return { leagueId: null, nativeReturn: true };
  }
}

function oauthCompletionRedirect(nativeReturn, status) {
  if (nativeReturn) return `${NATIVE_CALLBACK_URL}?status=${status}`;
  if (status === "connected") return `${config.appBaseUrl}/account/connect?connected=yahoo`;
  return `${config.appBaseUrl}/account/connect?error=yahoo_access_denied`;
}

async function createYahooAuthStart(req, leagueId, nativeReturn = false) {
  const userId = req.user.id;
  await ensureAppUser(req.user);

  const state = crypto.randomBytes(16).toString("hex");
  const { error } = await supabase.from("oauth_state").upsert({
    state,
    platform: "yahoo",
    user_id: userId,
    verifier: encodeOAuthVerifier(leagueId, nativeReturn),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) throw new Error(`OAuth state persistence failed: ${error.message}`);

  return { url: getYahooAuthUrl(state) };
}

router.get("/auth", requireAuth, async (req, res, next) => {
  try {
    const leagueId = req.query.leagueId || req.query.league_id || null;
    const { url } = await createYahooAuthStart(req, leagueId);
    return res.redirect(url);
  } catch (e) {
    logger.error("Yahoo OAuth authorize failed", { err: e.message });
    return next(e);
  }
});

router.post("/auth", requireAuth, async (req, res, next) => {
  try {
    const leagueId = req.body?.leagueId || req.body?.league_id || null;
    const { url } = await createYahooAuthStart(req, leagueId, req.body?.native_return === true);
    return res.json({ url });
  } catch (e) {
    logger.error("Yahoo OAuth authorize failed", { err: e.message });
    return next(e);
  }
});

router.get("/callback", async (req, res, next) => {
  try {
    const { code, state, error: providerError } = req.query;
    if (!state || (!code && !providerError)) return res.status(400).json({ error: "Missing code or state" });

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

    const { leagueId, nativeReturn } = decodeOAuthVerifier(oauthRow.verifier);
    if (providerError) {
      await supabase.from("oauth_state").delete().eq("state", state);
      return res.redirect(oauthCompletionRedirect(nativeReturn, "cancelled"));
    }

    const tokens = await exchangeYahooCode(code);
    await persistYahooTokens(oauthRow.user_id, tokens, leagueId);
    await supabase.from("oauth_state").delete().eq("state", state);

    return res.redirect(oauthCompletionRedirect(nativeReturn, "connected"));
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
