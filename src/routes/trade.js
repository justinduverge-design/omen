"use strict";

const crypto = require("node:crypto");
const express = require("express");
const { Redis } = require("@upstash/redis");
const config = require("../config");
const llm = require("../services/llm");
const { buildLiveAdpResponse } = require("../services/adp");
const {
  DEFAULT_SHARE_TTL_SECONDS,
  createDefaultTradeShareStore,
} = require("../services/tradeShareStore");
const { buildTradeShareOgSvg } = require("../services/tradeShareOg");
const { compareTrade } = require("../services/tradeValue");

const MAX_PLAYERS_PER_SIDE = 10;
const MAX_SHARE_PAYLOAD_BYTES = 16 * 1024;
const TRADE_SHARE_CONTRACT = "trade-share.v1";
const VALID_SCORING_FORMATS = new Set(["ppr", "half_ppr", "standard"]);
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SENSITIVE_FIELD_RE = /(cookie|espn_s2|swid|token|secret|authorization|password)/i;
const tradePulseRedis = config.isProd && config.redisUrl && config.redisToken
  ? new Redis({ url: config.redisUrl, token: config.redisToken })
  : null;

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function validatePlayers(players, side) {
  if (!Array.isArray(players) || players.length === 0) {
    return `${side} must be a non-empty array`;
  }
  // Product guardrail: cap comparison size until abuse limits and UX are clearer.
  if (players.length > MAX_PLAYERS_PER_SIDE) {
    return `${side} may contain 1-10 players`;
  }

  for (const player of players) {
    if (!isPlainObject(player)) {
      return "each player must be an object";
    }
    if (
      Object.prototype.hasOwnProperty.call(player, "projected_points")
      && !Number.isFinite(Number(player.projected_points))
    ) {
      return "projected_points must be a number";
    }
  }

  return null;
}

function validateTradePayload(body = {}) {
  if (
    body.scoring_format != null
    && !VALID_SCORING_FORMATS.has(String(body.scoring_format))
  ) {
    return "scoring_format must be one of ppr, half_ppr, standard";
  }

  const sendError = validatePlayers(body.send, "send");
  if (sendError) return sendError;

  const receiveError = validatePlayers(body.receive, "receive");
  if (receiveError) return receiveError;

  return null;
}

function jsonByteLength(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? {}), "utf8");
  } catch {
    return Infinity;
  }
}

function containsSensitiveField(value) {
  if (Array.isArray(value)) {
    return value.some((item) => containsSensitiveField(item));
  }
  if (!isPlainObject(value)) return false;

  return Object.entries(value).some(([key, nested]) => (
    SENSITIVE_FIELD_RE.test(key) || containsSensitiveField(nested)
  ));
}

