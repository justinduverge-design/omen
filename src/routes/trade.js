"use strict";

const express = require("express");
const llm = require("../services/llm");
const { compareTrade } = require("../services/tradeValue");

const router = express.Router();
const MAX_PLAYERS_PER_SIDE = 10;
const VALID_SCORING_FORMATS = new Set(["ppr", "half_ppr", "standard"]);

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

module.exports = router;
module.exports.validateTradePayload = validateTradePayload;
