#!/usr/bin/env node
/**
 * A7B staging shadow: stages an accepted scoring artifact into disjoint primary, witness
 * and backup roots, recovers from a backup, or runs the labeled failure-injection drill.
 * Local and non-production only; it proves recovery before production depends on it.
 */
"use strict";

const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const path = require("node:path");
const { CliArgsError, parseCliArgs } = require("./lib/cli-args");
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

// Every option any subcommand takes; main() narrows them per subcommand.
const OPTIONS = Object.fromEntries(
  [
    "acceptance",
    "receipt",
    "primary-root",
    "witness-root",
    "backup-root",
    "hash",
    "recovery-root",
    "witness-observation",
  ].map((name) => [name, { type: "string" }]),
);

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") return { command: "help" };
  try {
    const { values, positionals } = parseCliArgs(rest, OPTIONS);
    if (positionals.length) throw new CliArgsError("positional", positionals[0]);
    return { command, ...values };
  } catch (error) {
    if (!(error instanceof CliArgsError)) throw error;
    if (error.reason === "duplicate") throw new Error(`duplicate option ${error.argument}`);
    if (error.reason === "unknown") throw new Error(`unsupported option ${error.argument}`);
    throw new Error(`invalid argument near ${error.argument}`);
  }
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
    requireOnly(
      options,
      ["acceptance", "receipt", "primary-root", "witness-root", "backup-root"],
      ["command", "acceptance", "receipt", "primary-root", "witness-root", "backup-root"],
    );
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
    process.stdout.write(
      `${JSON.stringify(
        {
          status: result.receipt.status,
          acceptance_sha256: result.acceptanceHash,
          publication_authorized: false,
          primary_evidence_path: result.primaryEvidencePath,
          backup_evidence_path: result.backupEvidencePath,
          witness_observation_path: result.witnessObservationPath,
          staging_receipt_path: result.stagingReceiptPath,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  if (options.command === "recover") {
    requireOnly(
      options,
      ["hash", "backup-root", "recovery-root", "witness-observation"],
      ["command", "hash", "backup-root", "recovery-root", "witness-observation"],
    );
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
