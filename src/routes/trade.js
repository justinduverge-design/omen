"use strict";

const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { compareTrade } = require("../services/tradeValue");

const router = express.Router();
const MAX_PLAYERS_PER_SIDE = 10;

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
  const sendError = validatePlayers(body.send, "send");
  if (sendError) return sendError;

  const receiveError = validatePlayers(body.receive, "receive");
  if (receiveError) return receiveError;

  return null;
}

router.post("/compare", requireAuth, (req, res, next) => {
  try {
    const validationError = validateTradePayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = compareTrade({
      send: req.body.send,
      receive: req.body.receive,
    });

    return res.json(result);
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
module.exports.validateTradePayload = validateTradePayload;
