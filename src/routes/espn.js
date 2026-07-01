"use strict";

/**
 * ESPN data routes.
 *
 * GET /api/espn/roster?leagueId=...&week=...
 * Returns a normalized ESPN roster. Auth is required; subscription is not.
 */

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { logger } = require("../middleware/logging");
const { requireAuth } = require("../middleware/auth");
const espnAdapter = require("../adapters/espn");
const {
  DEFAULT_DEBOUNCE_MS,
  buildDraftListResponse,
  buildDraftMetaResponse,
  buildDraftStateResponse,
  parseEspnDraftId,
} = require("../services/espnDraft");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
const draftSnapshotCache = new Map();

async function vaultDecrypt(secretId) {
  if (!secretId) return null;
  const { data, error } = await supabase.rpc("vault_decrypt_secret", { secret_id: secretId });
  if (error) throw new Error("ESPN credentials unavailable");
  return data?.decrypted_secret ?? data?.[0]?.decrypted_secret ?? null;
}

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

function parseSinceCursor(value) {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function draftNotFound() {
  const err = new Error("ESPN draft not found");
  err.status = 404;
  err.code = "espn_draft_not_found";
  return err;
}

function ensureRequestedLeague(conn, requestedLeagueId) {
  if (conn?.league_id && String(conn.league_id) !== String(requestedLeagueId)) {
    throw draftNotFound();
  }
}

async function lookupConnection(userId) {
  const { data: conn, error: connError } = await supabase
    .from("platform_connections")
    .select("espn_secret_id, swid_secret_id, league_id, espn_team_id")
    .eq("user_id", userId)
    .eq("platform", "espn")
    .maybeSingle();

  if (connError) {
    const err = new Error("ESPN connection lookup failed");
    err.status = 503;
    err.code = "espn_connection_lookup_failed";
    throw err;
  }
  if (!conn) {
    const err = new Error("ESPN not connected");
    err.status = 401;
    err.code = "espn_not_connected";
    throw err;
  }

  const espnS2 = await vaultDecrypt(conn.espn_secret_id);
  const swid = await vaultDecrypt(conn.swid_secret_id);
  if (!espnS2 || !swid) {
    const err = new Error("ESPN re-auth required");
    err.status = 401;
    err.code = "espn_reauth_required";
    throw err;
  }

  return {
    ...conn,
    espnS2,
    swid,
  };
}

async function readDraftSnapshot({ userId, leagueId, espnS2, swid, teamId }) {
  const cacheKey = `${userId}:${leagueId}`;
  const now = Date.now();
  const cached = draftSnapshotCache.get(cacheKey);
  if (cached?.value && cached.expiresAt > now) return cached.value;
  if (cached?.promise) return cached.promise;

  const pending = espnAdapter.fetchEspnDraft(leagueId, espnS2, swid, { teamId })
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

function draftError(res, error, operation) {
  if (error?.code === "espn_not_connected" || error?.code === "espn_reauth_required") {
    return res.status(error.status || 401).json({ error: error.message, code: error.code });
  }
  if (isAuthError(error)) {
    return res.status(401).json({ error: "ESPN authentication failed", code: "espn_auth_failed" });
  }

  const status = error?.status || 503;
  const code = error?.code || (status === 404 ? "espn_draft_not_found" : "espn_draft_unavailable");
  const message = error?.message || "ESPN draft data is temporarily unavailable";

  logger.warn("ESPN draft request failed", {
    operation,
    status,
    code,
  });
  return res.status(status).json({ error: message, code });
}

router.get("/draft", requireAuth, async (req, res) => {
  try {
    const { leagueId } = req.query;
    if (!leagueId) {
      return res.status(400).json({ error: "leagueId query param required" });
    }

    const connection = await lookupConnection(req.user.id);
    ensureRequestedLeague(connection, leagueId);
    const draft = await readDraftSnapshot({
      userId: req.user.id,
      leagueId,
      espnS2: connection.espnS2,
      swid: connection.swid,
      teamId: connection.espn_team_id,
    });

    return res.json(buildDraftListResponse({ leagueId, draft }));
  } catch (error) {
    return draftError(res, error, "list");
  }
});

router.get("/draft/:draftId", requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const leagueId = parseEspnDraftId(draftId);
    if (!leagueId) {
      return res.status(400).json({ error: "draftId path param must be an ESPN draft id" });
    }

    const connection = await lookupConnection(req.user.id);
    ensureRequestedLeague(connection, leagueId);
    const draft = await readDraftSnapshot({
      userId: req.user.id,
      leagueId,
      espnS2: connection.espnS2,
      swid: connection.swid,
      teamId: connection.espn_team_id,
    });

    return res.json(buildDraftMetaResponse({ draftId, draft }));
  } catch (error) {
    return draftError(res, error, "meta");
  }
});

router.get("/draft/:draftId/state", requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const leagueId = parseEspnDraftId(draftId);
    if (!leagueId) {
      return res.status(400).json({ error: "draftId path param must be an ESPN draft id" });
    }

    const sinceCursor = parseSinceCursor(req.query.since);
    if (sinceCursor === null) {
      return res.status(400).json({ error: "since must be a non-negative integer" });
    }

    const connection = await lookupConnection(req.user.id);
    ensureRequestedLeague(connection, leagueId);
    const draft = await readDraftSnapshot({
      userId: req.user.id,
      leagueId,
      espnS2: connection.espnS2,
      swid: connection.swid,
      teamId: connection.espn_team_id,
    });

    return res.json(buildDraftStateResponse({
      draftId,
      draft,
      since: sinceCursor,
      debounceMs: DEFAULT_DEBOUNCE_MS,
    }));
  } catch (error) {
    return draftError(res, error, "state");
  }
});

router.get("/roster", requireAuth, async (req, res, next) => {
  try {
    const { leagueId, week } = req.query;
    if (!leagueId) return res.status(400).json({ error: "leagueId query param required" });
    if (!week) return res.status(400).json({ error: "week query param required" });

    const wk = parseInt(week, 10);
    if (!Number.isFinite(wk) || wk < 1) {
      return res.status(400).json({ error: "week must be a positive number" });
    }

    const connection = await lookupConnection(req.user.id);
    const roster = await espnAdapter.buildNormalizedRoster(
      leagueId,
      connection.espnS2,
      connection.swid,
      wk,
      { teamId: connection.espn_team_id }
    );
    return res.json(roster);
  } catch (e) {
    if (e.code === "espn_not_connected") {
      return res.status(401).json({ error: "ESPN not connected" });
    }
    if (e.code === "espn_reauth_required") {
      return res.status(401).json({ error: "ESPN re-auth required" });
    }
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
