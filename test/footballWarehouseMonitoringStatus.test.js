"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const test = require("node:test");
const {
  VERSION,
  FACT_TABLES,
  evaluateStatus,
  collectEvidence,
  failure,
} = require("../infra/warehouse/monitor/status");

const NOW = Date.parse("2026-10-08T18:00:00Z");

function healthyEvidence() {
  return {
    checker_completed: true,
    observed_at: "2026-10-08T18:00:00Z",
    database: { state: "running", health: "healthy", restart_policy: "unless-stopped" },
    host_postgres_listeners: 0,
    schema_verified: true,
    receipts: { started: 0, latest_state: "succeeded", latest_finished_at: "2026-10-08T17:00:00Z" },
    rows: Object.fromEntries(FACT_TABLES.map((table) => [table, 1])),
    orphan_facts: 0,
  };
}

test("warehouse lifecycle status is UP only for a healthy, private, fresh, linked dataset", () => {
  const result = evaluateStatus(healthyEvidence(), { nowMs: NOW });
  assert.equal(result.contract_version, VERSION);
  assert.equal(result.state, "UP");
  assert.ok(Object.values(result.checks).every(Boolean));
});

test("every warehouse lifecycle fault is DOWN", () => {
  const base = healthyEvidence();
  const faults = [
    { checker_completed: false },
    { database: { ...base.database, state: "exited" } },
    { database: { ...base.database, health: "unhealthy" } },
    { database: { ...base.database, restart_policy: "no" } },
    { host_postgres_listeners: 1 },
    { schema_verified: false },
    { receipts: { ...base.receipts, started: 1 } },
    { receipts: { ...base.receipts, latest_state: "failed" } },
    { receipts: { ...base.receipts, latest_finished_at: "2026-10-06T00:00:00Z" } },
    { rows: { ...base.rows, nfl_plays: 0 } },
    { orphan_facts: 1 },
  ];
  for (const patch of faults) assert.equal(evaluateStatus({ ...base, ...patch }, { nowMs: NOW }).state, "DOWN");
});

test("collector uses fixed read-only boundaries and returns no credentials", () => {
  const calls = [];
  const run = (command, args) => {
    calls.push([command, args]);
    if (command === "ss") return "";
    if (args[0] === "inspect") return JSON.stringify([{ State: { Status: "running", Health: { Status: "healthy" } }, HostConfig: { RestartPolicy: { Name: "unless-stopped" } } }]);
    return JSON.stringify({ schema_verified: true, receipts: { started: 0, latest_state: "succeeded", latest_finished_at: "2026-10-08T17:00:00Z" }, rows: healthyEvidence().rows, orphan_facts: 0 });
  };
  const evidence = collectEvidence({ run, now: () => new Date(NOW) });
  assert.equal(evaluateStatus(evidence, { nowMs: NOW }).state, "UP");
  const serialized = JSON.stringify(calls);
  assert.match(serialized, /begin transaction read only/);
  assert.doesNotMatch(serialized, /password|secret|PGPASSWORD/i);
  assert.deepEqual(calls[0].slice(0, 2), ["docker", ["inspect", "omen_football_warehouse"]]);
});

test("checker failures have a machine-readable DOWN result and the CLI fails closed", () => {
  assert.deepEqual(failure("checker_failure").checks, { checker_completed: false });
  const script = path.join(__dirname, "..", "infra", "warehouse", "monitor", "status.js");
  const result = spawnSync(process.execPath, [script], { env: { PATH: "" }, encoding: "utf8" });
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.state, "DOWN");
  assert.equal(payload.code, "checker_failure");
  assert.equal(payload.checks.checker_completed, false);
});

test("CLI evaluates an already-collected absolute evidence artifact", () => {
  const script = path.join(__dirname, "..", "infra", "warehouse", "monitor", "status.js");
  const directory = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "omen-warehouse-monitor-"));
  const evidence = path.join(directory, "evidence.json");
  try {
    fs.writeFileSync(evidence, JSON.stringify(healthyEvidence()));
    const result = spawnSync(process.execPath, [script, "evaluate", evidence, "2026-10-08T18:00:00Z"], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).state, "UP");
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});

test("host exporter is read-only, payload-free, and emits failure evidence on checker crash", () => {
  const exporter = fs.readFileSync(path.join(__dirname, "..", "infra", "warehouse", "monitor", "status-export"), "utf8");
  assert.match(exporter, /PGOPTIONS='-c default_transaction_read_only=on'/);
  assert.match(exporter, /omen-football-warehouse-lifecycle-evidence\.v1/);
  assert.match(exporter, /"checker_completed":false/);
  assert.doesNotMatch(exporter, /(?:password|secret|token|credential)/i);
  assert.doesNotMatch(exporter, /^\s*(?:insert|update|delete|truncate|alter|create|drop|grant|revoke)\b/im);
});
