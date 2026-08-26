"use strict";

const ACCEPTANCE_SHA256 = "5c4cbc0568ce85a94512b7722144a7cddcb83fe74bd088f04d90f7a628a00bea";
const KVM1_HARD_STOP_BYTES = 30 * 1024 ** 3;
const WITNESS_MINIMUM_BYTES = 10 * 1024 ** 3;

const REQUIRED_ALERT_CODES = Object.freeze([
  "job_failure",
  "source_loss",
  "schema_drift",
  "stale_data",
  "disk_low",
  "witness_mismatch",
  "witness_outage",
]);

const REQUIRED_FAILURE_SCENARIOS = Object.freeze([
  "source_loss",
  "schema_drift",
  "witness_mismatch",
  "witness_unavailable",
  "source_stale",
  "disk_low",
  "correction_candidate",
]);

const PHASE_NAMES = Object.freeze([
  "Safe preparation and read-only checks",
  "KVM1 provisioning",
  "Command Center Pi witness and backup",
  "Live monitoring and alerts",
  "Scheduling and service supervision",
  "Correction and recovery rehearsal",
  "A4 no-write acceptance",
  "Final production-activation gate",
]);

const SCHEDULES = Object.freeze([
  { id: "daily_capture", calendar: "*-01,02,09,10,11,12-* 05:15:00 America/New_York", role: "kvm1-primary" },
  { id: "monday_completeness", calendar: "Mon *-*-* 05:30:00 America/New_York", role: "kvm1-primary" },
  { id: "tuesday_post_mnf_capture", calendar: "Tue *-*-* 05:15:00 America/New_York", role: "kvm1-primary" },
  { id: "tuesday_normalize_validate", calendar: "Tue *-*-* 05:30:00 America/New_York", role: "kvm1-primary" },
  { id: "tuesday_witness", calendar: "Tue *-*-* 05:45:00 America/New_York", role: "command-center-pi-witness" },
  { id: "tuesday_decision", calendar: "Tue *-*-* 06:00:00 America/New_York", role: "kvm1-primary" },
  { id: "tuesday_retry_1", calendar: "Tue *-*-* 06:15:00 America/New_York", role: "kvm1-primary" },
  { id: "tuesday_retry_2", calendar: "Tue *-*-* 06:45:00 America/New_York", role: "kvm1-primary" },
  { id: "tuesday_retry_3", calendar: "Tue *-*-* 07:30:00 America/New_York", role: "kvm1-primary" },
  { id: "thursday_correction_capture", calendar: "Thu *-*-* 05:15:00 America/New_York", role: "kvm1-primary" },
  { id: "thursday_correction_decision", calendar: "Thu *-*-* 06:00:00 America/New_York", role: "kvm1-primary" },
]);

function remoteAction(id, summary, target) {
  return Object.freeze({
    id,
    summary,
    target,
    requires_founder_approval: true,
    authorized: false,
  });
}

const PHASES = Object.freeze([
  {
    name: PHASE_NAMES[0],
    safe_actions: [
      "Inspect repository, KVM1, and Command Center without reading secret values",
      "Bind all planning evidence to the exact Phase 3 acceptance SHA-256",
      "Record absent roots, services, timers, and witness reachability without changing them",
    ],
    remote_mutations: [],
  },
  {
    name: PHASE_NAMES[1],
    safe_actions: ["Review the proposed owner, modes, disk thresholds, immutable layout, and pinned runner artifact"],
    remote_mutations: [
      remoteAction("kvm1_data_root", "Create and permission the dedicated KVM1 football-data root", "kvm1"),
      remoteAction("kvm1_runner_install", "Install the reviewed collector/validator runner and configuration", "kvm1"),
      remoteAction("kvm1_backup_scope", "Add immutable football-data evidence to the approved backup scope", "kvm1"),
    ],
  },
  {
    name: PHASE_NAMES[2],
    safe_actions: ["Verify the Pi is online and inspect its actual disk, OS, alert dispatcher, and supervision state"],
    remote_mutations: [
      remoteAction("pi_witness_root", "Create and permission the independent witness/backup-observer root", "command-center"),
      remoteAction("pi_witness_install", "Install the reviewed hash/freshness witness with no publication authority", "command-center"),
    ],
  },
  {
    name: PHASE_NAMES[3],
    safe_actions: ["Verify alert coverage, deduplication, recovery notice behavior, and secret scrubbing locally"],
    remote_mutations: [
      remoteAction("kvm1_alert_export", "Install a read-only, payload-free status export for the witness", "kvm1"),
      remoteAction("pi_alert_integration", "Add seven football-data signals to the notification-only dispatcher", "command-center"),
    ],
  },
  {
    name: PHASE_NAMES[4],
    safe_actions: ["Validate unit and timer files locally; confirm every job is disabled before installation"],
    remote_mutations: [
      remoteAction("kvm1_units_install", "Install disabled KVM1 service and timer units", "kvm1"),
      remoteAction("pi_units_install", "Install disabled Pi witness and outage-monitor units", "command-center"),
      remoteAction("timers_activate", "Enable collection, validation, witness, and alert timers", "kvm1+command-center"),
    ],
  },
  {
    name: PHASE_NAMES[5],
    safe_actions: ["Replay correction and fresh-primary recovery against isolated roots with exact hashes"],
    remote_mutations: [
      remoteAction("host_recovery_rehearsal", "Run a controlled KVM1-to-Pi backup and fresh KVM1 recovery drill", "kvm1+command-center"),
    ],
  },
  {
    name: PHASE_NAMES[6],
    safe_actions: ["Prepare the exact no-write command and acceptance worksheet without credentials"],
    remote_mutations: [
      remoteAction("a4_no_write", "Read real pending rows and compare Standard/Half PPR/PPR with zero writes", "kvm1-production"),
    ],
  },
  {
    name: PHASE_NAMES[7],
    safe_actions: ["Assemble evidence; keep collection, publication, and scoring flags false"],
    remote_mutations: [
      remoteAction("collection_activate", "Enable collection only for an observed shadow week", "kvm1"),
      remoteAction("publication_activate", "Enable publication after separate founder authorization", "kvm1-production"),
      remoteAction("scoring_activate", "Enable production Tuesday scoring after separate founder authorization", "kvm1-production"),
    ],
  },
]);

