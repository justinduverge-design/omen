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
const { resolveNflPlayerInputs } = require("../services/playerSearch");
const { resolveTradeLeagueContext } = require("../services/tradeLeagueContext");
const { authenticateOmenRequest, getActivePlatformConnections } = require("../services/omen");
const { getCurrentNflWeekContext } = require("../services/nflSchedule");
const { logger } = require("../middleware/logging");
const sleeperAdapter = require("../adapters/sleeper");

const MAX_PLAYERS_PER_SIDE = 10;
const MAX_SHARE_PAYLOAD_BYTES = 16 * 1024;
const TRADE_SHARE_CONTRACT = "trade-share.v1";
// Additive. v1 consumers (web Trade Analyzer, trade-share.v1 snapshots) keep
// reading `verdict`; v2 clients read `verdict_state`, which is the only field
// carrying the four approved verdict labels.
const TRADE_COMPARE_CONTRACT = "trade-compare.v2";
const VALID_CONTEXT_PLATFORMS = new Set(["yahoo", "sleeper", "espn"]);
const MAX_LEAGUE_ID_LENGTH = 64;

// Approved verdict vocabulary (visual briefs §9.2). The shipped three-value
// enum maps onto the first three; the fourth is reachable only through the
// evaluability signal and never by inference on the client.
const VERDICT_STATE_BY_VERDICT = Object.freeze({
  accept: "favors_you",
  decline: "you_give_up_too_much",
  neutral: "close_needs_context",
});
const VERDICT_STATE_INSUFFICIENT = "insufficient_data";
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

/**
 * `league_context` is a request for personalization, not the data itself.
 * The client may name which connected league to use; it may never supply the
 * roster, scoring rules, or settings — those are read server-side from the
 * user's own stored connection.
 */
function validateLeagueContext(body = {}) {
  const context = body.league_context;
  if (context == null) return null;
  if (!isPlainObject(context)) {
    return "league_context must be an object";
  }
  if (
    context.platform != null
    && !VALID_CONTEXT_PLATFORMS.has(String(context.platform).toLowerCase())
  ) {
    return "league_context.platform must be one of yahoo, sleeper, espn";
  }
  if (context.league_id != null && String(context.league_id).length > MAX_LEAGUE_ID_LENGTH) {
    return "league_context.league_id is too long";
  }
  return null;
}

/**
 * Can Omen responsibly evaluate this offer at all?
 *
 * Visual briefs §9.4: "Incomplete player data — name incomplete input; do not
 * force verdict." A missing projection means one side's value is unknown, so
 * the comparison is reported as non-evaluable rather than dressed up as a
 * verdict. Derived from the same missing_projection_count the engine already
 * emits, per the founder decision of 2026-08-16.
 */
function evaluabilityFor(result) {
  const missing = Number(result?.send?.missing_projection_count || 0)
    + Number(result?.receive?.missing_projection_count || 0);
  const total = Number(result?.send?.player_count || 0)
    + Number(result?.receive?.player_count || 0);

  if (!total) {
    return {
      status: "insufficient_data",
      reason: "no_players",
      missing_projection_count: 0,
      total_player_count: 0,
    };
  }
  if (missing > 0) {
    return {
      status: "insufficient_data",
      reason: "missing_projections",
      missing_projection_count: missing,
      total_player_count: total,
    };
  }
  return {
    status: "evaluable",
    reason: null,
    missing_projection_count: 0,
    total_player_count: total,
  };
}

function verdictStateFor(result, evaluability) {
  if (evaluability.status === "insufficient_data") return VERDICT_STATE_INSUFFICIENT;
  return VERDICT_STATE_BY_VERDICT[result?.verdict] || "close_needs_context";
}

function neutralAnalysisContext(reason = null) {
  return {
    mode: "neutral",
    platform: null,
    league_id: null,
    league_name: null,
    applied: [],
    unavailable_reason: reason,
  };
}

async function defaultPlayerResolver(players) {
  return resolveNflPlayerInputs(players, { fetchPlayers: sleeperAdapter.fetchSleeperPlayers });
}

function resolvedTradePlayers(inputs, resolutions) {
  return inputs.map((input, index) => {
    const canonical = resolutions[index].player;
    const out = {
      name: canonical.name,
      position: canonical.position,
      team: canonical.team,
      player_key: canonical.id,
    };
    if (Object.prototype.hasOwnProperty.call(input, "projected_points")) {
      out.projected_points = Number(input.projected_points);
    } else if (canonical.projected_points != null) {
      out.projected_points = canonical.projected_points;
    }
    if (input.status != null) out.status = input.status;
    return out;
  });
}

function unresolvedPlayersFor(side, inputs, resolutions) {
  const unresolved = [];
  resolutions.forEach((resolution, index) => {
    if (resolution.status === "resolved") return;
    unresolved.push({
      side,
      index,
      name: String(inputs[index]?.name || "").trim(),
      reason: resolution.status,
      suggestions: resolution.suggestions,
    });
  });
  return unresolved;
}

