"use strict";

const { parseWarehouseRuntimeConfig } = require("./runtimeConfig");
const { createWarehousePool, createCurrentSeasonComposition, createCurrentSeasonValidationComposition } = require("./currentSeasonComposition");
const { verifyWarehouseTarget } = require("./targetIdentity");
const { createDerivedStages } = require("./derivedStages");

const MODES = new Set(["config", "source-validate", "ingest"]);

function parseArgs(argv = []) {
  if (!Array.isArray(argv)) throw new TypeError("argv must be an array");
  if (!argv.length) return { mode: "config", season: null };
  const [mode, ...rest] = argv;
  if (!MODES.has(mode)) throw new TypeError("mode must be config, source-validate, or ingest");
  if (mode === "config" && rest.length) throw new TypeError("config mode accepts no arguments");
  if (mode === "config") return { mode, season: null };
  if (rest.length !== 2 || rest[0] !== "--season" || !/^\d{4}$/.test(rest[1])) {
    throw new TypeError(`${mode} requires --season YYYY`);
  }
  const season = Number(rest[1]);
  if (season < 1999 || season > 2100) throw new TypeError("season must be an integer from 1999 through 2100");
  return { mode, season };
}

function safeCode(error) {
  return typeof error?.code === "string" && /^[a-z0-9_]{1,64}$/.test(error.code)
    ? error.code : "warehouse_command_failed";
}

function withDeadline(promise, timeoutMs) {
  let timer;
  const deadline = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error("shutdown timed out"), { code: "shutdown_timeout" })), timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), deadline]).finally(() => clearTimeout(timer));
}

async function runCurrentSeasonCommand({
  argv = [], env = process.env, Pool, output = () => {}, signalSource = process,
  parseConfig = parseWarehouseRuntimeConfig, createPool = createWarehousePool,
  createIngest = createCurrentSeasonComposition,
  createValidation = createCurrentSeasonValidationComposition,
  verifyTarget = verifyWarehouseTarget,
  createDerived = ({ pool, mode }) => createDerivedStages({ pool, mode }),
} = {}) {
  const args = parseArgs(argv);
  const config = parseConfig({ env, requireDatabase: args.mode === "ingest" });
  if (args.mode === "config") {
    const result = { job: "football-warehouse-current-season", mode: args.mode, state: "validated" };
    output(result); return result;
  }

  const controller = new AbortController();
  let interrupted = false;
  const onSignal = () => { interrupted = true; controller.abort(); };
  signalSource.once("SIGINT", onSignal);
  signalSource.once("SIGTERM", onSignal);
  let pool;
  let primaryError;
  let completedResult;
  try {
    if (args.mode === "source-validate") {
      const runner = createValidation({ acquisitionTimeoutMs: config.acquisitionTimeoutMs });
      const summary = await runner.run({ season: args.season, mode: "validate", signal: controller.signal });
      if (interrupted) throw Object.assign(new Error("interrupted"), { code: "interrupted" });
      const result = { job: "football-warehouse-current-season", state: "validated", ...summary };
      output(result); return result;
    }
    if (env.FOOTBALL_WAREHOUSE_INGEST_ENABLED !== "true") {
      throw Object.assign(new Error("ingest is disabled"), { code: "ingest_disabled" });
    }
    pool = createPool({ Pool, config });
    pool.on("error", onSignal);
    await verifyTarget({ pool, expectedDatabase: config.expectedDatabase, expectedRole: config.expectedRole });
    const runner = createIngest({ pool, acquisitionTimeoutMs: config.acquisitionTimeoutMs });
    const summary = await runner.run({ season: args.season, mode: "ingest", signal: controller.signal });
    if (interrupted) throw Object.assign(new Error("interrupted"), { code: "interrupted" });
    // Opt-in: derived stages (opportunity table, RAT-QB v0) read the facts just committed above.
    const derived = env.FOOTBALL_WAREHOUSE_DERIVED_ENABLED === "true"
      ? await createDerived({ pool, mode: env.FOOTBALL_WAREHOUSE_DERIVED_FAILURE_MODE === "report" ? "report" : "strict" }).run({ season: args.season }) : undefined;
    if (interrupted) throw Object.assign(new Error("interrupted"), { code: "interrupted" });
    completedResult = { job: "football-warehouse-current-season", state: "succeeded", ...summary, ...(derived ? { derived } : {}) };
  } catch (error) {
    primaryError = error;
    output({ job: "football-warehouse-current-season", mode: args.mode, season: args.season, state: "failed", code: safeCode(error) });
    throw error;
  } finally {
    signalSource.removeListener("SIGINT", onSignal);
    signalSource.removeListener("SIGTERM", onSignal);
    if (pool) {
      pool.removeListener?.("error", onSignal);
      try { await withDeadline(pool.end(), config.shutdownTimeoutMillis); } catch (error) {
        if (!primaryError) {
          output({ job: "football-warehouse-current-season", mode: args.mode, season: args.season, state: "failed", code: safeCode(error) });
          throw error;
        }
      }
    }
  }
  output(completedResult);
  return completedResult;
}

module.exports = { parseArgs, runCurrentSeasonCommand, safeCode, withDeadline };
