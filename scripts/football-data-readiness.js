#!/usr/bin/env node
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const {
  buildProductionReadinessAssessment,
} = require("../src/services/footballData/productionReadiness");

const USAGE = "Usage: node scripts/football-data-readiness.js assess --evidence <sanitized-json>";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (command !== "assess") throw new Error(USAGE);
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (flag !== "--evidence" || !value || options.evidence) throw new Error(USAGE);
    options.evidence = path.resolve(value);
  }
  if (!options.evidence || rest.length !== 2) throw new Error(USAGE);
  return { command, ...options };
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const input = JSON.parse(await fs.readFile(options.evidence, "utf8"));
  if (input.schema !== "omen-football-production-readiness-input.v1") {
    throw new Error("Evidence must use schema omen-football-production-readiness-input.v1");
  }
  const result = buildProductionReadinessAssessment({
    phase3: input.phase3,
    hosts: input.hosts,
    infrastructure: input.infrastructure || null,
    a4: input.a4 || null,
    alertCodes: input.alert_codes,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { main, parseArgs };
