"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const MANIFEST_SCHEMA = "omen-football-raw-manifest.v1";
const REPLAY_SCHEMA = "omen-football-raw-replay.v1";
const COLLECTOR_VERSION = "omen-football-collector.v1";
const MAX_SNAPSHOT_BYTES = 64 * 1024 * 1024;
const PRODUCTION_ROOT = path.resolve("/var/lib/omen-football-data");

const SOURCE_CONTRACTS = Object.freeze({
  stats_player: Object.freeze({
    source: "nflverse-data",
    dataset: "stats_player",
    releaseTag: "stats_player",
    assetName: (season) => `stats_player_week_${season}.csv`,
    sourceUrl: (season) =>
      `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_${season}.csv`,
    extension: ".csv",
    acceptedContentTypes: Object.freeze([
      "text/csv",
      "application/csv",
      "application/octet-stream",
      "text/plain",
    ]),
    requiredColumns: Object.freeze([
      "player_id",
      "player_name",
      "season",
      "week",
      "season_type",
      "fantasy_points",
      "fantasy_points_ppr",
    ]),
    rights: Object.freeze({
      license: "CC BY 4.0",
      license_url: "https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md",
      terms_url: "https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md",
      rights_review_date: "2026-08-24",
      attribution: "Data sourced from nflverse-data under CC BY 4.0.",
    }),
  }),
  stats_team: Object.freeze({
    source: "nflverse-data",
    dataset: "stats_team",
    releaseTag: "stats_team",
    assetName: (season) => `stats_team_week_${season}.csv`,
    sourceUrl: (season) =>
      `https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_${season}.csv`,
    extension: ".csv",
    acceptedContentTypes: Object.freeze([
      "text/csv",
      "application/csv",
      "application/octet-stream",
      "text/plain",
    ]),
    requiredColumns: Object.freeze([
      "season",
      "week",
      "team",
      "season_type",
      "game_id",
      "opponent_team",
      "def_sacks",
      "def_interceptions",
      "fumble_recovery_opp",
      "fg_made",
      "pat_made",
    ]),
    rights: Object.freeze({
      license: "CC BY 4.0",
      license_url: "https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md",
      terms_url: "https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md",
      rights_review_date: "2026-08-24",
      attribution: "Data sourced from nflverse-data under CC BY 4.0.",
    }),
  }),
  schedules: Object.freeze({
    source: "nflverse-data",
    dataset: "schedules",
    releaseTag: "schedules",
    assetName: () => "games.csv",
    sourceUrl: () =>
      "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv",
    extension: ".csv",
    acceptedContentTypes: Object.freeze([
      "text/csv",
      "application/csv",
      "application/octet-stream",
      "text/plain",
    ]),
    requiredColumns: Object.freeze([
      "game_id",
      "season",
      "game_type",
      "week",
      "gameday",
      "away_team",
      "away_score",
      "home_team",
      "home_score",
      "old_game_id",
      "gsis",
      "pfr",
      "pff",
      "espn",
    ]),
    rights: Object.freeze({
      license: "CC BY 4.0",
      license_url: "https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md",
      terms_url: "https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md",
      rights_review_date: "2026-08-24",
      attribution: "Data sourced from nflverse-data under CC BY 4.0.",
    }),
  }),
});

class FootballDataError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "FootballDataError";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new FootballDataError(code, message, options);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function toIso(value, field) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) fail("INVALID_TIME", `${field} must be a valid date`);
  return date.toISOString();
}

function normalizeSeason(value) {
  const season = Number(value);
  if (!Number.isInteger(season) || season < 1999 || season > 2100) {
    fail("INVALID_SEASON", "season must be an integer from 1999 through 2100");
  }
  return season;
}

