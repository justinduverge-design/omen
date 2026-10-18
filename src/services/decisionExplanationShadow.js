"use strict";

/**
 * Request-side shadow hook for decision explanations. In shadow mode it queues the decision's facts
 * for the background writer and logs whether an explanation already exists. It never changes the
 * response, never waits on the model, and never throws into the caller.
 */

const { buildExplanationInput, mode } = require("./decisionExplanation");
const { createDefaultDecisionExplanationStore } = require("./decisionExplanationStore");
// Lazy, like tradeSearchPool.js: keeps this module loadable in tests without the logger stack.
const defaultLog = () => require("../middleware/logging").logger;

let defaultStore = null;
const storeFor = () => (defaultStore ||= createDefaultDecisionExplanationStore());

/**
 * @param {{type:string, decision:string, why:Array}} args
 * @param {{env?:object, store?:object, log?:object}} [deps]
 * @returns {Promise<"off"|"skipped"|"queued"|"available"|"rejected"|"pending"|"error">}
 */
async function shadowDecisionExplanation(args, { env = process.env, store, log } = {}) {
  if (mode(env) !== "shadow") return "off";
  try {
    const input = buildExplanationInput(args);
    if (!input) return "skipped";
    const target = store || storeFor();
    const existing = await target.get(input.hash);
    let state;
    if (existing) state = existing.ok ? "available" : "rejected";
    else state = (await target.enqueue(input)) ? "queued" : "pending";
    (log || defaultLog()).info("decision explanation shadow", { type: input.type, state, hash: input.hash.slice(0, 12) });
    return state;
  } catch (error) {
    (log || defaultLog()).warn("decision explanation shadow failed", { error: error?.message });
    return "error";
  }
}

/** Fire-and-forget form for request handlers. */
function queueDecisionExplanation(args, deps) {
  if (mode(deps?.env || process.env) !== "shadow") return;
  shadowDecisionExplanation(args, deps).catch(() => {});
}

module.exports = { shadowDecisionExplanation, queueDecisionExplanation };
