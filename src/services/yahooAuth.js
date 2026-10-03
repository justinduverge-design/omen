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
const connectionStore  = require("./connectionStore");

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

function expiryFrom(tokens) {
  return new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString();
}

async function persistYahooTokens(userId, tokens, leagueId = null) {
  // Both tokens and the connection row in one transaction, under the lock account_erase() takes.
  const stored = await connectionStore.storeYahoo(supabase, {
    userId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: expiryFrom(tokens),
    yahooGuid: tokens.xoauth_yahoo_guid || null,
    leagueId,
  });
  if (stored.present) return;

  // Today's path, kept until redo step 02 is applied.
  const { data: existing, error: lookupError } = await supabase
    .from("platform_connections")
    .select("league_id, token_secret_id, refresh_secret_id")
    .eq("user_id", userId)
    .eq("platform", "yahoo")
    .maybeSingle();

  if (lookupError) throw new Error(`platform_connections lookup failed: ${lookupError.message}`);

  const [accessSecretId, refreshSecretId] = await Promise.all([
    existing?.token_secret_id
      ? vaultUpdate(existing.token_secret_id, tokens.access_token).then(() => existing.token_secret_id)
      : vaultCreate(tokens.access_token, `yahoo_access_${userId}`, "Yahoo OAuth access token"),
    existing?.refresh_secret_id
      ? vaultUpdate(existing.refresh_secret_id, tokens.refresh_token).then(() => existing.refresh_secret_id)
      : vaultCreate(tokens.refresh_token, `yahoo_refresh_${userId}`, "Yahoo OAuth refresh token"),
  ]);

  const { error } = await supabase.from("platform_connections").upsert({
    user_id: userId,
    platform: "yahoo",
    // "yahoo" is a deliberate placeholder (league_id is NOT NULL) - hasUsableLeagueId() rejects it; GET /api/yahoo/leagues + POST /api/yahoo/league bind the real one.
    league_id: leagueId || existing?.league_id || "yahoo",
    platform_user_id: tokens.xoauth_yahoo_guid || null,
    token_secret_id: accessSecretId,
    refresh_secret_id: refreshSecretId,
    token_expires_at: expiryFrom(tokens),
    is_active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,platform" });

  if (error) throw new Error(`Yahoo token persistence failed: ${error.message}`);
}

async function readYahooConnection(userId) {
  const { data: conn, error } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", "yahoo")
    .maybeSingle();

  if (error) throw new Error(`platform_connections lookup failed: ${error.message}`);
  return conn;
}

// One Yahoo token exchange per user at a time in this process. Yahoo may issue a new refresh token
// and revoke the old one, so two parallel exchanges with the same refresh token can fail or leave a
// revoked token stored (Codex, #525). Concurrent callers share the one in-flight refresh.
const refreshesInFlight = new Map();

// Across processes (API and cron containers, or more than one API process), a short Redis claim spans the
// whole provider exchange (Codex, #525). The holder exchanges; anyone else waits for the token the holder
// stores and never calls Yahoo. Without Redis, only the process-local map above applies.
const CLAIM_TTL_MS = 20_000;
const CLAIM_WAIT_TRIES = 10;
const CLAIM_WAIT_MS = 300;
const RELEASE_IF_OWNER = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
const RENEW_IF_OWNER = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end";
let claimStore;
let claimSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// While held, the claim is renewed well inside its lease, so a slow exchange or slow database write cannot
// let it lapse and admit a second exchanger (Codex, #533). The Yahoo request itself is also time-bounded.
let claimRenewEveryMs = CLAIM_TTL_MS / 4;

function refreshClaimStore() {
  if (claimStore === undefined) {
    claimStore = config.redisUrl && config.redisToken
      ? new (require("@upstash/redis").Redis)({ url: config.redisUrl, token: config.redisToken })
      : null;
  }
  return claimStore;
}

// Test seam: substitute the claim store and the wait between re-reads.
function setRefreshClaimStore(store, { sleep, renewEveryMs } = {}) {
  claimStore = store;
  if (sleep) claimSleep = sleep;
  if (renewEveryMs) claimRenewEveryMs = renewEveryMs;
}

// Returns a release function when this process holds the claim, null when another process does, and a
// no-op release when the claim store is unavailable (fall back to the process-local guard).
async function claimRefresh(userId) {
  const store = refreshClaimStore();
  if (!store) return async () => {};
  const key = `omen:yahoo_refresh_claim:${userId}`;
  const token = require("node:crypto").randomUUID();
  try {
    const acquired = await store.set(key, token, { nx: true, px: CLAIM_TTL_MS });
    if (!acquired) return null;
  } catch (err) {
    logger.warn("Yahoo refresh claim unavailable; refreshing without the cross-process guard", { err: err.message });
    return async () => {};
  }
  const renewal = setInterval(() => {
    store.eval(RENEW_IF_OWNER, [key], [token, String(CLAIM_TTL_MS)]).catch((err) => {
      logger.warn("Yahoo refresh claim renewal failed", { err: err.message });
    });
  }, claimRenewEveryMs);
  renewal.unref?.();
  return async () => {
    clearInterval(renewal);
    try {
      await store.eval(RELEASE_IF_OWNER, [key], [token]);
    } catch (err) {
      logger.warn("Yahoo refresh claim release failed; it expires on its own", { err: err.message });
    }
  };
}

async function waitForStoredToken(userId) {
  for (let i = 0; i < CLAIM_WAIT_TRIES; i += 1) {
    await claimSleep(CLAIM_WAIT_MS);
    const current = await readYahooConnection(userId);
    if (current && !expiresSoon(current)) {
      const stored = await vaultDecrypt(current.token_secret_id);
      if (stored) return stored;
    }
  }
  throw Object.assign(new Error("Yahoo token refresh in progress elsewhere; retry shortly"), {
    status: 503,
    code: "yahoo_refresh_in_progress",
  });
}

function refreshYahooAccessToken(userId, conn) {
  const inFlight = refreshesInFlight.get(userId);
  if (inFlight) return inFlight;
  const refresh = exchangeAndStore(userId, conn).finally(() => refreshesInFlight.delete(userId));
  refreshesInFlight.set(userId, refresh);
  return refresh;
}

function expiresSoon(conn) {
  const expiresAt = conn?.token_expires_at ? new Date(conn.token_expires_at) : null;
  return !expiresAt || expiresAt.getTime() < Date.now() + 60_000;
}

async function exchangeAndStore(userId, snapshot) {
  // The caller's snapshot may be stale: another request can finish a refresh after it was read and
  // before this one became the leader. Re-read, and use a token someone else already stored instead of
  // exchanging again (a second exchange can rotate and revoke the stored refresh token; Codex, #525).
  const conn = (await readYahooConnection(userId)) || snapshot;
  if (!expiresSoon(conn)) {
    const stored = await vaultDecrypt(conn.token_secret_id);
    if (stored) return stored;
  }

  const release = await claimRefresh(userId);
  if (!release) return waitForStoredToken(userId);
  try {
    // Re-read under the claim: another process may have stored a fresh token after this request's read
    // and released the claim before this request took it (Codex, #533).
    const current = (await readYahooConnection(userId)) || conn;
    if (!expiresSoon(current)) {
      const stored = await vaultDecrypt(current.token_secret_id);
      if (stored) return stored;
    }
    return await exchangeWithProvider(userId, current);
  } finally {
    await release();
  }
}

async function exchangeWithProvider(userId, conn) {
  const refreshToken = await vaultDecrypt(conn.refresh_secret_id);
  if (!refreshToken) {
    throw Object.assign(new Error("Yahoo refresh token missing - re-auth required"), { status: 401 });
  }

  let refreshed;
  try {
    refreshed = await refreshYahooToken(refreshToken);
  } catch (err) {
    // Another process may have refreshed first and rotated the refresh token this request read.
    // If the stored expiry moved, use the access token it stored instead of failing.
    const current = await readYahooConnection(userId);
    if (current && current.token_expires_at !== conn.token_expires_at) {
      const stored = await vaultDecrypt(current.token_secret_id);
      if (stored) return stored;
    }
    throw err;
  }

  const accessToken = refreshed.access_token;
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  // Across processes, the write lands only if nobody refreshed since this request read the row.
  // A loser keeps its own fresh access token for this request and writes nothing.
  const rotation = await connectionStore.rotateYahoo(supabase, {
    userId,
    expectedExpiresAt: conn.token_expires_at,
    accessToken,
    refreshToken: refreshed.refresh_token || null,
    expiresAt,
  });

  if (!rotation.present) {
    // Today's path, kept until redo step 02 is applied.
    await vaultUpdate(conn.token_secret_id, accessToken);
    if (refreshed.refresh_token) {
      await vaultUpdate(conn.refresh_secret_id, refreshed.refresh_token);
    }
    await supabase.from("platform_connections").update({
      token_expires_at: expiresAt,
      updated_at:       new Date().toISOString(),
    }).eq("user_id", userId).eq("platform", "yahoo");
  }

  logger.info("Yahoo token refreshed", { userId, stored: rotation.present ? rotation.data !== false : true });
  return accessToken;
}

async function getAuthenticatedYahooClient(userId) {
  const conn = await readYahooConnection(userId);
  if (!conn) {
    throw Object.assign(new Error("No Yahoo connection for this user"), { status: 404 });
  }

  let accessToken = await vaultDecrypt(conn.token_secret_id);
  if (!accessToken) {
    throw Object.assign(new Error("No Yahoo token on file"), { status: 401 });
  }

  if (expiresSoon(conn)) {
    accessToken = await refreshYahooAccessToken(userId, conn);
  }

  return {
    client: new YahooClient(accessToken),
    accessToken,
  };
}

module.exports = { getAuthenticatedYahooClient, persistYahooTokens, setRefreshClaimStore };
