"use strict";

const { createClient } = require("@supabase/supabase-js");
const config = require("../config");

const CONNECTION_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 500;

function accessError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function setBounded(cache, key, value) {
  cache.delete(key);
  while (cache.size >= MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, value);
}

function createSleeperDraftAccess({
  supabaseClient,
  now = () => Date.now(),
} = {}) {
  const db = supabaseClient || createClient(config.supabaseUrl, config.supabaseServiceKey);
  const cache = new Map();
  const inFlight = new Map();

  async function getConnection(userId) {
    const cached = cache.get(userId);
    if (cached && cached.expiresAt > now()) return cached.connection;
    if (inFlight.has(userId)) return inFlight.get(userId);

    const request = (async () => {
      try {
        const { data, error } = await db
          .from("platform_connections")
          .select("league_id, platform_user_id")
          .eq("user_id", userId)
          .eq("platform", "sleeper")
          .eq("is_active", true)
          .maybeSingle();

        if (error) {
          throw accessError(503, "sleeper_connection_lookup_failed", "Sleeper connection lookup failed");
        }
        if (!data?.league_id || !data?.platform_user_id) {
          throw accessError(404, "sleeper_connection_not_found", "Connect a Sleeper league before loading its draft");
        }

        const connection = {
          league_id: String(data.league_id),
          platform_user_id: String(data.platform_user_id),
        };
        setBounded(cache, userId, {
          connection,
          expiresAt: now() + CONNECTION_TTL_MS,
        });
        return connection;
      } finally {
        inFlight.delete(userId);
      }
    })();

    inFlight.set(userId, request);
    return request;
  }

  async function assertLeagueAccess(userId, requestedLeagueId) {
    const connection = await getConnection(userId);
    if (String(requestedLeagueId) !== connection.league_id) {
      throw accessError(404, "sleeper_draft_not_found", "Draft not found for the connected Sleeper league");
    }
    return connection;
  }

  async function assertDraftAccess(userId, draft) {
    const connection = await getConnection(userId);
    if (!draft?.league_id || String(draft.league_id) !== connection.league_id) {
      throw accessError(404, "sleeper_draft_not_found", "Draft not found for the connected Sleeper league");
    }
    return connection;
  }

  return { getConnection, assertLeagueAccess, assertDraftAccess };
}

module.exports = {
  ...createSleeperDraftAccess(),
  createSleeperDraftAccess,
  CONNECTION_TTL_MS,
};
