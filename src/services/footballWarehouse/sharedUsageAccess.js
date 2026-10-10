"use strict";

/**
 * Lazily-built, fail-safe access to the usage reader and the warehouse read runtime for services
 * outside the Start/Sit route (the Omen call and Waiver Analysis).
 *
 * Nothing here can throw into a caller: if the runtime cannot be built (for example warehouse mode
 * with a bad credential, which the startup check already reports), access is simply unavailable and
 * the caller keeps today's behavior. FOOTBALL_DATA_MODE handling is unchanged: the mode is read
 * through the same readRuntime code the Start/Sit route uses.
 */

const { createFailSafeWarehouseReadRuntime } = require("./readRuntime");
const { createUsageShadowRunner } = require("./usageShadow");
const { getWarehouseUsageBundle } = require("./warehouseUsageBundle");
const { getUsageBundle } = require("../playerUsage");

let runtime; // undefined = not built yet
let failure = null; // the startup error, kept so strict callers fail closed exactly as before
let reader;

/**
 * The one warehouse read runtime for the process (one pool). Lenient callers get null when it could
 * not be built; strict callers (the Start/Sit route, which fails closed in warehouse mode) get the
 * original error rethrown. A configuration failure is logged once.
 */
function getRuntime({ logger, strict = false } = {}) {
  if (runtime === undefined) {
    try {
      const { Pool } = require("pg");
      runtime = createFailSafeWarehouseReadRuntime({
        Pool,
        onShadowUnavailable: (event) => { try { logger?.warn?.("Football warehouse reader unavailable", event); } catch {} },
      });
    } catch (error) {
      runtime = null;
      failure = error;
      try { logger?.warn?.("Football warehouse reader failed to configure", { event: "football_warehouse_read_startup", outcome: "unavailable" }); } catch {}
    }
  }
  if (runtime === null && strict) throw failure;
  return runtime;
}

async function closeRuntime() {
  const current = runtime;
  runtime = undefined; failure = null; reader = undefined;
  if (current) await current.close();
}

/** { mode, read({ mode, input }) } over the legacy-authoritative usage reader, or null when unavailable. */
function getUsageReader({ logger } = {}) {
  const rt = getRuntime({ logger });
  if (!rt) return null;
  if (!reader) {
    reader = createUsageShadowRunner({
      readLegacy: (input) => getUsageBundle(input),
      readWarehouse: (input) => getWarehouseUsageBundle({ ...input, repository: rt.repository }),
      emitTelemetry: (event) => { try { logger?.info?.("Football warehouse usage shadow", event); } catch {} },
    });
  }
  return { mode: rt.mode, read: (args) => reader.read(args) };
}

function _reset() { runtime = undefined; failure = null; reader = undefined; }

module.exports = { getRuntime, getUsageReader, closeRuntime, _reset };
