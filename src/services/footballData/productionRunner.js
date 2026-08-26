"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { validateAcceptanceArtifact } = require("./acceptanceValidator");
const { captureSnapshot, readExactSnapshot } = require("./rawVault");

const PHASE3_ACCEPTANCE_SHA256 = "5c4cbc0568ce85a94512b7722144a7cddcb83fe74bd088f04d90f7a628a00bea";

const REQUIRED_ALERT_CODES = Object.freeze([
  "job_failure",
  "source_loss",
  "schema_drift",
  "stale_data",
  "disk_low",
  "witness_mismatch",
  "witness_outage",
]);

const FIXED_CONTAINER_STATE_ROOT = "/state";

const FAILURE_ALERTS = Object.freeze({
  RUNNER_EXIT: "job_failure",
  JOB_FAILURE: "job_failure",
  SOURCE_DEFERRED: "source_loss",
  SOURCE_HTTP_ERROR: "source_loss",
  SOURCE_TIMEOUT: "source_loss",
  SOURCE_UNAVAILABLE: "source_loss",
  SOURCE_LOSS: "source_loss",
  CONTENT_TYPE_MISMATCH: "schema_drift",
  EMPTY_SNAPSHOT: "schema_drift",
  INVALID_MANIFEST: "schema_drift",
  RAW_HASH_MISMATCH: "schema_drift",
  SCHEMA_DRIFT: "schema_drift",
  SCHEMA_FINGERPRINT_MISMATCH: "schema_drift",
  SOURCE_STALE: "stale_data",
  DISK_LOW: "disk_low",
  WITNESS_MISMATCH: "witness_mismatch",
  WITNESS_HASH_MISMATCH: "witness_mismatch",
  WITNESS_OUTAGE: "witness_outage",
  WITNESS_UNAVAILABLE: "witness_outage",
});

function normalizeSeason(value) {
  const season = Number(value);
  if (!Number.isInteger(season) || season < 1999 || season > 2100) {
    throw new Error("season must be an integer from 1999 through 2100");
  }
  return season;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const allowedCommands = new Set([
    "capture-set",
    "validate-batch",
    "status",
    "import-phase3",
    "recover-phase3",
    "publish",
  ]);
  if (!allowedCommands.has(command)) throw new Error("unsupported production command");
  const allowed = {
    "capture-set": new Set(["season"]),
    "validate-batch": new Set(["batch-id"]),
    status: new Set(),
    "import-phase3": new Set(),
    "recover-phase3": new Set(),
    publish: new Set(["acceptance-sha256", "witness-observation"]),
  }[command];
  const result = { command };
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index];
    const value = rest[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`invalid argument near ${key || "(missing)"}`);
    }
    const name = key.slice(2);
    if (!allowed.has(name)) throw new Error(`unsupported option --${name}`);
    if (Object.hasOwn(result, name)) throw new Error(`duplicate option --${name}`);
    result[name] = value;
  }
  if (command === "capture-set") {
    result.season = normalizeSeason(result.season ?? new Date().getUTCFullYear());
  }
  if (command === "validate-batch" && !result["batch-id"]) {
    throw new Error("validate-batch requires --batch-id");
  }
  if (command === "publish" && (!result["acceptance-sha256"] || !result["witness-observation"])) {
    throw new Error("publish requires an exact acceptance SHA-256 and witness observation id");
  }
  return result;
}

function classifyProductionFailure(error = {}) {
  const alertCode = FAILURE_ALERTS[String(error.code || error)] || "job_failure";
  return {
    code: alertCode,
    severity: alertCode === "schema_drift" || alertCode === "witness_mismatch" ? "critical" : "high",
  };
}

