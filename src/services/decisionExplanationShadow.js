"use strict";

/**
 * Request-side shadow hook for decision explanations. In shadow mode it queues the decision's facts
 * for the background writer and logs whether an explanation already exists. It never changes the
 * response, never waits on the model, and never throws into the caller.
 */

const { buildExplanationInput, mode, VERSION } = require("./decisionExplanation");
const {
  createDefaultDecisionExplanationStore,
  getBounded,
  BOUNDED_BUDGET_MS,
  RESULT_TTL_SECONDS,
} = require("./decisionExplanationStore");
let defaultLogger = null;
const defaultLog = () => defaultLogger || require("../middleware/logging").logger;
function setDefaultLogger(logger) {
  defaultLogger = logger;
}

let defaultStore = null;
const storeFor = () => (defaultStore ||= createDefaultDecisionExplanationStore());

function isRecordValid(record, input, { now = Date.now, ttlMs = RESULT_TTL_SECONDS * 1000 } = {}) {
  if (!record || typeof record !== "object") return false;
  if (record.version !== input.version) return false;
  if (record.expired === true) return false;
  const currentTime = typeof now === "function" ? now() : Number(now) || Date.now();
  if (record.expires_at) {
    const expiresAt = new Date(record.expires_at).getTime();
    if (!Number.isNaN(expiresAt) && currentTime >= expiresAt) return false;
  }
  const createdAt = record.created_at || record.timestamp;
  if (createdAt) {
    const createdTime = new Date(createdAt).getTime();
    if (!Number.isNaN(createdTime) && (currentTime - createdTime > ttlMs || currentTime < createdTime)) {
      return false;
    }
  }
  return true;
}

/**
 * @param {{type:string, decision:string, why:Array}} args
 * @param {{env?:object, store?:object, budgetMs?:number, log?:object, now?:Function|number, ttlMs?:number}} [deps]
 * @returns {Promise<string|null>}
 */
async function getLiveDecisionExplanation(
  args,
  { env = process.env, store, budgetMs = BOUNDED_BUDGET_MS, log, now, ttlMs } = {},
) {
  if (mode(env) !== "live") return null;
  const input = buildExplanationInput(args);
  if (!input) return null;

  const target = store || storeFor();

  let record;
  try {
    record =
      typeof target.getBounded === "function"
        ? await target.getBounded(input.hash, budgetMs, { log })
        : await getBounded(target, input.hash, budgetMs, { log });
  } catch (error) {
    (log || defaultLog()).warn("decision explanation live read failed", { error: error?.message });
    return null;
  }

  if (record === "not ready") {
    return null;
  }

  if (!record) {
    Promise.resolve()
      .then(() => target.enqueue(input))
      .catch(() => {});
    return null;
  }

  if (record.ok === false) {
    return null;
  }

  if (!isRecordValid(record, input, { now, ttlMs })) {
    return null;
  }

  if (record.ok === true && typeof record.text === "string") {
    return record.text;
  }

  return null;
}

/**
 * @param {{type:string, decision:string, why:Array}} args
 * @param {{env?:object, store?:object, log?:object}} [deps]
 * @returns {Promise<"off"|"skipped"|"queued"|"available"|"rejected"|"pending"|"error">}
 */
async function shadowDecisionExplanation(args, { env = process.env, store, log } = {}) {
  const currentMode = mode(env);
  if (currentMode !== "shadow" && currentMode !== "live") return "off";
  try {
    const input = buildExplanationInput(args);
    if (!input) return "skipped";
    const target = store || storeFor();
    const existing = await target.get(input.hash);
    let state;
    if (existing) state = existing.ok ? "available" : "rejected";
    else state = (await target.enqueue(input)) ? "queued" : "pending";
    (log || defaultLog()).info("decision explanation shadow", {
      type: input.type,
      state,
      hash: input.hash.slice(0, 12),
    });
    return state;
  } catch (error) {
    (log || defaultLog()).warn("decision explanation shadow failed", { error: error?.message });
    return "error";
  }
}

/** Fire-and-forget form for request handlers. */
function queueDecisionExplanation(args, deps) {
  const currentMode = mode(deps?.env || process.env);
  if (currentMode !== "shadow" && currentMode !== "live") return;
  shadowDecisionExplanation(args, deps).catch(() => {});
}

function setDefaultDecisionExplanationStore(store) {
  defaultStore = store;
}

module.exports = {
  shadowDecisionExplanation,
  queueDecisionExplanation,
  getLiveDecisionExplanation,
  setDefaultDecisionExplanationStore,
  setDefaultLogger,
};
