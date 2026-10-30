#!/usr/bin/env node
/**
 * Assesses football-data production readiness from a sanitized evidence file and prints
 * the verdict as JSON. Fail-closed: anything missing or unproven reads as not ready, so
 * the go-live call rests on evidence rather than on a feeling.
 */
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { CliArgsError, parseCliArgs } = require("./lib/cli-args");

const { buildProductionReadinessAssessment } = require("../src/services/footballData/productionReadiness");

const USAGE = "Usage: node scripts/football-data-readiness.js assess --evidence <sanitized-json>";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (command !== "assess") throw new Error(USAGE);
  try {
    const { values, positionals } = parseCliArgs(rest, { evidence: { type: "string" } });
    if (positionals.length || !values.evidence) throw new Error(USAGE);
    return { command, evidence: path.resolve(values.evidence) };
  } catch (error) {
    if (error instanceof CliArgsError) throw new Error(USAGE);
    throw error;
  }
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