function sourceContract(dataset, season) {
  const contract = SOURCE_CONTRACTS[dataset];
  if (!contract) {
    fail(
      "SOURCE_NOT_ALLOWLISTED",
      `dataset ${String(dataset || "(missing)")} is not enabled for the local collector`,
    );
  }
  const normalizedSeason = normalizeSeason(season);
  return {
    ...contract,
    season: normalizedSeason,
    assetName: contract.assetName(normalizedSeason),
    sourceUrl: contract.sourceUrl(normalizedSeason),
  };
}

function assertPathInside(root, candidate, field = "path") {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  const relative = path.relative(resolvedRoot, resolvedCandidate);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return resolvedCandidate;
  }
  fail("PATH_OUTSIDE_VAULT", `${field} must stay inside the selected local vault root`);
}

function resolveVaultPath(root, relativePath, field = "path") {
  if (typeof relativePath !== "string" || !relativePath || path.posix.isAbsolute(relativePath)) {
    fail("INVALID_MANIFEST", `${field} must be a non-empty relative path`);
  }
  const segments = relativePath.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    fail("INVALID_MANIFEST", `${field} contains an unsafe path segment`);
  }
  return assertPathInside(root, path.join(path.resolve(root), ...segments), field);
}

function assertLocalVaultRoot(root) {
  if (typeof root !== "string" || !root.trim()) {
    fail("LOCAL_ROOT_REQUIRED", "an explicit local vault root is required");
  }
  const resolved = path.resolve(root);
  const relativeToProduction = path.relative(PRODUCTION_ROOT, resolved);
  if (
    resolved === PRODUCTION_ROOT ||
    (relativeToProduction && !relativeToProduction.startsWith("..") && !path.isAbsolute(relativeToProduction))
  ) {
    fail("PRODUCTION_ROOT_REFUSED", "the local command refuses the production football-data root");
  }
  return resolved;
}

async function prepareLocalRoot(root) {
  const selectedRoot = assertLocalVaultRoot(root);
  await fs.mkdir(selectedRoot, { recursive: true });
  const realRoot = await fs.realpath(selectedRoot);
  assertLocalVaultRoot(realRoot);
  return realRoot;
}

async function ensureDirectoryWithin(root, directory) {
  const target = assertPathInside(root, directory, "immutable directory");
  const relative = path.relative(root, target);
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      await fs.mkdir(current);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink()) {
      fail("PATH_OUTSIDE_VAULT", "immutable directory must not traverse a symbolic link");
    }
    if (!stat.isDirectory()) {
      fail("INVALID_VAULT_PATH", "immutable directory path contains a non-directory entry");
    }
    assertPathInside(root, await fs.realpath(current), "immutable directory");
  }
  return target;
}

function assertRightsReviewCurrent({ now, rightsReviewDate }) {
  const current = new Date(toIso(now, "now"));
  const reviewed = new Date(`${rightsReviewDate}T00:00:00.000Z`);
  if (Number.isNaN(reviewed.getTime())) {
    fail("RIGHTS_REVIEW_INVALID", "rights review date is invalid");
  }
  const reviewYear = current.getUTCMonth() >= 6
    ? current.getUTCFullYear()
    : current.getUTCFullYear() - 1;
  const requiredSince = new Date(Date.UTC(reviewYear, 6, 15));
  if (reviewed < requiredSince) {
    fail(
      "RIGHTS_REVIEW_STALE",
      `rights review must be dated ${requiredSince.toISOString().slice(0, 10)} or later`,
    );
  }
}

function headerValue(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name);
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return entry ? entry[1] : null;
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  if (quoted) fail("SCHEMA_DRIFT", "CSV header contains an unterminated quoted field");
  values.push(value);
  return values;
}

