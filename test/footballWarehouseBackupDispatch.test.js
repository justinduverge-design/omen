"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..", "infra", "warehouse", "backup");

test("warehouse backup reuses commissioned encrypted transport without exposing credentials", () => {
  const script = fs.readFileSync(path.join(root, "create-snapshot.sh"), "utf8");
  assert.match(script, /EXPECTED_HOST="omen-prod"/);
  assert.match(script, /warehouse-backup-pgpass/);
  assert.match(script, /< "\$PGPASS_FILE"/);
  assert.match(script, /RESTIC_PASSWORD_FILE="\$RESTIC_PASSWORD_FILE"/);
  assert.match(script, /restic backup --json --no-cache --tag omen-football-warehouse/);
  assert.match(script, /cmp -s "\$stage\/before\.json" "\$stage\/after\.json"/);
  assert.match(script, /install -d -m 0711 -o root -g root "\$SNAPSHOT_ROOT"/);
  assert.match(script, /chmod 0700 "\$stage"/);
  assert.match(script, /trap - EXIT\nrm -rf -- "\$final"/);
  assert.doesNotMatch(script, /cat "\$PGPASS_FILE"/);
  assert.doesNotMatch(script, /RESTIC_PASSWORD=/);
  assert.doesNotMatch(script, /POSTGRES_PASSWORD=/);
});

test("KVM2 restore is pinned, networkless, isolated, and verifies restored evidence", () => {
  const script = fs.readFileSync(path.join(root, "restore-isolated.sh"), "utf8");
  assert.match(script, /EXPECTED_HOST="model-host"/);
  assert.match(script, /IMAGE="sha256:[a-f0-9]{64}"/);
  assert.match(script, /docker image inspect "\$IMAGE"/);
  assert.doesNotMatch(script, /IMAGE="postgres:17\.11-bookworm"/);
  assert.match(script, /--network none/);
  assert.match(script, /--no-owner --no-privileges/);
  assert.match(script, /verify-restore "\$manifest" "\$proof"/);
  assert.match(script, /e\.state <> 'succeeded'\)\)\)\nfrom football\.warehouse_ingest_events/);
  assert.match(script, /preserved container\/volume for bounded diagnosis/);
  assert.doesNotMatch(script, /docker pull/);
  assert.doesNotMatch(script, /--publish|-p 5432/);
});

test("restore transfer is forced-command-only, path-fixed, host-key-pinned, and credential preserving", () => {
  const exporter = fs.readFileSync(path.join(root, "export-restore-file.sh"), "utf8");
  const receiver = fs.readFileSync(path.join(root, "receive-restore-source.sh"), "utf8");
  assert.match(exporter, /SSH_ORIGINAL_COMMAND/);
  assert.match(exporter, /request" == "latest"/);
  assert.match(exporter, /--latest 1 --tag omen-football-warehouse/);
  assert.match(exporter, /\^\(manifest\|dump\).*\[0-9a-f\]\{64\}.*warehouse-/);
  assert.match(exporter, /restic snapshots --json --no-cache --tag omen-football-warehouse/);
  assert.match(exporter, /restic dump --no-cache "\$snapshot_id" "\$SNAPSHOT_ROOT\/\$run_id\/\$filename"/);
  assert.doesNotMatch(exporter, /eval|bash -c|sh -c/);
  assert.match(receiver, /StrictHostKeyChecking=yes/);
  assert.match(receiver, /UserKnownHostsFile="\$KNOWN_HOSTS"/);
  assert.match(receiver, /target already exists/);
  assert.match(receiver, /manifest identity or dump size is invalid/);
  assert.match(receiver, /validateManifest/);
  assert.match(receiver, /"\$free_bytes" -gt \$\(\(dump_bytes \+ 1073741824\)\)/);
  assert.match(receiver, /node "\$MANIFEST_TOOL" verify "\$stage\/manifest\.json"/);
  assert.doesNotMatch(receiver, /RESTIC_PASSWORD|restic-password|password-file/);
});

test("scheduled backup and restore use separate timers, pinned trust, and clean decrypted input only after proof", () => {
  const backup = fs.readFileSync(path.join(root, "run-nightly-backup.sh"), "utf8");
  const retention = fs.readFileSync(path.join(root, "apply-retention.sh"), "utf8");
  const restore = fs.readFileSync(path.join(root, "run-weekly-restore-proof.sh"), "utf8");
  const backupTimer = fs.readFileSync(path.join(root, "omen-warehouse-backup.timer"), "utf8");
  const restoreTimer = fs.readFileSync(path.join(root, "omen-warehouse-restore-proof.timer"), "utf8");
  assert.match(backup, /EXPECTED_HOST="omen-prod"/);
  assert.match(backup, /kuma-backup-push-url/);
  assert.match(backup, /push_status down backup_failed/);
  assert.match(backup, /"\$RETENTION_TOOL" --check[\s\S]*"\$SNAPSHOT_TOOL"[\s\S]*"\$RETENTION_TOOL"[\s\S]*push_status up backup_completed/);
  assert.doesNotMatch(backup, /echo.*KUMA|printf.*KUMA_URL/);
  assert.match(retention, /warehouse-restic-retention/);
  assert.match(retention, /600:root:root/);
  assert.match(retention, /"\$\{#policy_lines\[@\]\}" -eq 1/);
  assert.match(retention, /restic forget --no-cache --tag omen-football-warehouse/);
  assert.match(retention, /--keep-daily "\$keep_daily"/);
  assert.match(retention, /--keep-weekly "\$keep_weekly"/);
  assert.match(retention, /--keep-monthly "\$keep_monthly" --prune/);
  assert.match(restore, /EXPECTED_HOST="model-host"/);
  assert.match(restore, /StrictHostKeyChecking=yes/);
  assert.match(restore, /"\$REMOTE" latest/);
  assert.match(restore, /"\$RESTORER" "\$source\/manifest\.json" "\$proof"/);
  assert.match(restore, /verify-restore "\$source\/manifest\.json" "\$proof"[\s\S]*rm -rf -- "\$source"/);
  assert.match(backupTimer, /OnCalendar=\*-\*-\* 12:30:00 UTC/);
  assert.match(backupTimer, /Persistent=true/);
  assert.match(restoreTimer, /OnCalendar=Sun \*-\*-\* 14:00:00 UTC/);
  assert.match(restoreTimer, /Persistent=true/);
});
