#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const VERSION = "omen-football-warehouse-status.v1";

function down(checks) { return { contract_version: VERSION, state: "DOWN", checks }; }

function evaluateStatus(evidence, { nowMs, maxBackupAgeMs = 36 * 3600e3, maxIngestAgeMs = 36 * 3600e3, maxRestoreAgeMs = 8 * 24 * 3600e3 } = {}) {
  const checks = {};
  const age = (value) => Number.isFinite(Date.parse(value)) ? nowMs - Date.parse(value) : Infinity;
  checks.database = evidence.database === "up";
  checks.worker = evidence.worker === "up";
  checks.backup_fresh = age(evidence.last_backup_at) >= 0 && age(evidence.last_backup_at) <= maxBackupAgeMs;
  checks.ingest_fresh = age(evidence.last_ingest_at) >= 0 && age(evidence.last_ingest_at) <= maxIngestAgeMs;
  const restore = evidence.restore_proof || {};
  checks.restore_proof_fresh = restore.state === "restored_verified"
    && restore.contract_version === "omen-football-warehouse-restore-proof.v1"
    && /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(restore.verifier_run_id || "")
    && restore.verifier_run_id !== evidence.backup_run_id
    && /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(restore.target_cluster_id || "") && restore.target_cluster_id !== "omen-prod"
    && restore.backup_run_id === evidence.backup_run_id && restore.dump_sha256 === evidence.backup_dump_sha256
    && age(restore.verified_at) >= 0 && age(restore.verified_at) <= maxRestoreAgeMs;
  checks.no_started_receipts = evidence.started_receipts === 0;
  const disk = evidence.disk_measurement || {};
  const policy = evidence.disk_policy || {};
  const backupMeasurement = policy.backup_measurement || {};
  checks.disk_measurement_fresh = disk.source === "statvfs" && age(disk.measured_at) >= 0 && age(disk.measured_at) <= 3600e3
    && Number.isSafeInteger(disk.capacity_bytes) && Number.isSafeInteger(disk.free_bytes)
    && disk.capacity_bytes > 0 && disk.free_bytes >= 0 && disk.free_bytes <= disk.capacity_bytes;
  checks.disk_policy_measured = backupMeasurement.source === "validated_manifest"
    && backupMeasurement.backup_run_id === evidence.backup_run_id
    && backupMeasurement.dump_sha256 === evidence.backup_dump_sha256
    && age(backupMeasurement.measured_at) >= 0 && age(backupMeasurement.measured_at) <= maxRestoreAgeMs
    && Number.isSafeInteger(backupMeasurement.dump_bytes) && backupMeasurement.dump_bytes === evidence.backup_dump_bytes
    && backupMeasurement.dump_bytes > 0
    && Number.isSafeInteger(policy.watermark_bytes) && policy.watermark_bytes > 0
    && Number.isSafeInteger(policy.restore_headroom_bytes) && policy.restore_headroom_bytes > 0
    && policy.restore_headroom_bytes >= backupMeasurement.dump_bytes
    && age(policy.calculated_at) >= 0 && age(policy.calculated_at) <= maxRestoreAgeMs;
  checks.disk_above_watermark = checks.disk_measurement_fresh && checks.disk_policy_measured
    && disk.free_bytes >= policy.watermark_bytes + policy.restore_headroom_bytes;
  checks.backup_checksum_valid = evidence.backup_checksum_valid === true;
  return Object.values(checks).every(Boolean) ? { contract_version: VERSION, state: "UP", checks } : down(checks);
}

function main(argv) {
  if (argv.length !== 3 || argv[0] !== "evaluate") throw Object.assign(new Error("usage"), { code: "usage" });
  const evidencePath = argv[1];
  if (!path.isAbsolute(evidencePath)) throw Object.assign(new Error("absolute path required"), { code: "usage" });
  const nowMs = Date.parse(argv[2]);
  if (!Number.isFinite(nowMs)) throw Object.assign(new Error("invalid time"), { code: "usage" });
  const result = evaluateStatus(JSON.parse(fs.readFileSync(evidencePath, "utf8")), { nowMs });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.state !== "UP") process.exitCode = 2;
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) {
    process.stderr.write(`${JSON.stringify({ contract_version: VERSION, state: "DOWN", code: error.code || "invalid_evidence" })}\n`);
    process.exitCode = 1;
  }
}

module.exports = { VERSION, evaluateStatus };
