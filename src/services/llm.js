"use strict";

const net = require("node:net");

/**
 * LLM service — wraps Ollama OpenAI-compatible API.
 * LLM_BASE_URL: private/internal Ollama URL (e.g. http://ollama.internal:11434)
 * LLM_MODEL:    model name (e.g. gemma4:e2b-q4_0 or gemma3:4b)
 * LLM_TIMEOUT:  ms before giving up (default 30000)
 *
 * All functions return null on failure — callers must handle gracefully.
 * The app must work without the LLM (it is an enhancement, not a dependency).
 */

const PRIVATE_HOST_SUFFIXES = Object.freeze([
  ".internal",
  ".lan",
  ".local",
  ".home.arpa",
  ".tailnet",
  ".ts.net",
]);

function parseTimeout(value) {
  const timeout = Number(value);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : 30000;
}

function normalizeBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return { baseUrl: "", status: "not_configured" };

  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { baseUrl: "", status: "invalid_url" };
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    if (parsed.pathname.toLowerCase() === "/v1") parsed.pathname = "";
    if (parsed.pathname === "/") parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return {
      baseUrl: parsed.toString().replace(/\/$/, ""),
      hostname: parsed.hostname.toLowerCase(),
      status: "configured",
    };
  } catch {
    return { baseUrl: "", status: "invalid_url" };
  }
}

function isPrivateIpv4(hostname) {
  const octets = hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) return false;
  const [a, b] = octets;
  return a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127);
}

function isPrivateIpv6(hostname) {
  const normalized = hostname.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
  return normalized === "::1"
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("fe8")
    || normalized.startsWith("fe9")
    || normalized.startsWith("fea")
    || normalized.startsWith("feb");
}

function isPrivateLlmHost(hostname) {
  if (!hostname) return false;
  if (hostname === "localhost") return true;
  if (net.isIP(hostname) === 4) return isPrivateIpv4(hostname);
  if (net.isIP(hostname) === 6) return isPrivateIpv6(hostname);
  return PRIVATE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

function buildBridgeConfig(env = process.env) {
  const normalized = normalizeBaseUrl(env.LLM_BASE_URL);
  const model = env.LLM_MODEL || "gemma4:e2b-q4_0";
  const timeoutMs = parseTimeout(env.LLM_TIMEOUT);
  const privateHost = normalized.status === "configured"
    ? isPrivateLlmHost(normalized.hostname)
    : false;

  let status = normalized.status;
  if (status === "configured") {
    status = privateHost ? "configured_private" : "misconfigured_public";
  }

  return {
    baseUrl: privateHost ? normalized.baseUrl : "",
    model,
    timeoutMs,
    status,
    privateHost,
  };
}

const BRIDGE = buildBridgeConfig();
const LLM_BASE_URL = BRIDGE.baseUrl;
const LLM_MODEL    = BRIDGE.model;
const LLM_TIMEOUT  = BRIDGE.timeoutMs;

function getLlmBridgeStatus() {
  return {
    status: BRIDGE.status,
    model: LLM_MODEL,
    timeout_ms: LLM_TIMEOUT,
    transport: "openai_compatible_chat_completions",
    private_route_required: true,
    public_url_exposed: false,
    note: "LLM_BASE_URL must resolve over a private route such as Tailscale; this status never returns the URL.",
  };
}

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
    "You are Omen, a concise fantasy football analyst.",
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
  getLlmBridgeStatus,
  isPrivateLlmHost,
};