function inspectCsvSchema(bytes, contract) {
  const newline = bytes.indexOf(0x0a);
  const headerBytes = newline === -1 ? bytes : bytes.subarray(0, newline);
  const headerLine = headerBytes.toString("utf8").replace(/^\uFEFF/, "").replace(/\r$/, "");
  if (!headerLine) fail("SCHEMA_DRIFT", "CSV header is empty");
  const headers = parseCsvLine(headerLine).map((header) => header.trim());
  if (new Set(headers).size !== headers.length) {
    fail("SCHEMA_DRIFT", "CSV header contains duplicate column names");
  }
  const missing = contract.requiredColumns.filter((column) => !headers.includes(column));
  if (missing.length) {
    fail("SCHEMA_DRIFT", `CSV schema is missing required columns: ${missing.join(", ")}`);
  }
  return {
    headers,
    fingerprint: `sha256:${sha256(Buffer.from(JSON.stringify(headers)))}`,
  };
}

async function readBodyLimited(response, maxBytes = MAX_SNAPSHOT_BYTES) {
  const declaredLength = Number(headerValue(response.headers, "content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    fail("SNAPSHOT_TOO_LARGE", `snapshot exceeds the ${maxBytes}-byte local collector limit`);
  }

  if (response.body && typeof response.body[Symbol.asyncIterator] === "function") {
    const chunks = [];
    let total = 0;
    for await (const chunk of response.body) {
      const bytes = Buffer.from(chunk);
      total += bytes.length;
      if (total > maxBytes) {
        if (typeof response.body.cancel === "function") await response.body.cancel().catch(() => {});
        fail("SNAPSHOT_TOO_LARGE", `snapshot exceeds the ${maxBytes}-byte local collector limit`);
      }
      chunks.push(bytes);
    }
    return Buffer.concat(chunks, total);
  }

  if (typeof response.arrayBuffer !== "function") {
    fail("INVALID_RESPONSE", "source response has no readable body");
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxBytes) {
    fail("SNAPSHOT_TOO_LARGE", `snapshot exceeds the ${maxBytes}-byte local collector limit`);
  }
  return bytes;
}

function assertContentType(response, contract) {
  const raw = String(headerValue(response.headers, "content-type") || "").toLowerCase();
  const contentType = raw.split(";", 1)[0].trim();
  if (!contract.acceptedContentTypes.includes(contentType)) {
    fail(
      "CONTENT_TYPE_MISMATCH",
      `unexpected content type ${contentType || "(missing)"} for ${contract.dataset}`,
    );
  }
  return contentType;
}

async function writeImmutable(root, filePath, bytes) {
  await ensureDirectoryWithin(root, path.dirname(filePath));
  const realDirectory = await fs.realpath(path.dirname(filePath));
  assertPathInside(root, realDirectory, "immutable directory");
  const realFilePath = path.join(realDirectory, path.basename(filePath));
  try {
    await fs.writeFile(realFilePath, bytes, { flag: "wx" });
    return true;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const existing = await fs.readFile(realFilePath);
    if (existing.length !== bytes.length || !crypto.timingSafeEqual(existing, bytes)) {
      fail("IMMUTABLE_CONFLICT", `immutable path already contains different bytes: ${filePath}`);
    }
    return false;
  }
}

function manifestTime(iso) {
  return iso.replace(/[-:.]/g, "");
}

async function fetchWithTimeout(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        accept: "text/csv,application/octet-stream;q=0.9",
        "user-agent": "OmenFootballDataCollector/1.0 (local non-production)",
      },
      redirect: "follow",
    });
  } catch (error) {
    const code = error?.name === "AbortError" ? "SOURCE_TIMEOUT" : "SOURCE_UNAVAILABLE";
    fail(code, `nflverse capture failed: ${error?.message || "unknown network error"}`, { cause: error });
  } finally {
    clearTimeout(timer);
  }
}