function blocker(code, message) {
  return { code, message };
}

function unique(values) {
  return [...new Set(Array.isArray(values) ? values : [])];
}

function evaluateA4NoWriteEvidence(evidence) {
  if (!evidence) {
    return { status: "fail", failures: [blocker("a4_no_write_missing", "A4 no-write evidence is absent")] };
  }
  const failures = [];
  if (evidence.mode !== "no-write" || evidence.dry_run !== true) {
    failures.push(blocker("a4_not_dry_run", "A4 must run in explicit no-write mode"));
  }
  if (evidence.acceptance_sha256 !== ACCEPTANCE_SHA256 || evidence.exact_manifest !== true) {
    failures.push(blocker("a4_artifact_unbound", "A4 must bind the exact Phase 3 acceptance artifact"));
  }
  if (!Number.isInteger(evidence.real_rows_read) || evidence.real_rows_read < 1) {
    failures.push(blocker("a4_no_real_rows", "A4 must inspect at least one real pending row"));
  }
  if (evidence.writes_attempted !== 0 || evidence.writes_completed !== 0) {
    failures.push(blocker("a4_write_attempted", "A4 attempted or completed a write"));
  }
  if ([evidence.standard_comparison, evidence.half_ppr_comparison, evidence.ppr_comparison]
    .some((value) => value !== "pass")) {
    failures.push(blocker("a4_format_comparison_failed", "All three scoring-format comparisons must pass"));
  }
  if (evidence.independent_reference !== "pass") {
    failures.push(blocker("a4_independent_reference_failed", "A4 must pass the independent scoring reference"));
  }
  if (evidence.readiness !== "healthy") {
    failures.push(blocker("a4_readiness_unhealthy", "Production readiness must be healthy during A4"));
  }
  if (evidence.cron_health !== "healthy") {
    failures.push(blocker("a4_cron_unhealthy", "Cron health must be healthy during A4"));
  }
  if (evidence.correction_rehearsal !== "pass") {
    failures.push(blocker("a4_correction_unproven", "Correction behavior must pass before A4 acceptance"));
  }
  if (evidence.recovery_rehearsal !== "pass") {
    failures.push(blocker("a4_recovery_unproven", "Recovery behavior must pass before A4 acceptance"));
  }
  if (evidence.publication_authorized !== false
      || evidence.persistent_production_scoring_enabled !== false) {
    failures.push(blocker("a4_non_activation_violated", "Publication and production scoring must remain disabled"));
  }
  return { status: failures.length ? "fail" : "pass", failures };
}

function inspectPhase3(evidence, blockers) {
  if (!evidence || evidence.acceptance_sha256 !== ACCEPTANCE_SHA256) {
    blockers.push(blocker("phase3_hash_mismatch", "Phase 4 must bind the exact Phase 3 acceptance SHA-256"));
  }
  if (evidence?.exact_manifest !== true) {
    blockers.push(blocker("exact_manifest_required", "Latest aliases or unbound inputs are forbidden"));
  }
  const covered = new Set(unique(evidence?.failure_scenarios));
  const missing = REQUIRED_FAILURE_SCENARIOS.filter((scenario) => !covered.has(scenario));
  if (missing.length) {
    blockers.push(blocker("phase3_failure_coverage_incomplete", `Missing Phase 3 scenarios: ${missing.join(", ")}`));
  }
  if (evidence?.publication_authorized !== false || evidence?.promoted !== false) {
    blockers.push(blocker("phase3_non_publication_violated", "Phase 3 evidence must remain non-promoted and non-published"));
  }
  if (evidence?.recovery?.status !== "recovered"
      || evidence?.recovery?.witness_status !== "match"
      || evidence?.recovery?.recovered_sha256 !== ACCEPTANCE_SHA256) {
    blockers.push(blocker("phase3_recovery_unbound", "Recovery must preserve the exact hash after a witness match"));
  }
}