function truncateString(value, maxLength) {
  const text = String(value);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function sanitizePlayer(player = {}) {
  const clean = {
    name: truncateString(player.name || "Unknown", 120),
    position: truncateString(player.position || "UNK", 16),
  };

  if (player.team != null) clean.team = truncateString(player.team, 16);
  if (player.status != null) clean.status = truncateString(player.status, 40);
  if (player.player_key != null) clean.player_key = truncateString(player.player_key, 160);

  const projected = Number(player.projected_points);
  if (Number.isFinite(projected)) {
    clean.projected_points = projected;
  }

  return clean;
}

function validateTradeSharePayload(body = {}) {
  if (!isPlainObject(body)) {
    return { status: 400, error: "trade_share_body_required" };
  }
  if (jsonByteLength(body) > MAX_SHARE_PAYLOAD_BYTES) {
    return { status: 413, error: "trade_share_payload_too_large" };
  }
  if (containsSensitiveField(body)) {
    return { status: 400, error: "trade_share_sensitive_field" };
  }

  const tradeError = validateTradePayload(body);
  return tradeError ? { status: 400, error: tradeError } : null;
}

function buildShareSnapshot({
  hash,
  body,
  now = () => new Date(),
  ttlSeconds = DEFAULT_SHARE_TTL_SECONDS,
}) {
  const createdAt = now();
  const expiresAt = new Date(createdAt.getTime() + ttlSeconds * 1000);
  const trade = {
    send: body.send.map(sanitizePlayer),
    receive: body.receive.map(sanitizePlayer),
    scoring_format: body.scoring_format || "ppr",
  };
  const result = compareTrade({
    send: trade.send,
    receive: trade.receive,
  }, {
    scoringFormat: trade.scoring_format,
  });

  return {
    contract_version: TRADE_SHARE_CONTRACT,
    hash,
    is_public: true,
    source: "trade_analyzer",
    created_at: createdAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    trade,
    result,
  };
}

function handleStorageError(res, error) {
  if (error?.code === "trade_share_storage_unavailable") {
    res.status(503).json({ error: "trade_share_storage_unavailable" });
    return true;
  }
  return false;
}

function createTradeRouter({
  tradeShareStore = createDefaultTradeShareStore(),
  generateHash = () => crypto.randomUUID(),
  now = () => new Date(),
  tradePulseBuilder = buildLiveAdpResponse,
  tradePulseRedisClient = tradePulseRedis,
} = {}) {
  const router = express.Router();

  router.get("/pulse", async (_req, res) => {
    const unavailable = () => res.json({
      contract_version: "trade-pulse.v1", status: "unavailable", is_mock: false,
      source_status: "live_adp_unavailable", buy_low: [], sell_high: [],
    });
    if (!tradePulseRedisClient) return unavailable();
    try {
      const adp = await tradePulseBuilder({ redis: tradePulseRedisClient, format: "ppr", teams: 12, year: new Date().getFullYear() });
      const players = Array.isArray(adp.weighted_players) ? adp.weighted_players.slice(0, 5) : [];
      return res.json({
        contract_version: "trade-pulse.v1", status: "live", is_mock: false,
        source_status: "live_adp", generated_at: new Date().toISOString(),
        buy_low: players.map((player) => ({
          name: player.name, position: player.position, team: player.team,
          reason: "Consensus ADP supports a value review before your league prices it in.",
        })), sell_high: [],
      });
    } catch {
      return unavailable();
    }
  });

  router.post("/compare", async (req, res, next) => {
    try {
      const validationError = validateTradePayload(req.body);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const scoring_format = req.body.scoring_format || "ppr";
      const result = compareTrade({
        send: req.body.send,
        receive: req.body.receive,
      }, {
        scoringFormat: scoring_format,
      });

      result.explanation = await llm.explainTrade({
        send:      req.body.send,
        receive:   req.body.receive,
        net_value: result.net_value,
        a_score: result.a_score,
        b_score: result.b_score,
        combined_score: result.combined_score,
        scarcity_analysis: result.scarcity_analysis,
        verdict:   result.verdict,
      });

      return res.json(result);
    } catch (e) {
      return next(e);
    }
  });

  router.post("/share", async (req, res, next) => {
    try {
      const validationError = validateTradeSharePayload(req.body);
      if (validationError) {
        return res.status(validationError.status).json({ error: validationError.error });
      }

      const hash = generateHash();
      const snapshot = buildShareSnapshot({ hash, body: req.body, now });
      await tradeShareStore.write(hash, snapshot, DEFAULT_SHARE_TTL_SECONDS);

      return res.status(201).json({
        contract_version: TRADE_SHARE_CONTRACT,
        hash,
        api_path: `/api/trade/share/${hash}`,
        expires_at: snapshot.expires_at,
      });
    } catch (e) {
      if (handleStorageError(res, e)) return undefined;
      return next(e);
    }
  });

  router.get("/share/:hash", async (req, res, next) => {
    try {
      const { hash } = req.params;
      if (!UUID_V4_RE.test(hash)) {
        return res.status(400).json({ error: "invalid_trade_share_hash" });
      }

      const snapshot = await tradeShareStore.read(hash);
      if (!snapshot) {
        return res.status(404).json({ error: "trade_share_not_found" });
      }

      return res.json(snapshot);
    } catch (e) {
      if (handleStorageError(res, e)) return undefined;
      return next(e);
    }
  });

  router.get("/share/:hash/og.svg", async (req, res, next) => {
    try {
      const { hash } = req.params;
      if (!UUID_V4_RE.test(hash)) {
        return res.status(400).json({ error: "invalid_trade_share_hash" });
      }

      const snapshot = await tradeShareStore.read(hash);
      if (!snapshot) {
        return res.status(404).json({ error: "trade_share_not_found" });
      }

      res.set("Content-Type", "image/svg+xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=300, s-maxage=300");
      return res.send(buildTradeShareOgSvg(snapshot));
    } catch (e) {
      if (handleStorageError(res, e)) return undefined;
      return next(e);
    }
  });

  return router;
}

const router = createTradeRouter();

module.exports = router;
module.exports.createTradeRouter = createTradeRouter;
module.exports.validateTradeSharePayload = validateTradeSharePayload;
module.exports.validateTradePayload = validateTradePayload;