async function captureSnapshot({
  dataset,
  season,
  root,
  fetchImpl = global.fetch,
  now = () => new Date(),
  timeoutMs = 30_000,
  parentSnapshot = null,
} = {}) {
  const selectedRoot = assertLocalVaultRoot(root);
  const contract = sourceContract(dataset, season);
  if (typeof fetchImpl !== "function") fail("FETCH_UNAVAILABLE", "fetch implementation is required");
  if (parentSnapshot !== null && !/^[A-Za-z0-9._-]{1,240}$/.test(parentSnapshot)) {
    fail("INVALID_PARENT_SNAPSHOT", "parent snapshot must be a prior snapshot id or null");
  }

  const retrievalStartedAt = toIso(now(), "retrieval start");
  assertRightsReviewCurrent({
    now: new Date(retrievalStartedAt),
    rightsReviewDate: contract.rights.rights_review_date,
  });

  const response = await fetchWithTimeout(fetchImpl, contract.sourceUrl, timeoutMs);
  const status = Number(response?.status);
  if (status === 404) {
    fail("SOURCE_DEFERRED", `${contract.assetName} is not published`);
  }
  if (!response?.ok) {
    fail("SOURCE_HTTP_ERROR", `nflverse capture returned HTTP ${status || "unknown"}`);
  }

  const contentType = assertContentType(response, contract);
  const bytes = await readBodyLimited(response);
  if (!bytes.length) fail("EMPTY_SNAPSHOT", "nflverse capture returned zero bytes");
  const schema = inspectCsvSchema(bytes, contract);
  const retrievalEndedAt = toIso(now(), "retrieval end");
  const contentHash = sha256(bytes);
  const vaultRoot = await prepareLocalRoot(selectedRoot);
  const snapshotId = [
    contract.source,
    contract.dataset,
    manifestTime(retrievalEndedAt),
    contentHash.slice(0, 16),
  ].join(".");

  const rawRelativePath = path.posix.join(
    "raw",
    contract.source,
    contract.dataset,
    String(contract.season),
    `${contentHash}${contract.extension}`,
  );
  const manifestRelativePath = path.posix.join(
    "manifests",
    contract.source,
    contract.dataset,
    String(contract.season),
    `${snapshotId}.json`,
  );
  const rawPath = resolveVaultPath(vaultRoot, rawRelativePath, "raw.path");
  const manifestPath = resolveVaultPath(vaultRoot, manifestRelativePath, "manifest path");

  const manifest = {
    schema: MANIFEST_SCHEMA,
    collector_version: COLLECTOR_VERSION,
    snapshot_id: snapshotId,
    source: contract.source,
    dataset: contract.dataset,
    source_url: contract.sourceUrl,
    release: {
      tag: contract.releaseTag,
      asset: contract.assetName,
    },
    retrieval: {
      started_at_utc: retrievalStartedAt,
      ended_at_utc: retrievalEndedAt,
    },
    http: {
      status,
      etag: headerValue(response.headers, "etag"),
      last_modified: headerValue(response.headers, "last-modified"),
      content_type: contentType,
    },
    raw: {
      path: rawRelativePath,
      byte_length: bytes.length,
      sha256: contentHash,
    },
    rights: { ...contract.rights },
    season_coverage: {
      season: contract.season,
      season_types: ["PRE", "REG", "POST"],
    },
    source_schema_fingerprint: schema.fingerprint,
    source_columns: schema.headers,
    parent_snapshot: parentSnapshot,
  };

  const rawCreated = await writeImmutable(vaultRoot, rawPath, bytes);
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const manifestCreated = await writeImmutable(vaultRoot, manifestPath, manifestBytes);
  if (!manifestCreated) {
    fail("DUPLICATE_OBSERVATION", `retrieval observation already exists: ${snapshotId}`);
  }

  return { manifest, manifestPath, rawPath, rawCreated };
}

