"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  ACCEPTANCE_SHA256,
  PHASE_NAMES,
  REQUIRED_ALERT_CODES,
  REQUIRED_FAILURE_SCENARIOS,
  buildProductionReadinessAssessment,
  evaluateA4NoWriteEvidence,
} = require("../src/services/footballData/productionReadiness");
const { parseArgs } = require("../scripts/football-data-readiness");

function phase3Evidence(overrides = {}) {
  return {
    acceptance_sha256: ACCEPTANCE_SHA256,
    exact_manifest: true,
    failure_scenarios: [...REQUIRED_FAILURE_SCENARIOS],
    publication_authorized: false,
    promoted: false,
    recovery: { status: "recovered", witness_status: "match", recovered_sha256: ACCEPTANCE_SHA256 },
    ...overrides,
  };
}

function hostEvidence(overrides = {}) {
  return {
    kvm1: {
      reachable: true,
      hostname: "srv1737978",
      os: "Ubuntu",
      os_version: "24.04",
      system_state: "running",
      available_bytes: 35 * 1024 ** 3,
      data_root: { path: "/var/lib/omen-football-data", exists: false },
      services: { docker: "active", nginx: "active", omen_api: "healthy", omen_cron: "running" },
    },
    witness: {
      reachable: true,
      hostname: "command-center",
      os: "Debian GNU/Linux",
      os_version: "13",
      system_state: "running",
      available_bytes: 80 * 1024 ** 3,
      data_root: { path: "/var/lib/omen-football-witness", exists: false },
    },
    ...overrides,
  };
}

function a4Evidence(overrides = {}) {
  return {
    mode: "no-write",
    dry_run: true,
    acceptance_sha256: ACCEPTANCE_SHA256,
    exact_manifest: true,
    real_rows_read: 3,
    writes_attempted: 0,
    writes_completed: 0,
    standard_comparison: "pass",
    half_ppr_comparison: "pass",
    ppr_comparison: "pass",
    independent_reference: "pass",
    readiness: "healthy",
    cron_health: "healthy",
    correction_rehearsal: "pass",
    recovery_rehearsal: "pass",
    publication_authorized: false,
    persistent_production_scoring_enabled: false,
    ...overrides,
  };
}

function infrastructureEvidence(overrides = {}) {
  return {
    kvm1_provisioned: true,
    witness_provisioned: true,
    live_alert_delivery: "pass",
    schedules_active: true,
    service_supervision: "pass",
    backup_rehearsal: "pass",
    correction_rehearsal: "pass",
    recovery_rehearsal: "pass",
    ...overrides,
  };
}

test("Phase 4 assessment preserves the exact Phase 3 artifact and all non-activation gates", () => {
  const result = buildProductionReadinessAssessment({
    phase3: phase3Evidence(),
    hosts: hostEvidence(),
    infrastructure: infrastructureEvidence(),
    a4: a4Evidence(),
    alertCodes: REQUIRED_ALERT_CODES,
  });

  assert.equal(result.schema, "omen-football-production-readiness.v1");
  assert.equal(result.status, "ready_for_founder_approval");
  assert.equal(result.acceptance_sha256, ACCEPTANCE_SHA256);
  assert.deepEqual(result.phases.map((phase) => phase.name), PHASE_NAMES);
  assert.deepEqual(result.alerts.required, REQUIRED_ALERT_CODES);
  assert.ok(result.schedules.every((schedule) => schedule.active === true));
  assert.equal(result.gates.remote_host_mutation_authorized, false);
  assert.equal(result.gates.collection_activation_authorized, false);
  assert.equal(result.gates.publication_authorized, false);
  assert.equal(result.gates.production_scoring_authorized, false);
  assert.equal(result.gates.a4_no_write_accepted, true);
  assert.ok(result.phases.every((phase) => phase.remote_mutations.every(
    (action) => action.requires_founder_approval === true,
  )));
});

