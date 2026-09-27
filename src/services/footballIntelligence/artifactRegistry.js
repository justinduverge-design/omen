"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { assertSourceAdmission } = require("./sourceRegistry");
const { validateArtifact } = require("./validateArtifact");

const RECEIPT_SCHEMA = "football-intelligence-source-receipt.v1";
const INDEX_SCHEMA = "football-intelligence-artifact-index.v1";
const REGISTRY_VERSION = "football-intelligence-artifact-registry.v1";
const DERIVED_RECEIPT_SCHEMA = "football-intelligence-derived-receipt.v1";
const PRODUCTION_ROOT = path.resolve("/var/lib/omen-football-intelligence");
const MAX_ARTIFACT_BYTES = 512 * 1024 * 1024;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const RECEIPT_ID = /^receipt:[a-f0-9]{64}$/;

class ArtifactRegistryError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "ArtifactRegistryError";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new ArtifactRegistryError(code, message, options);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function stable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}

function requireString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    fail("INVALID_SOURCE_RECEIPT", `${field} must be a non-empty string`);
  }
  return value.trim();
}

function toIso(value, field) {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) fail("INVALID_SOURCE_RECEIPT", `${field} must be a valid time`);
  return date.toISOString();
}

function assertLocalRoot(root) {
  if (typeof root !== "string" || !root.trim()) {
    fail("LOCAL_ROOT_REQUIRED", "an explicit local artifact root is required");
  }
  const resolved = path.resolve(root);
  const relative = path.relative(PRODUCTION_ROOT, resolved);
  if (resolved === PRODUCTION_ROOT || (relative && !relative.startsWith("..") && !path.isAbsolute(relative))) {
    fail("PRODUCTION_ROOT_REFUSED", "the local registry refuses the production artifact root");
  }
  return resolved;
}

function inside(root, candidate) {
  const resolved = path.resolve(candidate);
  const relative = path.relative(root, resolved);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) return resolved;
  fail("PATH_OUTSIDE_REGISTRY", "artifact path must remain inside the registry root");
}

async function ensureSafeDirectory(root, relativePath) {
  let current = root;
  for (const segment of relativePath.split("/").filter(Boolean)) {
    current = inside(root, path.join(current, segment));
    try {
      await fs.mkdir(current);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    const stat = await fs.lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      fail("UNSAFE_REGISTRY_PATH", "registry directories must not traverse symbolic links");
    }
  }
}

async function prepareRoot(root) {
  const selected = assertLocalRoot(root);
  await fs.mkdir(selected, { recursive: true });
  const real = await fs.realpath(selected);
  assertLocalRoot(real);
  for (const directory of ["objects/sha256", "receipts", "derived-receipts", "indexes"]) {
    await ensureSafeDirectory(real, directory);
  }
  return real;
}

async function writeImmutable(filePath, bytes) {
  try {
    const handle = await fs.open(filePath, "wx", 0o600);
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    return true;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const existing = await fs.readFile(filePath);
    if (!existing.equals(bytes)) {
      fail("IMMUTABLE_CONFLICT", `immutable path already contains different bytes: ${filePath}`);
    }
    return false;
  }
}

async function writeProjection(filePath, value) {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  const temporary = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  await fs.writeFile(temporary, bytes, { mode: 0o600, flag: "wx" });
  await fs.rename(temporary, filePath);
}

function validateSource(source, intendedUse) {
  if (!source || typeof source !== "object") fail("INVALID_SOURCE_RECEIPT", "source is required");
  const rights = source.rights;
  if (!rights || typeof rights !== "object") fail("INVALID_SOURCE_RECEIPT", "source.rights is required");
  const validated = {
    family: requireString(source.family, "source.family"),
    owner: requireString(source.owner, "source.owner"),
    release: requireString(source.release, "source.release"),
    source_url: requireString(source.source_url, "source.source_url"),
    upstream_updated_at_utc: toIso(source.upstream_updated_at_utc, "source.upstream_updated_at_utc"),
    rights: {
      license: requireString(rights.license, "source.rights.license"),
      license_url: requireString(rights.license_url, "source.rights.license_url"),
      attribution: requireString(rights.attribution, "source.rights.attribution"),
    },
  };
  assertSourceAdmission({
    family: validated.family,
    intendedUse,
    owner: validated.owner,
    license: validated.rights.license,
  }, fail);
  return validated;
}

