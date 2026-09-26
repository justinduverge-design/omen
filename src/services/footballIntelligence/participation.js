"use strict";

const { fail, integer, numberObservation, observed, replayTable, text } = require("./tabularReceipt");

const REQUIRED_COLUMNS = Object.freeze([
  "nflverse_game_id", "play_id", "possession_team", "offense_formation", "offense_personnel", "defenders_in_box", "defense_personnel",
]);

async function ingestParticipationReceipt({ registry, receiptId, tabularReader } = {}) {
  const replay = await replayTable({
    registry, receiptId, tabularReader, requiredColumns: REQUIRED_COLUMNS,
    accepts: (receipt) => receipt.source.family === "pbp_participation" && ["historical_calibration", "historical_replay"].includes(receipt.intended_use),
    receiptErrorCode: "PARTICIPATION_RECEIPT_REQUIRED",
  });
  const identities = new Set();
  const facts = replay.rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) fail("INVALID_CANONICAL_FACT", "participation rows must be objects");
    const gameId = text(row.nflverse_game_id, "nflverse_game_id");
    const playId = integer(row.play_id, "play_id", { min: 0 });
    const identity = `${gameId}\u0000${playId}`;
    if (identities.has(identity)) fail("DUPLICATE_PARTICIPATION_FACT", `duplicate participation identity: ${gameId}/${playId}`);
    identities.add(identity);
    return Object.freeze({
      schema: "football-participation-fact.v1",
      game_id: gameId,
      play_id: playId,
      possession_team: text(row.possession_team, "possession_team").toUpperCase(),
      observations: Object.freeze({
        offense_formation: observed(row.offense_formation, { parse: (value) => text(value, "offense_formation") }),
        offense_personnel: observed(row.offense_personnel, { parse: (value) => text(value, "offense_personnel") }),
        defenders_in_box: numberObservation(row.defenders_in_box, "defenders_in_box"),
        defense_personnel: observed(row.defense_personnel, { parse: (value) => text(value, "defense_personnel") }),
      }),
      provenance: replay.provenance,
    });
  });
  facts.sort((a, b) => a.game_id.localeCompare(b.game_id) || a.play_id - b.play_id);
  return Object.freeze({
    receipt_id: replay.receipt.receipt_id,
    artifact_id: replay.receipt.artifact.sha256,
    role: "historical_calibration_only",
    facts: Object.freeze(facts),
  });
}

module.exports = { REQUIRED_COLUMNS, ingestParticipationReceipt };
