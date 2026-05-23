"use strict";

/**
 * LLM service — wraps Ollama OpenAI-compatible API.
 * LLM_BASE_URL: private/internal Ollama URL (e.g. http://ollama.internal:11434)
 * LLM_MODEL:    model name (e.g. gemma4:e2b-q4_0 or gemma3:4b)
 * LLM_TIMEOUT:  ms before giving up (default 30000)
 *
 * All functions return null on failure — callers must handle gracefully.
 * The app must work without the LLM (it is an enhancement, not a dependency).
 */

const LLM_BASE_URL = process.env.LLM_BASE_URL || "";
const LLM_MODEL    = process.env.LLM_MODEL    || "gemma3:4b";
const LLM_TIMEOUT  = Number(process.env.LLM_TIMEOUT) || 30000;

/**
 * Core: send messages to the LLM, return full text response.
 * Uses the OpenAI-compatible /v1/chat/completions endpoint.
 * Returns null if LLM is unavailable or times out.
 */
async function chat(messages) {
  if (!LLM_BASE_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT);
  try {
    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      signal:  controller.signal,
      body: JSON.stringify({
        model:    LLM_MODEL,
        messages,
        stream:   false,
        max_tokens: 200,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Explain a trade comparison result in 2-3 plain English sentences.
 * send/receive: arrays of { name, position, projected_points }
 * net_value: number, verdict: "accept" | "decline" | "neutral"
 */
async function explainTrade({ send, receive, net_value, verdict }) {
  const sendStr    = send.map(p => `${p.name} (${p.position})`).join(", ");
  const receiveStr = receive.map(p => `${p.name} (${p.position})`).join(", ");
  const messages = [
    {
      role: "system",
      content:
        "You are a concise fantasy football analyst. " +
        "Give plain English advice in 2-3 sentences. No markdown. No bullet points.",
    },
    {
      role: "user",
      content:
        `Trade analysis: giving away ${sendStr}, receiving ${receiveStr}. ` +
        `Net projected value difference: ${net_value > 0 ? "+" : ""}${net_value} points. ` +
        `Model verdict: ${verdict}. ` +
        `Briefly explain why this trade is a ${verdict} and what the key factor is.`,
    },
  ];
  return chat(messages);
}

/**
 * Explain a start/sit recommendation.
 * from/to: { name, position, projected, status }
 * delta: number, slot: string
 */
async function explainStartSit({ from, to, delta, slot }) {
  const messages = [
    {
      role: "system",
      content:
        "You are a concise fantasy football analyst. " +
        "Give plain English advice in 1-2 sentences. No markdown.",
    },
    {
      role: "user",
      content:
        `Start/sit decision for ${slot} slot: ` +
        `bench ${from.name} (projected ${from.projected} pts${from.status ? ", " + from.status : ""}) ` +
        `and start ${to.name} (projected ${to.projected} pts${to.status ? ", " + to.status : ""}). ` +
        `Difference: ${delta} pts. Give one clear reason why.`,
    },
  ];
  return chat(messages);
}

/**
 * Run a single agent call with a dedicated system prompt and user prompt.
 * Used for both sub-agents (expect one-sentence string) and the Manager Agent
 * (expects JSON string). Timeout is longer than trade explanations.
 * Returns null on failure — caller must handle gracefully.
 */
async function runAgent(systemPrompt, userPrompt, { maxTokens = 400 } = {}) {
  if (!LLM_BASE_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT * 2);
  try {
    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      signal:  controller.signal,
      body: JSON.stringify({
        model:      LLM_MODEL,
        messages:   [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        stream:     false,
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function stripJsonFence(text) {
  return String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function shortUserString(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 240);
}

function parseOmenExplanation(raw) {
  if (!raw) return null;

  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(stripJsonFence(raw));
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const summary = shortUserString(parsed.summary);
  const whyItMatters = shortUserString(parsed.why_it_matters);
  const riskText = shortUserString(parsed.risk);
  const confidenceText = shortUserString(parsed.confidence);
  const dataUsed = Array.isArray(parsed.data_used)
    ? parsed.data_used.map(shortUserString).filter(Boolean).slice(0, 8)
    : null;

  if (!summary || !whyItMatters || !riskText || !confidenceText || !dataUsed?.length) {
    return null;
  }

  return {
    summary,
    why_it_matters: whyItMatters,
    risk: riskText,
    confidence: confidenceText,
    data_used: dataUsed,
  };
}

/**
 * Generate plain-English Omen / MVP Move explanation copy from sanitized facts.
 * The LLM may explain the already-built recommendation, but must not choose or
 * alter the move, confidence, risk level, players, EV delta, or response state.
 */
async function explainOmenMvpMove(payload) {
  const systemPrompt = [
    "You are Corvus, a concise fantasy football analyst.",
    "Explain only the already-selected MVP Move using plain English.",
    "Do not change the recommendation, players, confidence score, risk level, expected value, or response state.",
    "Use only the provided sanitized facts.",
    "Return strict JSON only, with no markdown.",
    'Required shape: {"summary":"string","why_it_matters":"string","risk":"string","confidence":"string","data_used":["string"]}',
  ].join(" ");

  const userPrompt = [
    "Write the Omen / MVP Move explanation from these sanitized facts.",
    JSON.stringify(payload),
  ].join("\n\n");

  const raw = await runAgent(systemPrompt, userPrompt, { maxTokens: 360 });
  return parseOmenExplanation(raw);
}

module.exports = {
  chat,
  explainTrade,
  explainStartSit,
  runAgent,
  explainOmenMvpMove,
  parseOmenExplanation,
};