function exactHash(value, field) {
  const hash = String(value || "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error(`${field} must be an exact SHA-256`);
  return hash;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function timestampId(value) {
  return new Date(value).toISOString().replace(/[-:.]/g, "");
}

function safeBatchId(value) {
  const selected = String(value || "");
  if (!/^[0-9TZ]{16,32}-[a-f0-9]{16}$/.test(selected)) throw new Error("batch id is invalid");
  return selected;
}

function inside(root, candidate, field) {
  const selectedRoot = path.resolve(root);
  const selected = path.resolve(candidate);
  const relative = path.relative(selectedRoot, selected);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) return selected;
  throw new Error(`${field} escaped the fixed state root`);
}

async function writeImmutableJson(root, relativePath, value) {
  const selected = inside(root, path.join(root, relativePath), "immutable JSON path");
  await fs.mkdir(path.dirname(selected), { recursive: true });
  await fs.writeFile(selected, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  return selected;
}

async function writeImmutableBytes(root, relativePath, value) {
  const selected = inside(root, path.join(root, relativePath), "immutable byte path");
  await fs.mkdir(path.dirname(selected), { recursive: true });
  try {
    await fs.writeFile(selected, value, { flag: "wx", mode: 0o640 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const current = await fs.readFile(selected);
    if (current.length !== value.length || !crypto.timingSafeEqual(current, value)) {
      throw new Error("immutable evidence conflict");
    }
  }
  return selected;
}

async function writeMutableJson(root, relativePath, value) {
  const selected = inside(root, path.join(root, relativePath), "mutable JSON path");
  await fs.mkdir(path.dirname(selected), { recursive: true });
  const temporary = `${selected}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o640 });
  await fs.rename(temporary, selected);
  return selected;
}

function buildPayloadFreeStatus({ generatedAt, job, state, batchId = null, datasets = {}, alerts = [] } = {}) {
  const generated = new Date(generatedAt);
  if (Number.isNaN(generated.getTime())) throw new Error("generatedAt must be a valid timestamp");
  if (!/^[a-z][a-z0-9-]{1,63}$/.test(String(job || ""))) throw new Error("job is invalid");
  if (!["pass", "pending", "quarantined", "failed"].includes(state)) throw new Error("state is invalid");
  const selectedDatasets = {};
  for (const name of ["stats_player", "stats_team", "schedules"]) {
    if (!datasets[name]) continue;
    selectedDatasets[name] = {
      sha256: exactHash(datasets[name].sha256, `${name}.sha256`),
      byte_length: Number(datasets[name].byteLength),
    };
    if (!Number.isInteger(selectedDatasets[name].byte_length) || selectedDatasets[name].byte_length < 1) {
      throw new Error(`${name}.byteLength must be a positive integer`);
    }
  }
  return {
    schema: "omen-football-production-status.v1",
    generated_at_utc: generated.toISOString(),
    job,
    state,
    batch_id: batchId,
    datasets: selectedDatasets,
    alerts: alerts.map((alert) => ({
      code: REQUIRED_ALERT_CODES.includes(alert.code) ? alert.code : "job_failure",
      severity: alert.severity === "critical" ? "critical" : "high",
    })),
    publication_authorized: false,
    production_scoring_authorized: false,
  };
}

async function captureProductionSet({
  stateRoot = FIXED_CONTAINER_STATE_ROOT,
  season,
  now = () => new Date(),
  captureImpl = captureSnapshot,
} = {}) {
  const selectedRoot = path.resolve(stateRoot);
  const vaultRoot = inside(selectedRoot, path.join(selectedRoot, "vault"), "vault root");
  const capturedAt = now().toISOString();
  const datasets = {};
  for (const dataset of ["stats_player", "stats_team", "schedules"]) {
    const result = await captureImpl({
      dataset,
      season: normalizeSeason(season),
      root: vaultRoot,
      userAgent: "OmenFootballDataCollector/1.0 (production)",
    });
    const manifestBytes = await fs.readFile(result.manifestPath);
    datasets[dataset] = {
      snapshot_id: result.manifest.snapshot_id,
      manifest_path: path.relative(selectedRoot, result.manifestPath).split(path.sep).join("/"),
      manifest_sha256: sha256(manifestBytes),
      raw_sha256: exactHash(result.manifest.raw.sha256, `${dataset}.raw.sha256`),
      raw_byte_length: result.manifest.raw.byte_length,
      raw_created: result.rawCreated,
    };
  }
  const identity = sha256(Buffer.from(JSON.stringify(Object.entries(datasets))));
  const batchId = `${timestampId(capturedAt)}-${identity.slice(0, 16)}`;
  const batch = {
    schema: "omen-football-production-capture-batch.v1",
    batch_id: batchId,
    captured_at_utc: capturedAt,
    season: normalizeSeason(season),
    datasets,
    publication_authorized: false,
    production_scoring_authorized: false,
  };
  const batchPath = await writeImmutableJson(selectedRoot, `batches/${batchId}.json`, batch);
  const status = buildPayloadFreeStatus({
    generatedAt: capturedAt,
    job: "capture-set",
    state: "pass",
    batchId,
    datasets: Object.fromEntries(Object.entries(datasets).map(([name, value]) => [name, {
      sha256: value.raw_sha256,
      byteLength: value.raw_byte_length,
    }])),
  });
  await Promise.all([
    writeMutableJson(selectedRoot, "status/current.json", status),
    writeMutableJson(selectedRoot, "exports/status.json", status),
  ]);
  return { batch, batchPath, status };
}

async function validateProductionBatch({
  stateRoot = FIXED_CONTAINER_STATE_ROOT,
  batchId,
  now = () => new Date(),
  readImpl = readExactSnapshot,
} = {}) {
  const selectedRoot = path.resolve(stateRoot);
  const selectedBatchId = safeBatchId(batchId);
  const batchPath = inside(selectedRoot, path.join(selectedRoot, "batches", `${selectedBatchId}.json`), "batch path");
  const batch = JSON.parse(await fs.readFile(batchPath, "utf8"));
  if (batch.schema !== "omen-football-production-capture-batch.v1" || batch.batch_id !== selectedBatchId) {
    throw new Error("capture batch identity is invalid");
  }
  const verified = {};
  for (const dataset of ["stats_player", "stats_team", "schedules"]) {
    const evidence = batch.datasets?.[dataset];
    if (!evidence) throw new Error(`capture batch is missing ${dataset}`);
    const manifestPath = inside(selectedRoot, path.join(selectedRoot, evidence.manifest_path), `${dataset} manifest path`);
    const exact = await readImpl({
      root: inside(selectedRoot, path.join(selectedRoot, "vault"), "vault root"),
      manifestPath,
      expectedDataset: dataset,
    });
    if (exact.manifestHash !== evidence.manifest_sha256
        || exact.manifest.raw.sha256 !== evidence.raw_sha256) {
      throw new Error(`${dataset} exact manifest binding failed`);
    }
    verified[dataset] = {
      manifest_sha256: evidence.manifest_sha256,
      raw_sha256: evidence.raw_sha256,
    };
  }
  const receipt = {
    schema: "omen-football-production-validation.v1",
    validated_at_utc: now().toISOString(),
    status: "pass",
    batch_id: selectedBatchId,
    datasets: verified,
    publication_authorized: false,
    production_scoring_authorized: false,
  };
  const receiptPath = await writeImmutableJson(
    selectedRoot,
    `validations/${selectedBatchId}.json`,
    receipt,
  );
  return { receipt, receiptPath };
}

async function importPhase3Evidence({ stateRoot = FIXED_CONTAINER_STATE_ROOT, now = () => new Date() } = {}) {
  const selectedRoot = path.resolve(stateRoot);
  const inputRoot = inside(selectedRoot, path.join(selectedRoot, "inbox", "phase3"), "phase3 inbox");
  const acceptanceBytes = await fs.readFile(path.join(inputRoot, "acceptance.json"));
  const receiptBytes = await fs.readFile(path.join(inputRoot, "receipt.json"));
  const acceptanceHash = sha256(acceptanceBytes);
  if (acceptanceHash !== PHASE3_ACCEPTANCE_SHA256) {
    throw new Error("Phase 3 acceptance bytes do not match the immutable readiness hash");
  }
  const validated = validateAcceptanceArtifact({ acceptanceBytes, receiptBytes });
  if (validated.acceptance_sha256 !== PHASE3_ACCEPTANCE_SHA256) {
    throw new Error("Phase 3 receipt is not bound to the immutable readiness hash");
  }
  const evidenceRoot = `evidence/${PHASE3_ACCEPTANCE_SHA256}`;
  const acceptancePath = await writeImmutableBytes(
    selectedRoot,
    `${evidenceRoot}/acceptance.json`,
    acceptanceBytes,
  );
  const receiptPath = await writeImmutableBytes(selectedRoot, `${evidenceRoot}/receipt.json`, receiptBytes);
  const importReceipt = {
    schema: "omen-football-production-import.v1",
    imported_at_utc: now().toISOString(),
    acceptance_sha256: PHASE3_ACCEPTANCE_SHA256,
    validation_status: "pass",
    publication_authorized: false,
    production_scoring_authorized: false,
  };
  const importPath = await writeImmutableJson(
    selectedRoot,
    `imports/${timestampId(importReceipt.imported_at_utc)}-${PHASE3_ACCEPTANCE_SHA256.slice(0, 16)}.json`,
    importReceipt,
  );
  return { acceptancePath, receiptPath, importPath, receipt: importReceipt };
}

async function recoverPhase3Evidence({
  stateRoot = FIXED_CONTAINER_STATE_ROOT,
  backupRoot = "/backup",
  recoveryRoot = "/recovery",
  now = () => new Date(),
} = {}) {
  const selectedState = path.resolve(stateRoot);
  const selectedBackup = path.resolve(backupRoot);
  const selectedRecovery = path.resolve(recoveryRoot);
  const observation = JSON.parse(await fs.readFile(
    inside(selectedState, path.join(selectedState, "witness", "phase3-observation.json"), "witness observation"),
    "utf8",
  ));
  if (observation.schema !== "omen-football-witness-observation.v1"
      || observation.status !== "match"
      || observation.expected_hash !== PHASE3_ACCEPTANCE_SHA256
      || observation.observed_hash !== PHASE3_ACCEPTANCE_SHA256) {
    throw new Error("fresh-root recovery requires an exact matching witness observation");
  }
  const source = inside(
    selectedBackup,
    path.join(selectedBackup, "evidence", PHASE3_ACCEPTANCE_SHA256),
    "backup evidence",
  );
  const acceptanceBytes = await fs.readFile(path.join(source, "acceptance.json"));
  const receiptBytes = await fs.readFile(path.join(source, "receipt.json"));
  if (sha256(acceptanceBytes) !== PHASE3_ACCEPTANCE_SHA256) {
    throw new Error("backup acceptance bytes do not match the requested Phase 3 hash");
  }
  validateAcceptanceArtifact({ acceptanceBytes, receiptBytes });
  const entries = await fs.readdir(selectedRecovery).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  if (entries.length) throw new Error("fresh-root recovery target must start empty");
  await fs.mkdir(selectedRecovery, { recursive: true });
  const relative = `evidence/${PHASE3_ACCEPTANCE_SHA256}`;
  const acceptancePath = await writeImmutableBytes(selectedRecovery, `${relative}/acceptance.json`, acceptanceBytes);
  await writeImmutableBytes(selectedRecovery, `${relative}/receipt.json`, receiptBytes);
  const recoveryReceipt = {
    schema: "omen-football-production-recovery.v1",
    recovered_at_utc: now().toISOString(),
    acceptance_sha256: PHASE3_ACCEPTANCE_SHA256,
    witness_status: "match",
    status: "recovered",
    publication_authorized: false,
    production_scoring_authorized: false,
  };
  const receiptPath = await writeImmutableJson(
    selectedRecovery,
    `recoveries/${timestampId(recoveryReceipt.recovered_at_utc)}-${PHASE3_ACCEPTANCE_SHA256.slice(0, 16)}.json`,
    recoveryReceipt,
  );
  return { acceptancePath, receiptPath, receipt: recoveryReceipt };
}

async function publishAcceptance({
  stateRoot = FIXED_CONTAINER_STATE_ROOT,
  acceptanceSha256,
  witnessObservation,
  now = () => new Date(),
} = {}) {
  const selectedRoot = path.resolve(stateRoot);
  const selectedHash = exactHash(acceptanceSha256, "acceptanceSha256");
  if (selectedHash !== PHASE3_ACCEPTANCE_SHA256) throw new Error("publication input is not admitted");
  const control = await fs.readFile(path.join(selectedRoot, "control", "publication-enabled"), "utf8")
    .catch((error) => (error.code === "ENOENT" ? "" : Promise.reject(error)));
  if (control !== "enabled\n") throw new Error("publication is disabled");
  const observationId = String(witnessObservation || "");
  if (observationId !== "phase3-observation" && !/^[0-9TZ]{16,40}-[a-f0-9]{16}$/.test(observationId)) {
    throw new Error("witness observation id is invalid");
  }
  const observation = JSON.parse(await fs.readFile(
    inside(selectedRoot, path.join(selectedRoot, "witness", `${observationId}.json`), "witness observation"),
    "utf8",
  ));
  if (observation.status !== "match"
      || observation.expected_hash !== selectedHash
      || observation.observed_hash !== selectedHash) {
    throw new Error("publication requires a matching exact witness observation");
  }
  const acceptancePath = inside(
    selectedRoot,
    path.join(selectedRoot, "evidence", selectedHash, "acceptance.json"),
    "acceptance evidence",
  );
  if (sha256(await fs.readFile(acceptancePath)) !== selectedHash) throw new Error("publication evidence hash drift");
  const publishedAt = now().toISOString();
  const publicationId = `${timestampId(publishedAt)}-${selectedHash.slice(0, 16)}`;
  const publication = {
    schema: "omen-football-publication.v1",
    publication_id: publicationId,
    published_at_utc: publishedAt,
    acceptance_sha256: selectedHash,
    witness_observation_id: observationId,
    attribution: "Data sourced from nflverse-data under CC BY 4.0.",
    authorized: true,
    promoted: true,
    production_scoring_authorized: false,
  };
  const publicationPath = await writeImmutableJson(
    selectedRoot,
    `published/${publicationId}.json`,
    publication,
  );
  return { publication, publicationPath };
}

async function recordProductionFailure({
  stateRoot = FIXED_CONTAINER_STATE_ROOT,
  command,
  error,
  now = () => new Date(),
} = {}) {
  const alert = classifyProductionFailure(error);
  const alerts = [{ code: "job_failure", severity: "high" }];
  if (alert.code !== "job_failure") alerts.push(alert);
  const status = buildPayloadFreeStatus({
    generatedAt: now().toISOString(),
    job: String(command || "job-failure").replace(/[^a-z0-9-]/g, "-").slice(0, 64),
    state: alert.code === "source_loss" ? "pending" : "failed",
    alerts,
  });
  await Promise.all([
    writeMutableJson(path.resolve(stateRoot), "status/current.json", status),
    writeMutableJson(path.resolve(stateRoot), "exports/status.json", status),
  ]);
  return status;
}

module.exports = {
  FIXED_CONTAINER_STATE_ROOT,
  PHASE3_ACCEPTANCE_SHA256,
  REQUIRED_ALERT_CODES,
  buildPayloadFreeStatus,
  captureProductionSet,
  classifyProductionFailure,
  importPhase3Evidence,
  parseArgs,
  publishAcceptance,
  recordProductionFailure,
  recoverPhase3Evidence,
  validateProductionBatch,
};
