#!/usr/bin/env node
"use strict";

const path = require("node:path");
const {
  captureSnapshot,
  replaySnapshot,
} = require("../src/services/footballData/rawVault");

const USAGE = `Usage:
  node scripts/football-data.js capture --dataset stats_player --season <year> --root <local-path>
  node scripts/football-data.js replay --root <local-path> --manifest <exact-manifest-path> --out <local-path>

Phase 1 is local and non-production only. It has no scheduler, credentials,
database, publication, production-root, or "latest" replay mode.`;

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

  if (options.command === "capture") {
    requireOnly(options, ["dataset", "season", "root"], ["command", "dataset", "season", "root"]);
    const result = await captureSnapshot({
      dataset: options.dataset,
      season: options.season,
      root: path.resolve(options.root),
    });
    process.stdout.write(`${JSON.stringify({
      status: "captured",
      snapshot_id: result.manifest.snapshot_id,
      raw_sha256: result.manifest.raw.sha256,
      raw_byte_length: result.manifest.raw.byte_length,
      raw_created: result.rawCreated,
      manifest_path: result.manifestPath,
    }, null, 2)}\n`);
    return;
  }

  if (options.command === "replay") {
    requireOnly(options, ["root", "manifest", "out"], ["command", "root", "manifest", "out"]);
    const result = await replaySnapshot({
      root: path.resolve(options.root),
      manifestPath: options.manifest,
      outputRoot: path.resolve(options.out),
    });
    process.stdout.write(`${JSON.stringify({
      status: "verified",
      snapshot_id: result.receipt.snapshot_id,
      manifest_sha256: result.receipt.manifest_sha256,
      raw_sha256: result.receipt.raw_sha256,
      promoted: false,
      receipt_path: result.receiptPath,
    }, null, 2)}\n`);
    return;
  }

  throw new Error(`unknown command ${options.command}`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`football-data ${error.code || "ERROR"}: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { main, parseArgs };
