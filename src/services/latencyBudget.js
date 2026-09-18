"use strict";

/**
 * A small request-path budget primitive. The caller owns the user-visible
 * fallback; this module only makes a slow optional dependency distinguishable
 * from an ordinary dependency failure.
 */
class LatencyBudgetExceeded extends Error {
  constructor(stage, timeoutMs) {
    super(`${stage} exceeded its ${timeoutMs}ms latency budget`);
    this.name = "LatencyBudgetExceeded";
    this.code = "latency_budget_exceeded";
    this.stage = stage;
    this.timeout_ms = timeoutMs;
  }
}

function isLatencyBudgetExceeded(error) {
  return error instanceof LatencyBudgetExceeded || error?.code === "latency_budget_exceeded";
}

/**
 * Run an operation within a bounded request budget.
 *
 * Operations that accept the supplied AbortSignal can stop their own network
 * work when the budget expires. Existing provider adapters that cannot accept
 * a signal still stop blocking the Omen response; their eventual resolution is
 * intentionally ignored by this request.
 */
async function withinLatencyBudget(stage, timeoutMs, operation) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("timeoutMs must be a positive finite number");
  }
  if (typeof operation !== "function") throw new TypeError("operation must be a function");

  const controller = new AbortController();
  let timer = null;
  try {
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new LatencyBudgetExceeded(stage, timeoutMs));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

module.exports = {
  LatencyBudgetExceeded,
  isLatencyBudgetExceeded,
  withinLatencyBudget,
};