/**
 * Default personalization resolver: reads the caller's own connections and
 * the provider's league settings. Injected in tests so the maths is provable
 * without a network call.
 */
async function defaultLeagueContextResolver({ userId, platform, leagueId }) {
  return resolveTradeLeagueContext({
    userId,
    platform,
    leagueId,
    deps: {
      getConnections: getActivePlatformConnections,
      fetchSleeperLeague: (id) => sleeperAdapter.fetchSleeperLeague(id),
      buildSleeperRoster: async (id, username, league) => {
        const context = getCurrentNflWeekContext();
        const normalized = await sleeperAdapter.buildNormalizedRoster(
          id,
          username,
          context.week,
          { season: league?.season || context.season }
        );
        const slots = normalized?.slots || {};
        return [
          ...(slots.starters || []),
          ...(slots.bench || []),
          ...(slots.ir || []),
        ];
      },
      logger,
    },
  });
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
  authenticate = authenticateOmenRequest,
  leagueContextResolver = defaultLeagueContextResolver,
  playerResolver = defaultPlayerResolver,
  tradeExplainer = llm.explainTrade,
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

  /**
   * Resolve personalization, or explain in one word why it could not happen.
   *
   * Failure is never fatal here: visual briefs §8.3 requires that an
   * unverifiable league quietly retains neutral analysis rather than erroring,
   * and §9.1 requires the screen to say which one it is.
   */
  async function resolveAnalysisContext(req) {
    const requested = req.body.league_context;
    if (requested == null) return { analysis: neutralAnalysisContext(), scoringConfig: {} };

    let user = null;
    try {
      user = await authenticate(req.headers.authorization);
    } catch {
      // Trade stays free and public; asking for personalization without a
      // session is a downgrade to neutral, not a 401.
      return { analysis: neutralAnalysisContext("unauthenticated"), scoringConfig: {} };
    }

    const resolved = await leagueContextResolver({
      userId: user.id,
      platform: requested.platform == null ? null : String(requested.platform).toLowerCase(),
      leagueId: requested.league_id == null ? null : String(requested.league_id),
    });

    if (resolved?.status !== "personalized") {
      return {
        analysis: neutralAnalysisContext(resolved?.reason || "league_context_unavailable"),
        scoringConfig: {},
      };
    }

    return {
      analysis: {
        mode: "personalized",
        platform: resolved.platform || null,
        league_id: resolved.league_id || null,
        league_name: resolved.league_name || null,
        applied: Array.isArray(resolved.applied) ? resolved.applied : [],
        unavailable_reason: null,
      },
      scoringConfig: resolved.scoringConfig || {},
    };
  }

  router.post("/compare", async (req, res, next) => {
    try {
      const validationError = validateTradePayload(req.body);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
      const contextError = validateLeagueContext(req.body);
      if (contextError) {
        return res.status(400).json({ error: contextError });
      }

      // `F-BAR-29`: identity is a hard gate ahead of every score, tier,
      // summary, share snapshot and LLM call. Missing projections can produce
      // an honest non-verdict for a *real* player; they can never turn an
      // invented name into a low-confidence fantasy asset.
      let sendResolutions;
      let receiveResolutions;
      try {
        [sendResolutions, receiveResolutions] = await Promise.all([
          playerResolver(req.body.send),
          playerResolver(req.body.receive),
        ]);
      } catch (error) {
        logger.warn("Trade player resolution unavailable", { err: error.message });
        return res.status(503).json({
          error: "player_resolution_unavailable",
          code: "player_resolution_unavailable",
        });
      }

      const unresolved = [
        ...unresolvedPlayersFor("send", req.body.send, sendResolutions),
        ...unresolvedPlayersFor("receive", req.body.receive, receiveResolutions),
      ];
      if (unresolved.length) {
        return res.status(422).json({
          error: "unresolved_players",
          code: "trade_unresolved_players",
          unresolved,
        });
      }

      const send = resolvedTradePlayers(req.body.send, sendResolutions);
      const receive = resolvedTradePlayers(req.body.receive, receiveResolutions);

      const { analysis, scoringConfig } = await resolveAnalysisContext(req);
      // A personalized run derives its scoring format from the provider's own
      // settings; the client-supplied label only governs the neutral path.
      const scoring_format = analysis.mode === "personalized"
        ? scoringConfig.scoring_format
        : (req.body.scoring_format || "ppr");

      const result = compareTrade({
        send,
        receive,
      }, {
        scoringFormat: scoring_format,
      }, scoringConfig);

      const evaluability = evaluabilityFor(result);
      result.contract_version = TRADE_COMPARE_CONTRACT;
      result.evaluability = evaluability;
      result.verdict_state = verdictStateFor(result, evaluability);
      result.analysis_context = analysis;

      result.explanation = await tradeExplainer({
        send,
        receive,
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
module.exports.validateLeagueContext = validateLeagueContext;
module.exports.evaluabilityFor = evaluabilityFor;
module.exports.verdictStateFor = verdictStateFor;
module.exports.TRADE_COMPARE_CONTRACT = TRADE_COMPARE_CONTRACT;
