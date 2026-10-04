"use strict";

/**
 * Closed evidence vocabulary, enforced in CI (test/evidenceVocabulary.test.js).
 *
 * The contract schemas leave evidence `category` and `kind` as free strings, and closing them to
 * enums is a breaking change under the contract lock rules (test/contracts/README.md), so the
 * taxonomy is closed here, in code, until a future version (start-sit-detail v3, waiver v2) can
 * carry it as a schema enum. Adding a value is a deliberate edit to this file.
 */

const freeze = (list) => Object.freeze([...list]);

// start-sit-detail v1/v2 `evidence[]` (startSitDetail.js, projectionBreakdown.js).
const START_SIT = Object.freeze({
  categories: freeze([
    "league_fact", "player_game_fact", "points_breakdown", "recent_usage", "team_system",
    "current_status", "omen_inference", "limitation",
  ]),
  kinds: freeze(["verified", "projection", "projected", "observed_context", "inference", "limitation"]),
});

// waiver-analysis.v1 `evidence[]` (waiverAnalysis.js). `kind` here is a roster-math label, not
// the verified/projection scale.
const WAIVER = Object.freeze({
  categories: freeze(["immediate_need", "league_fact"]),
  kinds: freeze(["roster_math", "league_context"]),
});

// move-detail.v1 `evidence_at_the_time[]`, code-built rows (routes/moves.js legacy builder and
// the code-side `evidenceCategory` fallback). The decision-based builder also takes `category`
// from the DB `decision_factors.family` and `kind` from `evidence_kind`; those DB-derived values
// are OPEN and not covered here.
const MOVE_DETAIL = Object.freeze({
  categories: freeze(["league_context", "player_game_fact", "model_input", "omen_inference", "limitation"]),
  kinds: freeze(["verified", "model", "projection", "inference", "limitation"]),
});

module.exports = { START_SIT, WAIVER, MOVE_DETAIL };
