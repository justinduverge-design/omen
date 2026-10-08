"use strict";

const { compareUsageBundles } = require("./usageComparison");

const MODES = new Set(["supabase", "shadow", "warehouse"]);
const DEFAULT_SHADOW_TIMEOUT_MS = 250;

function timeoutMs(value) {
  if (!Number.isInteger(value) || value < 10 || value > 5_000) {
    throw new TypeError("shadowTimeoutMs must be an integer from 10 through 5000");
  }
  return value;
}

function bounded(operation, milliseconds) {
  let timer;
  return Promise.race([
    Promise.resolve().then(operation),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error("warehouse shadow timed out"), { code: "shadow_timeout" })), milliseconds);
      timer.unref?.();
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * Coordinates usage reads without knowing request, user, league, provider, or player identity.
 * Shadow work is detached from the legacy response and reports aggregate comparison counters only.
 */
function createUsageShadowRunner({
  readLegacy,
  readWarehouse,
  emitTelemetry = () => {},
  compare = compareUsageBundles,
  shadowTimeoutMs = DEFAULT_SHADOW_TIMEOUT_MS,
}) {
  if (typeof readLegacy !== "function") throw new TypeError("readLegacy must be a function");
  if (typeof readWarehouse !== "function") throw new TypeError("readWarehouse must be a function");
  if (typeof emitTelemetry !== "function") throw new TypeError("emitTelemetry must be a function");
  if (typeof compare !== "function") throw new TypeError("compare must be a function");
  const budget = timeoutMs(shadowTimeoutMs);
  const pending = new Set();

  function emit(event) {
    try { emitTelemetry(Object.freeze({ event: "football_warehouse_usage_shadow", ...event })); } catch {}
  }

  function observe(legacyPromise, warehouseOperation) {
    const warehousePromise = bounded(warehouseOperation, budget);
    const task = Promise.all([legacyPromise, warehousePromise])
      .then(([legacy, warehouse]) => emit(compare(legacy, warehouse)))
      .catch((error) => emit({ outcome: error?.code === "shadow_timeout" ? "timeout" : "failure" }))
      .finally(() => pending.delete(task));
    pending.add(task);
  }

  return {
    async read({ mode, input }) {
      if (!MODES.has(mode)) throw new TypeError("mode must be supabase, shadow, or warehouse");
      if (mode === "warehouse") return readWarehouse(input); // fail closed: never blend or fall back
      const legacyPromise = Promise.resolve().then(() => readLegacy(input));
      if (mode === "shadow") {
        observe(legacyPromise, () => readWarehouse(input));
      }
      return legacyPromise;
    },
    async drain() { await Promise.allSettled([...pending]); },
  };
}

module.exports = { createUsageShadowRunner, DEFAULT_SHADOW_TIMEOUT_MS };
