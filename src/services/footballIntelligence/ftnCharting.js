"use strict";

const { booleanObservation, fail, integer, numberObservation, observed, replayTable, text } = require("./tabularReceipt");

const COVERAGE_THRESHOLD = 0.7;
const REQUIRED_COLUMNS = Object.freeze([
  "nflverse_game_id", "nflverse_play_id", "possession_team", "is_motion", "is_play_action", "is_screen_pass", "is_rpo",
  "is_qb_out_of_pocket", "qb_location", "n_offense_backfield", "n_defense_box", "n_blitzers", "n_pass_rushers",
]);

function coverageGate(coverage) {
  const eligible = coverage.eligible_plays;
  const charted = coverage.charted_plays;
  if (!Number.isInteger(eligible) || eligible < 0 || !Number.isInteger(charted) || charted < 0 || charted > eligible) {
    fail("INVALID_FTN_COVERAGE", "FTN receipt coverage requires integer eligible_plays and charted_plays with charted not exceeding eligible");
  }
  const ratio = eligible === 0 ? null : charted / eligible;
  const eligibleForEnrichment = ratio !== null && ratio >= COVERAGE_THRESHOLD;
  return Object.freeze({
    threshold: COVERAGE_THRESHOLD,
    eligible_plays: eligible,
    charted_plays: charted,
    ratio,
    state: eligibleForEnrichment ? "coverage_met" : "insufficient_coverage",
    eligible_for_enrichment: eligibleForEnrichment,
  });
}

async function ingestFtnChartingReceipt({ registry, receiptId, tabularReader } = {}) {
  const replay = await replayTable({
    registry, receiptId, tabularReader, requiredColumns: REQUIRED_COLUMNS,
    accepts: (receipt) => receipt.source.family === "ftn_charting" && ["tactical_enrichment", "historical_calibration"].includes(receipt.intended_use),
    receiptErrorCode: "FTN_CHARTING_RECEIPT_REQUIRED",
  });
  const gate = coverageGate(replay.receipt.coverage);
  const identities = new Set();
  const facts = replay.rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) fail("INVALID_CANONICAL_FACT", "FTN charting rows must be objects");
    const gameId = text(row.nflverse_game_id, "nflverse_game_id");
    const playId = integer(row.nflverse_play_id, "nflverse_play_id", { min: 0 });
    const identity = `${gameId}\u0000${playId}`;
    if (identities.has(identity)) fail("DUPLICATE_FTN_CHARTING_FACT", `duplicate FTN charting identity: ${gameId}/${playId}`);
    identities.add(identity);
    return Object.freeze({
      schema: "football-charting-fact.v1",
      game_id: gameId,
      play_id: playId,
      possession_team: text(row.possession_team, "possession_team").toUpperCase(),
      observations: Object.freeze({
        motion: booleanObservation(row.is_motion),
        play_action: booleanObservation(row.is_play_action),
        screen_pass: booleanObservation(row.is_screen_pass),
        rpo: booleanObservation(row.is_rpo),
        qb_out_of_pocket: booleanObservation(row.is_qb_out_of_pocket),
        qb_location: observed(row.qb_location, { missing: "not_covered", parse: (value) => text(value, "qb_location") }),
        offense_backfield: numberObservation(row.n_offense_backfield, "n_offense_backfield", "not_covered"),
        defense_box: numberObservation(row.n_defense_box, "n_defense_box", "not_covered"),
        blitzers: numberObservation(row.n_blitzers, "n_blitzers", "not_covered"),
        pass_rushers: numberObservation(row.n_pass_rushers, "n_pass_rushers", "not_covered"),
      }),
      provenance: replay.provenance,
    });
  });
  facts.sort((a, b) => a.game_id.localeCompare(b.game_id) || a.play_id - b.play_id);
  return Object.freeze({
    receipt_id: replay.receipt.receipt_id,
    artifact_id: replay.receipt.artifact.sha256,
    coverage_gate: gate,
    facts: Object.freeze(facts),
  });
}

module.exports = { COVERAGE_THRESHOLD, REQUIRED_COLUMNS, ingestFtnChartingReceipt };
