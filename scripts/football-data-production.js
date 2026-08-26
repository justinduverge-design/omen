#!/usr/bin/env node
"use strict";

const fs = require("node:fs/promises");
const {
  FIXED_CONTAINER_STATE_ROOT,
  captureProductionSet,
  importPhase3Evidence,
  parseArgs,
  publishAcceptance,
  recordProductionFailure,
  recoverPhase3Evidence,
  validateProductionBatch,
} = require("../src/services/footballData/productionRunner");

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  let result;
  if (options.command === "capture-set") {
    result = await captureProductionSet({ stateRoot: FIXED_CONTAINER_STATE_ROOT, season: options.season });
    result = { status: "captured", batch: result.batch, batch_path: result.batchPath };
  } else if (options.command === "validate-batch") {
    result = await validateProductionBatch({
      stateRoot: FIXED_CONTAINER_STATE_ROOT,
      batchId: options["batch-id"],
    });
    result = { status: result.receipt.status, receipt: result.receipt, receipt_path: result.receiptPath };
  } else if (options.command === "status") {
    process.stdout.write(await fs.readFile(`${FIXED_CONTAINER_STATE_ROOT}/exports/status.json`, "utf8"));
    return;
  } else if (options.command === "import-phase3") {
    result = await importPhase3Evidence({ stateRoot: FIXED_CONTAINER_STATE_ROOT });
  } else if (options.command === "recover-phase3") {
    result = await recoverPhase3Evidence({ stateRoot: FIXED_CONTAINER_STATE_ROOT });
  } else if (options.command === "publish") {
    result = await publishAcceptance({
      stateRoot: FIXED_CONTAINER_STATE_ROOT,
      acceptanceSha256: options["acceptance-sha256"],
      witnessObservation: options["witness-observation"],
    });
  } else {
    throw new Error("unsupported production command");
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  const command = process.argv[2];
  main().catch(async (error) => {
    try {
      await recordProductionFailure({ command, error });
    } catch {
      // Preserve the original bounded failure when the state filesystem itself is unavailable.
    }
    process.stderr.write(`football-data-production ${error.code || "ERROR"}: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { main };
