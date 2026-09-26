#!/usr/bin/env node
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const {
  ArtifactRegistryError,
  createLocalArtifactRegistry,
} = require("../src/services/footballIntelligence");

function usage() {
  return [
    "Usage:",
    "  node scripts/football-intelligence-artifacts.js register --root <dir> --file <artifact> --metadata <json>",
    "  node scripts/football-intelligence-artifacts.js index --root <dir>",
    "  node scripts/football-intelligence-artifacts.js verify --root <dir> --artifact <sha256:id>",
    "",
    "Metadata is the registerSourceArtifact object without the bytes field.",
    "All commands require an explicit local root and refuse /var/lib/omen-football-intelligence.",
  ].join("\n");
}

function parse(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index];
    const value = rest[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error(usage());
    options[key.slice(2)] = value;
  }
  if (!command || !options.root) throw new Error(usage());
  return { command, options };
}

async function main() {
  const { command, options } = parse(process.argv.slice(2));
  const registry = createLocalArtifactRegistry({ root: path.resolve(options.root) });
  if (command === "register") {
    if (!options.file || !options.metadata) throw new Error(usage());
    const [bytes, metadataBytes] = await Promise.all([
      fs.readFile(path.resolve(options.file)),
      fs.readFile(path.resolve(options.metadata), "utf8"),
    ]);
    const metadata = JSON.parse(metadataBytes);
    const result = await registry.registerSourceArtifact({ ...metadata, bytes });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (command === "index") {
    process.stdout.write(`${JSON.stringify(await registry.rebuildIndex(), null, 2)}\n`);
    return;
  }
  if (command === "verify") {
    if (!options.artifact) throw new Error(usage());
    const bytes = await registry.readArtifact(options.artifact);
    process.stdout.write(`${JSON.stringify({ artifact_id: options.artifact, byte_length: bytes.length, verified: true })}\n`);
    return;
  }
  throw new Error(usage());
}

main().catch((error) => {
  const code = error instanceof ArtifactRegistryError ? error.code : "INVALID_COMMAND";
  process.stderr.write(`${code}: ${error.message}\n`);
  process.exitCode = 1;
});
