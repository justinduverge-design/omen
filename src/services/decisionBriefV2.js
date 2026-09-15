"use strict";

const CONTRACT = "omen-decision-brief.v2";
const LABELS = Object.freeze({ confident: "Confident", leaning: "Leaning", coin_flip: "Coin flip" });

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
  result.evidence = Object.entries(body.signals || {}).map(([name, signal]) => ({
    name,
    kind: signal.status !== "live" ? "limitation" : /project/i.test(name) ? "projection" : "model",
    source_status: signal.status,
    used: signal.used === true,
    statement: signal.message,
  }));
  return result;
}

module.exports = { CONTRACT, LABELS, bandedConfidence, limitationStatements, decisionBriefV2 };
