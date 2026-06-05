"use strict";

const express = require("express");
const { logger } = require("../middleware/logging");
const { fetchSleeperPlayers } = require("../adapters/sleeper");
const {
  normalizePlayerSearchQuery,
  searchNflPlayers,
} = require("../services/playerSearch");

const router = express.Router();

router.get("/search", async (req, res) => {
  const query = normalizePlayerSearchQuery(req.query);
  if (query.error) {
    return res.status(400).json({
      error: query.error,
      code: query.code,
    });
  }

  try {
    const players = await searchNflPlayers(query, { fetchPlayers: fetchSleeperPlayers });
    return res.json(players);
  } catch (e) {
    logger.warn("Player search source unavailable", { err: e.message });
    return res.status(503).json({
      error: "Player search source unavailable",
      code: "player_search_source_unavailable",
    });
  }
});

module.exports = router;
