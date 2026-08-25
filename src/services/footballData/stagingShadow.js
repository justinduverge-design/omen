"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { validateAcceptanceArtifact } = require("./acceptanceValidator");
const { assertLocalVaultRoot } = require("./rawVault");

const STAGING_RECEIPT_SCHEMA = "omen-football-staging-shadow.v1";
const WITNESS_SCHEMA = "omen-football-witness-observation.v1";
const RECOVERY_SCHEMA = "omen-football-primary-recovery.v1";
const DEFAULT_MAX_AGE_MS = 36 * 60 * 60 * 1000;
const DEFAULT_MIN_FREE_BYTES = 2 * 1024 * 1024 * 1024;

class StagingShadowError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "StagingShadowError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new StagingShadowError(code, message, details);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactHash(value, field) {
  const hash = String(value || "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hash)) fail("INVALID_HASH", `${field} must be an exact SHA-256`);
  return hash;
}

function iso(value, field) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) fail("INVALID_TIME", `${field} must be a valid timestamp`);
  return date.toISOString();
}

function artifactTime(value) {
  return value.replace(/[-:.]/g, "");
}

function evaluateWitness({ expectedHash, observedHash, available = observedHash !== null } = {}) {
  const expected = exactHash(expectedHash, "expectedHash");
  if (!available || observedHash === null || observedHash === undefined) {
    return {
      status: "alert",
      code: "witness_unavailable",
      expected_hash: expected,
      observed_hash: null,
      publication_authorized: false,
    };
  }
  const observed = exactHash(observedHash, "observedHash");
  if (observed !== expected) {
    return {
      status: "hard_stop",
      code: "witness_hash_mismatch",
      expected_hash: expected,
      observed_hash: observed,
      publication_authorized: false,
    };
  }
  return {
    status: "pass",
    code: "witness_match",
    expected_hash: expected,
    observed_hash: observed,
    publication_authorized: false,
  };
}

function evaluateOperationalHealth({
  generatedAt,
  now,
  freeBytes,
  minFreeBytes = DEFAULT_MIN_FREE_BYTES,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
} = {}) {
  const generated = new Date(iso(generatedAt, "generatedAt"));
  const current = new Date(iso(now, "now"));
  const free = Number(freeBytes);
  const minimum = Number(minFreeBytes);
  if (!Number.isFinite(free) || free < 0 || !Number.isFinite(minimum) || minimum < 0) {
    fail("INVALID_CAPACITY", "freeBytes and minFreeBytes must be nonnegative finite values");
  }
  if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
    fail("INVALID_FRESHNESS", "maxAgeMs must be a positive finite value");
  }
  const ageMs = current.getTime() - generated.getTime();
  if (ageMs < 0) fail("INVALID_FRESHNESS", "generatedAt must not be in the future");
  const alerts = [];
  if (ageMs > maxAgeMs) {
    alerts.push({
      code: "source_stale",
      severity: "high",
      observed_age_ms: ageMs,
      maximum_age_ms: maxAgeMs,
    });
  }
  if (free < minimum) {
    alerts.push({
      code: "disk_low",
      severity: "high",
      free_bytes: free,
      minimum_free_bytes: minimum,
    });
  }
  return {
    status: alerts.length ? "alert" : "pass",
    generated_at_utc: generated.toISOString(),
    checked_at_utc: current.toISOString(),
    age_ms: ageMs,
    free_bytes: free,
    alerts,
  };
}

function classifyPipelineFailure(error = {}) {
  const code = String(error.code || error || "UNKNOWN_PIPELINE_FAILURE");
  const sourcePending = new Set([
    "SOURCE_DEFERRED",
    "SOURCE_HTTP_ERROR",
    "SOURCE_TIMEOUT",
    "SOURCE_UNAVAILABLE",
  ]);
  const pending = sourcePending.has(code);
  return {
    status: pending ? "pending" : "quarantined",
    code,
    alert: {
      code: pending ? "source_unavailable" : "source_invalid",
      severity: pending ? "high" : "critical",
    },
    fallback_attempted: false,
    publication_authorized: false,
    promoted: false,
  };
}

function derivedComparisonKey(result) {
  return [
    result.season,
    result.season_type,
    result.week,
    result.subject_type,
    result.subject_id,
    result.ruleset_version,
  ].join("|");
}

function derivedComparable(result) {
  return JSON.stringify({
    standard: result.standard,
    half_ppr: result.half_ppr,
    ppr: result.ppr,
    publisher_reference: result.publisher_reference || null,
  });
}

