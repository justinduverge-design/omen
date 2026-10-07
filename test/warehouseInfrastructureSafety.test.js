"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(root, ...parts), "utf8");
}

function withoutYamlComments(contents) {
  return contents
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n");
}

test("warehouse PostgreSQL is internal-only and bounded", () => {
  const compose = withoutYamlComments(read("infra", "warehouse", "docker-compose.yml"));

  assert.match(compose, /image:\s+postgres:17\.11-bookworm@sha256:91eb910c44c7ed13f7f1a4ccadaa9ca72ef14cddc04cacb6e070e48eb44731a3$/m);
  assert.match(compose, /POSTGRES_DB:\s*omen_football/);
  assert.match(compose, /pg_isready\s+-U\s+postgres\s+-d\s+omen_football/);
  assert.match(compose, /checksum='27fb1e8dd4a5167ffc27660f165f326e7c9a6e3b4aaf2e04ec16ec4e55448f1c'/);
  assert.match(compose, /checksum='0b0577edd8995fad967409a37012390d77447cf55595fd4a310270b56f7a169d'/);
  assert.match(compose, /0002_apply_access_policy\.sh:ro/);
  assert.match(compose, /internal:\s+true/);
  assert.doesNotMatch(compose, /^\s*ports:/m, "warehouse PostgreSQL must not publish a host port");
  assert.match(compose, /healthcheck:/);
  assert.match(compose, /mem_limit:\s*2g/i, "KVM1 warehouse must enforce its 2 GB memory ceiling");
  assert.match(compose, /(?:cpus|nano_cpus):/, "warehouse must have an explicit CPU bound");
  assert.match(compose, /pids_limit:/, "warehouse must have a PID bound");
  assert.match(compose, /max-size:/, "warehouse container logs must be size-bounded");
});

test("warehouse initialization records the exact migration checksum and version", () => {
  const receipt = read("warehouse", "migrations", "0002_record_migration.sh");
  assert.match(receipt, /sha256sum\s+"\$migration"/);
  assert.match(receipt, /27fb1e8dd4a5167ffc27660f165f326e7c9a6e3b4aaf2e04ec16ec4e55448f1c/);
  assert.match(receipt, /--single-transaction/);
  assert.match(receipt, /warehouse_schema_migrations/);
  assert.match(receipt, /values \(1, '0001_football_warehouse'/);
  assert.match(receipt, /and checksum = :'migration_checksum'/);
  assert.doesNotMatch(receipt, /echo\s+[^\n]*(?:password|POSTGRES_PASSWORD)/i);
});

test("warehouse deployment is an immutable artifact operation, separate from container mutation", () => {
  const build = read("infra", "warehouse", "build-release.sh");
  const verifyRelease = read("infra", "warehouse", "verify-release.sh");
  assert.match(build, /git archive --format=tar "\$commit"/);
  assert.match(build, /platform=linux\/amd64/);
  assert.match(build, /MANIFEST-SHA256/);
  assert.match(build, /builder does not match the requested commit/);
  assert.match(verifyRelease, /approved_manifest/);
  assert.doesNotMatch(`${build}\n${verifyRelease}`, /docker compose|docker run|systemctl/);
});

test("warehouse password uses a machine-local secret file, never an env file", () => {
  const compose = withoutYamlComments(read("infra", "warehouse", "docker-compose.yml"));
  const provision = read("infra", "warehouse", "provision-credentials.sh");

  assert.match(compose, /POSTGRES_PASSWORD_FILE:\s*\/run\/secrets\//);
  assert.match(compose, /^\s*secrets:/m);
  assert.doesNotMatch(compose, /^\s*env_file:/m);
  assert.doesNotMatch(compose, /POSTGRES_PASSWORD:\s*[^_]/);

  assert.match(provision, /umask\s+077/);
  assert.match(provision, /chmod\s+600/);
  assert.match(provision, /chown\s+root:root/);
  assert.doesNotMatch(provision, /WAREHOUSE_DB_URL=.*\$\{?DB_PASSWORD/);
  assert.doesNotMatch(provision, />>\s*"?\$API_ENV_FILE"?/);
  assert.doesNotMatch(provision, /cat\s+[^\n]*(?:password|secret)/i);
});

test("warehouse operations never make destructive teardown the normal rollback", () => {
  const runbook = read("infra", "warehouse", "runbook.md");

  assert.doesNotMatch(
    runbook,
    /rollback[\s\S]{0,800}docker compose down -v/i,
    "rollback must preserve the warehouse volume unless a separately approved destructive action removes it",
  );
  assert.match(runbook, /root:root/);
  assert.match(runbook, /0600|600 permissions/);
  assert.match(runbook, /no (?:published|host) port|must not publish/i);
  assert.match(runbook, /HostConfig\.Memory|cgroup/i, "resource bounds require live enforcement proof");
});

test("unsafe preparation scripts fail closed until their proven replacements exist", () => {
  for (const parts of [
    ["infra", "warehouse", "backfill.sh"],
    ["infra", "warehouse", "backup", "backup.sh"],
    ["infra", "warehouse", "pi-watchdog", "watchdog.sh"],
  ]) {
    const script = read(...parts);
    const refusal = script.indexOf("exit 64");
    assert.ok(refusal > -1, `${parts.join("/")} must carry an unconditional refusal`);
    const docker = script.indexOf("docker ");
    const curl = script.indexOf("curl ");
    assert.ok(docker === -1 || refusal < docker, `${parts.join("/")} must refuse before Docker access`);
    assert.ok(curl === -1 || refusal < curl, `${parts.join("/")} must refuse before network access`);
  }

  assert.match(read("infra", "warehouse", "init", "warehouse-ddl.sql"), /^-- RETIRED:/);
});
