"use strict";

/**
 * Platform connection routes.
 *
 * Handles connection state for Yahoo, Sleeper, and ESPN. ESPN raw cookie
 * values must never be logged, echoed, or persisted outside Supabase Vault.
 */

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const { Redis } = require("@upstash/redis");
const config = require("../config");
const { logger } = require("../middleware/logging");
const { requireAuth } = require("../middleware/auth");
const { ensureAppUser } = require("../services/appUser");
const { hasUsableLeagueId } = require("../services/omenReadiness");
const sleeperAdapter = require("../adapters/sleeper");
const espnAdapter = require("../adapters/espn");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
const VALID_PLATFORMS = new Set(["yahoo", "sleeper", "espn"]);
const PROVIDER_STATE_CONTRACT_VERSION = "platform-provider-state.v1";
const CONNECTION_REPLAY_TTL_SECONDS = 10 * 60;
const NATIVE_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

function nowIso() {
  return new Date().toISOString();
}

function createConnectionReplayStore() {
  if (!config.redisUrl || !config.redisToken) return null;
  return new Redis({ url: config.redisUrl, token: config.redisToken });
}

function connectionReplayKey(userId, requestId) {
  return `omen:connection-replay:${userId}:sleeper:${requestId}`;
}

function parseReplayRecord(raw) {
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

async function startConnectionReplay({ userId, requestId }) {
  const redis = createConnectionReplayStore();
  if (!redis) return { kind: "unavailable" };

  const key = connectionReplayKey(userId, requestId);
  const existing = parseReplayRecord(await redis.get(key));
  if (existing?.status === "complete") return { kind: "replay", redis, key, response: existing.response };
  if (existing?.status === "in_progress") return { kind: "in_progress" };

  const acquired = await redis.set(key, JSON.stringify({ status: "in_progress" }), {
    nx: true,
    ex: CONNECTION_REPLAY_TTL_SECONDS,
  });
  if (acquired) return { kind: "started", redis, key };

  const raced = parseReplayRecord(await redis.get(key));
  if (raced?.status === "complete") return { kind: "replay", redis, key, response: raced.response };
  return { kind: "in_progress" };
}

async function completeConnectionReplay(replay, response) {
  await replay.redis.set(replay.key, JSON.stringify({ status: "complete", response }), {
    ex: CONNECTION_REPLAY_TTL_SECONDS,
  });
}

function stripWrappingQuotes(value) {
  const trimmed = String(value || "").trim();
  if (trimmed.length < 2) return trimmed;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  return ((first === "\"" && last === "\"") || (first === "'" && last === "'"))
    ? trimmed.slice(1, -1).trim()
    : trimmed;
}

function extractCookieValue(rawValue, cookieName) {
  const target = cookieName.toLowerCase();
  const raw = stripWrappingQuotes(rawValue).replace(/;+\s*$/, "");
  if (!raw) return "";

  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim().toLowerCase();
    if (name === target) {
      return stripWrappingQuotes(part.slice(index + 1)).replace(/;+\s*$/, "");
    }
  }

  const prefix = `${cookieName}=`;
  if (raw.toLowerCase().startsWith(prefix.toLowerCase())) {
    return stripWrappingQuotes(raw.slice(prefix.length)).replace(/;+\s*$/, "");
  }

  return raw;
}

function normalizeSwidCookie(rawValue) {
  let value = extractCookieValue(rawValue, "SWID");
  try {
    if (/%7b|%7d/i.test(value)) value = decodeURIComponent(value);
  } catch {
    // Keep the original value if a pasted cookie contains unrelated percent escapes.
  }

  const unwrapped = value.replace(/[{}]/g, "");
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(unwrapped);
  return uuidLike ? `{${unwrapped}}` : value;
}