function validateManifest(manifest) {
  if (!manifest || manifest.schema !== MANIFEST_SCHEMA) {
    fail("INVALID_MANIFEST", `manifest schema must be ${MANIFEST_SCHEMA}`);
  }
  if (manifest.collector_version !== COLLECTOR_VERSION) {
    fail("INVALID_MANIFEST", `manifest collector version must be ${COLLECTOR_VERSION}`);
  }
  const contract = sourceContract(manifest.dataset, manifest?.season_coverage?.season);
  if (manifest.source !== contract.source || manifest.source_url !== contract.sourceUrl) {
    fail("INVALID_MANIFEST", "manifest source does not match the reviewed allowlist");
  }
  if (manifest.release?.tag !== contract.releaseTag || manifest.release?.asset !== contract.assetName) {
    fail("INVALID_MANIFEST", "manifest release identity does not match the allowlist");
  }
  if (!/^[a-f0-9]{64}$/.test(manifest.raw?.sha256 || "")) {
    fail("INVALID_MANIFEST", "manifest raw SHA-256 is invalid");
  }
  if (!Number.isInteger(manifest.raw?.byte_length) || manifest.raw.byte_length <= 0) {
    fail("INVALID_MANIFEST", "manifest raw byte length is invalid");
  }
  if (manifest.raw.byte_length > MAX_SNAPSHOT_BYTES) {
    fail("INVALID_MANIFEST", "manifest raw byte length exceeds the local collector limit");
  }
  const expectedRawPath = path.posix.join(
    "raw",
    contract.source,
    contract.dataset,
    String(contract.season),
    `${manifest.raw.sha256}${contract.extension}`,
  );
  if (manifest.raw.path !== expectedRawPath) {
    fail("INVALID_MANIFEST", "manifest raw path is not the canonical content-addressed path");
  }
  const endedAt = toIso(manifest.retrieval?.ended_at_utc, "manifest retrieval end");
  const expectedSnapshotId = [
    contract.source,
    contract.dataset,
    manifestTime(endedAt),
    manifest.raw.sha256.slice(0, 16),
  ].join(".");
  if (manifest.snapshot_id !== expectedSnapshotId) {
    fail("INVALID_MANIFEST", "manifest snapshot id does not match its retrieval and raw hash");
  }
  if (manifest.http?.status !== 200 || !contract.acceptedContentTypes.includes(manifest.http?.content_type)) {
    fail("INVALID_MANIFEST", "manifest HTTP evidence is not an accepted successful capture");
  }
  for (const [field, expected] of Object.entries(contract.rights)) {
    if (manifest.rights?.[field] !== expected) {
      fail("INVALID_MANIFEST", `manifest rights field ${field} does not match the reviewed allowlist`);
    }
  }
  if (!Array.isArray(manifest.source_columns)) {
    fail("INVALID_MANIFEST", "manifest source columns are missing");
  }
  const recordedFingerprint = `sha256:${sha256(Buffer.from(JSON.stringify(manifest.source_columns)))}`;
  if (manifest.source_schema_fingerprint !== recordedFingerprint) {
    fail("INVALID_MANIFEST", "manifest schema fingerprint is internally inconsistent");
  }
  const missing = contract.requiredColumns.filter((column) => !manifest.source_columns.includes(column));
  if (missing.length) {
    fail("INVALID_MANIFEST", `manifest source columns omit required fields: ${missing.join(", ")}`);
  }
  assertRightsReviewCurrent({
    now: new Date(endedAt),
    rightsReviewDate: manifest.rights?.rights_review_date,
  });
  return contract;
}

