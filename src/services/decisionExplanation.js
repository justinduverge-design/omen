"use strict";

/**
 * Decision explanations: a small local model words the engine's own reasons for ONE user decision
 * ("start A over B", "add X, drop Y") into at most two sentences.
 *
 * The engine decides and supplies the reasons (the `why` statements from evidenceWhy.js, each one a
 * grounded evidence row). The model only rephrases them. Output that fails narrationGrounding against
 * exactly those facts is dropped, never repaired, and the caller keeps its deterministic text.
 *
 * Never on a request path: requests enqueue an input (decisionExplanationStore.js) and a background
 * worker writes it. Inputs are keyed by a hash of the facts, so the same facts share one explanation
 * and no user id is stored.
 *
 * Mode: DECISION_EXPLANATIONS_MODE = off (default) | shadow. Shadow writes and stores explanations
 * but nothing is shown to users.
 */

const crypto = require("node:crypto");
const { validateGroundedText } = require("./narrationGrounding");

const VERSION = "decision-explanation.v1";
const DEFAULT_MODEL = "qwen3:1.7b";
const DEFAULT_TIMEOUT_MS = 60000;
const MAX_REASONS = 3;
const DECISION_TYPES = Object.freeze(["start_sit", "waiver", "trade"]);

function mode(env = process.env) {
  return env.DECISION_EXPLANATIONS_MODE === "shadow" ? "shadow" : "off";
}

function clean(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

/**
 * @param {object} args
 * @param {string} args.type one of DECISION_TYPES
 * @param {string} args.decision the engine's own one-line decision, e.g. "Start Bijan Robinson over Tony Pollard at FLEX."
 * @param {Array<{text:string, basis?:string}>} args.why evidenceWhy statements, already ranked
 * @returns {{ version:string, type:string, facts:{decision:string, reasons:string[]}, hash:string } | null}
 */
function buildExplanationInput({ type, decision, why } = {}) {
  if (!DECISION_TYPES.includes(type)) return null;
  const decisionText = clean(decision);
  // A limitation is honest context, not a reason to prefer one player; the deterministic text keeps it.
  const reasons = (Array.isArray(why) ? why : [])
    .filter((s) => s && s.basis !== "limitation")
    .map((s) => clean(s.text))
    .filter(Boolean)
    .slice(0, MAX_REASONS);
  if (!decisionText || !reasons.length) return null;
  const facts = { decision: decisionText, reasons };
  const hash = crypto.createHash("sha256").update(JSON.stringify([VERSION, type, facts])).digest("hex");
  return { version: VERSION, type, facts, hash };
}

function messagesFor(input) {
  return [
    {
      role: "system",
      content:
        "You explain one fantasy football decision to the manager who has to make it. " +
        "Use ONLY the decision and reasons given; add nothing. Use only the names and numbers provided. " +
        "Do not mention any other stat, opponent, injury, matchup or weather. " +
        "Do not predict, do not guarantee, do not give a confidence number. " +
        "At most 2 sentences, under 45 words, plain text, no markdown. Speak to the manager as \"you\".",
    },
    {
      role: "user",
      content: `Decision: ${input.facts.decision}\nReasons:\n${input.facts.reasons.map((r) => `- ${r}`).join("\n")}\n\nExplain why.`,
    },
  ];
}

/**
 * Ask the local model for the explanation and validate it. Never throws.
 * @returns {Promise<{ ok:boolean, text:string|null, reasons:string[], model:string, ms:number }>}
 */
async function writeExplanation(input, {
  baseUrl = process.env.LLM_BASE_URL,
  model = process.env.DECISION_EXPLANATION_MODEL || DEFAULT_MODEL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = fetch,
  validator = validateGroundedText,
} = {}) {
  const started = Date.now();
  const result = (ok, text, reasons) => ({ ok, text, reasons, model, ms: Date.now() - started });
  if (!input || !baseUrl) return result(false, null, [baseUrl ? "no_input" : "no_llm_base_url"]);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let text = "";
  try {
    const res = await fetchImpl(`${String(baseUrl).replace(/\/+$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: messagesFor(input),
        stream: false,
        think: false,
        options: { temperature: 0.2, num_predict: 140 },
      }),
    });
    if (!res.ok) return result(false, null, [`http_${res.status}`]);
    const data = await res.json();
    text = clean(String(data?.message?.content || "").replace(/<think>[\s\S]*?<\/think>/g, ""));
  } catch (error) {
    return result(false, null, [error?.name === "AbortError" ? "timeout" : "request_failed"]);
  } finally {
    clearTimeout(timer);
  }

  let verdict;
  try {
    verdict = validator(text, input.facts, { maxSentences: 2 });
  } catch {
    verdict = { ok: false, reasons: ["validator_error"] };
  }
  return verdict.ok ? result(true, text, []) : result(false, null, verdict.reasons);
}

module.exports = {
  VERSION,
  DEFAULT_MODEL,
  DECISION_TYPES,
  mode,
  buildExplanationInput,
  writeExplanation,
  messagesFor,
};
