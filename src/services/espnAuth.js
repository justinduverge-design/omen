"use strict";

// SECURITY: ESPN cookies (espn_s2, swid) must never be logged, echoed,
// or persisted in plaintext. Do not add log statements that include these values.

/**
 * Authenticated ESPN credential factory.
 *
 * Given a Supabase user id, returns decrypted ESPN session credentials from
 * Supabase Vault. The platform_connections table stores only Vault secret IDs.
 */

const { createClient } = require("@supabase/supabase-js");
const config = require("../config");

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

async function vaultDecrypt(secretId) {
  if (!secretId) return null;
  const { data, error } = await supabase.rpc("vault_decrypt_secret", { secret_id: secretId });
  if (error) throw new Error("ESPN credentials unavailable");
  return data?.decrypted_secret ?? data?.[0]?.decrypted_secret ?? null;
}

async function getAuthenticatedEspnCredentials(userId) {
  const { data: conn, error } = await supabase
    .from("platform_connections")
    .select("espn_secret_id, swid_secret_id")
    .eq("user_id", userId)
    .eq("platform", "espn")
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`platform_connections lookup failed: ${error.message}`);
  if (!conn?.espn_secret_id || !conn?.swid_secret_id) {
    throw Object.assign(new Error("ESPN not connected"), { status: 404 });
  }

  let espn_s2;
  let swid;
  try {
    espn_s2 = await vaultDecrypt(conn.espn_secret_id);
    swid = await vaultDecrypt(conn.swid_secret_id);
  } catch (_e) {
    throw Object.assign(new Error("ESPN credentials unavailable"), { status: 401 });
  }

  if (!espn_s2 || !swid) {
    throw Object.assign(new Error("ESPN credentials unavailable"), { status: 401 });
  }

  return { espn_s2, swid };
}

module.exports = { getAuthenticatedEspnCredentials };
