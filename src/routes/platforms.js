"use strict";

/**
 * Platform connection routes.
 *
 * Handles connection state for Yahoo, Sleeper, and ESPN. ESPN raw cookie
 * values must never be logged, echoed, or persisted outside Supabase Vault.
 */

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { logger } = require("../middleware/logging");
const { requireAuth } = require("../middleware/auth");
const sleeperAdapter = require("../adapters/sleeper");
const espnAdapter = require("../adapters/espn");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
const VALID_PLATFORMS = new Set(["yahoo", "sleeper", "espn"]);

function nowIso() {
  return new Date().toISOString();
}

function platformStatus(rows) {
  const byPlatform = new Map((rows || []).map((row) => [row.platform, row]));
  const yahoo = byPlatform.get("yahoo");
  const sleeper = byPlatform.get("sleeper");
  const espn = byPlatform.get("espn");

  return {
    yahoo: {
      connected: Boolean(yahoo?.is_active && yahoo?.token_secret_id),
      platform: "yahoo",
    },
    sleeper: {
      connected: Boolean(sleeper?.is_active && sleeper?.platform_username),
      platform: "sleeper",
      username: sleeper?.is_active ? sleeper?.platform_username || null : null,
    },
    espn: {
      connected: Boolean(espn?.is_active && espn?.espn_secret_id && espn?.swid_secret_id),
      platform: "espn",
    },
  };
}

function secretIdFromVaultResult(data) {
  if (typeof data === "string") return data;
  if (data?.id) return data.id;
  if (data?.secret_id) return data.secret_id;
  if (Array.isArray(data)) return secretIdFromVaultResult(data[0]);
  return data || null;
}

async function vaultCreate(secret, name, description = "") {
  const { data, error } = await supabase.rpc("vault_create_secret", { secret, name, description });
  if (error) throw new Error(`Vault create failed: ${error.message}`);
  const secretId = secretIdFromVaultResult(data);
  if (!secretId) throw new Error("Vault create failed: missing secret id");
  return secretId;
}

async function vaultUpdate(secretId, newSecret) {
  const { error } = await supabase.rpc("vault_update_secret", {
    secret_id: secretId,
    new_secret: newSecret,
  });
  if (error) throw new Error(`Vault update failed: ${error.message}`);
  return secretId;
}

async function vaultUpsert(existingSecretId, secret, name, description) {
  return existingSecretId
    ? vaultUpdate(existingSecretId, secret)
    : vaultCreate(secret, name, description);
}

async function vaultDelete(secretId) {
  if (!secretId) return;
  const { error } = await supabase.rpc("vault_delete_secret", { secret_id: secretId });
  if (error) {
    logger.warn("Vault secret deletion failed", { err: error.message, secretId });
  }
}

function isSleeperNotFound(err) {
  return err?.status === 404 || err?.response?.status === 404;
}

async function validateEspnConnection({ leagueId, espn_s2, swid, espnTeamId }) {
  const roster = await espnAdapter.buildNormalizedRoster(leagueId, espn_s2, swid, 1, {
    teamId: espnTeamId,
  });
  return roster && roster.source === "espn";
}

router.get("/status", requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("platform_connections")
      .select("platform,is_active,platform_username,token_secret_id,espn_secret_id,swid_secret_id")
      .eq("user_id", req.user.id);

    if (error) throw new Error(`platform_connections lookup failed: ${error.message}`);
    return res.json(platformStatus(data));
  } catch (e) {
    logger.error("Platform status lookup failed", { err: e.message });
    return next(e);
  }
});

router.post("/sleeper/connect", requireAuth, async (req, res, next) => {
  try {
    const username = String(req.body?.username || "").trim();
    const leagueId = String(req.body?.league_id || "").trim();
    if (!username) return res.status(422).json({ error: "username required" });
    if (!leagueId) return res.status(422).json({ error: "league_id required" });

    let sleeperUser;
    try {
      sleeperUser = await sleeperAdapter.fetchSleeperUser(username);
    } catch (e) {
      if (isSleeperNotFound(e)) {
        return res.status(400).json({ error: "Sleeper username not found" });
      }
      throw e;
    }

    const { error } = await supabase.from("platform_connections").upsert({
      user_id: req.user.id,
      platform: "sleeper",
      platform_user_id: sleeperUser.user_id,
      platform_username: sleeperUser.username || username,
      league_id: leagueId,
      is_active: true,
      updated_at: nowIso(),
    }, { onConflict: "user_id,platform" });

    if (error) throw new Error(`Sleeper connection upsert failed: ${error.message}`);
    return res.json({ connected: true, username: sleeperUser.username || username });
  } catch (e) {
    logger.error("Sleeper connect failed", { err: e.message });
    return next(e);
  }
});

