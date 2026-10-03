"use strict";

const crypto = require("crypto");
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { logger } = require("../middleware/logging");
const { requireAuth } = require("../middleware/auth");
const { isMissingFunction } = require("../services/connectionStore");
const { createDefaultTradeSavedQueueStore } = require("../services/tradeSavedQueueStore");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
// #519's Redis saved-trade blob, superseded by the saved_trades table (which cascades from users).
const legacySavedTrades = createDefaultTradeSavedQueueStore();
// Shortened from "DELETE MY OMEN DATA" on 2026-09-03 (founder). The long phrase made an
// already-deliberate action tedious, and on a phone it fought autocapitalize and autocorrect
// the whole way — the founder hit it while trying to reset an account for testing.
//
// Matched case-insensitively and trimmed, which the long phrase deliberately was not. With one
// short word, strictness stops being a safety property and becomes a way to fail someone who
// typed "Delete". The guardrail was never the exact casing — it is that the user must type a
// word at all rather than tap once.
const DELETE_CONFIRMATION = "delete";

// **Kept accepted deliberately.** Every already-installed app and the currently-deployed web
// bundle still send the old phrase, and this route is the App Store 5.1.1 deletion path — a
// window where a stale client cannot delete their own account is the one outcome worse than a
// long phrase. Retire this only once no shipped client sends it.
const LEGACY_DELETE_CONFIRMATION = "DELETE MY OMEN DATA";

function isDeleteConfirmed(raw) {
  const text = String(raw ?? "").trim();
  return text.toLowerCase() === DELETE_CONFIRMATION || text === LEGACY_DELETE_CONFIRMATION;
}
const LEGAL_VERSION = "2026-08-02";
const LEGAL_CONSENT_TYPES = [
  `age_13_plus:${LEGAL_VERSION}`,
  `privacy_notice:${LEGAL_VERSION}`,
  `terms_of_use:${LEGAL_VERSION}`,
];

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

// Tables a redo step adds (09 beta_reports, 12 saved_trades): until the step is applied, there is nothing
// to export or delete, so a missing table reads as empty instead of failing the request.
const NOT_YET_APPLIED_TABLES = new Set(["beta_reports", "saved_trades"]);
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

async function selectRows(table, columns, userId) {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("user_id", userId);
  if (NOT_YET_APPLIED_TABLES.has(table) && MISSING_TABLE_CODES.has(error?.code)) return [];
  if (error) throw new Error(`${table} export failed: ${error.message}`);
  return Array.isArray(data) ? data : [];
}