function inspectHosts(hosts, blockers) {
  const kvm1 = hosts?.kvm1;
  if (!kvm1?.reachable) blockers.push(blocker("kvm1_outage", "KVM1 is unreachable"));
  if (kvm1?.hostname !== "srv1737978") blockers.push(blocker("kvm1_identity_mismatch", "KVM1 hostname does not match the approved host"));
  if (kvm1?.system_state !== "running") blockers.push(blocker("kvm1_unhealthy", "KVM1 system state is not running"));
  if (!Number.isFinite(kvm1?.available_bytes) || kvm1.available_bytes < KVM1_HARD_STOP_BYTES) {
    blockers.push(blocker("kvm1_disk_below_hard_stop", "KVM1 has less than the 30 GiB hard-stop reserve"));
  }

  const witness = hosts?.witness;
  if (!witness?.reachable) blockers.push(blocker("witness_outage", "Command Center witness is unreachable"));
  if (witness?.reachable && witness.hostname !== "command-center") {
    blockers.push(blocker("witness_identity_mismatch", "Witness hostname does not match Command Center"));
  }
  if (witness?.reachable && witness.system_state !== "running") {
    blockers.push(blocker("witness_unhealthy", "Command Center system state is not running"));
  }
  if (witness?.reachable
      && (!Number.isFinite(witness.available_bytes) || witness.available_bytes < WITNESS_MINIMUM_BYTES)) {
    blockers.push(blocker("witness_disk_low", "Command Center has less than the 10 GiB witness reserve"));
  }
}

function inspectInfrastructure(evidence, blockers) {
  const checks = [
    [evidence?.kvm1_provisioned === true, "kvm1_not_provisioned", "KVM1 provisioning is unproven"],
    [evidence?.witness_provisioned === true, "witness_not_provisioned", "Command Center provisioning is unproven"],
    [evidence?.live_alert_delivery === "pass", "live_alerts_unproven", "Live alert delivery is unproven"],
    [evidence?.schedules_active === true, "schedules_not_active", "Collection and validation schedules are not active"],
    [evidence?.service_supervision === "pass", "service_supervision_unproven", "Service supervision is unproven"],
    [evidence?.backup_rehearsal === "pass", "backup_rehearsal_unproven", "Backup rehearsal is unproven"],
    [evidence?.correction_rehearsal === "pass", "correction_rehearsal_unproven", "Correction rehearsal is unproven"],
    [evidence?.recovery_rehearsal === "pass", "recovery_rehearsal_unproven", "Recovery rehearsal is unproven"],
  ];
  for (const [passed, code, message] of checks) {
    if (!passed) blockers.push(blocker(code, message));
  }
}

function buildProductionReadinessAssessment({
  phase3,
  hosts,
  infrastructure,
  a4,
  alertCodes = [],
} = {}) {
  const blockers = [];
  inspectPhase3(phase3, blockers);
  inspectHosts(hosts, blockers);

  const coveredAlerts = new Set(unique(alertCodes));
  const missingAlerts = REQUIRED_ALERT_CODES.filter((code) => !coveredAlerts.has(code));
  if (missingAlerts.length) {
    blockers.push(blocker("alert_coverage_incomplete", `Missing alert classes: ${missingAlerts.join(", ")}`));
  }

  inspectInfrastructure(infrastructure, blockers);

  const a4Evaluation = evaluateA4NoWriteEvidence(a4);
  blockers.push(...a4Evaluation.failures);

  return {
    schema: "omen-football-production-readiness.v1",
    status: blockers.length ? "blocked" : "ready_for_founder_approval",
    acceptance_sha256: phase3?.acceptance_sha256 || null,
    exact_manifest_required: true,
    source_set: ["nflverse-data:stats_player", "nflverse-data:stats_team", "nflverse-data:schedules"],
    schedules: SCHEDULES.map((schedule) => ({
      ...schedule,
      active: infrastructure?.schedules_active === true,
    })),
    alerts: {
      required: [...REQUIRED_ALERT_CODES],
      declared: unique(alertCodes),
      live_delivery_proven: infrastructure?.live_alert_delivery === "pass",
    },
    phases: PHASES.map((phase) => ({
      name: phase.name,
      safe_actions: [...phase.safe_actions],
      remote_mutations: phase.remote_mutations.map((action) => ({ ...action })),
    })),
    blockers,
    gates: {
      remote_host_mutation_authorized: false,
      collection_activation_authorized: false,
      a4_no_write_accepted: a4Evaluation.status === "pass",
      publication_authorized: false,
      production_scoring_authorized: false,
    },
    publication: { authorized: false, promoted: false },
  };
}

module.exports = {
  ACCEPTANCE_SHA256,
  KVM1_HARD_STOP_BYTES,
  PHASE_NAMES,
  REQUIRED_ALERT_CODES,
  REQUIRED_FAILURE_SCENARIOS,
  SCHEDULES,
  WITNESS_MINIMUM_BYTES,
  buildProductionReadinessAssessment,
  evaluateA4NoWriteEvidence,
};
