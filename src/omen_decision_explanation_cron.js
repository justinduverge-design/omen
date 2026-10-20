"use strict";

// Drains the decision-explanation queue with the local model on KVM2 (services/decisionExplanation.js).
// Shadow only: does nothing unless DECISION_EXPLANATIONS_MODE=shadow. Not scheduled yet; adding its
// timer is a separate approved step (infra/schedule/TIMERS.md).

const { logger } = require("./middleware/logging");
const { mode } = require("./services/decisionExplanation");
const { createDefaultDecisionExplanationStore } = require("./services/decisionExplanationStore");
const { drainOnce } = require("./services/decisionExplanationWorker");

async function main({ env = process.env } = {}) {
  if (mode(env) !== "shadow") {
    logger.info("Decision explanations off; nothing to do");
    return { skipped: "off" };
  }
  const summary = await drainOnce({
    store: createDefaultDecisionExplanationStore(env),
    limit: Number(env.DECISION_EXPLANATION_BATCH) || 50,
  });
  logger.info("Decision explanations drained", summary);
  return summary;
}

if (require.main === module) {
  const { traceCronJob } = require("./services/telemetry");
  traceCronJob("decision_explanations", main).catch((error) => {
    logger.error("Decision explanation drain failed", { code: error.code || "failure" });
    process.exit(1);
  });
}

module.exports = { main };