async function readExactSnapshot({ root, manifestPath, expectedDataset = null } = {}) {
  const vaultRoot = await prepareLocalRoot(root);
  if (typeof manifestPath !== "string" || !manifestPath.trim()) {
    fail("EXACT_MANIFEST_REQUIRED", "one exact manifest path is required");
  }
  if (String(manifestPath).split(/[\\/]+/).some((segment) => /latest/i.test(segment))) {
    fail("LATEST_FORBIDDEN", "latest aliases are forbidden; provide one exact manifest path");
  }
  const selectedManifestPath = assertPathInside(
    vaultRoot,
    path.isAbsolute(manifestPath) ? manifestPath : path.join(vaultRoot, manifestPath),
    "manifest path",
  );
  const exactManifestPath = assertPathInside(
    vaultRoot,
    await fs.realpath(selectedManifestPath),
    "manifest path",
  );
  const manifestBytes = await fs.readFile(exactManifestPath);
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch (error) {
    fail("INVALID_MANIFEST", "manifest is not valid JSON", { cause: error });
  }
  const contract = validateManifest(manifest);
  if (expectedDataset && contract.dataset !== expectedDataset) {
    fail("MANIFEST_DATASET_MISMATCH", `expected ${expectedDataset}, received ${contract.dataset}`);
  }
  const selectedRawPath = resolveVaultPath(vaultRoot, manifest.raw.path, "raw.path");
  const rawPath = assertPathInside(vaultRoot, await fs.realpath(selectedRawPath), "raw.path");
  const rawBytes = await fs.readFile(rawPath);
  if (rawBytes.length !== manifest.raw.byte_length || sha256(rawBytes) !== manifest.raw.sha256) {
    fail("RAW_HASH_MISMATCH", "raw bytes do not match the exact manifest");
  }
  const schema = inspectCsvSchema(rawBytes, contract);
  if (schema.fingerprint !== manifest.source_schema_fingerprint) {
    fail("SCHEMA_FINGERPRINT_MISMATCH", "raw schema fingerprint does not match the exact manifest");
  }

  return {
    contract,
    exactManifestPath,
    manifest,
    manifestBytes,
    manifestHash: sha256(manifestBytes),
    rawBytes,
    rawPath,
    schema,
    vaultRoot,
  };
}

async function replaySnapshot({ root, manifestPath, outputRoot, now = () => new Date() } = {}) {
  const selectedReplayRoot = assertLocalVaultRoot(outputRoot);
  const exact = await readExactSnapshot({ root, manifestPath });
  const {
    contract,
    exactManifestPath,
    manifest,
    manifestHash,
    rawBytes,
    schema,
    vaultRoot,
  } = exact;

  const replayedAt = toIso(now(), "replay time");
  const runId = `${manifestTime(replayedAt)}-${manifestHash.slice(0, 16)}`;
  const replayRoot = await prepareLocalRoot(selectedReplayRoot);
  const runRoot = assertPathInside(replayRoot, path.join(replayRoot, runId), "replay run path");
  await fs.mkdir(replayRoot, { recursive: true });
  try {
    await fs.mkdir(runRoot);
  } catch (error) {
    if (error.code === "EEXIST") fail("REPLAY_RUN_EXISTS", `replay run already exists: ${runId}`);
    throw error;
  }

  const replayRawPath = path.join(runRoot, `input-${manifest.raw.sha256}${contract.extension}`);
  const receiptPath = path.join(runRoot, "receipt.json");
  const receipt = {
    schema: REPLAY_SCHEMA,
    replay_id: runId,
    replayed_at_utc: replayedAt,
    snapshot_id: manifest.snapshot_id,
    manifest_path: path.relative(vaultRoot, exactManifestPath).split(path.sep).join("/"),
    manifest_sha256: manifestHash,
    raw_sha256: manifest.raw.sha256,
    raw_byte_length: rawBytes.length,
    source_schema_fingerprint: schema.fingerprint,
    verification: {
      hash: "pass",
      byte_length: "pass",
      schema: "pass",
      rights: "pass",
    },
    promoted: false,
  };
  await fs.writeFile(replayRawPath, rawBytes, { flag: "wx" });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
  return { receipt, receiptPath, replayRawPath, runRoot };
}

module.exports = {
  COLLECTOR_VERSION,
  MANIFEST_SCHEMA,
  MAX_SNAPSHOT_BYTES,
  REPLAY_SCHEMA,
  SOURCE_CONTRACTS,
  FootballDataError,
  assertLocalVaultRoot,
  assertRightsReviewCurrent,
  captureSnapshot,
  readExactSnapshot,
  replaySnapshot,
};