test("an offline Command Center witness blocks readiness and emits witness outage evidence", () => {
  const result = buildProductionReadinessAssessment({
    phase3: phase3Evidence(),
    hosts: hostEvidence({
      witness: {
        reachable: false,
        hostname: "command-center",
        last_seen: "1d ago",
      },
    }),
    infrastructure: null,
    a4: null,
    alertCodes: REQUIRED_ALERT_CODES,
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.some((blocker) => blocker.code === "witness_outage"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "a4_no_write_missing"));
  assert.equal(result.gates.a4_no_write_accepted, false);
  assert.equal(result.gates.publication_authorized, false);
  assert.equal(result.gates.production_scoring_authorized, false);
});

test("A4 acceptance requires real rows, all three formats, healthy services, and zero writes", () => {
  assert.deepEqual(evaluateA4NoWriteEvidence(a4Evidence()), { status: "pass", failures: [] });

  const failed = evaluateA4NoWriteEvidence(a4Evidence({
    real_rows_read: 0,
    writes_attempted: 1,
    half_ppr_comparison: "fail",
    cron_health: "unknown",
  }));

  assert.equal(failed.status, "fail");
  assert.deepEqual(failed.failures.map((failure) => failure.code), [
    "a4_no_real_rows",
    "a4_write_attempted",
    "a4_format_comparison_failed",
    "a4_cron_unhealthy",
  ]);
});

test("hash drift, latest aliases, promoted Phase 3 evidence, or missing failure coverage fail closed", () => {
  const result = buildProductionReadinessAssessment({
    phase3: phase3Evidence({
      acceptance_sha256: "latest",
      exact_manifest: false,
      failure_scenarios: ["source_loss"],
      promoted: true,
    }),
    hosts: hostEvidence(),
    infrastructure: infrastructureEvidence(),
    a4: a4Evidence(),
    alertCodes: REQUIRED_ALERT_CODES,
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.some((blocker) => blocker.code === "phase3_hash_mismatch"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "exact_manifest_required"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "phase3_failure_coverage_incomplete"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "phase3_non_publication_violated"));
});

test("low KVM1 disk and missing required alert coverage block readiness", () => {
  const result = buildProductionReadinessAssessment({
    phase3: phase3Evidence(),
    hosts: hostEvidence({
      kvm1: {
        ...hostEvidence().kvm1,
        available_bytes: 10 * 1024 ** 3,
      },
    }),
    infrastructure: infrastructureEvidence(),
    a4: a4Evidence(),
    alertCodes: REQUIRED_ALERT_CODES.filter((code) => code !== "schema_drift"),
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.some((blocker) => blocker.code === "kvm1_disk_below_hard_stop"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "alert_coverage_incomplete"));
});

test("unproven provisioning, alert delivery, schedules, supervision, backup, correction, or recovery block readiness", () => {
  const result = buildProductionReadinessAssessment({
    phase3: phase3Evidence(),
    hosts: hostEvidence(),
    infrastructure: infrastructureEvidence({
      kvm1_provisioned: false,
      live_alert_delivery: "not_run",
      schedules_active: false,
      backup_rehearsal: "not_run",
    }),
    a4: a4Evidence(),
    alertCodes: REQUIRED_ALERT_CODES,
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.blockers.map((blocker) => blocker.code), [
    "kvm1_not_provisioned",
    "live_alerts_unproven",
    "schedules_not_active",
    "backup_rehearsal_unproven",
  ]);
  assert.equal(result.alerts.live_delivery_proven, false);
  assert.ok(result.schedules.every((schedule) => schedule.active === false));
  assert.equal(result.gates.publication_authorized, false);
  assert.equal(result.gates.production_scoring_authorized, false);
});

test("the readiness CLI accepts one sanitized evidence file and rejects ambiguous arguments", () => {
  assert.deepEqual(parseArgs(["assess", "--evidence", "evidence.json"]), {
    command: "assess",
    evidence: require("node:path").resolve("evidence.json"),
  });
  assert.throws(() => parseArgs(["assess"]), /Usage:/);
  assert.throws(() => parseArgs(["assess", "--host", "kvm1"]), /Usage:/);
  assert.throws(() => parseArgs(["activate", "--evidence", "evidence.json"]), /Usage:/);
});