function normalizeEspnLeagueId(rawValue) {
  const raw = stripWrappingQuotes(rawValue);
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    const fromUrl = parsed.searchParams.get("leagueId") || parsed.searchParams.get("league_id");
    if (fromUrl) return fromUrl.trim();
  } catch {
    // Plain ids and query fragments are handled below.
  }

  const queryMatch = raw.match(/(?:leagueId|league_id)=([^&\s]+)/i);
  if (queryMatch) return queryMatch[1].trim();

  return raw.trim();
}

function platformStatus(rows) {
  const byPlatform = new Map((rows || []).map((row) => [row.platform, row]));
  const yahoo = byPlatform.get("yahoo");
  const sleeper = byPlatform.get("sleeper");
  const espn = byPlatform.get("espn");

  const status = {
    yahoo: {
      connected: Boolean(yahoo?.is_active && yahoo?.token_secret_id),
      platform: "yahoo",
      // `available` answers "can a user start a new Yahoo connection right now",
      // which is a different question from `connected`. Both are needed: an
      // existing connection can be connected-but-unavailable while Yahoo's
      // Fantasy API entitlement is pending.
      available: config.yahoo.enabled,
      unavailableReason: config.yahoo.enabled ? null : "pending_provider_approval",
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

  return {
    ...status,
    connections: status,
  };
}

function selectedLeagueFromConnection(row) {
  if (!hasUsableLeagueId(row)) return [];
  return [{
    id: String(row.league_id),
    name: null,
    season: null,
    scoring_format: null,
    team_id: row.espn_team_id ? String(row.espn_team_id) : null,
    team_name: null,
    selected: true,
  }];
}

function platformStatusContract(rows) {
  const byPlatform = new Map((rows || []).map((row) => [row.platform, row]));
  const legacy = platformStatus(rows);
  const sleeper = byPlatform.get("sleeper");
  const espn = byPlatform.get("espn");

  return {
    platforms: {
      sleeper: {
        platform: "sleeper",
        status: legacy.sleeper.connected ? "connected" : "disconnected",
        connected: legacy.sleeper.connected,
        username: legacy.sleeper.username,
        leagues: selectedLeagueFromConnection(sleeper),
      },
      yahoo: {
        platform: "yahoo",
        status: legacy.yahoo.connected ? "connected" : "disconnected",
        connected: legacy.yahoo.connected,
        available: legacy.yahoo.available,
        unavailableReason: legacy.yahoo.unavailableReason,
        leagues: selectedLeagueFromConnection(byPlatform.get("yahoo")),
      },
      espn: {
        platform: "espn",
        status: legacy.espn.connected ? "connected" : "disconnected",
        connected: legacy.espn.connected,
        leagues: selectedLeagueFromConnection(espn),
      },
      manual: {
        platform: "manual",
        status: "disconnected",
        connected: false,
        team_name: null,
        leagues: [],
      },
    },
  };
}

function providerState(platform, row) {
  const base = { platform, state: "not_started", recovery_action: "start_connection", error_code: null };
  if (!row?.is_active) return base;

  if (platform === "yahoo") {
    if (!row.token_secret_id) {
      return { ...base, state: "needs_reauth", recovery_action: "reauthenticate", error_code: "yahoo_oauth_context_missing" };
    }
    if (!hasUsableLeagueId(row)) {
      return { ...base, state: "choosing_league", recovery_action: "choose_league", error_code: "yahoo_league_context_missing" };
    }
  }

  if (platform === "sleeper") {
    if (!row.platform_username) {
      return { ...base, state: "resolving_account", recovery_action: "retry", error_code: "sleeper_account_context_missing" };
    }
    if (!hasUsableLeagueId(row)) {
      return { ...base, state: "choosing_league", recovery_action: "choose_league", error_code: "sleeper_league_context_missing" };
    }
  }

  if (platform === "espn") {
    if (!row.espn_secret_id || !row.swid_secret_id) {
      return { ...base, state: "needs_reauth", recovery_action: "reauthenticate", error_code: "espn_connection_context_missing" };
    }
    if (!hasUsableLeagueId(row)) {
      return { ...base, state: "choosing_league", recovery_action: "choose_league", error_code: "espn_league_context_missing" };
    }
  }

  return { platform, state: "connected", recovery_action: null, error_code: null };
}

function providerStateContract(rows) {
  const byPlatform = new Map((rows || []).map((row) => [row.platform, row]));
  return {
    contract_version: PROVIDER_STATE_CONTRACT_VERSION,
    providers: Object.fromEntries(
      [...VALID_PLATFORMS].map((platform) => [platform, providerState(platform, byPlatform.get(platform))])
    ),
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
    logger.warn("Vault secret deletion failed", { err: error.message });
  }
}

function isSleeperNotFound(err) {
  return err?.status === 404 || err?.response?.status === 404;
}

function currentSeason() {
  return new Date().getFullYear();
}

function sleeperScoringFormat(league) {
  const recValue = Number(league?.scoring_settings?.rec);
  if (recValue === 0) return "standard";
  if (recValue === 0.5) return "half_ppr";
  return "ppr";
}

function sleeperTeamName(rosterInfo, sleeperUserId) {
  const users = Array.isArray(rosterInfo?.users) ? rosterInfo.users : [];
  const user = users.find((leagueUser) => String(leagueUser.user_id) === String(sleeperUserId));
  return user?.metadata?.team_name || user?.display_name || user?.username || null;
}

async function sleeperLeagueSummary(league, sleeperUserId) {
  const leagueId = String(league?.league_id || league?.id || "").trim();
  let teamId = null;
  let teamName = null;

  if (leagueId) {
    try {
      const rosterInfo = await sleeperAdapter.fetchSleeperRoster(leagueId, sleeperUserId);
      teamId = rosterInfo?.roster_id == null ? null : String(rosterInfo.roster_id);
      teamName = sleeperTeamName(rosterInfo, sleeperUserId);
    } catch {
      // League discovery should still return leagues even if roster lookup drifts.
    }
  }

  return {
    id: leagueId,
    name: league?.name || null,
    season: Number(league?.season) || currentSeason(),
    scoring_format: sleeperScoringFormat(league),
    team_id: teamId,
    team_name: teamName,
  };
}

async function validateEspnConnection({ leagueId, espn_s2, swid, espnTeamId }) {
  try {
    if (typeof espnAdapter.verifyLeagueAccess === "function") {
      await espnAdapter.verifyLeagueAccess(leagueId, espn_s2, swid, espnTeamId || null);
      return { valid: true };
    }

    const roster = await espnAdapter.buildNormalizedRoster(leagueId, espn_s2, swid, 1, {
      teamId: espnTeamId,
    });
    return { valid: Boolean(roster && roster.source === "espn") };
  } catch (error) {
    return {
      valid: false,
      status: error?.status || error?.response?.status || null,
      message: error?.message || "ESPN connection validation failed",
    };
  }
}

function espnValidationError(result) {
  if (result?.status === 404 || /team not found|league/i.test(result?.message || "")) {
    return {
      status: "error",
      code: "espn_league_or_team_not_found",
      message: "ESPN accepted the request, but Omen could not find your team in that league. Confirm the League ID belongs to the same ESPN account and that the league has a fantasy team for you.",
    };
  }

  return {
    status: "error",
    code: "espn_cookies_invalid",
    message: "ESPN did not accept those cookies. Make sure espn_s2 and SWID were copied from the same signed-in ESPN browser session.",
  };
}

async function getPlatformConnectionRows(userId) {
  const { data, error } = await supabase
    .from("platform_connections")
    .select("platform,is_active,platform_username,token_secret_id,espn_secret_id,swid_secret_id,league_id,espn_team_id")
    .eq("user_id", userId);

  if (error) throw new Error(`platform_connections lookup failed: ${error.message}`);
  return data || [];
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const rows = await getPlatformConnectionRows(req.user.id);
    return res.json(platformStatusContract(rows));
  } catch (e) {
    logger.error("Platform status contract lookup failed", { err: e.message });
    return next(e);
  }
});

