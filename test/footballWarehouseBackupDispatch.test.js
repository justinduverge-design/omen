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
  assert.doesNotMatch(script, /cat "\$PGPASS_FILE"/);
  assert.doesNotMatch(script, /RESTIC_PASSWORD=/);
  assert.doesNotMatch(script, /POSTGRES_PASSWORD=/);
});

test("KVM2 restore is pinned, networkless, isolated, and verifies restored evidence", () => {
  const script = fs.readFileSync(path.join(root, "restore-isolated.sh"), "utf8");
  assert.match(script, /EXPECTED_HOST="model-host"/);
  assert.match(script, /postgres:17\.11-bookworm@sha256:[a-f0-9]{64}/);
  assert.match(script, /docker image inspect "\$IMAGE"/);
  assert.match(script, /--network none/);
  assert.match(script, /--no-owner --no-privileges/);
  assert.match(script, /verify-restore "\$manifest" "\$proof"/);
  assert.match(script, /preserved container\/volume for bounded diagnosis/);
  assert.doesNotMatch(script, /docker pull/);
  assert.doesNotMatch(script, /--publish|-p 5432/);
});
