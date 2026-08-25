#!/usr/bin/env node
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const { validateAcceptanceArtifact } = require("../src/services/footballData/acceptanceValidator");

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error(`invalid argument near ${key || "(missing)"}`);
    }
    const name = key.slice(2);
    if (Object.hasOwn(options, name)) throw new Error(`duplicate option --${name}`);
    options[name] = value;
  }
  for (const required of ["acceptance", "receipt"]) {
    if (!options[required]) throw new Error(`missing required option --${required}`);
  }
  for (const name of Object.keys(options)) {
    if (!["acceptance", "receipt"].includes(name)) throw new Error(`unsupported option --${name}`);
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
