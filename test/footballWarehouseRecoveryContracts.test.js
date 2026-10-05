"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { validateManifest, verifyDump, verifyRestoreEvidence } = require("../infra/warehouse/backup/manifest");
const { evaluateStatus } = require("../infra/warehouse/pi-watchdog/status");

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "omen-warehouse-recovery-"));
  const dump = Buffer.from("deterministic warehouse dump fixture\n");
  fs.writeFileSync(path.join(directory, "warehouse.dump"), dump);
  const manifest = {
    contract_version: "omen-football-warehouse-backup.v1", state: "created",
    created_at: "2026-10-05T12:00:00.000Z", postgres_version: "postgres:17.6", schema_version: 1, backup_run_id: "backup-20261005-120000",
    dump: { filename: "warehouse.dump", bytes: dump.length, sha256: crypto.createHash("sha256").update(dump).digest("hex") },
    receipts: { succeeded: 12, started: 0 }, row_counts: { football_teams: 32, football_players: 2500, nfl_games: 272, nfl_player_weekly_stats: 1000, nfl_team_weekly_stats: 544, nfl_weekly_rosters: 1800, nfl_plays: 0 },
    restic_tags: ["omen-football-warehouse", "schema-v1"],
  };
  const manifestPath = path.join(directory, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  return { directory, manifest, manifestPath };
}

test("backup manifest verifies exact local dump bytes without a network or secret", () => {
  const item = fixture();
  try { assert.equal(verifyDump(item.manifest, item.manifestPath).state, "checksum_verified"); }
  finally { fs.rmSync(item.directory, { recursive: true }); }
});

test("backup manifest fails closed on active receipts, unsafe filenames, tampering, and restore mismatch", () => {
  const item = fixture();
  try {
    assert.throws(() => validateManifest({ ...item.manifest, receipts: { succeeded: 12, started: 1 } }), (error) => error.code === "backup_not_ready");
    assert.throws(() => validateManifest({ ...item.manifest, dump: { ...item.manifest.dump, filename: "../warehouse.dump" } }), (error) => error.code === "invalid_manifest");
    assert.throws(() => validateManifest({ ...item.manifest, row_counts: {} }), (error) => error.code === "invalid_manifest");
    fs.appendFileSync(path.join(item.directory, "warehouse.dump"), "tampered");
    assert.throws(() => verifyDump(item.manifest, item.manifestPath), (error) => error.code === "dump_mismatch");
    assert.throws(() => validateManifest({ ...item.manifest, state: "restored_verified" }), (error) => error.code === "invalid_manifest");
    const restore = { contract_version: "omen-football-warehouse-restore-proof.v1", backup_run_id: item.manifest.backup_run_id, verifier_run_id: "restore-20261005-130000", target_cluster_id: "isolated-restore-20261005", postgres_version: "postgres:17.6", schema_version: 1, dump_sha256: item.manifest.dump.sha256, verified_at: "2026-10-05T13:00:00Z", representative_queries_passed: true, receipts: item.manifest.receipts, row_counts: item.manifest.row_counts };
    const proof = verifyRestoreEvidence(item.manifest, restore);
    assert.equal(proof.state, "restored_verified");
    assert.equal(proof.backup_run_id, item.manifest.backup_run_id);
    assert.equal(proof.verified_at, restore.verified_at);
    assert.throws(() => verifyRestoreEvidence(item.manifest, { ...restore, target_cluster_id: "omen-prod" }), (error) => error.code === "restore_mismatch");
    assert.throws(() => verifyRestoreEvidence(item.manifest, { ...restore, backup_run_id: "backup-other-run" }), (error) => error.code === "restore_mismatch");
  } finally { fs.rmSync(item.directory, { recursive: true }); }
});

test("watchdog reports UP only when every independently supplied signal is healthy", () => {
  const nowMs = Date.parse("2026-10-05T12:00:00Z");
  const dumpSha = "a".repeat(64);
  const healthy = { database: "up", worker: "up", last_backup_at: "2026-10-05T11:00:00Z", last_ingest_at: "2026-10-05T10:00:00Z", backup_run_id: "backup-20261005-110000", backup_dump_sha256: dumpSha, backup_dump_bytes: 2 * 1024 ** 3, restore_proof: { state: "restored_verified", contract_version: "omen-football-warehouse-restore-proof.v1", backup_run_id: "backup-20261005-110000", dump_sha256: dumpSha, verified_at: "2026-10-04T12:00:00Z", verifier_run_id: "restore-20261004-120000", target_cluster_id: "isolated-restore-20261004" }, started_receipts: 0, disk_measurement: { source: "statvfs", measured_at: "2026-10-05T11:30:00Z", capacity_bytes: 80 * 1024 ** 3, free_bytes: 20 * 1024 ** 3 }, disk_policy: { calculated_at: "2026-10-05T11:45:00Z", watermark_bytes: 5 * 1024 ** 3, restore_headroom_bytes: 5 * 1024 ** 3, backup_measurement: { source: "validated_manifest", measured_at: "2026-10-05T11:00:00Z", backup_run_id: "backup-20261005-110000", dump_sha256: dumpSha, dump_bytes: 2 * 1024 ** 3 } }, backup_checksum_valid: true };
  assert.equal(evaluateStatus(healthy, { nowMs }).state, "UP");
  for (const patch of [{ database: "down" }, { last_backup_at: "2026-10-01T00:00:00Z" }, { last_ingest_at: "invalid" }, { restore_proof: { ...healthy.restore_proof, verified_at: "2026-09-01T00:00:00Z" } }, { started_receipts: 1 }, { disk_measurement: { ...healthy.disk_measurement, free_bytes: 1 } }, { backup_checksum_valid: false }]) {
    assert.equal(evaluateStatus({ ...healthy, ...patch }, { nowMs }).state, "DOWN");
  }
  assert.equal(evaluateStatus({ ...healthy, disk_measurement: { ...healthy.disk_measurement, measured_at: "2026-10-01T00:00:00Z" } }, { nowMs }).state, "DOWN");
  assert.equal(evaluateStatus({ ...healthy, disk_policy: { ...healthy.disk_policy, backup_measurement: { ...healthy.disk_policy.backup_measurement, dump_bytes: 1 } } }, { nowMs }).state, "DOWN");
  assert.equal(evaluateStatus({ ...healthy, restore_proof: { ...healthy.restore_proof, backup_run_id: "backup-other-run" } }, { nowMs }).state, "DOWN");
  assert.equal(evaluateStatus({ ...healthy, disk_policy: { ...healthy.disk_policy, backup_measurement: { ...healthy.disk_policy.backup_measurement, source: "manual" } } }, { nowMs }).state, "DOWN");
  assert.equal(evaluateStatus({ ...healthy, restore_proof: { ...healthy.restore_proof, verifier_run_id: undefined } }, { nowMs }).state, "DOWN");
  assert.equal(evaluateStatus({ ...healthy, restore_proof: { ...healthy.restore_proof, verifier_run_id: healthy.backup_run_id } }, { nowMs }).state, "DOWN");
});