router.get("/status", requireAuth, async (req, res, next) => {
  try {
    const rows = await getPlatformConnectionRows(req.user.id);
    return res.json(platformStatus(rows));
  } catch (e) {
    logger.error("Platform status lookup failed", { err: e.message });
    return next(e);
  }
});

router.get("/state", requireAuth, async (req, res) => {
  try {
    const rows = await getPlatformConnectionRows(req.user.id);
    return res.json(providerStateContract(rows));
  } catch (e) {
    logger.error("Provider state contract lookup failed");
    return res.status(503).json({
      contract_version: PROVIDER_STATE_CONTRACT_VERSION,
      state: "retryable_error",
      recovery_action: "retry",
      error_code: "provider_state_unavailable",
    });
  }
});

router.post("/sleeper/resolve", requireAuth, async (req, res, next) => {
  try {
    const username = String(req.body?.sleeper_username || req.body?.username || "").trim();
    const season = Number(req.body?.season) || currentSeason();
    if (!username) return res.status(422).json({ error: "sleeper_username required" });

    let sleeperUser;
    try {
      sleeperUser = await sleeperAdapter.fetchSleeperUser(username);
    } catch (e) {
      if (isSleeperNotFound(e)) {
        return res.status(400).json({ error: "Sleeper username not found" });
      }
      throw e;
    }

    const leagues = await sleeperAdapter.fetchSleeperLeagues(sleeperUser.user_id, season);
    const summaries = await Promise.all(
      leagues.map((league) => sleeperLeagueSummary(league, sleeperUser.user_id))
    );

    return res.json({
      status: "resolved",
      platform: "sleeper",
      username: sleeperUser.username || username,
      sleeper_user_id: sleeperUser.user_id,
      season,
      leagues: summaries,
    });
  } catch (e) {
    logger.error("Sleeper resolve failed", { err: e.message });
    return next(e);
  }
});

