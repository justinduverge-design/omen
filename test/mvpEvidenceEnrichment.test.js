"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const evidence = require("../src/services/mvpEvidenceEnrichment");

function liveResponse() {
  return {
    state: "success", mode: "live", request_id: "must-not-reach-model",
    league: { id: "must-not-reach-model", season: 2026, week: 4 },
    recommendation: {
      type: "start_sit", title: "Start Starter Wideout over Bench Wideout",
      move: "Move Starter Wideout into your WR slot.",
      primary_player: { id: "must-not-reach-model", name: "Starter Wideout", position: "WR", team: "DAL" },
      comparison_player: { id: "must-not-reach-model", name: "Bench Wideout", position: "WR", team: "PHI" },
      expected_value_delta: { points: 2.1, label: "meaningful" },
      confidence: { score: 82, label: "confident", rationale: "Projection edge is meaningful." },
      risk: { level: "medium", reasons: ["Matchup is unavailable."] },
      matchup_context: { opponent_team: "NYG", source: "espn_scoreboard", status: "live" },
      explanation: {
        summary: "Start Starter Wideout.", why_it_matters: "The projection edge is meaningful.",
        risk: "Risk is medium.", confidence: "Confidence is 82 out of 100.",
        data_used: ["connected roster", "weekly projection"],
      },
    },
    signals: {
      roster: { status: "live", message: "Roster imported from connected provider." },
      llm_reasoning: { status: "unavailable", used: false, source: "ollama_gemma", message: "Private narration is not available." },
      matchup_dvp: { status: "unavailable", used: false, source: "nflverse_data", message: "Opponent context is not available." },
    },
  };
}

function validNarration(overrides = {}) {
  return {
    summary: "Start Starter Wideout for the stronger projected role",
    why_it_matters: "The roster projection gives this lineup a meaningful edge",
    risk: "Risk remains medium", confidence: "Confidence is high",
    data_used: ["connected roster", "weekly projection"], ...overrides,
  };
}

test("private LLM payload is bounded and omits identifiers and raw response material", () => {
  const payload = evidence.buildMvpLlmPayload(liveResponse());
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("must-not-reach-model"), false);
  assert.equal(payload.primary_player.id, undefined);
  assert.equal(payload.state, "success");
  assert.deepEqual(payload.data_used, ["connected roster", "weekly projection"]);
});

test("LLM narration promotion keeps deterministic risk, confidence, and source labels", async () => {
  const response = liveResponse();
  const narration = await evidence.generateMvpLlmNarration(response, {
    llmService: {
      explainOmenMvpMove: async () => validNarration(),
      getLlmBridgeStatus: () => ({ status: "configured_private", model: "gemma4:e2b-q4_0" }),
    },
  });
  assert.ok(narration);
  assert.equal(evidence.applyMvpLlmNarration(response, narration), true);
  assert.equal(response.recommendation.explanation.summary, validNarration().summary);
  assert.equal(response.recommendation.explanation.risk, "Risk is medium.");
  assert.deepEqual(response.recommendation.explanation.data_used, ["connected roster", "weekly projection"]);
  assert.equal(response.signals.llm_reasoning.model, "gemma4:e2b-q4_0");
  assert.equal(response.signals.llm_reasoning.used, true);
});

test("LLM remains unavailable when output invents a data source or the private bridge is not configured", async () => {
  const response = liveResponse();
  const inventedSource = await evidence.generateMvpLlmNarration(response, {
    llmService: {
      explainOmenMvpMove: async () => validNarration({ data_used: ["injury report"] }),
      getLlmBridgeStatus: () => ({ status: "configured_private", model: "gemma4:e2b-q4_0" }),
    },
  });
  assert.equal(inventedSource, null);
  const unavailableBridge = await evidence.generateMvpLlmNarration(response, {
    llmService: {
      explainOmenMvpMove: async () => validNarration(),
      getLlmBridgeStatus: () => ({ status: "not_configured", model: "gemma4:e2b-q4_0" }),
    },
  });
  assert.equal(unavailableBridge, null);
});

test("live DvP lookup requires an actual schedule-backed opponent and never maps DAL to PHI", () => {
  const response = liveResponse();
  assert.deepEqual(evidence.deriveVerifiedDvpLookup(response), {
    position: "WR", opponentTeam: "NYG", season: 2026, week: 4,
  });
  delete response.recommendation.matchup_context;
  assert.equal(evidence.deriveVerifiedDvpLookup(response), null);
});

test("DvP mock context is accepted only for an explicit mock response and declared fixture source", () => {
  const response = liveResponse();
  response.mode = "mock";
  response.recommendation.matchup_context = {
    opponent_team: "PHI", source: "mock_schedule_fixture", status: "mock",
  };
  assert.equal(evidence.deriveVerifiedDvpLookup(response), null);
  assert.deepEqual(evidence.deriveVerifiedDvpLookup(response, { explicitMock: true }), {
    position: "WR", opponentTeam: "PHI", season: 2026, week: 4,
  });
});

test("DvP resolver validates provider result and distinct-week evidence before promotion", async () => {
  const response = liveResponse();
  const expected = { opponent_team: "NYG", position: "WR", avg_points_allowed: 16.2, sample_weeks: 3, dvp_label: "favorable" };
  const dvp = await evidence.resolveMvpDvpContext(response, {}, {
    matchup: { getDvpContext: async (lookup) => {
      assert.deepEqual(lookup, { position: "WR", opponentTeam: "NYG", season: 2026, week: 4 });
      return expected;
    } },
  });
  assert.deepEqual(dvp, expected);
  assert.equal(evidence.applyDvpContext(response, dvp), true);
  assert.equal(response.signals.matchup_dvp.status, "live");
  assert.ok(response.recommendation.explanation.data_used.includes("matchup DvP"));
  const wrongOpponent = await evidence.resolveMvpDvpContext(liveResponse(), {}, {
    matchup: { getDvpContext: async () => ({ ...expected, opponent_team: "DAL" }) },
  });
  assert.equal(wrongOpponent, null);
});
