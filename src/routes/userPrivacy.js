"use strict";

const crypto = require("crypto");
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { logger } = require("../middleware/logging");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
const DELETE_CONFIRMATION = "DELETE MY CORVUS DATA";

function userHash(userId) {
  return crypto.createHash("sha256").update(String(userId)).digest("hex");
}

function redactPlatformConnection(row = {}) {
  return {
    platform: row.platform || null,
    platform_username: row.platform_username || null,
    league_id: row.league_id || null,
    espn_team_id: row.espn_team_id || null,
    is_active: Boolean(row.is_active),
    token_expires_at: row.token_expires_at || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

async function selectRows(table, columns, userId) {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("user_id", userId);
  if (error) throw new Error(`${table} export failed: ${error.message}`);
  return Array.isArray(data) ? data : [];
}

async function selectUserProfile(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("id,email,is_subscribed,created_at,updated_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`users export failed: ${error.message}`);
  return data || { id: userId };
}

async function deleteWhereUserId(table, userId) {
  const { error } = await supabase.from(table).delete().eq("user_id", userId);
  if (error) throw new Error(`${table} delete failed: ${error.message}`);
}

async function deleteVaultSecret(secretId) {
  if (!secretId) return;
  const { error } = await supabase.rpc("vault_delete_secret", { secret_id: secretId });
  if (error) {
    logger.warn("Vault secret delete failed during account deletion", { err: error.message });
  }
}

router.get("/export", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [
      profile,
      platformRows,
      subscriptionRows,
      consentRows,
      moveRows,
    ] = await Promise.all([
      selectUserProfile(userId),
      selectRows(
        "platform_connections",
        "platform,platform_username,league_id,espn_team_id,is_active,token_expires_at,created_at,updated_at",
        userId
      ),
      selectRows(
        "subscriptions",
        "plan,status,subscribed_at,canceled_at,trial_ends_at,current_period_end,expires_at",
        userId
      ),
      selectRows("consent_records", "consent_type,granted,granted_at,withdrawn_at,ip_address,user_agent", userId),
      selectRows("moves", "id,feature,move_type,created_at,updated_at", userId),
    ]);

    return res.json({
      contract_version: "user-export.v1",
      generated_at: new Date().toISOString(),
      user: profile,
      platform_connections: platformRows.map(redactPlatformConnection),
      subscriptions: subscriptionRows,
      consent_records: consentRows,
      moves: moveRows,
      redactions: [
        "Raw OAuth tokens are excluded.",
        "ESPN cookies are excluded.",
        "Supabase Vault secret identifiers are excluded.",
      ],
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/consent", requireAuth, async (req, res, next) => {
  try {
    const consentType = String(req.body?.consent_type || "").trim();
    const granted = Boolean(req.body?.granted);
    if (!consentType) {
      return res.status(400).json({ error: "consent_type is required" });
    }

    const { error } = await supabase.from("consent_records").upsert({
      user_id: req.user.id,
      consent_type: consentType,
      granted,
      granted_at: granted ? new Date().toISOString() : null,
      withdrawn_at: granted ? null : new Date().toISOString(),
      ip_address: req.ip || null,
      user_agent: req.get("user-agent") || null,
    });
    if (error) throw new Error(`consent_records upsert failed: ${error.message}`);

    return res.json({
      contract_version: "user-consent.v1",
      consent_type: consentType,
      granted,
    });
  } catch (err) {
    return next(err);
  }
});

router.delete("/delete", requireAuth, async (req, res, next) => {
  try {
    if (req.body?.confirmation !== DELETE_CONFIRMATION) {
      return res.status(400).json({
        error: `confirmation must exactly equal "${DELETE_CONFIRMATION}"`,
      });
    }

    const userId = req.user.id;
    const { data: platformRows, error: platformError } = await supabase
      .from("platform_connections")
      .select("token_secret_id,refresh_secret_id,espn_secret_id,swid_secret_id")
      .eq("user_id", userId);
    if (platformError) throw new Error(`platform_connections lookup failed: ${platformError.message}`);

    const secretIds = new Set();
    for (const row of platformRows || []) {
      for (const key of ["token_secret_id", "refresh_secret_id", "espn_secret_id", "swid_secret_id"]) {
        if (row[key]) secretIds.add(row[key]);
      }
    }
    await Promise.all([...secretIds].map(deleteVaultSecret));

    await Promise.all([
      deleteWhereUserId("moves", userId),
      deleteWhereUserId("platform_connections", userId),
      deleteWhereUserId("oauth_state", userId),
      deleteWhereUserId("consent_records", userId),
      deleteWhereUserId("subscriptions", userId),
    ]);

    await supabase.from("deletion_audit_log").insert({
      user_id_hash: userHash(userId),
      method: "user_requested",
    });

    await supabase.from("users").delete().eq("id", userId);

    logger.info("User deletion completed", { user_hash: userHash(userId) });
    return res.json({
      contract_version: "user-delete.v1",
      deleted: true,
      user_hash: userHash(userId),
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
module.exports.DELETE_CONFIRMATION = DELETE_CONFIRMATION;
module.exports.redactPlatformConnection = redactPlatformConnection;
