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

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

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

router.get("/roster", requireAuth, async (req, res, next) => {
  try {
    const { leagueId, week } = req.query;
    if (!leagueId) return res.status(400).json({ error: "leagueId query param required" });
    if (!week) return res.status(400).json({ error: "week query param required" });

    const wk = parseInt(week, 10);
    if (!Number.isFinite(wk) || wk < 1) {
      return res.status(400).json({ error: "week must be a positive number" });
    }

    const { data: conn, error: connError } = await supabase
      .from("platform_connections")
      .select("espn_secret_id, swid_secret_id, league_id")
      .eq("user_id", req.user.id)
      .eq("platform", "espn")
      .maybeSingle();
    if (connError) throw new Error("ESPN connection lookup failed");
    if (!conn) return res.status(401).json({ error: "ESPN not connected" });
    const espnS2 = await vaultDecrypt(conn.espn_secret_id);
    const swid = await vaultDecrypt(conn.swid_secret_id);
    if (!espnS2 || !swid) return res.status(401).json({ error: "ESPN re-auth required" });

    const roster = await espnAdapter.buildNormalizedRoster(leagueId, espnS2, swid, wk);
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
