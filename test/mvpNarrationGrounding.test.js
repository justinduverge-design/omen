"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const evidence = require("../src/services/mvpEvidenceEnrichment");
const { withinLatencyBudget, isLatencyBudgetExceeded } = require("../src/services/latencyBudget");

function liveResponse() {
  return {
    state: "success", mode: "live",
    league: { id: "x", season: 2026, week: 4 },
    recommendation: {
      type: "start_sit", title: "Start Starter Wideout over Bench Wideout",
      move: "Move Starter Wideout into your WR slot.",
      primary_player: { name: "Starter Wideout", position: "WR", team: "DAL" },
      comparison_player: { name: "Bench Wideout", position: "WR", team: "PHI" },
      expected_value_delta: { points: 2.1, label: "meaningful" },
      confidence: { score: 82, label: "confident", rationale: "Projection edge is meaningful." },
      risk: { level: "medium", reasons: ["Matchup is unavailable."] },
      explanation: {
        summary: "Start Starter Wideout.", why_it_matters: "The projection edge is meaningful.",
        risk: "Risk is medium.", confidence: "Confidence is 82 out of 100.",
        data_used: ["connected roster", "weekly projection"],
      },
    },
    signals: {
      llm_reasoning: { status: "unavailable", used: false, source: "ollama_gemma", message: "Private narration is not available." },
    },
  };
}

function narration(overrides = {}) {
  return {
    summary: "Start Starter Wideout for the stronger projected role",
    why_it_matters: "The roster projection gives this lineup a meaningful edge",
    risk: "Risk remains medium", confidence: "Confidence is high",
    data_used: ["connected roster", "weekly projection"], ...overrides,
  };
}

const BRIDGE_OK = () => ({ status: "configured_private", model: "gemma4:e2b-q4_0" });
const service = (explainOmenMvpMove) => ({ explainOmenMvpMove, getLlmBridgeStatus: BRIDGE_OK });

test("ungrounded LLM narration is rejected so the deterministic explanation stays", async () => {
  const invented = [
    { summary: "Start Starter Wideout because of his target share" },
    { why_it_matters: "The edge is 9.9 points for Starter Wideout" },
    { summary: "Start Starter Wideout over Patrick Mahomes" },
    { why_it_matters: "Starter Wideout faces the Cowboys" },
    { summary: "Starter Wideout is a guaranteed start" },
    { why_it_matters: "Confidence is 82 out of 100" },
  ];
  for (const override of invented) {
    const response = liveResponse();
    const before = JSON.stringify(response.recommendation.explanation);
    const result = await evidence.generateMvpLlmNarration(response, {
      llmService: service(async () => narration(override)),
    });
    assert.equal(result, null, JSON.stringify(override));
    assert.equal(evidence.applyMvpLlmNarration(response, result), false);
    assert.equal(JSON.stringify(response.recommendation.explanation), before);
    assert.equal(response.signals.llm_reasoning.used, false);
  }
});

test("grounded rounding variants of the EV delta are accepted", async () => {
  for (const phrase of ["about 2.1 points", "about 2.10 points", "about 2 points"]) {
    const result = await evidence.generateMvpLlmNarration(liveResponse(), {
      llmService: service(async () => narration({ why_it_matters: `Starter Wideout is projected ${phrase} ahead` })),
    });
    assert.ok(result, phrase);
  }
});

test("LLM null or error leaves the deterministic explanation untouched", async () => {
  for (const explain of [async () => null, async () => { throw new Error("bridge down"); }]) {
    const response = liveResponse();
    const before = JSON.stringify(response.recommendation.explanation);
    let result = null;
    try {
      result = await evidence.generateMvpLlmNarration(response, { llmService: service(explain) });
    } catch {
      // The route-level enrichWithLlm swallows this; the response must be untouched.
    }
    assert.equal(evidence.applyMvpLlmNarration(response, result), false);
    assert.equal(JSON.stringify(response.recommendation.explanation), before);
  }
});

test("a hung narrator is cut off by the latency budget and leaves the explanation untouched", async () => {
  const response = liveResponse();
  const before = JSON.stringify(response.recommendation.explanation);
  const started = Date.now();
  await assert.rejects(
    withinLatencyBudget("llm_narration", 50, () => evidence.generateMvpLlmNarration(response, {
      timeoutMs: 50,
      llmService: service(() => new Promise(() => {})),
    })),
    (error) => isLatencyBudgetExceeded(error)
  );
  assert.ok(Date.now() - started < 1000);
  assert.equal(JSON.stringify(response.recommendation.explanation), before);
});