function buildCorrectionCandidate({
  currentAcceptance,
  currentHash,
  previousAcceptance,
  previousHash,
} = {}) {
  const currentArtifactHash = exactHash(currentHash, "currentHash");
  const previousArtifactHash = exactHash(previousHash, "previousHash");
  if (JSON.stringify(currentAcceptance?.scope) !== JSON.stringify(previousAcceptance?.scope)) {
    fail("CORRECTION_SCOPE_MISMATCH", "correction candidates must cover the exact same scope");
  }
  if (JSON.stringify(currentAcceptance?.rulesets) !== JSON.stringify(previousAcceptance?.rulesets)) {
    fail("RULESET_CHANGE_NOT_CORRECTION", "a ruleset change is not a source correction");
  }
  const previous = new Map();
  const current = new Map();
  for (const family of ["offensive", "kicker", "dst"]) {
    for (const result of previousAcceptance?.derived?.[family] || []) {
      previous.set(derivedComparisonKey(result), { family, result });
    }
    for (const result of currentAcceptance?.derived?.[family] || []) {
      current.set(derivedComparisonKey(result), { family, result });
    }
  }
  const changedSubjects = [];
  for (const resultKey of new Set([...previous.keys(), ...current.keys()])) {
    const before = previous.get(resultKey);
    const after = current.get(resultKey);
    if (!before || !after || derivedComparable(before.result) !== derivedComparable(after.result)) {
      const selected = after || before;
      changedSubjects.push({
        family: selected.family,
        season: selected.result.season,
        week: selected.result.week,
        subject_type: selected.result.subject_type,
        subject_id: selected.result.subject_id,
        before: before ? JSON.parse(derivedComparable(before.result)) : null,
        after: after ? JSON.parse(derivedComparable(after.result)) : null,
      });
    }
  }
  changedSubjects.sort((left, right) => (
    left.week - right.week
      || left.subject_type.localeCompare(right.subject_type)
      || left.subject_id.localeCompare(right.subject_id)
  ));
  if (!changedSubjects.length) {
    return {
      status: "no_change",
      acceptance_sha256: currentArtifactHash,
      compared_to: previousArtifactHash,
      changed_subjects: [],
      publication_authorized: false,
    };
  }
  if (currentAcceptance?.source_bundle_hash === previousAcceptance?.source_bundle_hash) {
    fail("UNEXPLAINED_DERIVED_CHANGE", "derived values changed without a new source bundle or ruleset");
  }
  return {
    status: "correction_candidate",
    acceptance_sha256: currentArtifactHash,
    source_bundle_hash: currentAcceptance.source_bundle_hash,
    supersedes: previousArtifactHash,
    superseded_source_bundle_hash: previousAcceptance.source_bundle_hash,
    changed_subjects: changedSubjects,
    publication_authorized: false,
    promoted: false,
  };
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertRoleRoot(root, role) {
  const selected = assertLocalVaultRoot(root);
  const filesystemRoot = path.parse(selected).root;
  if (selected === filesystemRoot || selected === os.homedir() || selected === process.cwd()) {
    fail("UNSAFE_ROLE_ROOT", `${role} must be a dedicated staging subdirectory`);
  }
  return selected;
}

async function prepareRoleRoot(root, role) {
  const selected = assertRoleRoot(root, role);
  await fs.mkdir(selected, { recursive: true });
  const real = await fs.realpath(selected);
  assertRoleRoot(real, role);
  return real;
}

function assertDisjointRoots(roots) {
  const entries = Object.entries(roots);
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) {
      const [leftRole, leftRoot] = entries[left];
      const [rightRole, rightRoot] = entries[right];
      if (isInside(leftRoot, rightRoot) || isInside(rightRoot, leftRoot)) {
        fail("ROLE_ROOT_OVERLAP", `${leftRole} and ${rightRole} roots must be disjoint`);
      }
    }
  }
}

async function ensureDirectoryWithin(root, directory) {
  if (!isInside(root, directory)) fail("PATH_OUTSIDE_ROLE", "staging path escaped its role root");
  const relative = path.relative(root, directory);
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      await fs.mkdir(current);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    const stat = await fs.lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      fail("UNSAFE_ROLE_PATH", "staging role paths must contain only real directories");
    }
    const real = await fs.realpath(current);
    if (!isInside(root, real)) fail("PATH_OUTSIDE_ROLE", "staging directory escaped its role root");
  }
}

