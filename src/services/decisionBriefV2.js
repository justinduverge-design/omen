"use strict";

const CONTRACT = "omen-decision-brief.v2";
const CONTRACT_V3 = "omen-decision-brief.v3";
const LABELS = Object.freeze({ confident: "Confident", leaning: "Leaning", coin_flip: "Coin flip" });
const { CAPABILITY_CONTRACT, buildDecisionCapabilities } = require("./decisionCapabilities");

// Collects the statements for things Omen could not read on this request. These are the
// engine's own signal messages, not a new vocabulary invented here — a signal that is not
// `live` has already written the sentence explaining itself.
function limitationStatements(signals) {
  return Object.values(signals || {})
    .filter((signal) => signal && signal.status !== "live" && typeof signal.message === "string")
    .map((signal) => signal.message.trim())
    .filter(Boolean);
}

// Versioned server presentation policy, not a probability or calibrated win rate.
// Preserve the engine's ordering without exposing a score to native clients.
function bandedConfidence(value, limitations = []) {
  const raw = typeof value === "number" ? value : value?.score;
  const score = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  const rationale = typeof value?.rationale === "string" ? value.rationale.trim() : "";
  const safeRationale = rationale && !/\d\s*(?:%|out of|\/\s*100)|confidence[^.!?]*\d/i.test(rationale);

  // **No score is not the lowest band.** This returned "coin_flip" for a missing score until
  // 2026-09-15, which asserts a judgement the engine never made: "coin flip" says Omen weighed
  // it and found the evidence balanced, where the truth is that Omen has no confidence value at
  // all. The client component's own rule is "absent means absent — no placeholder bar, no dash,
  // no zero", and a fourth word in the band vocabulary is the same substitution in prose.
  //
  // Instead of a label, say what was missing. This is the same discipline the risk treatment
  // already follows (the label names the injury, never the word "high" alone) and what
  // `waiverAnalysis.js` means by "naming the absence beats inventing a sentence".
  if (score == null) {
    return {
      band: null,
      drivers: [],
      unavailable_reason: limitations.length
        ? limitations
        : ["Omen did not produce a confidence value for this call."],
    };
  }

  const band = score >= 80 ? "confident" : score >= 60 ? "leaning" : "coin_flip";
  return {
    band,
    drivers: [safeRationale ? rationale
      : "This band reflects the engine's combined evidence; it is not a probability of success."],
  };
}

function decisionBriefV2(body) {
  const limitations = limitationStatements(body.signals);

  function visit(value, inherited) {
    if (Array.isArray(value)) return value.map((item) => visit(item, inherited));
    if (!value || typeof value !== "object") return value;
    const own = value.confidence;
    const confidence = own != null && typeof own !== "string"
      ? bandedConfidence(own, limitations)
      : inherited;
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      if (/^confidence_(score|label|pct|percent|percentage)$/.test(key)) continue;
      if (key === "confidence") {
        // A null band has no label. Substituting one would reintroduce the claim this
        // version exists to remove.
        result[key] = typeof item === "string"
          ? (confidence.band ? LABELS[confidence.band] : null)
          : confidence;
      } else result[key] = visit(item, confidence);
    }
    return result;
  }
  const result = visit(body, bandedConfidence(body.recommendation?.confidence || body.confidence, limitations));
  result.contract_version = CONTRACT;
  result.confidence_policy = "engine-bands.v1";
  result.evidence = buildDecisionCapabilities({
    signals: body.signals,
    generatedAt: body.generated_at,
  }).capabilities.map((capability) => ({
    name: capability.name,
    kind: capability.kind,
    source_status: capability.state,
    used: capability.used,
    statement: capability.statement,
  }));
  return result;
}

// v3 is deliberately additive: v2 remains stable for already-shipped clients, while
// native clients opting into v3 receive the same canonical capability records that all
// destinations will share. `signals` remains for compatibility; new native code reads
// `capabilities` so it never needs to expose an implementation-only "stub" label.
function decisionBriefV3(body) {
  const result = decisionBriefV2(body);
  const shared = buildDecisionCapabilities({
    signals: body.signals,
    promoted: body.capability_overrides,
    generatedAt: body.generated_at,
  });
  return {
    ...result,
    contract_version: CONTRACT_V3,
    capability_contract: CAPABILITY_CONTRACT,
    capabilities: shared.capabilities,
  };
}

module.exports = {
  CONTRACT,
  CONTRACT_V3,
  LABELS,
  bandedConfidence,
  limitationStatements,
  decisionBriefV2,
  decisionBriefV3,
};
