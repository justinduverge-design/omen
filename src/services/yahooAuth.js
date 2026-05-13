"use strict";

/**
 * =================================================================
 * Authenticated Yahoo client factory
 * -----------------------------------------------------------------
 * Given a Supabase user id, returns a YahooClient with a fresh
 * access token. Handles:
 *   - lookup of platform_connections row
 *   - decrypt access + refresh tokens via Vault
 *   - proactive refresh (1-min buffer before expiry) + persist
 *
 * Used by every route that needs to talk to Yahoo on behalf of a
 * user. Extracted from routes/yahoo.js so multiple routers can
 * share the same plumbing without duplicating it.
 * =================================================================
 */

const { createClient } = require("@supabase/supabase-js");
const config           = require("../config");
const { logger }       = require("../middleware/logging");
const { refreshYahooToken } = require("../middleware/yahooOAuth");
const YahooClient      = require("./yahoo");

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

async function vaultDecrypt(secretId) {
  if (!secretId) return null;
  const { data, error } = await supabase.rpc("vault_decrypt_secret", { secret_id: secretId });
  if (error) throw new Error(`Vault decrypt failed: ${error.message}`);
  return data?.decrypted_secret ?? data?.[0]?.decrypted_secret ?? null;
}

async function vaultUpdate(secretId, newSecret) {
  const { error } = await supabase.rpc("vault_update_secret", {
    secret_id:  secretId,
    new_secret: newSecret,
  });
  if (error) throw new Error(`Vault update failed: ${error.message}`);
}

async function vaultCreate(secret, name, description = "") {
  const { data, error } = await supabase.rpc("vault_create_secret", { secret, name, description });
  if (error) throw new Error(`Vault create failed: ${error.message}`);
  return data?.id || data?.secret_id || data?.[0]?.id || data?.[0]?.secret_id || data;
}

async function persistYahooTokens(userId, tokens, leagueId = null) {
  const { data: existing, error: lookupError } = await supabase
    .from("platform_connections")
    .select("league_id")
    .eq("user_id", userId)
    .eq("platform", "yahoo")
    .maybeSingle();

  if (lookupError) throw new Error(`platform_connections lookup failed: ${lookupError.message}`);

  const [accessSecretId, refreshSecretId] = await Promise.all([
    vaultCreate(tokens.access_token, `yahoo_access_${userId}`, "Yahoo OAuth access token"),
    vaultCreate(tokens.refresh_token, `yahoo_refresh_${userId}`, "Yahoo OAuth refresh token"),
  ]);

  const { error } = await supabase.from("platform_connections").upsert({
    user_id: userId,
    platform: "yahoo",
    league_id: leagueId || existing?.league_id || "yahoo",
    platform_user_id: tokens.xoauth_yahoo_guid || null,
    token_secret_id: accessSecretId,
    refresh_secret_id: refreshSecretId,
    token_expires_at: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString(),
    is_active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,platform" });

  if (error) throw new Error(`Yahoo token persistence failed: ${error.message}`);
}

async function getAuthenticatedYahooClient(userId) {
  const { data: conn, error } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", "yahoo")
    .maybeSingle();

  if (error) throw new Error(`platform_connections lookup failed: ${error.message}`);
  if (!conn) {
    throw Object.assign(new Error("No Yahoo connection for this user"), { status: 404 });
  }

  let accessToken = await vaultDecrypt(conn.token_secret_id);
  if (!accessToken) {
    throw Object.assign(new Error("No Yahoo token on file"), { status: 401 });
  }

  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
  const isExpired = !expiresAt || expiresAt.getTime() < Date.now() + 60_000;

  if (isExpired) {
    const refreshToken = await vaultDecrypt(conn.refresh_secret_id);
    if (!refreshToken) {
      throw Object.assign(new Error("Yahoo refresh token missing - re-auth required"), { status: 401 });
    }

    const refreshed = await refreshYahooToken(refreshToken);
    accessToken = refreshed.access_token;

    await vaultUpdate(conn.token_secret_id, accessToken);
    if (refreshed.refresh_token) {
      await vaultUpdate(conn.refresh_secret_id, refreshed.refresh_token);
    }
    await supabase.from("platform_connections").update({
      token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      updated_at:       new Date().toISOString(),
    }).eq("user_id", userId).eq("platform", "yahoo");

    logger.info("Yahoo token refreshed", { userId });
  }

  return new YahooClient(accessToken);
}

module.exports = { getAuthenticatedYahooClient, persistYahooTokens };
