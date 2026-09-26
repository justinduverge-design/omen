"use strict";

const { CONTRACTS, MODELS } = require("./contracts");
const { hashCanonical } = require("./canonicalize");
const { resolveNamespaceIdentity } = require("./identityDimensions");

const FTN_METRICS = Object.freeze({
  motion: "offense_motion",
  play_action: "play_action",
  screen_pass: "screen",
  rpo: "rpo",
  qb_out_of_pocket: "qb_out_of_pocket",
  qb_location: "qb_location",
  offense_backfield: "backfield_count",
  defense_box: "box_count",
  blitzers: "blitzers",
  pass_rushers: "pass_rushers",
});

function buildObservedMetricFacts({ ordinaryPbp, schedules, identitySnapshot, ftnCharting = null } = {}) {
  requireFacts(ordinaryPbp, "ordinaryPbp");
  requireFacts(schedules, "schedules");
  if (!identitySnapshot) throw invalid("identitySnapshot is required");
  if (ftnCharting !== null && (!ftnCharting || !Array.isArray(ftnCharting.facts) || !ftnCharting.coverage_gate)) {
    throw invalid("ftnCharting must be a normalized FTN receipt result");
  }
  const games = new Map(schedules.facts.map((game) => [game.game_id, game]));
  if (games.size !== schedules.facts.length) throw invalid("schedule game identities must be unique");
  const plays = new Map();
  const facts = [];
  for (const play of ordinaryPbp.facts) {
    const game = games.get(play.game_id);
    if (!game) throw invalid(`ordinary PBP play has no admitted schedule context: ${play.game_id}`);
    if (game.season !== play.season || game.week !== play.week) throw invalid(`schedule period disagrees with ordinary PBP: ${play.game_id}`);
    const resolution = resolveNamespaceIdentity(identitySnapshot, {
      entityType: "team", namespace: "nflverse", externalId: play.possession_team, at: game.gameday,
    });
    if (resolution.state !== "resolved") {
      const error = invalid(`team identity is ${resolution.state}: nflverse/${play.possession_team}`);
      error.identity_resolution = resolution;
      throw error;
    }
    const key = playKey(play.game_id, play.play_id);
    plays.set(key, { play, game, teamId: resolution.canonical_id });
    facts.push(metricFact({
      play, game, teamId: resolution.canonical_id, metric: "no_huddle", value: play.play.no_huddle,
      availability: "observed", provenance: play.provenance,
    }));
  }

  if (ftnCharting) {
    for (const charted of ftnCharting.facts) {
      const context = plays.get(playKey(charted.game_id, charted.play_id));
      if (!context) throw invalid(`FTN charting does not join to the ordinary PBP denominator: ${charted.game_id}/${charted.play_id}`);
      if (charted.possession_team !== context.play.possession_team) throw invalid(`FTN possession team disagrees with ordinary PBP: ${charted.game_id}/${charted.play_id}`);
      for (const [observationKey, metric] of Object.entries(FTN_METRICS)) {
        const observation = charted.observations[observationKey];
        if (!observation) throw invalid(`FTN observation is missing: ${observationKey}`);
        const usable = ftnCharting.coverage_gate.eligible_for_enrichment && observation.state === "observed";
        facts.push(metricFact({
          play: context.play, game: context.game, teamId: context.teamId, metric,
          value: usable ? observation.value : null,
          availability: usable ? "observed" : ftnCharting.coverage_gate.eligible_for_enrichment ? observation.state : "not_covered",
          provenance: charted.provenance,
          eligible: usable,
        }));
      }
    }
  }
  facts.sort(compareFacts);
  return Object.freeze({
    contract_version: "football-observed-metric-set.v1",
    denominator: Object.freeze({ source_family: "play_by_play", eligible_plays: ordinaryPbp.facts.length }),
    ftn_coverage: ftnCharting ? ftnCharting.coverage_gate : null,
    facts: Object.freeze(facts),
    output_hash: hashCanonical(facts),
  });
}

function metricFact({ play, game, teamId, metric, value, availability, provenance, eligible = true }) {
  const source = Object.freeze({
    artifact_sha256: provenance.artifact_id,
    receipt_id: provenance.receipt_id,
    row_key: `${play.game_id}/${play.play_id}`,
    source_family: provenance.source_family,
    intended_use: provenance.intended_use,
    schema_fingerprint: provenance.source_schema_fingerprint,
  });
  const identity = { game_id: play.game_id, play_id: play.play_id, subject_id: teamId, metric, source };
  return Object.freeze({
    contract_version: CONTRACTS.observedFact,
    fact_key: hashCanonical(identity),
    game_id: play.game_id,
    play_id: play.play_id,
    season: play.season,
    week: play.week,
    subject_type: "team",
    subject_id: teamId,
    metric,
    value,
    availability,
    eligible,
    normalization_version: MODELS.normalization,
    observed_at_utc: `${game.gameday}T23:59:59.000Z`,
    source,
  });
}

function requireFacts(value, name) { if (!value || !Array.isArray(value.facts)) throw invalid(`${name} must be a normalized receipt result`); }
function playKey(gameId, playId) { return `${gameId}\u0000${playId}`; }
function compareFacts(a, b) { return a.season - b.season || a.week - b.week || a.game_id.localeCompare(b.game_id) || a.play_id - b.play_id || a.metric.localeCompare(b.metric); }
function invalid(message) { const error = new TypeError(message); error.code = "FOOTBALL_INTELLIGENCE_INVALID"; return error; }

module.exports = { FTN_METRICS, buildObservedMetricFacts };
