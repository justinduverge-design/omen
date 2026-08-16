"use strict";

/**
 * Sleeper data routes.
 *
 * GET /api/sleeper/roster?username=...&leagueId=...&week=...
 * Returns a normalized Sleeper roster. Auth is required; subscription is not.
 */

const express = require("express");
const { Redis } = require("@upstash/redis");
const config = require("../config");
const { logger } = require("../middleware/logging");
const { requireAuth } = require("../middleware/auth");
const sleeperAdapter = require("../adapters/sleeper");
const sleeperDraftAccess = require("../services/sleeperDraftAccess");
const {
  DEFAULT_DEBOUNCE_MS,
  buildDraftListResponse,
  buildDraftMetaResponse,
  buildDraftStateResponse,
} = require("../services/sleeperDraft");

const router = express.Router();
const ROSTER_TTL_S = 300;

const redis = config.redisUrl
  ? new Redis({ url: config.redisUrl, token: config.redisToken })
  : null;

async function readCache(key) {
  if (!redis) return null;
  const cached = await redis.get(key).catch(() => null);
  if (!cached) return null;
  return typeof cached === "string" ? JSON.parse(cached) : cached;
}

async function writeCache(key, value) {
  if (!redis) return;
  await redis.set(key, JSON.stringify(value), { ex: ROSTER_TTL_S }).catch(() => {});
}

function parseSinceCursor(value) {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function draftError(res, error, operation) {
  const safeCode = new Set([
    "sleeper_connection_lookup_failed",
    "sleeper_connection_not_found",
    "sleeper_draft_not_found",
    "sleeper_rate_limited",
    "sleeper_request_budget_exhausted",
  ]).has(error?.code);
  const notFound = error?.status === 404;
  const status = notFound ? 404 : 503;
  const code = safeCode
    ? error.code
    : notFound
      ? "sleeper_draft_not_found"
      : "sleeper_draft_unavailable";
  const message = safeCode || notFound
    ? error.message
    : "Sleeper draft data is temporarily unavailable";

  logger.warn("Sleeper draft request failed", {
    operation,
    code,
    status,
  });
  if (safeCode && error?.retryAfterMs) {
    res.set("Retry-After", String(Math.ceil(error.retryAfterMs / 1000)));
  }
  return res.status(status).json({
    error: message,
    code,
    ...(safeCode && error?.retryAfterMs ? { retry_after_ms: error.retryAfterMs } : {}),
  });
}

// --- Sleeper live-draft tracking — dark for 1.0 -----------------
//
// Founder decision 2026-08-16: the whole draft path goes dark for 1.0, not
// just Draft Assistant. These three routes are Sleeper live-draft *tracking*
// — a different feature from Draft Assistant — but they are draft surface, and
// 1.0 ships no draft surface at all.
//
// They are registered only when DRAFT_ASSISTANT_ENABLED=true, so with the flag
// off they are absent rather than refused and `/api/sleeper/draft*` returns the
// app's standard 404. The handlers and their services are preserved untouched
// for the 2027 draft; see `config.draftAssistant` for the re-activation path.
//
// Everything else on this router — /roster and below — is unaffected.
if (config.draftAssistant.enabled) {
  router.get("/draft", requireAuth, async (req, res, next) => {
    try {
      const { leagueId } = req.query;
      if (!leagueId) {
        return res.status(400).json({ error: "leagueId query param required" });
      }

      await sleeperDraftAccess.assertLeagueAccess(req.user.id, leagueId);
      const drafts = await sleeperAdapter.fetchSleeperLeagueDrafts(leagueId);
      return res.json(buildDraftListResponse({ leagueId, drafts }));
    } catch (e) {
      return draftError(res, e, "list");
    }
  });

  router.get("/draft/:draftId", requireAuth, async (req, res, next) => {
    try {
      const { draftId } = req.params;
      if (!draftId) {
        return res.status(400).json({ error: "draftId path param required" });
      }

      const draft = await sleeperAdapter.fetchSleeperDraft(draftId);
      const connection = await sleeperDraftAccess.assertDraftAccess(req.user.id, draft);
      return res.json(buildDraftMetaResponse({
        draftId,
        draft,
        platformUserId: connection.platform_user_id,
      }));
    } catch (e) {
      return draftError(res, e, "meta");
    }
  });

  router.get("/draft/:draftId/state", requireAuth, async (req, res, next) => {
    try {
      const { draftId } = req.params;
      if (!draftId) {
        return res.status(400).json({ error: "draftId path param required" });
      }

      const sinceCursor = parseSinceCursor(req.query.since);
      if (sinceCursor === null) {
        return res.status(400).json({ error: "since must be a non-negative integer" });
      }

      const [draft, picks] = await Promise.all([
        sleeperAdapter.fetchSleeperDraft(draftId),
        sleeperAdapter.fetchSleeperDraftPicks(draftId),
      ]);
      const connection = await sleeperDraftAccess.assertDraftAccess(req.user.id, draft);

      return res.json(buildDraftStateResponse({
        draftId,
        draft,
        picks,
        since: sinceCursor,
        debounceMs: DEFAULT_DEBOUNCE_MS,
        platformUserId: connection.platform_user_id,
      }));
    } catch (e) {
      return draftError(res, e, "state");
    }
  });
}

router.get("/roster", requireAuth, async (req, res, next) => {
  try {
    const { username, leagueId, week } = req.query;
    if (!username) {
      return res.status(400).json({ error: "username query param required" });
    }
    if (!leagueId) {
      return res.status(400).json({ error: "leagueId query param required" });
    }
    if (!week) {
      return res.status(400).json({ error: "week query param required; use GET /api/system/current-week to resolve it" });
    }

    const wk = parseInt(week, 10);
    if (!Number.isFinite(wk) || wk < 1) {
      return res.status(400).json({ error: "week must be a positive number" });
    }

    const cacheKey = `ssff:sleeper:roster:${req.user.id}:${leagueId}:${wk}`;
    const cached = await readCache(cacheKey);
    if (cached) return res.json({ ...cached, source: "cache" });

    const roster = await sleeperAdapter.buildNormalizedRoster(leagueId, username, wk);
    await writeCache(cacheKey, roster);
    return res.json(roster);
  } catch (e) {
    if (e.status === 404) {
      return res.status(404).json({ error: e.message });
    }
    logger.error("Sleeper roster fetch failed", { err: e.message, stack: e.stack });
    return next(e);
  }
});

module.exports = router;
