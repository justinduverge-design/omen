"use strict";

// Offline experiment only: fixed synthetic observations, no request-path or storage integration.
const { createHash } = require("node:crypto");
const { validateGroundedText } = require("../../../src/services/narrationGrounding");

const MODEL = "qwen3:1.7b";
const CASES = Object.freeze([
  { id: "heldout-01", earlier: 6, later: 12 },
  { id: "heldout-02", earlier: 14, later: 7 },
  { id: "heldout-03", earlier: 0, later: 0 },
  { id: "heldout-04", earlier: 18, later: 19 },
  { id: "heldout-05", earlier: 4, later: 1 },
].map(Object.freeze));

function factsFor(row) {
  if (!CASES.includes(row)) throw new Error("unknown fixture");
  return `Synthetic usage: earlier ${row.earlier} carries; later ${row.later} carries.`;
}
function fallbackFor(row) {
  factsFor(row);
  return row.later > row.earlier ? "Usage increased." : row.later < row.earlier ? "Usage decreased." : "Usage stayed the same.";
}

async function runCase(row, { fetchImpl = fetch, timeoutMs = 30000, clock = Date.now } = {}) {
  const facts = factsFor(row);
  const fallback = fallbackFor(row);
  const hash = createHash("sha256").update(facts).digest("hex");
  const started = clock();
  let output = null;
  let failure = null;
  let grounded = false;
  let agreement = false;
  try {
    const response = await fetchImpl("http://127.0.0.1:11434/api/chat", {
      method: "POST", headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ model: MODEL, stream: false, think: false,
        options: { temperature: 0, num_predict: 80 },
        messages: [
          { role: "system", content: "Classify the change in synthetic usage. Reply with exactly one: Usage increased. Usage decreased. Usage stayed the same." },
          { role: "user", content: facts },
        ] }),
    });
    if (!response.ok) failure = `http_${response.status}`;
    else {
      const data = await response.json();
      const candidate = typeof data?.message?.content === "string" ? data.message.content.trim() : "";
      const verdict = validateGroundedText(candidate, { observation: facts }, { maxSentences: 1, maxWords: 25, maxChars: 160 });
      grounded = verdict.ok;
      agreement = candidate === fallback;
      // Do not persist rejected, potentially unbounded model output.
      if (grounded && agreement) output = candidate;
      else failure = grounded ? "deterministic_disagreement" : "grounding_rejected";
    }
  } catch (error) {
    failure = error?.name === "TimeoutError" || error?.name === "AbortError" ? "timeout" : "host_unavailable";
  }
  return { version: 1, case_id: row.id, input_class: "synthetic_usage_trend", facts_hash: hash,
    model: MODEL, output, fallback, grounded, deterministic_agreement: agreement,
    latency_ms: Math.max(0, clock() - started), resource_use: null, failure_reason: failure, human_acted: false };
}

async function runBatch(options) {
  const receipts = [];
  for (const row of CASES) receipts.push(await runCase(row, options));
  return receipts;
}

if (require.main === module) runBatch().then((receipts) => {
  process.stdout.write(`${JSON.stringify(receipts, null, 2)}\n`);
  if (receipts.some((r) => r.failure_reason === "host_unavailable" || r.failure_reason === "timeout" || r.failure_reason?.startsWith("http_"))) process.exitCode = 1;
});
module.exports = { CASES, factsFor, fallbackFor, runCase, runBatch };
