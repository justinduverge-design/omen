"use strict";

const { CONTRACT_VERSION, SIGNAL_TYPE } = require("./servingRepository");

const CANONICAL_TEAM_ID = /^omen:team:[a-z0-9][a-z0-9._-]*$/;
const ADVISORY_STATUSES = new Set(["available", "stale"]);

async function enrichOmenWithFootballIntelligence({ response, repository = null } = {}) {
  if (!response || response.state !== "success" || !response.recommendation) return response;
  const teamId = response.recommendation.primary_player?.omen_team_id || null;
  const season = Number(response.league?.season ?? response.season);
  if (!CANONICAL_TEAM_ID.test(teamId || "")) {
    attach(response, unavailableSignal({
      teamId: null,
      season: Number.isInteger(season) ? season : null,
      reasonCode: "identity_unresolved",
      limitation: "The recommendation does not yet carry a confirmed Omen team identity.",
    }));
    return response;
  }
  if (!Number.isInteger(season) || !repository || typeof repository.findPublishedTeamSignal !== "function") {
    attach(response, unavailableSignal({
      teamId,
      season: Number.isInteger(season) ? season : null,
      reasonCode: "not_published",
      limitation: "No accepted football-intelligence publication is available for this recommendation.",
    }));
    return response;
  }
  try {
    const signal = await repository.findPublishedTeamSignal({ teamId, season });
    attach(response, signal || unavailableSignal({
      teamId, season, reasonCode: "not_published",
      limitation: "No accepted football-intelligence publication is available for this recommendation.",
    }));
  } catch {
    attach(response, unavailableSignal({
      teamId, season, reasonCode: "serving_unavailable",
      limitation: "Football-intelligence evidence could not be read for this recommendation.",
    }));
  }
  return response;
}

function attach(response, signal) {
  response.football_intelligence = signal;
  response.signals = response.signals || {};
  const publication = signal.publication || {};
  const qualityState = signal.quality?.state;
  const advisory = ADVISORY_STATUSES.has(signal.status)
    && typeof signal.summary === "string"
    && signal.summary.trim().length > 0
    && typeof publication.artifact_id === "string"
    && publication.artifact_id.length > 0
    && typeof publication.artifact_version === "string"
    && publication.artifact_version.length > 0
    && typeof publication.published_at_utc === "string"
    && Number.isFinite(Date.parse(publication.published_at_utc))
    && !new Set(["candidate", "unaccepted", "disputed"]).has(qualityState);
  response.signals.football_intelligence = {
    status: advisory ? "live" : "unavailable",
    used: false,
    source: "football_intelligence",
    message: advisory
      ? signal.summary
      : signal.quality?.limitations?.[0] || "Football-intelligence evidence is unavailable for this call.",
  };
}

function unavailableSignal({ teamId, season, reasonCode, limitation }) {
  return {
    contract_version: CONTRACT_VERSION,
    status: "unavailable",
    reason_code: reasonCode,
    signal_type: SIGNAL_TYPE,
    subject: { team_id: teamId, coach_id: null, season },
    as_of_utc: null,
    summary: null,
    interpretation: { direction: null, association_only: true, what_could_change_this: [] },
    scheme_dna: { contract_version: "scheme-dna.v1", artifact_id: "", dimensions: [] },
    coaching_tree: { contract_version: "coaching-tree.v1", confirmed_edges: [], inferred_edges: [] },
    evidence: {
      source_artifacts: [], games: null, plays: null, charted_plays: null,
      current_window: { start: null, end: null }, comparison_window: { start: null, end: null }, coverage_ratio: null,
    },
    quality: { state: "unavailable", coverage: "not_evaluated", confidence: null, limitations: [limitation] },
    freshness: { state: "unknown", computed_at_utc: null, latest_observation_at_utc: null, stale_after_utc: null },
    publication: { artifact_id: "", artifact_version: "", published_at_utc: null },
  };
}

module.exports = { enrichOmenWithFootballIntelligence, unavailableSignal };
