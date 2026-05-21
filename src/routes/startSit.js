"use strict";

const express = require("express");
const optimizer = require("../services/optimizer");
const llm = require("../services/llm");

const router = express.Router();
const LLM_TIMEOUT_MS = 8000;

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function validatePlayer(player, label) {
  if (!isPlainObject(player)) {
    return `${label} must be an object`;
  }
  if (typeof player.name !== "string" || player.name.trim().length === 0) {
    return `${label}.name must be a non-empty string`;
  }
  if (typeof player.position !== "string" || player.position.trim().length === 0) {
    return `${label}.position must be a non-empty string`;
  }
  if (typeof player.projected_points !== "number" || !Number.isFinite(player.projected_points)) {
    return `${label}.projected_points must be a number`;
  }
  return null;
}

function eligiblePositions(position, selectedPosition = null) {
  const normalized = String(position || "").toUpperCase();
  const positions = new Set(normalized === "DEF" ? ["DEF", "D/ST", "DST"] : [normalized]);
  if (selectedPosition) {
    positions.add(String(selectedPosition).trim().toUpperCase());
  }
  return Array.from(positions);
}

function normalizePlayer(player, key, selectedPosition = null) {
  const position = player.position.trim().toUpperCase();
  return {
    player_key: key,
    name: player.name.trim(),
    position,
    selected_position: selectedPosition || position,
    eligible_positions: eligiblePositions(position, selectedPosition),
    projected_points: player.projected_points,
    status: player.status || null,
  };
}

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    promise
      .catch(() => null)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      });
  });
}

function statusText(status) {
  if (status == null || status === "") return "active";
  return String(status).trim().toLowerCase();
}

function isActiveStatus(status) {
  const normalized = statusText(status);
  return ["active", "p", "probable"].includes(normalized);
}

function projectionEdgeWeight(pointsDelta) {
  if (pointsDelta >= 3) return "high";
  if (pointsDelta >= 1.5) return "medium";
  return "low";
}

function buildSignals({ winningPlayer, losingPlayer, pointsDelta }) {
  const signals = [
    {
      label: "Projection edge",
      value: `+${pointsDelta} pts`,
      weight: projectionEdgeWeight(pointsDelta),
    },
  ];

  if (!isActiveStatus(losingPlayer.status)) {
    signals.push({
      label: "Injury status",
      value: `${losingPlayer.name.trim()} ${statusText(losingPlayer.status)}`,
      weight: "medium",
    });
  }

  if (!isActiveStatus(winningPlayer.status)) {
    signals.push({
      label: "Starter risk",
      value: `${winningPlayer.name.trim()} ${statusText(winningPlayer.status)}`,
      weight: "medium",
    });
  }

  return signals;
}

async function explainSafely({ loser, winner, pointsDelta, slot }) {
  return withTimeout(
    llm.explainStartSit({
      from: {
        name: loser.name,
        position: loser.position,
        projected: loser.projected_points,
        status: loser.status || null,
      },
      to: {
        name: winner.name,
        position: winner.position,
        projected: winner.projected_points,
        status: winner.status || null,
      },
      delta: pointsDelta,
      slot,
    }),
    LLM_TIMEOUT_MS
  );
}

function comparePlayers(playerA, playerB) {
  const roster = {
    slots: {
      starters: [normalizePlayer(playerA, "player-a")],
      bench: [normalizePlayer(playerB, "player-b", playerA.position)],
    },
  };

  const [swap] = optimizer.evaluateLineup(roster, { minDelta: Number.NEGATIVE_INFINITY });
  const rawDelta = swap ? swap.delta : playerB.projected_points - playerA.projected_points;
  const winner = rawDelta > 0 ? "B" : "A";
  const winningPlayer = winner === "A" ? playerA : playerB;
  const losingPlayer = winner === "A" ? playerB : playerA;
  const pointsDelta = Math.abs(Number(rawDelta.toFixed(2)));

  return {
    winner,
    winningPlayer,
    losingPlayer,
    pointsDelta,
    recommendation: `Start ${winningPlayer.name.trim()} over ${losingPlayer.name.trim()}`,
    slot: winner === "A" ? playerA.position : playerB.position,
  };
}

router.post("/", async (req, res, next) => {
  try {
    const { playerA, playerB } = req.body || {};
    const validationError = validatePlayer(playerA, "playerA") || validatePlayer(playerB, "playerB");
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = comparePlayers(playerA, playerB);
    const signals = buildSignals(result);
    const explanation = await explainSafely({
      loser: result.losingPlayer,
      winner: result.winningPlayer,
      pointsDelta: result.pointsDelta,
      slot: result.slot,
    });

    return res.json({
      winner: result.winner,
      pointsDelta: result.pointsDelta,
      recommendation: result.recommendation,
      explanation,
      signals,
    });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
module.exports.validatePlayer = validatePlayer;
module.exports.comparePlayers = comparePlayers;
module.exports.buildSignals = buildSignals;
