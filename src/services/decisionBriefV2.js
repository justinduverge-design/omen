"use strict";

const CONTRACT = "omen-decision-brief.v2";
const LABELS = Object.freeze({ confident: "Confident", leaning: "Leaning", coin_flip: "Coin flip" });

// Versioned server presentation policy, not a probability or calibrated win rate.
// Preserve the engine's ordering without exposing a score to native clients.
function bandedConfidence(value) {
  const raw = typeof value === "number" ? value : value?.score;
  const score = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  const band = score == null ? "coin_flip" : score >= 80 ? "confident" : score >= 60 ? "leaning" : "coin_flip";
  const rationale = typeof value?.rationale === "string" ? value.rationale.trim() : "";
  const safeRationale = rationale && !/\d\s*(?:%|out of|\/\s*100)|confidence[^.!?]*\d/i.test(rationale);
  return {
    band,
    drivers: [safeRationale ? rationale : score == null
      ? "The available evidence does not establish a stronger lean."
      : "This band reflects the engine's combined evidence; it is not a probability of success."],
  };
}

function decisionBriefV2(body) {
  function visit(value, inherited) {
    if (Array.isArray(value)) return value.map((item) => visit(item, inherited));
    if (!value || typeof value !== "object") return value;
    const own = value.confidence;
    const confidence = own != null && typeof own !== "string" ? bandedConfidence(own) : inherited;
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      if (/^confidence_(score|label|pct|percent|percentage)$/.test(key)) continue;
      if (key === "confidence") {
        result[key] = typeof item === "string" ? LABELS[confidence.band] : confidence;
      } else result[key] = visit(item, confidence);
    }
    return result;
  }
  const result = visit(body, bandedConfidence(body.recommendation?.confidence || body.confidence));
  result.contract_version = CONTRACT;
  result.confidence_policy = "engine-bands.v1";
  result.evidence = Object.entries(body.signals || {}).map(([name, signal]) => ({
    name,
    kind: signal.status !== "live" ? "limitation" : /project/i.test(name) ? "projection" : "model",
    source_status: signal.status,
    used: signal.used === true,
    statement: signal.message,
  }));
  return result;
}

module.exports = { CONTRACT, LABELS, bandedConfidence, decisionBriefV2 };
