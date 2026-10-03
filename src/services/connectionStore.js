"use strict";

/**
 * Provider credential writes through the database redo's step 02 functions (plan A0).
 *
 * `sql/2026-10-01-redo/02_connection_credentials.up.sql` defines functions that change a Vault
 * secret and its `platform_connections` pointer in one transaction, under a per-(user, provider)
 * advisory lock. `account_erase()` (step 10) takes the same locks, so an erase can no longer land
 * between "secrets created" and "connection saved" and orphan a cookie (Codex, #514).
 *
 * Until step 02 is applied in production the functions do not exist. Each call here then reports
 * `{ present: false }` and the caller keeps its existing path. A fallback is logged once per
 * function per process: after step 02 is applied, that warning must stop appearing.
 *
 * Errors carry the function name and Postgres code only, never the arguments: the arguments are
 * cookies and tokens.
 */

const { logger } = require("../middleware/logging");

// PostgREST reports an unknown function as PGRST202; Postgres itself as 42883.
const MISSING_FUNCTION_CODES = new Set(["PGRST202", "42883"]);

// Argument names exactly as declared in step 02. test/connectionStore.test.js checks them against
// the SQL, because a misspelled name also comes back as PGRST202 and would fall back forever.
const STEP02_PARAMS = Object.freeze({
  connection_store_espn: ["p_user_id", "p_league_id", "p_team_id", "p_espn_s2", "p_swid"],
  connection_store_yahoo: ["p_user_id", "p_access_token", "p_refresh_token", "p_expires_at", "p_yahoo_guid", "p_league_id"],
  connection_rotate_yahoo: ["p_user_id", "p_expected_expires_at", "p_access_token", "p_refresh_token", "p_expires_at"],
  connection_revoke: ["p_user_id", "p_platform"],
});

const warnedFallback = new Set();

function isMissingFunction(error) {
  return Boolean(error && MISSING_FUNCTION_CODES.has(error.code));
}

async function callStep02(supabase, name, params) {
  const { data, error } = await supabase.rpc(name, params);
  if (isMissingFunction(error)) {
    if (!warnedFallback.has(name)) {
      warnedFallback.add(name);
      logger.warn("Step 02 function not present; using the legacy credential path", { fn: name });
    }
    return { present: false };
  }
  if (error) {
    const err = new Error(`${name} failed (${error.code || "unknown"})`);
    err.code = error.code;
    throw err;
  }
  return { present: true, data };
}

function storeEspn(supabase, { userId, leagueId, teamId = null, espnS2, swid }) {
  return callStep02(supabase, "connection_store_espn", {
    p_user_id: userId,
    p_league_id: leagueId,
    p_team_id: teamId,
    p_espn_s2: espnS2,
    p_swid: swid,
  });
}

function storeYahoo(supabase, { userId, accessToken, refreshToken, expiresAt, yahooGuid = null, leagueId = null }) {
  return callStep02(supabase, "connection_store_yahoo", {
    p_user_id: userId,
    p_access_token: accessToken,
    p_refresh_token: refreshToken,
    p_expires_at: expiresAt,
    p_yahoo_guid: yahooGuid,
    p_league_id: leagueId,
  });
}

// Compare-and-swap: writes only if token_expires_at still equals what the caller read.
// `data === false` means another request refreshed first.
function rotateYahoo(supabase, { userId, expectedExpiresAt, accessToken, refreshToken = null, expiresAt }) {
  return callStep02(supabase, "connection_rotate_yahoo", {
    p_user_id: userId,
    p_expected_expires_at: expectedExpiresAt ?? null,
    p_access_token: accessToken,
    p_refresh_token: refreshToken,
    p_expires_at: expiresAt,
  });
}

// All-or-nothing: deletes every secret the row points at, then the row. Throws if any secret is
// missing, so a disconnect can no longer report success while stranding a cookie.
function revoke(supabase, { userId, platform }) {
  return callStep02(supabase, "connection_revoke", { p_user_id: userId, p_platform: platform });
}

module.exports = {
  STEP02_PARAMS,
  isMissingFunction,
  storeEspn,
  storeYahoo,
  rotateYahoo,
  revoke,
};