router.post("/espn/connect", requireAuth, (req, res, next) => {
  res.locals.__skipBodyLog = true;
  return next();
}, async (req, res, next) => {
  try {
    const espn_s2 = String(req.body?.espn_s2 || "");
    const swid = String(req.body?.swid || "");
    const leagueId = String(req.body?.league_id || "").trim();
    const espnTeamId = req.body?.espn_team_id == null
      ? null
      : String(req.body.espn_team_id).trim() || null;

    if (!espn_s2 || !swid) {
      return res.status(422).json({ error: "espn_s2 and swid required" });
    }
    if (!leagueId) {
      return res.status(422).json({ error: "league_id required" });
    }

    try {
      const valid = await validateEspnConnection({ leagueId, espn_s2, swid, espnTeamId });
      if (!valid) return res.status(400).json({ error: "ESPN credentials invalid or expired" });
    } catch (_e) {
      return res.status(400).json({ error: "ESPN credentials invalid or expired" });
    }

    const { data: existing, error: lookupError } = await supabase
      .from("platform_connections")
      .select("espn_secret_id, swid_secret_id")
      .eq("user_id", req.user.id)
      .eq("platform", "espn")
      .maybeSingle();

    if (lookupError) throw new Error(`ESPN connection lookup failed: ${lookupError.message}`);

    const [espnSecretId, swidSecretId] = await Promise.all([
      vaultUpsert(existing?.espn_secret_id, espn_s2, `espn_s2_${req.user.id}`, "ESPN espn_s2 cookie"),
      vaultUpsert(existing?.swid_secret_id, swid, `espn_swid_${req.user.id}`, "ESPN SWID cookie"),
    ]);

    const { error } = await supabase.from("platform_connections").upsert({
      user_id: req.user.id,
      platform: "espn",
      espn_secret_id: espnSecretId,
      swid_secret_id: swidSecretId,
      league_id: leagueId,
      espn_team_id: espnTeamId,
      is_active: true,
      updated_at: nowIso(),
    }, { onConflict: "user_id,platform" });

    if (error) throw new Error(`ESPN connection upsert failed: ${error.message}`);
    return res.json({ connected: true });
  } catch (e) {
    logger.error("ESPN connect failed", { err: e.message });
    return next(new Error("ESPN connect failed"));
  }
});

router.delete("/:platform", requireAuth, async (req, res, next) => {
  try {
    const platform = String(req.params.platform || "").toLowerCase();
    if (!VALID_PLATFORMS.has(platform)) {
      return res.status(400).json({ error: "Invalid platform" });
    }

    const { data: conn, error: lookupError } = await supabase
      .from("platform_connections")
      .select("token_secret_id,refresh_secret_id,espn_secret_id,swid_secret_id")
      .eq("user_id", req.user.id)
      .eq("platform", platform)
      .maybeSingle();

    if (lookupError) throw new Error(`platform_connections lookup failed: ${lookupError.message}`);

    if (conn) {
      if (platform === "espn") {
        await Promise.all([
          vaultDelete(conn.espn_secret_id),
          vaultDelete(conn.swid_secret_id),
        ]);
      } else if (platform === "yahoo") {
        await Promise.all([
          vaultDelete(conn.token_secret_id),
          vaultDelete(conn.refresh_secret_id),
        ]);
      }

      const { error: deleteError } = await supabase
        .from("platform_connections")
        .delete()
        .eq("user_id", req.user.id)
        .eq("platform", platform);

      if (deleteError) throw new Error(`platform_connections delete failed: ${deleteError.message}`);
    }

    return res.json({ disconnected: true, platform });
  } catch (e) {
    logger.error("Platform disconnect failed", { err: e.message, platform: req.params.platform });
    return next(e);
  }
});

module.exports = router;