async function selectUserProfile(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("id,email,created_at,updated_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`users export failed: ${error.message}`);
  return data || { id: userId };
}

async function deleteWhereUserId(table, userId) {
  const { error } = await supabase.from(table).delete().eq("user_id", userId);
  if (NOT_YET_APPLIED_TABLES.has(table) && MISSING_TABLE_CODES.has(error?.code)) return;
  if (error) throw new Error(`${table} delete failed: ${error.message}`);
}

async function deleteVaultSecret(secretId) {
  if (!secretId) return;
  const { error } = await supabase.rpc("vault_delete_secret", { secret_id: secretId });
  if (error) {
    logger.warn("Vault secret delete failed during account deletion", { err: error.message });
  }
}

async function ensureConsentRecord(consentType, userId, req) {
  const { data, error: lookupError } = await supabase
    .from("consent_records")
    .select("id")
    .eq("user_id", userId)
    .eq("consent_type", consentType);
  if (lookupError) throw new Error(`consent_records lookup failed: ${lookupError.message}`);
  if (Array.isArray(data) && data.length > 0) return;

  const { error } = await supabase.from("consent_records").insert({
    user_id: userId,
    consent_type: consentType,
    granted: true,
    granted_at: new Date().toISOString(),
    withdrawn_at: null,
    ip_address: req.ip || null,
    user_agent: req.get("user-agent") || null,
  });
  if (error) throw new Error(`consent_records insert failed: ${error.message}`);
}

router.get("/export", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [
      profile,
      platformRows,
      consentRows,
      moveRows,
      reportRows,
      savedTradeRows,
    ] = await Promise.all([
      selectUserProfile(userId),
      selectRows(
        "platform_connections",
        "platform,platform_username,league_id,espn_team_id,is_active,token_expires_at,created_at,updated_at",
        userId
      ),
      selectRows("consent_records", "consent_type,granted,granted_at,withdrawn_at,ip_address,user_agent", userId),
      selectRows("moves", "id,feature,move_type,created_at,updated_at", userId),
      selectRows("beta_reports", "id,message,screen,app_version,build,os_version,device_model,connection_state,recent_error_codes,disclosure_accepted,created_at,expires_at", userId),
      selectRows("saved_trades", "provider,provider_league_id,season,week,provider_team_id,candidate_id,trade,reasoning,state,outcome,outcome_provenance,saved_at,sent_at,outcome_at", userId),
    ]);

    return res.json({
      contract_version: "user-export.v1",
      generated_at: new Date().toISOString(),
      user: profile,
      platform_connections: platformRows.map(redactPlatformConnection),
      consent_records: consentRows,
      moves: moveRows,
      beta_reports: reportRows,
      saved_trades: savedTradeRows,
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

router.post("/legal-acceptance", requireAuth, async (req, res, next) => {
  try {
    const termsVersion = String(req.body?.terms_version || "");
    const privacyVersion = String(req.body?.privacy_version || "");
    const minimumAgeConfirmed = req.body?.minimum_age_confirmed === true;

    if (
      termsVersion !== LEGAL_VERSION ||
      privacyVersion !== LEGAL_VERSION ||
      !minimumAgeConfirmed
    ) {
      return res.status(422).json({
        error: "Current Terms, Privacy Notice, and 13+ confirmation are required.",
      });
    }

    await Promise.all(
      LEGAL_CONSENT_TYPES.map((consentType) =>
        ensureConsentRecord(consentType, req.user.id, req)
      )
    );

    return res.json({
      contract_version: "legal-acceptance.v1",
      accepted: true,
      terms_version: LEGAL_VERSION,
      privacy_version: LEGAL_VERSION,
      minimum_age: 13,
    });
  } catch (err) {
    return next(err);
  }
});

router.delete("/delete", requireAuth, require("../services/responseCache").invalidateUserCacheOnWrite, async (req, res, next) => {
  try {
    if (!isDeleteConfirmed(req.body?.confirmation)) {
      return res.status(400).json({
        error: `confirmation must equal "${DELETE_CONFIRMATION}"`,
      });
    }

    const userId = req.user.id;

    // First, so a failure stops the request before anything is erased and a retry starts clean.
    await legacySavedTrades.deleteAll(userId);

    // One transaction for everything Omen holds (redo step 10). It waits for any connect in flight,
    // deletes every Vault secret or nothing, erases the Ledger, writes the audit row and removes the
    // users row. Today's table-by-table path stays until the function is applied.
    const { data: erased, error: eraseError } = await supabase.rpc("account_erase", {
      p_user_id: userId,
      p_method: "user_requested",
    });
    if (eraseError && !isMissingFunction(eraseError)) {
      throw new Error(`account_erase failed (${eraseError.code || "unknown"})`);
    }
    // The function cleans a sign-in with no app row itself, under its lock (Codex, #534), and reports a
    // repeat request as already_erased; the legacy cleanup runs only when the function is missing or is
    // the earlier version that returned no_such_user.
    if (eraseError || (erased?.erased === false && erased.reason !== "already_erased")) {
      // Function not applied yet, or no app user row. A sign-in without an app row can still own rows
      // keyed to the auth user (consent from /legal-acceptance, OAuth state), so clean those up before
      // the audit row records the deletion (Codex, #526).
      await eraseAccountLegacy(userId);
    }

    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw new Error(`auth identity delete failed: ${authError.message}`);

    logger.info("User deletion completed", { user_hash: userHash(userId) });
    return res.json({
      contract_version: "user-delete.v1",
      deleted: true,
      auth_identity_deleted: true,
      user_hash: userHash(userId),
    });
  } catch (err) {
    return next(err);
  }
});

async function insertDeletionAudit(userId) {
  const { error } = await supabase.from("deletion_audit_log").insert({
    user_id_hash: userHash(userId),
    method: "user_requested",
  });
  if (error) throw new Error(`deletion audit insert failed: ${error.message}`);
}

// Today's deletion, kept until redo steps 05 and 10 are applied. Each call commits on its own.
async function eraseAccountLegacy(userId) {
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
    deleteWhereUserId("beta_reports", userId),
    deleteWhereUserId("platform_connections", userId),
    deleteWhereUserId("oauth_state", userId),
    deleteWhereUserId("consent_records", userId),
  ]);

  await insertDeletionAudit(userId);

  const { error: userError } = await supabase.from("users").delete().eq("id", userId);
  if (userError) throw new Error(`users delete failed: ${userError.message}`);
}

module.exports = router;
module.exports.DELETE_CONFIRMATION = DELETE_CONFIRMATION;
module.exports.LEGACY_DELETE_CONFIRMATION = LEGACY_DELETE_CONFIRMATION;
module.exports.isDeleteConfirmed = isDeleteConfirmed;
module.exports.LEGAL_VERSION = LEGAL_VERSION;
module.exports.redactPlatformConnection = redactPlatformConnection;
