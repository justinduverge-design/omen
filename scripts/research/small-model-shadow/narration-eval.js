"use strict";
// Held-out synthetic decision narratives, separate from the classification experiment.
const { buildExplanationInput, writeExplanation } = require("../../../src/services/decisionExplanation");
const cases = [
  {
    type: "start_sit",
    decision: "Start Player Alpha over Player Beta.",
    why: [{ text: "Player Alpha has 12 carries over 3 games." }],
  },
  { type: "waiver", decision: "Add Player Cedar.", why: [{ text: "Player Cedar has 8 targets over 2 games." }] },
  { type: "trade", decision: "Keep Player Delta.", why: [{ text: "Player Delta is projected for 14 points." }] },
];
async function evaluate({ writer = writeExplanation } = {}) {
  const receipts = [];
  for (const [index, fixture] of cases.entries()) {
    const input = buildExplanationInput(fixture);
    const result = await writer(input, { baseUrl: "http://127.0.0.1:11434", model: "qwen3:1.7b", timeoutMs: 30000 });
    receipts.push({
      case_id: `narration-${index + 1}`,
      input_class: "synthetic_decision",
      facts_hash: input.hash,
      model: "qwen3:1.7b",
      output: result.ok ? result.text : null,
      grounding_pass: result.ok,
      fallback: `${fixture.decision} ${fixture.why[0].text}`,
      latency_ms: result.ms,
      resource_use: null,
      deterministic_agreement: null,
      failure_reason: result.ok ? null : result.reasons.map((r) => r.split(":")[0]),
      human_acted: false,
    });
  }
  return receipts;
}
if (require.main === module)
  evaluate().then((receipts) => {
    process.stdout.write(`${JSON.stringify(receipts, null, 2)}\n`);
    if (
      receipts.some((r) =>
        r.failure_reason?.some((x) => ["request_failed", "timeout"].includes(x) || x.startsWith("http_")),
      )
    )
      process.exitCode = 1;
  });
module.exports = { evaluate };
