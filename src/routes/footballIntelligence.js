"use strict";

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");
const {
  CONTRACT_VERSION,
  SIGNAL_TYPE,
  createFootballIntelligenceServingRepository,
} = require("../services/footballIntelligence/servingRepository");

const TEAM_ID = /^omen:team:[a-z0-9][a-z0-9._-]*$/;
const COACH_ID = /^omen:coach:[a-z0-9][a-z0-9._-]*$/;
const QUERY_FIELDS = new Set(["team_id", "coach_id", "season"]);

function requestScopedRepository(req) {
  const token = String(req.headers.authorization || "").slice("Bearer ".length).trim();
  const client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    accessToken: async () => token,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return createFootballIntelligenceServingRepository({ client });
}

function createFootballIntelligenceRouter({
  authenticate = requireAuth,
  repositoryFactory = requestScopedRepository,
} = {}) {
  const router = express.Router();

  router.get("/signals/coach-transfer", authenticate, async (req, res) => {
    const scope = parseScope(req.query);
    if (!scope) {
      return res.status(400).json(errorEnvelope(
        "invalid_scope",
        "team_id, coach_id, and a valid season are required; extra query fields are not accepted."
      ));
    }

    try {
      const repository = repositoryFactory(req);
      const signal = await repository.findPublishedCoachTransfer(scope);
      return res.json(signal || unavailableSignal(scope));
    } catch {
      return res.status(503).json(errorEnvelope(
        "serving_unavailable",
        "Football intelligence is unavailable right now. Try again later."
      ));
    }
  });

  return router;
}

function parseScope(query) {
  if (!query || Object.keys(query).some((key) => !QUERY_FIELDS.has(key))) return null;
  if (typeof query.team_id !== "string" || !TEAM_ID.test(query.team_id)) return null;
  if (typeof query.coach_id !== "string" || !COACH_ID.test(query.coach_id)) return null;
  if (typeof query.season !== "string" || !/^\d{4}$/.test(query.season)) return null;
  const season = Number(query.season);
  if (season < 1999 || season > 2100) return null;
  return { teamId: query.team_id, coachId: query.coach_id, season };
}

function unavailableSignal({ teamId, coachId, season }) {
  return {
    contract_version: CONTRACT_VERSION,
    status: "unavailable",
    reason_code: "not_published",
    signal_type: SIGNAL_TYPE,
    subject: { team_id: teamId, coach_id: coachId, season },
    as_of_utc: null,
    summary: null,
    interpretation: { direction: null, association_only: true, what_could_change_this: ["A validated signal must be published before Omen can use it."] },
    scheme_dna: { contract_version: "scheme-dna.v1", artifact_id: "", dimensions: [] },
    coaching_tree: { contract_version: "coaching-tree.v1", confirmed_edges: [], inferred_edges: [] },
    evidence: {
      source_artifacts: [], games: null, plays: null, charted_plays: null,
      current_window: { start: null, end: null }, comparison_window: { start: null, end: null }, coverage_ratio: null,
    },
    quality: { state: "unavailable", coverage: "not_evaluated", confidence: null, limitations: ["No published serving version exists for this scope."] },
    freshness: { state: "unknown", computed_at_utc: null, latest_observation_at_utc: null, stale_after_utc: null },
    publication: { artifact_id: "", artifact_version: "", published_at_utc: null },
  };
}

function errorEnvelope(code, message) {
  return { contract_version: "football-intelligence-signal-error.v1", error: "Football intelligence unavailable", code, message };
}

const router = createFootballIntelligenceRouter();
module.exports = router;
module.exports.createFootballIntelligenceRouter = createFootballIntelligenceRouter;
module.exports.parseScope = parseScope;
module.exports.unavailableSignal = unavailableSignal;
