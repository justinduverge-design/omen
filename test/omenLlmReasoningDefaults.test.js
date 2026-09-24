"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");

const { buildSignals, buildLiveMvpSignals, VALID_SIGNAL_STATUSES } = require("../src/services/omen");

/**
 * The `llm_reasoning` signal these two builders return is only the
 * *pre-attempt* default. src/routes/omen.js (enrichWithLlm) and
 * src/services/mvpEvidenceEnrichment.js overwrite it after a real narration
 * attempt: "live" on success, "unavailable" naming ollama_gemma on a timeout.
 * These builders must never claim "live" themselves (that would be an LLM
 * result that was never actually produced), and their copy must not assert a
 * stale "Gemma isn't wired yet" claim now that it is.
 */

test("buildSignals() llm_reasoning default never claims live and doesn't call the wiring stale", () => {
  const signals = buildSignals({ connected: true, useMockData: false, platform: "yahoo" });
  const llmReasoning = signals.llm_reasoning;

  assert.ok(VALID_SIGNAL_STATUSES.has(llmReasoning.status));
  assert.notEqual(llmReasoning.status, "live");
  assert.notEqual(llmReasoning.source, "ollama_gemma");
  assert.doesNotMatch(llmReasoning.message, /until Gemma is wired/i);
});

test("buildLiveMvpSignals() llm_reasoning default never claims live and doesn't call the wiring stale", () => {
  const signals = buildLiveMvpSignals({ connectedPlatforms: ["yahoo"], platform: "yahoo" });
  const llmReasoning = signals.llm_reasoning;

  assert.ok(VALID_SIGNAL_STATUSES.has(llmReasoning.status));
  assert.notEqual(llmReasoning.status, "live");
  assert.notEqual(llmReasoning.source, "ollama_gemma");
  assert.doesNotMatch(llmReasoning.message, /until Gemma is wired/i);
  // The live route gates real narration behind an explicit opt-in
  // (include_signals.llm_reasoning: true, which both native clients already
  // send). The default copy should say so rather than implying nothing is
  // wired at all.
  assert.match(llmReasoning.message, /include_signals\.llm_reasoning/);
});