router.post("/sleeper/connect", requireAuth, async (req, res, next) => {
  const requestId = req.body?.request_id == null ? null : String(req.body.request_id).trim();
  let replay = null;
  let connectionSaved = false;
  try {
    const username = String(req.body?.sleeper_username || req.body?.username || "").trim();
    const leagueId = String(req.body?.league_id || "").trim();
    if (!username) return res.status(422).json({ error: "sleeper_username required" });
    if (!leagueId) return res.status(422).json({ error: "league_id required" });
    if (requestId && !NATIVE_REQUEST_ID_PATTERN.test(requestId)) {
      return res.status(422).json({ error: "Invalid request_id", code: "invalid_request_id" });
    }

    if (requestId) {
      try {
        replay = await startConnectionReplay({ userId: req.user.id, requestId });
      } catch {
        logger.error("Sleeper connection replay storage failed");
        return res.status(503).json({
          error: "Connection request replay is temporarily unavailable",
          code: "connection_replay_unavailable",
        });
      }
      if (replay.kind === "unavailable") {
        return res.status(503).json({
          error: "Connection request replay is temporarily unavailable",
          code: "connection_replay_unavailable",
        });
      }
      if (replay.kind === "in_progress") {
        return res.status(409).json({
          error: "Connection request is already in progress",
          code: "connection_request_in_progress",
        });
      }
      if (replay.kind === "replay") return res.json({ ...replay.response, replayed: true });
    }

    await ensureAppUser(req.user);

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
    connectionSaved = true;
    const response = {
      connected: true,
      status: "connected",
      platform: "sleeper",
      username: sleeperUser.username || username,
      league_id: leagueId,
      ...(requestId ? { request_id: requestId, replayed: false } : {}),
    };
    if (replay?.kind === "started") {
      try {
        await completeConnectionReplay(replay, response);
      } catch {
        logger.error("Sleeper connection replay storage failed");
        return res.status(503).json({
          error: "Connection request replay is temporarily unavailable",
          code: "connection_replay_unavailable",
        });
      }
    }
    return res.json(response);
  } catch (e) {
    if (replay?.kind === "started" && !connectionSaved) await replay.redis.del(replay.key).catch(() => null);
    logger.error("Sleeper connect failed", { err: e.message });
    return next(e);
  }
});

