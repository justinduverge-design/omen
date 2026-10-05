#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const VERSION = "omen-football-warehouse-backup.v1";
const SHA256 = /^[a-f0-9]{64}$/;
const STATES = new Set(["created"]);
const REQUIRED_ROW_COUNTS = Object.freeze([
  "football_teams", "football_players", "nfl_games", "nfl_player_weekly_stats",
  "nfl_team_weekly_stats", "nfl_weekly_rosters", "nfl_plays",
]);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function assertObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("invalid_manifest", `${name} must be an object`);
}

function validateManifest(manifest) {
  assertObject(manifest, "manifest");
  if (manifest.contract_version !== VERSION) fail("invalid_manifest", "unsupported contract version");
  if (!STATES.has(manifest.state)) fail("invalid_manifest", "invalid state");
  if (!/^postgres:17(?:\.|$)/.test(manifest.postgres_version)) fail("invalid_manifest", "PostgreSQL 17 is required");
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(manifest.backup_run_id || "")) fail("invalid_manifest", "invalid backup run id");
  if (!Number.isSafeInteger(manifest.schema_version) || manifest.schema_version < 1) fail("invalid_manifest", "invalid schema version");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(manifest.created_at)) fail("invalid_manifest", "invalid created_at");
  assertObject(manifest.dump, "dump");
  if (!SHA256.test(manifest.dump.sha256) || !Number.isSafeInteger(manifest.dump.bytes) || manifest.dump.bytes < 1) fail("invalid_manifest", "invalid dump evidence");
  if (typeof manifest.dump.filename !== "string" || path.basename(manifest.dump.filename) !== manifest.dump.filename) fail("invalid_manifest", "dump filename must be a basename");
  assertObject(manifest.receipts, "receipts");
  if (!Number.isSafeInteger(manifest.receipts.succeeded) || manifest.receipts.succeeded < 0 || !Number.isSafeInteger(manifest.receipts.started) || manifest.receipts.started < 0) fail("invalid_manifest", "invalid receipt counts");
  if (manifest.receipts.started !== 0) fail("backup_not_ready", "started receipts must be zero");
  if (manifest.receipts.succeeded < 1) fail("backup_not_ready", "at least one succeeded receipt is required");
  assertObject(manifest.row_counts, "row_counts");
  if (Object.keys(manifest.row_counts).length !== REQUIRED_ROW_COUNTS.length || REQUIRED_ROW_COUNTS.some((table) => !(table in manifest.row_counts))) fail("invalid_manifest", "required row counts are missing");
  for (const [table, count] of Object.entries(manifest.row_counts)) {
    if (!/^[a-z][a-z0-9_]*$/.test(table) || !Number.isSafeInteger(count) || count < 0) fail("invalid_manifest", "invalid row count");
  }
  for (const table of REQUIRED_ROW_COUNTS.filter((name) => name !== "nfl_plays")) if (manifest.row_counts[table] < 1) fail("backup_not_ready", `${table} must contain data`);
  if (!Array.isArray(manifest.restic_tags) || !manifest.restic_tags.includes("omen-football-warehouse") || manifest.restic_tags.some((tag) => typeof tag !== "string" || !/^[a-z0-9_.:-]+$/.test(tag))) fail("invalid_manifest", "required Restic tag missing or invalid");
  return manifest;
}

function verifyRestoreEvidence(manifest, evidence) {
  validateManifest(manifest);
  assertObject(evidence, "restore evidence");
  if (evidence.contract_version !== "omen-football-warehouse-restore-proof.v1") fail("restore_mismatch", "unsupported restore proof");
  if (evidence.backup_run_id !== manifest.backup_run_id) fail("restore_mismatch", "restore proof is not bound to this backup run");
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(evidence.verifier_run_id || "") || evidence.verifier_run_id === manifest.backup_run_id) fail("restore_mismatch", "independent verifier identity is required");
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(evidence.target_cluster_id || "") || evidence.target_cluster_id === "omen-prod") fail("restore_mismatch", "isolated target identity is required");
  if (!/^postgres:17(?:\.|$)/.test(evidence.postgres_version || "") || evidence.schema_version !== manifest.schema_version) fail("restore_mismatch", "restored PostgreSQL or schema version does not match");
  if (!SHA256.test(evidence.dump_sha256 || "") || evidence.dump_sha256 !== manifest.dump.sha256) fail("restore_mismatch", "restore checksum does not match dump");
  if (!Number.isFinite(Date.parse(evidence.verified_at)) || evidence.representative_queries_passed !== true) fail("restore_mismatch", "restore verification is incomplete");
  assertObject(evidence.receipts, "restore receipts");
  assertObject(evidence.row_counts, "restore row_counts");
  if (evidence.receipts.succeeded !== manifest.receipts.succeeded || evidence.receipts.started !== 0) fail("restore_mismatch", "restored receipt counts do not match");
  for (const table of REQUIRED_ROW_COUNTS) if (evidence.row_counts[table] !== manifest.row_counts[table]) fail("restore_mismatch", "restored row counts do not match");
  return { state: "restored_verified", contract_version: evidence.contract_version, backup_run_id: manifest.backup_run_id,
    dump_sha256: manifest.dump.sha256, verified_at: evidence.verified_at, verifier_run_id: evidence.verifier_run_id,
    target_cluster_id: evidence.target_cluster_id };
}

function hashFile(filename) {
  const hash = crypto.createHash("sha256");
  const contents = fs.readFileSync(filename);
  hash.update(contents);
  return { sha256: hash.digest("hex"), bytes: contents.length };
}

function verifyDump(manifest, manifestPath) {
  validateManifest(manifest);
  const dumpPath = path.join(path.dirname(manifestPath), manifest.dump.filename);
  const actual = hashFile(dumpPath);
  if (actual.sha256 !== manifest.dump.sha256 || actual.bytes !== manifest.dump.bytes) fail("dump_mismatch", "dump checksum or size does not match manifest");
  return { state: "checksum_verified", contract_version: VERSION, dump_sha256: actual.sha256 };
}

function main(argv) {
  if (argv.length !== 2 || argv[0] !== "verify") fail("usage", "usage: manifest.js verify /absolute/path/manifest.json");
  const manifestPath = argv[1];
  if (!path.isAbsolute(manifestPath)) fail("usage", "manifest path must be absolute");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  process.stdout.write(`${JSON.stringify(verifyDump(manifest, manifestPath))}\n`);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) {
    process.stderr.write(`${JSON.stringify({ state: "down", code: error.code || "manifest_failed" })}\n`);
    process.exitCode = 1;
  }
}

module.exports = { VERSION, REQUIRED_ROW_COUNTS, hashFile, validateManifest, verifyDump, verifyRestoreEvidence };
