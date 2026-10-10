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

let runtime; // undefined = not built yet, null = unavailable
let reader;

function getRuntime({ logger } = {}) {
  if (runtime !== undefined) return runtime;
  try {
    const { Pool } = require("pg");
    runtime = createFailSafeWarehouseReadRuntime({
      Pool,
      onShadowUnavailable: (event) => { try { logger?.warn?.("Football warehouse reader unavailable", event); } catch {} },
    });
  } catch {
    runtime = null;
  }
  return runtime;
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

function _reset() { runtime = undefined; reader = undefined; }

module.exports = { getRuntime, getUsageReader, _reset };
