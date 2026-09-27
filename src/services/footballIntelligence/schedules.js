"use strict";

const { fail, integer, observed, replayTable, text } = require("./tabularReceipt");

const REQUIRED_COLUMNS = Object.freeze([
  "game_id", "season", "week", "game_type", "gameday", "away_team", "home_team", "away_coach", "home_coach",
]);

async function ingestScheduleReceipt({ registry, receiptId, tabularReader } = {}) {
  const replay = await replayTable({
    registry, receiptId, tabularReader, requiredColumns: REQUIRED_COLUMNS,
    accepts: (receipt) => receipt.source.family === "schedules" && ["identity_context", "historical_replay"].includes(receipt.intended_use),
    receiptErrorCode: "SCHEDULE_RECEIPT_REQUIRED",
  });
  const identities = new Set();
  const facts = replay.rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) fail("INVALID_CANONICAL_FACT", "schedule rows must be objects");
    const gameId = text(row.game_id, "game_id");
    if (identities.has(gameId)) fail("DUPLICATE_GAME_CONTEXT_FACT", `duplicate schedule game identity: ${gameId}`);
    identities.add(gameId);
    const gameType = text(row.game_type, "game_type").toUpperCase();
    if (!["REG", "POST", "PRE"].includes(gameType)) fail("INVALID_CANONICAL_FACT", "game_type is not recognized");
    const gameday = text(row.gameday, "gameday");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(gameday) || Number.isNaN(Date.parse(`${gameday}T00:00:00Z`))) {
      fail("INVALID_CANONICAL_FACT", "gameday must be an ISO calendar date");
    }
    const away = text(row.away_team, "away_team").toUpperCase();
    const home = text(row.home_team, "home_team").toUpperCase();
    if (away === home) fail("INVALID_CANONICAL_FACT", "schedule teams must differ");
    return Object.freeze({
      schema: "football-game-context-fact.v1",
      game_id: gameId,
      season: integer(row.season, "season", { min: 1920, max: 2200 }),
      week: integer(row.week, "week", { min: 1, max: 25 }),
      season_type: gameType,
      gameday,
      teams: Object.freeze({ away, home }),
      coaches: Object.freeze({
        away: observed(row.away_coach, { missing: "not_reported", parse: (value) => text(value, "away_coach") }),
        home: observed(row.home_coach, { missing: "not_reported", parse: (value) => text(value, "home_coach") }),
      }),
      provenance: replay.provenance,
    });
  });
  facts.sort((a, b) => a.game_id.localeCompare(b.game_id));
  return Object.freeze({ receipt_id: replay.receipt.receipt_id, artifact_id: replay.receipt.artifact.sha256, facts: Object.freeze(facts) });
}

module.exports = { REQUIRED_COLUMNS, ingestScheduleReceipt };