async function writeImmutable(root, relativePath, bytes) {
  const target = path.join(root, ...relativePath.split("/"));
  if (!isInside(root, target)) fail("PATH_OUTSIDE_ROLE", "immutable staging path escaped its role root");
  await ensureDirectoryWithin(root, path.dirname(target));
  try {
    await fs.writeFile(target, bytes, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const existing = await fs.readFile(target);
    if (existing.length !== bytes.length || sha256(existing) !== sha256(bytes)) {
      fail("IMMUTABLE_CONFLICT", `immutable staging path contains different bytes: ${relativePath}`);
    }
  }
  return target;
}

async function freeBytesFor(root, statfsImpl) {
  const stat = await statfsImpl(root);
  const free = Number(stat.bavail) * Number(stat.bsize);
  if (!Number.isFinite(free) || free < 0) fail("INVALID_CAPACITY", "filesystem capacity is unavailable");
  return free;
}

async function stageShadowAcceptance({
  acceptanceBytes,
  receiptBytes,
  primaryRoot,
  witnessRoot,
  backupRoot,
  witnessAvailable = true,
  witnessObservedHash,
  now = () => new Date(),
  statfsImpl = fs.statfs,
  minFreeBytes = DEFAULT_MIN_FREE_BYTES,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
  previousAcceptance = null,
  previousHash = null,
} = {}) {
  const validation = validateAcceptanceArtifact({ acceptanceBytes, receiptBytes });
  const acceptance = JSON.parse(Buffer.from(acceptanceBytes).toString("utf8"));
  const sourceReceipt = JSON.parse(Buffer.from(receiptBytes).toString("utf8"));
  const acceptanceHash = exactHash(validation.acceptance_sha256, "acceptance hash");
  const checkedAt = iso(now(), "now");
  assertDisjointRoots({
    primary: assertRoleRoot(primaryRoot, "primary"),
    witness: assertRoleRoot(witnessRoot, "witness"),
    backup: assertRoleRoot(backupRoot, "backup"),
  });
  const roots = {
    primary: await prepareRoleRoot(primaryRoot, "primary"),
    witness: await prepareRoleRoot(witnessRoot, "witness"),
    backup: await prepareRoleRoot(backupRoot, "backup"),
  };
  assertDisjointRoots(roots);

  const evidenceRelative = `evidence/${acceptanceHash}`;
  const primaryEvidencePath = await writeImmutable(
    roots.primary,
    `${evidenceRelative}/acceptance.json`,
    Buffer.from(acceptanceBytes),
  );
  await writeImmutable(roots.primary, `${evidenceRelative}/receipt.json`, Buffer.from(receiptBytes));
  const backupEvidencePath = await writeImmutable(
    roots.backup,
    `${evidenceRelative}/acceptance.json`,
    Buffer.from(acceptanceBytes),
  );
  await writeImmutable(roots.backup, `${evidenceRelative}/receipt.json`, Buffer.from(receiptBytes));

  const observedHash = witnessAvailable
    ? exactHash(witnessObservedHash || acceptanceHash, "witnessObservedHash")
    : null;
  const witnessEvaluation = evaluateWitness({
    expectedHash: acceptanceHash,
    observedHash,
    available: witnessAvailable,
  });
  const witnessObservation = {
    schema: WITNESS_SCHEMA,
    role: "command-center-pi-witness",
    mode: "local-staging-shadow",
    observed_at_utc: checkedAt,
    expected_hash: acceptanceHash,
    observed_hash: observedHash,
    status: witnessEvaluation.status === "pass" ? "match"
      : witnessEvaluation.status === "hard_stop" ? "mismatch" : "unavailable",
    publication_authorized: false,
  };
  const witnessObservationPath = await writeImmutable(
    roots.witness,
    `observations/${artifactTime(checkedAt)}-${acceptanceHash.slice(0, 16)}.json`,
    Buffer.from(`${JSON.stringify(witnessObservation, null, 2)}\n`),
  );

  const freeByRole = {};
  for (const [role, root] of Object.entries(roots)) {
    freeByRole[role] = await freeBytesFor(root, statfsImpl);
  }
  const health = evaluateOperationalHealth({
    generatedAt: sourceReceipt.generated_at_utc,
    now: checkedAt,
    freeBytes: Math.min(...Object.values(freeByRole)),
    minFreeBytes,
    maxAgeMs,
  });
  const alerts = [...health.alerts];
  if (witnessEvaluation.status !== "pass") {
    alerts.unshift({
      code: witnessEvaluation.code,
      severity: witnessEvaluation.status === "hard_stop" ? "critical" : "high",
    });
  }
  const correction = previousAcceptance && previousHash
    ? buildCorrectionCandidate({
      currentAcceptance: acceptance,
      currentHash: acceptanceHash,
      previousAcceptance,
      previousHash,
    })
    : null;
  const status = witnessEvaluation.status === "hard_stop" ? "quarantined"
    : witnessEvaluation.status === "alert" || health.status === "alert" ? "held"
      : "staged";
  const runId = `${artifactTime(checkedAt)}-${acceptanceHash.slice(0, 16)}`;
  const stagingReceipt = {
    schema: STAGING_RECEIPT_SCHEMA,
    run_id: runId,
    checked_at_utc: checkedAt,
    status,
    mode: "local-staging-shadow",
    acceptance_sha256: acceptanceHash,
    source_bundle_hash: validation.source_bundle_hash,
    scope: validation.scope,
    validation,
    roles: {
      primary: { root: roots.primary, evidence: "preserved" },
      witness: { root: roots.witness, status: witnessObservation.status },
      backup: { root: roots.backup, evidence: "preserved" },
    },
    health: { ...health, free_bytes_by_role: freeByRole },
    correction,
    alerts,
    publication: { authorized: false, promoted: false },
  };
  const stagingReceiptPath = await writeImmutable(
    roots.primary,
    `runs/${runId}/receipt.json`,
    Buffer.from(`${JSON.stringify(stagingReceipt, null, 2)}\n`),
  );
  return {
    acceptanceHash,
    backupEvidencePath,
    primaryEvidencePath,
    receipt: stagingReceipt,
    stagingReceiptPath,
    witnessObservation,
    witnessObservationPath,
  };
}

async function recoverPrimaryEvidence({
  acceptanceHash,
  backupRoot,
  recoveryRoot,
  witnessObservationPath,
  witnessObservation: suppliedObservation,
  now = () => new Date(),
} = {}) {
  const selectedHash = exactHash(acceptanceHash, "acceptanceHash");
  assertDisjointRoots({
    backup: assertRoleRoot(backupRoot, "backup"),
    recovery: assertRoleRoot(recoveryRoot, "recovery"),
  });
  const backup = await prepareRoleRoot(backupRoot, "backup");
  const recovery = await prepareRoleRoot(recoveryRoot, "recovery");
  assertDisjointRoots({ backup, recovery });
  const observation = suppliedObservation || JSON.parse(await fs.readFile(witnessObservationPath, "utf8"));
  if (observation?.schema !== WITNESS_SCHEMA
      || observation.status !== "match"
      || observation.observed_hash !== selectedHash
      || observation.expected_hash !== selectedHash) {
    fail("WITNESS_MISMATCH", "primary recovery requires one exact matching witness observation");
  }
  const evidenceRelative = `evidence/${selectedHash}`;
  const sourceAcceptancePath = path.join(backup, evidenceRelative, "acceptance.json");
  const sourceReceiptPath = path.join(backup, evidenceRelative, "receipt.json");
  if (!isInside(backup, sourceAcceptancePath) || !isInside(backup, sourceReceiptPath)) {
    fail("PATH_OUTSIDE_ROLE", "backup evidence escaped its role root");
  }
  const [acceptanceBytes, receiptBytes] = await Promise.all([
    fs.readFile(sourceAcceptancePath),
    fs.readFile(sourceReceiptPath),
  ]);
  if (sha256(acceptanceBytes) !== selectedHash) {
    fail("RECOVERY_HASH_MISMATCH", "backup acceptance bytes do not match the requested hash");
  }
  validateAcceptanceArtifact({ acceptanceBytes, receiptBytes });
  const acceptancePath = await writeImmutable(
    recovery,
    `${evidenceRelative}/acceptance.json`,
    acceptanceBytes,
  );
  await writeImmutable(recovery, `${evidenceRelative}/receipt.json`, receiptBytes);
  const recoveredAt = iso(now(), "recovery time");
  const recoveryReceipt = {
    schema: RECOVERY_SCHEMA,
    recovered_at_utc: recoveredAt,
    status: "recovered",
    acceptance_sha256: selectedHash,
    source_role: "backup",
    target_role: "recovered-kvm1-primary",
    witness_status: "match",
    publication: { authorized: false, promoted: false },
  };
  const receiptPath = await writeImmutable(
    recovery,
    `recoveries/${artifactTime(recoveredAt)}-${selectedHash.slice(0, 16)}.json`,
    Buffer.from(`${JSON.stringify(recoveryReceipt, null, 2)}\n`),
  );
  return { ...recoveryReceipt, acceptancePath, receiptPath };
}

function runFailureInjectionMatrix({ acceptance, acceptanceHash } = {}) {
  if (!acceptance || acceptance.schema !== "omen-football-scoring-acceptance.v1") {
    fail("INVALID_ACCEPTANCE", "failure injection requires one Phase 2 acceptance object");
  }
  const baselineHash = acceptanceHash
    ? exactHash(acceptanceHash, "acceptanceHash")
    : sha256(Buffer.from(`${JSON.stringify(acceptance, null, 2)}\n`));
  const corrected = JSON.parse(JSON.stringify(acceptance));
  corrected.source_manifests.stats_player = "f".repeat(64);
  corrected.source_bundle_hash = sha256(Buffer.from(JSON.stringify(
    Object.entries(corrected.source_manifests).sort(),
  )));
  const correctedFact = corrected.facts.offensive[0];
  const correctedResult = corrected.derived.offensive[0];
  correctedFact.receiving_yards += 10;
  correctedFact.raw_manifest_hash = corrected.source_bundle_hash;
  correctedResult.standard += 1;
  correctedResult.half_ppr += 1;
  correctedResult.ppr += 1;
  correctedResult.publisher_reference.standard += 1;
  correctedResult.publisher_reference.ppr += 1;
  correctedResult.raw_manifest_hash = corrected.source_bundle_hash;
  const correctedHash = sha256(Buffer.from(`${JSON.stringify(corrected, null, 2)}\n`));
  const now = "2026-08-25T21:00:00.000Z";
  const scenarios = [
    { name: "source_loss", result: classifyPipelineFailure({ code: "SOURCE_UNAVAILABLE" }) },
    { name: "schema_drift", result: classifyPipelineFailure({ code: "SCHEMA_DRIFT" }) },
    {
      name: "witness_mismatch",
      result: evaluateWitness({ expectedHash: baselineHash, observedHash: "e".repeat(64) }),
    },
    {
      name: "witness_unavailable",
      result: evaluateWitness({ expectedHash: baselineHash, observedHash: null }),
    },
    {
      name: "source_stale",
      result: evaluateOperationalHealth({
        generatedAt: "2026-08-23T00:00:00.000Z",
        now,
        freeBytes: DEFAULT_MIN_FREE_BYTES * 2,
      }),
    },
    {
      name: "disk_low",
      result: evaluateOperationalHealth({
        generatedAt: "2026-08-25T20:00:00.000Z",
        now,
        freeBytes: DEFAULT_MIN_FREE_BYTES - 1,
      }),
    },
    {
      name: "correction_candidate",
      fixture: "synthetic_failure_injection",
      result: buildCorrectionCandidate({
        currentAcceptance: corrected,
        currentHash: correctedHash,
        previousAcceptance: acceptance,
        previousHash: baselineHash,
      }),
    },
  ];
  const passed = scenarios.every((scenario) => {
    switch (scenario.name) {
      case "source_loss": return scenario.result.status === "pending" && !scenario.result.fallback_attempted;
      case "schema_drift": return scenario.result.status === "quarantined";
      case "witness_mismatch": return scenario.result.status === "hard_stop";
      case "witness_unavailable": return scenario.result.status === "alert";
      case "source_stale": return scenario.result.alerts.some((alert) => alert.code === "source_stale");
      case "disk_low": return scenario.result.alerts.some((alert) => alert.code === "disk_low");
      case "correction_candidate": return scenario.result.status === "correction_candidate";
      default: return false;
    }
  });
  return {
    schema: "omen-football-failure-injection.v1",
    status: passed ? "pass" : "fail",
    mode: "synthetic_failure_injection",
    baseline_acceptance_sha256: baselineHash,
    scenarios,
    publication_authorized: false,
    promoted: false,
  };
}

module.exports = {
  DEFAULT_MAX_AGE_MS,
  DEFAULT_MIN_FREE_BYTES,
  RECOVERY_SCHEMA,
  STAGING_RECEIPT_SCHEMA,
  StagingShadowError,
  WITNESS_SCHEMA,
  buildCorrectionCandidate,
  classifyPipelineFailure,
  evaluateOperationalHealth,
  evaluateWitness,
  recoverPrimaryEvidence,
  runFailureInjectionMatrix,
  stageShadowAcceptance,
};
