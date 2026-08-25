#!/usr/bin/env node
"use strict";

const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const path = require("node:path");
const {
  recoverPrimaryEvidence,
  runFailureInjectionMatrix,
  stageShadowAcceptance,
} = require("../src/services/footballData/stagingShadow");

const USAGE = `Usage:
  node scripts/football-data-staging.js stage --acceptance <exact-path> --receipt <exact-path> --primary-root <local-path> --witness-root <local-path> --backup-root <local-path>
  node scripts/football-data-staging.js recover --hash <exact-sha256> --backup-root <local-path> --recovery-root <local-path> --witness-observation <exact-path>
  node scripts/football-data-staging.js drill --acceptance <exact-path>

This is a local, non-production staging-shadow operator. It requires explicit,
disjoint role roots and never publishes, promotes, deploys, schedules, or writes
to a database. The drill command uses labeled synthetic failure injection.`;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") return { command: "help" };
  const options = { command };
  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (!key.startsWith("--") || !rest[index + 1] || rest[index + 1].startsWith("--")) {
      throw new Error(`invalid argument near ${key}`);
    }
    const name = key.slice(2);
    if (Object.hasOwn(options, name)) throw new Error(`duplicate option --${name}`);
    options[name] = rest[index + 1];
    index += 1;
  }
  return options;
}

function requireOnly(options, required, allowed) {
  for (const key of required) {
    if (!options[key]) throw new Error(`missing required option --${key}`);
  }
  for (const key of Object.keys(options)) {
    if (!allowed.includes(key)) throw new Error(`unsupported option --${key}`);
  }
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.command === "help") {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  if (options.command === "stage") {
    requireOnly(options,
      ["acceptance", "receipt", "primary-root", "witness-root", "backup-root"],
      ["command", "acceptance", "receipt", "primary-root", "witness-root", "backup-root"]);
    const [acceptanceBytes, receiptBytes] = await Promise.all([
      fs.readFile(path.resolve(options.acceptance)),
      fs.readFile(path.resolve(options.receipt)),
    ]);
    const result = await stageShadowAcceptance({
      acceptanceBytes,
      receiptBytes,
      primaryRoot: path.resolve(options["primary-root"]),
      witnessRoot: path.resolve(options["witness-root"]),
      backupRoot: path.resolve(options["backup-root"]),
    });
    process.stdout.write(`${JSON.stringify({
      status: result.receipt.status,
      acceptance_sha256: result.acceptanceHash,
      publication_authorized: false,
      primary_evidence_path: result.primaryEvidencePath,
      backup_evidence_path: result.backupEvidencePath,
      witness_observation_path: result.witnessObservationPath,
      staging_receipt_path: result.stagingReceiptPath,
    }, null, 2)}\n`);
    return;
  }

  if (options.command === "recover") {
    requireOnly(options,
      ["hash", "backup-root", "recovery-root", "witness-observation"],
      ["command", "hash", "backup-root", "recovery-root", "witness-observation"]);
    const result = await recoverPrimaryEvidence({
      acceptanceHash: options.hash,
      backupRoot: path.resolve(options["backup-root"]),
      recoveryRoot: path.resolve(options["recovery-root"]),
      witnessObservationPath: path.resolve(options["witness-observation"]),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (options.command === "drill") {
    requireOnly(options, ["acceptance"], ["command", "acceptance"]);
    const acceptanceBytes = await fs.readFile(path.resolve(options.acceptance));
    const acceptance = JSON.parse(acceptanceBytes.toString("utf8"));
    const acceptanceHash = crypto.createHash("sha256").update(acceptanceBytes).digest("hex");
    process.stdout.write(`${JSON.stringify(runFailureInjectionMatrix({ acceptance, acceptanceHash }), null, 2)}\n`);
    return;
  }

  throw new Error(`unknown command ${options.command}`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`football-data-staging ${error.code || "ERROR"}: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { main, parseArgs };
