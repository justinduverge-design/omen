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
const {
  DEFAULT_DEBOUNCE_MS,
  buildDraftListResponse,
  buildDraftMetaResponse,
  buildDraftStateResponse,
  parseYahooDraftId,
} = require("../services/yahooDraft");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
const draftSnapshotCache = new Map();

async function createYahooAuthStart(req, leagueId) {
  const userId = req.user.id;
  await ensureAppUser(req.user);

  const state = crypto.randomBytes(16).toString("hex");
  const { error } = await supabase.from("oauth_state").upsert({
    state,
    platform: "yahoo",
    user_id: userId,
    verifier: leagueId,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) throw new Error(`OAuth state persistence failed: ${error.message}`);

  return { url: getYahooAuthUrl(state) };
}

function parseSinceCursor(value) {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function yahooDraftNotFound() {
  const err = new Error("Yahoo draft not found");
  err.status = 404;
  err.code = "yahoo_draft_not_found";
  return err;
}

async function loadYahooDraftContext(userId, requestedLeagueKey) {
  try {
    const auth = await getAuthenticatedYahooClient(userId);
    const connectedLeagueKey = String(auth?.connection?.league_id || "").trim();
    if (!connectedLeagueKey) {
      const err = new Error("Yahoo not connected");
      err.status = 401;
      err.code = "yahoo_not_connected";
      throw err;
    }
    if (requestedLeagueKey && connectedLeagueKey !== String(requestedLeagueKey)) {
      throw yahooDraftNotFound();
    }
    return {
      client: auth.client,
      leagueKey: connectedLeagueKey,
    };
  } catch (error) {
    if (error?.message === "yahoo_token_expired") {
      error.status = 401;
      error.code = "yahoo_auth_failed";
      throw error;
    }
    if (error?.status === 404 && /no yahoo connection/i.test(String(error?.message || ""))) {
      error.status = 401;
      error.code = "yahoo_not_connected";
      throw error;
    }
    throw error;
  }
}

async function readDraftSnapshot({ userId, leagueKey, client }) {
  const cacheKey = `${userId}:${leagueKey}`;
  const now = Date.now();
  const cached = draftSnapshotCache.get(cacheKey);
  if (cached?.value && cached.expiresAt > now) return cached.value;
  if (cached?.promise) return cached.promise;

  const pending = yahooAdapter.fetchYahooDraft({ leagueKey, client })
    .then((draft) => {
      draftSnapshotCache.set(cacheKey, {
        value: draft,
        expiresAt: Date.now() + DEFAULT_DEBOUNCE_MS,
      });
      return draft;
    })
    .catch((error) => {
      draftSnapshotCache.delete(cacheKey);
      throw error;
    });

  draftSnapshotCache.set(cacheKey, {
    promise: pending,
    expiresAt: now + DEFAULT_DEBOUNCE_MS,
  });
  return pending;
}

function yahooDraftError(res, error, operation) {
  if (error?.code === "yahoo_not_connected") {
    return res.status(401).json({ error: "Yahoo not connected", code: error.code });
  }
  if (error?.message === "yahoo_token_expired" || error?.code === "yahoo_auth_failed" || error?.status === 401) {
    return res.status(401).json({ error: "Yahoo authentication failed", code: "yahoo_auth_failed" });
  }

  const status = error?.status || 503;
  const code = error?.code || (status === 404 ? "yahoo_draft_not_found" : "yahoo_draft_unavailable");
  const message = error?.message || "Yahoo draft data is temporarily unavailable";
  logger.warn("Yahoo draft request failed", {
    operation,
    status,
    code,
  });
  return res.status(status).json({ error: message, code });
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
    const { url } = await createYahooAuthStart(req, leagueId);
    return res.json({ url });
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

    return res.redirect(`${config.appBaseUrl}/account/connect?connected=yahoo`);
  } catch (e) {
    logger.error("Yahoo OAuth callback failed", { err: e.message });
    return next(e);
  }
});

router.get("/draft", requireAuth, async (req, res) => {
  try {
    const { leagueKey } = req.query;
    if (!leagueKey) {
      return res.status(400).json({ error: "leagueKey query param required" });
    }

    const context = await loadYahooDraftContext(req.user.id, leagueKey);
    const draft = await readDraftSnapshot({
      userId: req.user.id,
      leagueKey: context.leagueKey,
      client: context.client,
    });
    return res.json(buildDraftListResponse({ leagueKey: context.leagueKey, draft }));
  } catch (error) {
    return yahooDraftError(res, error, "list");
  }
});

router.get("/draft/:draftId", requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const leagueKey = parseYahooDraftId(draftId);
    if (!leagueKey) {
      return res.status(400).json({ error: "draftId path param must be a Yahoo draft id" });
    }

    const context = await loadYahooDraftContext(req.user.id, leagueKey);
    const draft = await readDraftSnapshot({
      userId: req.user.id,
      leagueKey: context.leagueKey,
      client: context.client,
    });
    return res.json(buildDraftMetaResponse({ draftId, draft }));
  } catch (error) {
    return yahooDraftError(res, error, "meta");
  }
});

router.get("/draft/:draftId/state", requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const leagueKey = parseYahooDraftId(draftId);
    if (!leagueKey) {
      return res.status(400).json({ error: "draftId path param must be a Yahoo draft id" });
    }

    const sinceCursor = parseSinceCursor(req.query.since);
    if (sinceCursor === null) {
      return res.status(400).json({ error: "since must be a non-negative integer" });
    }

    const context = await loadYahooDraftContext(req.user.id, leagueKey);
    const draft = await readDraftSnapshot({
      userId: req.user.id,
      leagueKey: context.leagueKey,
      client: context.client,
    });
    return res.json(buildDraftStateResponse({
      draftId,
      draft,
      since: sinceCursor,
      debounceMs: DEFAULT_DEBOUNCE_MS,
    }));
  } catch (error) {
    return yahooDraftError(res, error, "state");
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