function validateCoverage(coverage) {
  if (!coverage || typeof coverage !== "object") {
    fail("INVALID_SOURCE_RECEIPT", "coverage is required");
  }
  const output = {};
  for (const [key, value] of Object.entries(coverage).sort(([a], [b]) => a.localeCompare(b))) {
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      fail("INVALID_SOURCE_RECEIPT", `coverage.${key} must be null or a non-negative number`);
    }
    output[key] = value;
  }
  if (!Object.keys(output).length) fail("INVALID_SOURCE_RECEIPT", "coverage cannot be empty");
  return output;
}

function artifactPath(root, digest) {
  return inside(root, path.join(root, "objects", "sha256", digest.slice(0, 2), digest));
}

function receiptPath(root, digest) {
  return inside(root, path.join(root, "receipts", `${digest}.json`));
}

function derivedReceiptPath(root, digest) {
  return inside(root, path.join(root, "derived-receipts", `${digest}.json`));
}

function receiptDigest(receipt) {
  const unsigned = { ...receipt };
  delete unsigned.receipt_id;
  return sha256(Buffer.from(stable(unsigned)));
}

async function listJsonFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

function createLocalArtifactRegistry({ root, clock = () => new Date() }) {
  const selectedRoot = assertLocalRoot(root);

  async function ready() {
    return prepareRoot(selectedRoot);
  }

  async function readArtifact(artifactId) {
    if (!SHA256.test(artifactId || "")) fail("INVALID_ARTIFACT_ID", "artifact id must be sha256:<digest>");
    const registryRoot = await ready();
    const digest = artifactId.slice("sha256:".length);
    let bytes;
    try {
      bytes = await fs.readFile(artifactPath(registryRoot, digest));
    } catch (error) {
      if (error.code === "ENOENT") fail("ARTIFACT_NOT_FOUND", `artifact not found: ${artifactId}`);
      throw error;
    }
    if (sha256(bytes) !== digest) fail("ARTIFACT_HASH_MISMATCH", `artifact failed hash verification: ${artifactId}`);
    return bytes;
  }

  async function getReceipt(receiptId) {
    if (!RECEIPT_ID.test(receiptId || "")) fail("INVALID_RECEIPT_ID", "receipt id must be receipt:<digest>");
    const registryRoot = await ready();
    const digest = receiptId.slice("receipt:".length);
    let bytes;
    try {
      bytes = await fs.readFile(receiptPath(registryRoot, digest));
    } catch (error) {
      if (error.code === "ENOENT") fail("RECEIPT_NOT_FOUND", `receipt not found: ${receiptId}`);
      throw error;
    }
    let receipt;
    try {
      receipt = JSON.parse(bytes);
    } catch (error) {
      fail("INVALID_RECEIPT", `receipt is not valid JSON: ${receiptId}`, { cause: error });
    }
    if (receiptDigest(receipt) !== digest) fail("RECEIPT_HASH_MISMATCH", `receipt failed hash verification: ${receiptId}`);
    if (receipt.receipt_id !== receiptId) fail("RECEIPT_ID_MISMATCH", `receipt self-id does not match: ${receiptId}`);
    return receipt;
  }

  async function replayReceipt(receiptId) {
    const receipt = await getReceipt(receiptId);
    const bytes = await readArtifact(receipt.artifact.sha256);
    if (bytes.length !== receipt.artifact.byte_length) {
      fail("ARTIFACT_LENGTH_MISMATCH", `artifact byte length does not match receipt: ${receiptId}`);
    }
    return Object.freeze({ receipt, bytes });
  }

  async function getDerivedReceipt(receiptId) {
    if (!RECEIPT_ID.test(receiptId || "")) fail("INVALID_RECEIPT_ID", "receipt id must be receipt:<digest>");
    const registryRoot = await ready();
    const digest = receiptId.slice("receipt:".length);
    let bytes;
    try {
      bytes = await fs.readFile(derivedReceiptPath(registryRoot, digest));
    } catch (error) {
      if (error.code === "ENOENT") fail("DERIVED_RECEIPT_NOT_FOUND", `derived receipt not found: ${receiptId}`);
      throw error;
    }
    let receipt;
    try {
      receipt = JSON.parse(bytes);
    } catch (error) {
      fail("INVALID_RECEIPT", `derived receipt is not valid JSON: ${receiptId}`, { cause: error });
    }
    if (receiptDigest(receipt) !== digest) fail("RECEIPT_HASH_MISMATCH", `derived receipt failed hash verification: ${receiptId}`);
    if (receipt.receipt_id !== receiptId || receipt.schema !== DERIVED_RECEIPT_SCHEMA) {
      fail("RECEIPT_ID_MISMATCH", `derived receipt identity does not match: ${receiptId}`);
    }
    return receipt;
  }

  async function replayReadModel(receiptId) {
    const receipt = await getDerivedReceipt(receiptId);
    const bytes = await readArtifact(receipt.artifact.sha256);
    if (bytes.length !== receipt.artifact.byte_length) fail("ARTIFACT_LENGTH_MISMATCH", `read model length does not match receipt: ${receiptId}`);
    let readModel;
    try {
      readModel = JSON.parse(bytes);
    } catch (error) {
      fail("INVALID_DERIVED_ARTIFACT", `read model is not valid JSON: ${receiptId}`, { cause: error });
    }
    validateArtifact(readModel);
    if (readModel.output_hash !== receipt.validation.output_hash) fail("DERIVED_OUTPUT_MISMATCH", `read model output hash does not match receipt: ${receiptId}`);
    return Object.freeze({ receipt, read_model: readModel, bytes });
  }

  async function rebuildIndex() {
    const registryRoot = await ready();
    const receipts = [];
    for (const file of await listJsonFiles(path.join(registryRoot, "receipts"))) {
      const digest = path.basename(file, ".json");
      receipts.push(await getReceipt(`receipt:${digest}`));
    }
    receipts.sort((a, b) => a.receipt_id.localeCompare(b.receipt_id));
    const artifacts = new Map();
    const sources = {};
    for (const receipt of receipts) {
      const current = artifacts.get(receipt.artifact.sha256) || {
        artifact_id: receipt.artifact.sha256,
        byte_length: receipt.artifact.byte_length,
        media_type: receipt.artifact.media_type,
        receipt_ids: [],
      };
      current.receipt_ids.push(receipt.receipt_id);
      artifacts.set(current.artifact_id, current);
      const family = receipt.source.family;
      const source = sources[family] || { artifact_count: 0, receipt_count: 0, latest_receipt_id: null };
      source.receipt_count += 1;
      sources[family] = source;
    }
    for (const family of Object.keys(sources)) {
      const familyReceipts = receipts
        .filter((receipt) => receipt.source.family === family)
        .sort((a, b) => a.captured_at_utc.localeCompare(b.captured_at_utc) || a.receipt_id.localeCompare(b.receipt_id));
      sources[family].artifact_count = new Set(familyReceipts.map((receipt) => receipt.artifact.sha256)).size;
      sources[family].latest_receipt_id = familyReceipts.at(-1).receipt_id;
    }
    const index = {
      schema: INDEX_SCHEMA,
      registry_version: REGISTRY_VERSION,
      generated_at_utc: toIso(clock(), "clock"),
      artifacts: [...artifacts.values()].sort((a, b) => a.artifact_id.localeCompare(b.artifact_id)),
      receipts: receipts.map((receipt) => ({
        receipt_id: receipt.receipt_id,
        artifact_id: receipt.artifact.sha256,
        source_family: receipt.source.family,
        captured_at_utc: receipt.captured_at_utc,
        supersedes_artifact_id: receipt.supersession?.supersedes_artifact_id || null,
      })),
      sources: Object.fromEntries(Object.entries(sources).sort(([a], [b]) => a.localeCompare(b))),
    };
    await writeProjection(path.join(registryRoot, "indexes", "registry.json"), index);
    return index;
  }

  async function registerSourceArtifact(input) {
    if (!input || typeof input !== "object") fail("INVALID_SOURCE_RECEIPT", "artifact input is required");
    const bytes = Buffer.isBuffer(input.bytes) ? input.bytes : Buffer.from(input.bytes || "");
    if (!bytes.length) fail("INVALID_SOURCE_RECEIPT", "artifact bytes cannot be empty");
    if (bytes.length > MAX_ARTIFACT_BYTES) {
      fail("ARTIFACT_TOO_LARGE", `artifact exceeds the ${MAX_ARTIFACT_BYTES}-byte local registry limit`);
    }
    const intendedUse = requireString(input.intended_use, "intended_use");
    const source = validateSource(input.source, intendedUse);
    const schemaFingerprint = requireString(input.schema_fingerprint, "schema_fingerprint");
    if (!SHA256.test(schemaFingerprint)) {
      fail("INVALID_SOURCE_RECEIPT", "schema_fingerprint must be sha256:<digest>");
    }
    if (!Number.isInteger(input.row_count) || input.row_count < 0) {
      fail("INVALID_SOURCE_RECEIPT", "row_count must be a non-negative integer");
    }
    const artifactType = requireString(input.artifact_type, "artifact_type");
    const mediaType = requireString(input.media_type, "media_type");
    const coverage = validateCoverage(input.coverage);
    const observedEventTime = input.observed_event_time ? {
      from: toIso(input.observed_event_time.from, "observed_event_time.from"),
      through: toIso(input.observed_event_time.through, "observed_event_time.through"),
    } : null;
    if (observedEventTime && observedEventTime.from > observedEventTime.through) {
      fail("INVALID_SOURCE_RECEIPT", "observed event-time range is reversed");
    }
    const registryRoot = await ready();
    const digest = sha256(bytes);
    const artifactId = `sha256:${digest}`;
    const supersedes = input.supersedes_artifact_id || null;
    if (supersedes !== null) {
      if (!SHA256.test(supersedes) || supersedes === artifactId) {
        fail("INVALID_SUPERSESSION", "supersession must name a different sha256 artifact");
      }
      try {
        await readArtifact(supersedes);
      } catch (error) {
        if (error.code === "ARTIFACT_NOT_FOUND") {
          fail("SUPERSEDED_ARTIFACT_NOT_FOUND", `superseded artifact is absent: ${supersedes}`);
        }
        throw error;
      }
      requireString(input.correction_reason, "correction_reason");
    }
    await ensureSafeDirectory(registryRoot, `objects/sha256/${digest.slice(0, 2)}`);
    const objectPath = artifactPath(registryRoot, digest);
    const artifactCreated = await writeImmutable(objectPath, bytes);
    const receipt = {
      schema: RECEIPT_SCHEMA,
      registry_version: REGISTRY_VERSION,
      receipt_id: null,
      artifact_type: artifactType,
      captured_at_utc: toIso(clock(), "clock"),
      intended_use: intendedUse,
      source,
      artifact: {
        sha256: artifactId,
        byte_length: bytes.length,
        media_type: mediaType,
        object_path: `objects/sha256/${digest.slice(0, 2)}/${digest}`,
      },
      schema_fingerprint: schemaFingerprint,
      row_count: input.row_count,
      observed_event_time: observedEventTime,
      coverage,
      supersession: supersedes ? {
        supersedes_artifact_id: supersedes,
        reason: input.correction_reason.trim(),
      } : null,
      publication: { authorized: false, state: "captured" },
    };
    const digestReceipt = receiptDigest(receipt);
    receipt.receipt_id = `receipt:${digestReceipt}`;
    // The identifier is derived with receipt_id omitted; verification follows the same rule.
    const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
    const receiptFile = receiptPath(registryRoot, digestReceipt);
    let receiptCreated;
    try {
      receiptCreated = await writeImmutable(receiptFile, receiptBytes);
    } catch (error) {
      throw error;
    }
    await rebuildIndex();
    return {
      artifact_id: artifactId,
      receipt_id: receipt.receipt_id,
      created: { artifact: artifactCreated, receipt: receiptCreated },
      paths: { artifact: objectPath, receipt: receiptFile, index: path.join(registryRoot, "indexes", "registry.json") },
    };
  }

  async function registerReadModel(input) {
    if (!input || typeof input !== "object") fail("INVALID_DERIVED_ARTIFACT", "read-model input is required");
    const validation = validateArtifact(input.readModel);
    if (!Array.isArray(input.source_artifact_ids) || input.source_artifact_ids.length === 0) {
      fail("INVALID_DERIVED_ARTIFACT", "source_artifact_ids must be non-empty");
    }
    const sourceArtifactIds = [...new Set(input.source_artifact_ids)].sort();
    if (sourceArtifactIds.length !== input.source_artifact_ids.length) fail("INVALID_DERIVED_ARTIFACT", "source_artifact_ids cannot contain duplicates");
    for (const artifactId of sourceArtifactIds) {
      try {
        await readArtifact(artifactId);
      } catch (error) {
        if (error.code === "ARTIFACT_NOT_FOUND") fail("SOURCE_ARTIFACT_NOT_FOUND", `read-model source artifact is absent: ${artifactId}`);
        throw error;
      }
    }
    const effectiveWindow = input.effective_window;
    if (!effectiveWindow?.from || !effectiveWindow?.through) fail("INVALID_DERIVED_ARTIFACT", "effective_window.from and through are required");
    const registryRoot = await ready();
    const bytes = Buffer.from(`${stable(input.readModel)}\n`);
    const digest = sha256(bytes);
    const artifactId = `sha256:${digest}`;
    const supersedes = input.supersedes_artifact_id || null;
    if (supersedes) {
      if (!SHA256.test(supersedes) || supersedes === artifactId) fail("INVALID_SUPERSESSION", "derived supersession must name a different sha256 artifact");
      const derivedFiles = await listJsonFiles(path.join(registryRoot, "derived-receipts"));
      let predecessor = null;
      for (const file of derivedFiles) {
        const candidate = await getDerivedReceipt(`receipt:${path.basename(file, ".json")}`);
        if (candidate.artifact.sha256 === supersedes) predecessor = candidate;
        if (candidate.supersession?.supersedes_artifact_id === supersedes) {
          fail("SUPERSESSION_BRANCH", `derived artifact already has a successor: ${supersedes}`);
        }
      }
      if (!predecessor) fail("SUPERSEDED_ARTIFACT_NOT_FOUND", `superseded read model is absent: ${supersedes}`);
      requireString(input.correction_reason, "correction_reason");
    }
    await ensureSafeDirectory(registryRoot, `objects/sha256/${digest.slice(0, 2)}`);
    const objectPath = artifactPath(registryRoot, digest);
    const artifactCreated = await writeImmutable(objectPath, bytes);
    const receipt = {
      schema: DERIVED_RECEIPT_SCHEMA,
      registry_version: REGISTRY_VERSION,
      receipt_id: null,
      artifact_type: "football_intelligence_read_model",
      computed_at_utc: toIso(clock(), "clock"),
      artifact: { sha256: artifactId, byte_length: bytes.length, media_type: "application/json", object_path: `objects/sha256/${digest.slice(0, 2)}/${digest}` },
      source_artifact_ids: sourceArtifactIds,
      effective_window: effectiveWindow,
      validation,
      supersession: supersedes ? { supersedes_artifact_id: supersedes, reason: input.correction_reason.trim() } : null,
      publication: { authorized: false, state: "candidate" },
    };
    const digestReceipt = receiptDigest(receipt);
    receipt.receipt_id = `receipt:${digestReceipt}`;
    const receiptFile = derivedReceiptPath(registryRoot, digestReceipt);
    const receiptCreated = await writeImmutable(receiptFile, Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`));
    return { artifact_id: artifactId, receipt_id: receipt.receipt_id, created: { artifact: artifactCreated, receipt: receiptCreated }, paths: { artifact: objectPath, receipt: receiptFile } };
  }

  return Object.freeze({ getReceipt, getDerivedReceipt, readArtifact, replayReceipt, replayReadModel, rebuildIndex, registerReadModel, registerSourceArtifact, root: selectedRoot });
}

module.exports = {
  ArtifactRegistryError,
  DERIVED_RECEIPT_SCHEMA,
  INDEX_SCHEMA,
  RECEIPT_SCHEMA,
  REGISTRY_VERSION,
  createLocalArtifactRegistry,
};
