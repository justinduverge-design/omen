#!/usr/bin/env node

/**
 * Validate the intentionally small, repository-owned Probo YAML subset.
 * This is not a compliance certification or a general YAML parser. It checks
 * the fields Omen requires so the machine manifest cannot silently drift from
 * its evidence contract.
 */
const fs = require("node:fs");
const path = require("node:path");

const repo = path.resolve(__dirname, "..");
const manifestPath = path.join(repo, "probo.yaml");
const source = fs.readFileSync(manifestPath, "utf8");
const errors = [];

function scalar(key, block) {
  const match = block.match(new RegExp(`^\\s{4}${key}:\\s*(.+?)\\s*$`, "m"));
  if (!match) return null;
  const value = match[1].trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\\\\"/g, '"');
  }
  return value;
}

if (!/^manifest_version:\s*2\s*$/m.test(source)) errors.push("manifest_version must be 2");
if (!/^framework:\s*"gdpr_soc2_hybrid"\s*$/m.test(source)) errors.push("framework must be declared");

const blocks = source.split(/^  - id: /m).slice(1).map((tail) => {
  const idMatch = tail.match(/^"([^"]+)"/);
  return idMatch ? { 0: `  - id: ${tail}`, 1: idMatch[1] } : null;
}).filter(Boolean);
if (blocks.length === 0) errors.push("no controls found");
const ids = new Set();
const statuses = new Set(["designed", "implemented", "tested", "operating", "stale", "failed", "independently_assessed", "not_applicable"]);

for (const match of blocks) {
  const id = match[1];
  const block = match[0];
  if (ids.has(id)) errors.push(`duplicate control id: ${id}`);
  ids.add(id);
  for (const key of ["name", "description", "evidence_path", "check", "owner", "status", "evidence_type", "evidence_freshness_days", "last_reviewed", "next_review"]) {
    if (!scalar(key, block)) errors.push(`${id} missing ${key}`);
  }
  const status = scalar("status", block);
  if (status && !statuses.has(status)) errors.push(`${id} has unknown status: ${status}`);
  const freshness = Number(scalar("evidence_freshness_days", block));
  if (!Number.isInteger(freshness) || freshness <= 0) errors.push(`${id} evidence_freshness_days must be a positive integer`);
  for (const key of ["last_reviewed", "next_review"]) {
    const value = scalar(key, block);
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors.push(`${id} ${key} must be YYYY-MM-DD`);
  }
  const evidence = scalar("evidence_path", block);
  if (evidence && !fs.existsSync(path.join(repo, evidence))) errors.push(`${id} evidence path missing: ${evidence}`);
}

const tracker = fs.readFileSync(path.join(repo, "Blueprints/security-privacy.md"), "utf8");
for (const id of ["CC6.1", "GDPR_ART_17", "GDPR_ART_5", "CC7.2", "OMEN-ESP-01", "OMEN-MIG-01", "OMEN-RET-01", "OMEN-DR-01"]) {
  if (!source.includes(`id: "${id}"`)) errors.push(`manifest missing tracker control: ${id}`);
}
if (!/ESPN recovery privacy rules/i.test(tracker)) errors.push("tracker ESPN recovery control reference missing");

if (errors.length) {
  console.error(`Probo manifest invalid (${errors.length} error${errors.length === 1 ? "" : "s"})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Probo manifest valid: ${blocks.length} controls`);
}
