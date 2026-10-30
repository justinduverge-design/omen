#!/usr/bin/env node
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { CliArgsError, parseCliArgs } = require("./lib/cli-args");

const { validateAcceptanceArtifact } = require("../src/services/footballData/acceptanceValidator");

function parseArgs(argv) {
  let options;
  try {
    options = parseCliArgs(argv, { acceptance: { type: "string" }, receipt: { type: "string" } }).values;
  } catch (error) {
    if (!(error instanceof CliArgsError)) throw error;
    if (error.reason === "duplicate") throw new Error(`duplicate option ${error.argument}`);
    if (error.reason === "unknown") throw new Error(`unsupported option ${error.argument}`);
    throw new Error(`invalid argument near ${error.argument}`);
  }
  for (const required of ["acceptance", "receipt"]) {
    if (!options[required]) throw new Error(`missing required option --${required}`);
  }
  return options;
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const [acceptanceBytes, receiptBytes] = await Promise.all([
    fs.readFile(path.resolve(options.acceptance)),
    fs.readFile(path.resolve(options.receipt)),
  ]);
  const validation = validateAcceptanceArtifact({ acceptanceBytes, receiptBytes });
  process.stdout.write(`${JSON.stringify(validation, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`football-data-validation ${error.code || "ERROR"}: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { main, parseArgs };