/**
 * W1-A league discovery — "which ESPN leagues does this session belong to?"
 *
 * ESPN publishes no league list on `lm-api-reads`: that API can only answer about a league you
 * already name, which is why every ESPN integration (ours and everyone else's) historically made
 * the user hunt for a league id in a URL. The fan API is the endpoint ESPN's own site uses to
 * render "My Teams", and it is the only way to answer this question.
 *
 * This route **stores nothing**. It takes a session, asks ESPN what it can see, and returns
 * labels. Persistence happens only when the user picks a league and `POST /espn/connect` runs —
 * so a user who discovers their leagues and then backs out leaves no connection behind.
 *
 * SECURITY: `__skipBodyLog` keeps the request body out of request logging, exactly as
 * `/espn/connect` does. The response carries league and team labels only; no credential is
 * echoed, and the adapter's failure reporter strips the query string.
 */
router.post("/espn/leagues", requireAuth, (req, res, next) => {
  res.locals.__skipBodyLog = true;
  return next();
}, async (req, res, next) => {
  try {
    const espn_s2 = extractCookieValue(req.body?.espn_s2, "espn_s2");
    const swid = normalizeSwidCookie(req.body?.swid);

    if (!espn_s2 || !swid) {
      return res.status(422).json({
        status: "error",
        code: "espn_cookies_required",
        message: "ESPN_S2 and SWID are required.",
      });
    }

    let leagues;
    try {
      leagues = await espnAdapter.fetchEspnFanLeagues(espn_s2, swid);
    } catch (error) {
      // ESPN rejecting the session is a normal outcome here, not a server fault: the usual cause
      // is a session that expired between sign-in and this call.
      const status = Number(error?.status);
      if (status === 401 || status === 403) {
        return res.status(401).json({
          status: "error",
          code: "espn_session_rejected",
          message: "ESPN did not accept that session. Sign in again and retry.",
        });
      }
      logger.warn("ESPN league discovery failed", { http_status: status || null });
      return res.status(502).json({
        status: "error",
        code: "espn_discovery_unavailable",
        message: "Omen could not reach ESPN to list your leagues. Try again shortly.",
      });
    }

    return res.json({ status: "ok", platform: "espn", leagues });
  } catch (e) {
    logger.error("ESPN league discovery failed");
    return next(e);
  }
});

router.post("/espn/connect", requireAuth, (req, res, next) => {
  res.locals.__skipBodyLog = true;
  return next();
}, async (req, res, next) => {
  try {
    const espn_s2 = extractCookieValue(req.body?.espn_s2, "espn_s2");
    const swid = normalizeSwidCookie(req.body?.swid);
    const leagueId = normalizeEspnLeagueId(req.body?.league_id);
    const espnTeamId = req.body?.espn_team_id == null
      ? null
      : String(req.body.espn_team_id).trim() || null;

    if (!espn_s2 || !swid) {
      return res.status(422).json({
        status: "error",
        code: "espn_cookies_required",
        message: "ESPN_S2 and SWID are required.",
      });
    }
    if (!leagueId) {
      return res.status(422).json({
        status: "error",
        code: "espn_league_id_required",
        message: "ESPN league ID is required.",
      });
    }

    await ensureAppUser(req.user);

    const validation = await validateEspnConnection({ leagueId, espn_s2, swid, espnTeamId });
    if (!validation.valid) {
      return res.status(400).json(espnValidationError(validation));
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
    return res.json({
      connected: true,
      status: "connected",
      platform: "espn",
      leagues: [{
        id: leagueId,
        name: null,
        season: currentSeason(),
        scoring_format: null,
        team_id: espnTeamId,
        team_name: null,
        selected: true,
      }],
    });
  } catch (e) {
    if (e.status && e.status < 500) return next(e);
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
