#!/usr/bin/node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const CONTRACT = "omen-football-warehouse-publication.v1";
const RELEASE_CONTRACT = "omen-football-warehouse-release.v1";
const PRODUCTION_ROOT = "/opt/omen/warehouse";
const MAX_BUNDLE_BYTES = 4 * 1024 * 1024;
const IMAGE = "postgres:17.11-bookworm@sha256:91eb910c44c7ed13f7f1a4ccadaa9ca72ef14cddc04cacb6e070e48eb44731a3";
const FILE_MODES = Object.freeze({
  COMMIT: 0o444,
  "MANIFEST-SHA256": 0o444,
  "RELEASE-CONTRACT": 0o444,
  SHA256SUMS: 0o444,
  "infra/warehouse/build-release.sh": 0o755,
  "infra/warehouse/docker-compose.yml": 0o644,
  "infra/warehouse/provision-credentials.sh": 0o755,
  "infra/warehouse/verify-release.sh": 0o755,
  "warehouse/migrations/0001_football_warehouse.sql": 0o644,
  "warehouse/migrations/0002_record_migration.sh": 0o755,
});
const DIR_MODES = Object.freeze({ infra: 0o755, "infra/warehouse": 0o755, warehouse: 0o755, "warehouse/migrations": 0o755 });
const EXPECTED = Object.freeze([...Object.keys(FILE_MODES), ...Object.keys(DIR_MODES).map((name) => `${name}/`)].sort());

class PublishError extends Error {
  constructor(code) { super(code); this.name = "PublishError"; this.code = code; }
}
function fail(code) { throw new PublishError(code); }
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function readBounded(fsImpl, fd, expectedSize) {
  const output = Buffer.alloc(MAX_BUNDLE_BYTES + 1); let offset = 0;
  while (offset < output.length) {
    const read = fsImpl.readSync(fd, output, offset, output.length - offset, null);
    if (read === 0) break;
    offset += read;
  }
  if (offset > MAX_BUNDLE_BYTES || offset !== expectedSize) fail("bundle_source_changed");
  return output.subarray(0, offset);
}
function safeSegment(name) {
  if (!name || name.startsWith("/") || name.startsWith("-") || name.includes("\\") || /[\x00-\x1f\x7f]/.test(name)) return false;
  const parts = name.replace(/\/$/, "").split("/");
  return parts.every((part) => part && part !== "." && part !== "..");
}
function field(block, start, length) { return block.subarray(start, start + length).toString("ascii").replace(/\0.*$/, ""); }
function numberField(block, start, length) {
  const text = field(block, start, length).trim();
  if (!/^[0-7]+$/.test(text)) fail("archive_header_invalid");
  const value = Number.parseInt(text, 8);
  if (!Number.isSafeInteger(value)) fail("archive_header_invalid");
  return value;
}
function canonicalHeader(name, mode, size, type) {
  const block = Buffer.alloc(512);
  function octal(value, width) { const text = value.toString(8); return `${"0".repeat(width - 1 - text.length)}${text}\0`; }
  Buffer.from(name).copy(block, 0); block.write(octal(mode, 8), 100, "ascii"); block.write(octal(0, 8), 108, "ascii");
  block.write(octal(0, 8), 116, "ascii"); block.write(octal(size, 12), 124, "ascii"); block.write(octal(0, 12), 136, "ascii");
  block.fill(0x20, 148, 156); block[156] = type.charCodeAt(0); block.write("ustar\0", 257, "ascii"); block.write("00", 263, "ascii");
  block.write("root", 265, "ascii"); block.write("root", 297, "ascii");
  const sum = block.reduce((total, byte) => total + byte, 0); block.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148, "ascii"); return block;
}
function parseTar(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1536 || bytes.length % 512 !== 0) fail("archive_invalid");
  const entries = [];
  const seen = new Set();
  let offset = 0;
  let ended = false;
  while (offset + 512 <= bytes.length) {
    const block = bytes.subarray(offset, offset + 512);
    if (block.every((byte) => byte === 0)) {
      if (offset + 1024 !== bytes.length || !bytes.subarray(offset + 512).every((byte) => byte === 0)) fail("archive_trailer_invalid");
      ended = true;
      break;
    }
    const stored = numberField(block, 148, 8);
    const check = Buffer.from(block); check.fill(0x20, 148, 156);
    if (check.reduce((sum, byte) => sum + byte, 0) !== stored) fail("archive_checksum_invalid");
    if (field(block, 257, 6) !== "ustar" || field(block, 263, 2) !== "00") fail("archive_format_invalid");
    const name = field(block, 0, 100);
    const type = String.fromCharCode(block[156] || 0x30);
    const mode = numberField(block, 100, 8);
    const uid = numberField(block, 108, 8), gid = numberField(block, 116, 8);
    const size = numberField(block, 124, 12), mtime = numberField(block, 136, 12);
    if (!safeSegment(name) || seen.has(name) || uid !== 0 || gid !== 0 || mtime !== 0 || !["0", "5"].includes(type)) fail("archive_entry_invalid");
    if (field(block, 157, 100) || field(block, 329, 8) || field(block, 337, 8) || field(block, 345, 155)
        || field(block, 265, 32) !== "root" || field(block, 297, 32) !== "root") fail("archive_header_invalid");
    if ((type === "5") !== name.endsWith("/") || (type === "5" && size !== 0)) fail("archive_entry_invalid");
    const canonicalMode = type === "5" ? DIR_MODES[name.slice(0, -1)] : FILE_MODES[name];
    if (canonicalMode == null || mode !== canonicalMode) fail("archive_entry_invalid");
    if (!block.equals(canonicalHeader(name, mode, size, type))) fail("archive_header_invalid");
    const dataStart = offset + 512, dataEnd = dataStart + size;
    if (dataEnd > bytes.length) fail("archive_truncated");
    const paddedEnd = dataStart + Math.ceil(size / 512) * 512;
    if (!bytes.subarray(dataEnd, paddedEnd).every((byte) => byte === 0)) fail("archive_padding_invalid");
    seen.add(name); entries.push({ name, type, mode, contents: Buffer.from(bytes.subarray(dataStart, dataEnd)) });
    offset = paddedEnd;
  }
  if (!ended || entries.map((entry) => entry.name).join("\n") !== EXPECTED.join("\n")) fail("archive_inventory_invalid");
  return entries;
}
function validateTree(entries) {
  const files = new Map(entries.filter((entry) => entry.type === "0").map((entry) => [entry.name, entry.contents]));
  const commitText = files.get("COMMIT").toString("utf8");
  if (!/^[0-9a-f]{40}\n$/.test(commitText)) fail("commit_invalid");
  const commit = commitText.trim();
  const contract = [
    `contract_version=${RELEASE_CONTRACT}`, `commit=${commit}`, "platform=linux/amd64", `image=${IMAGE}`,
    "install_root=/opt/omen/warehouse/releases", "",
  ].join("\n");
  if (!files.get("RELEASE-CONTRACT").equals(Buffer.from(contract))) fail("release_contract_invalid");
  const manifestText = files.get("SHA256SUMS").toString("utf8");
  const manifestHash = sha256(files.get("SHA256SUMS"));
  if (files.get("MANIFEST-SHA256").toString("utf8") !== `${manifestHash}\n`) fail("inner_manifest_invalid");
  const expectedHashed = ["COMMIT", "RELEASE-CONTRACT", "infra/warehouse/build-release.sh", "infra/warehouse/docker-compose.yml",
    "infra/warehouse/verify-release.sh", "infra/warehouse/provision-credentials.sh",
    "warehouse/migrations/0001_football_warehouse.sql", "warehouse/migrations/0002_record_migration.sh"];
  const lines = manifestText.trimEnd().split("\n");
  if (lines.length !== expectedHashed.length) fail("inner_manifest_invalid");
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^([0-9a-f]{64})  ([A-Za-z0-9._/-]+)$/.exec(lines[index]);
    if (!match || match[2] !== expectedHashed[index] || !files.has(match[2]) || sha256(files.get(match[2])) !== match[1]) fail("inner_manifest_invalid");
  }
  return { commit, manifestHash };
}
function ensureSafeProductionParents(fsImpl, root) {
  const parts = root.split("/").filter(Boolean); let current = "/";
  for (const part of parts) {
    current = path.join(current, part);
    if (!fsImpl.existsSync(current)) { fsImpl.mkdirSync(current, { mode: 0o755 }); fsImpl.chmodSync(current, 0o755); }
    const stat = fsImpl.lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== 0 || stat.gid !== 0 || (stat.mode & 0o022) !== 0) fail("destination_parent_unsafe");
  }
}
function writeTree(fsImpl, stage, entries) {
  for (const entry of entries.filter((item) => item.type === "5")) {
    const target = path.join(stage, entry.name); fsImpl.mkdirSync(target, { recursive: false, mode: entry.mode }); fsImpl.chmodSync(target, entry.mode);
  }
  for (const entry of entries.filter((item) => item.type === "0")) {
    const target = path.join(stage, entry.name);
    const fd = fsImpl.openSync(target, "wx", entry.mode);
    try { fsImpl.writeFileSync(fd, entry.contents); fsImpl.fsyncSync(fd); } finally { fsImpl.closeSync(fd); }
    fsImpl.chmodSync(target, entry.mode);
  }
  fsImpl.chmodSync(stage, 0o755);
}
function fsyncDirectory(fsImpl, directory) {
  const fd = fsImpl.openSync(directory, fs.constants.O_RDONLY);
  try { fsImpl.fsyncSync(fd); } finally { fsImpl.closeSync(fd); }
}
function publishedTreeMatches(fsImpl, target, entries, requireRoot) {
  try {
    const root = fsImpl.lstatSync(target);
    if (!root.isDirectory() || root.isSymbolicLink() || (root.mode & 0o777) !== 0o755 || (requireRoot && (root.uid !== 0 || root.gid !== 0))) return false;
    const expected = new Set(entries.map((entry) => entry.name.replace(/\/$/, "")));
    const actual = [];
    function walk(relative) {
      for (const name of fsImpl.readdirSync(path.join(target, relative)).sort()) {
        const child = relative ? `${relative}/${name}` : name; actual.push(child);
        const stat = fsImpl.lstatSync(path.join(target, child)); if (stat.isDirectory() && !stat.isSymbolicLink()) walk(child);
      }
    }
    walk("");
    if (actual.length !== expected.size || actual.some((name) => !expected.has(name))) return false;
    for (const entry of entries) {
      const name = entry.name.replace(/\/$/, ""); const absolute = path.join(target, name); const stat = fsImpl.lstatSync(absolute);
      if (stat.isSymbolicLink() || (entry.type === "0" && stat.nlink !== 1) || (stat.mode & 0o777) !== entry.mode
          || (requireRoot && (stat.uid !== 0 || stat.gid !== 0))) return false;
      if (entry.type === "5" ? !stat.isDirectory() : !stat.isFile() || !fsImpl.readFileSync(absolute).equals(entry.contents)) return false;
    }
    return true;
  } catch { return false; }
}
function ensureDirectory(fsImpl, directory, mode, requireRoot) {
  let created = false;
  try { fsImpl.mkdirSync(directory, { mode }); created = true; } catch (error) { if (error?.code !== "EEXIST") throw error; }
  if (created) fsImpl.chmodSync(directory, mode);
  const stat = fsImpl.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o777) !== mode
      || (requireRoot && (stat.uid !== 0 || stat.gid !== 0))) fail("destination_parent_unsafe");
}
function publishRelease({ bundlePath, approvedBundleSha256, destinationRoot = PRODUCTION_ROOT, requireRoot = true, fsImpl = fs, now = () => new Date() } = {}) {
  if (requireRoot && process.geteuid() !== 0) fail("root_required");
  if (requireRoot && destinationRoot !== PRODUCTION_ROOT) fail("destination_invalid");
  if (!path.isAbsolute(bundlePath || "") || !/^[0-9a-f]{64}$/.test(approvedBundleSha256 || "")) fail("arguments_invalid");
  if (requireRoot) ensureSafeProductionParents(fsImpl, destinationRoot);
  else fsImpl.mkdirSync(destinationRoot, { recursive: true, mode: 0o755 });
  const releases = path.join(destinationRoot, "releases"); ensureDirectory(fsImpl, releases, 0o755, requireRoot);
  let work;
  let result;
  let cleanupFailed = false;
  try {
    work = fsImpl.mkdtempSync(path.join(destinationRoot, ".publish-"));
    fsImpl.chmodSync(work, 0o700);
    const privateBundle = path.join(work, "release.tar");
    let sourceFd; let sourceBytes;
    try {
      sourceFd = fsImpl.openSync(bundlePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
      const source = fsImpl.fstatSync(sourceFd);
      if (!source.isFile() || source.size < 1 || source.size > MAX_BUNDLE_BYTES) fail("bundle_source_invalid");
      sourceBytes = readBounded(fsImpl, sourceFd, source.size);
    } catch (error) {
      if (error instanceof PublishError) throw error;
      fail("bundle_source_invalid");
    } finally { if (sourceFd != null) fsImpl.closeSync(sourceFd); }
    const privateFd = fsImpl.openSync(privateBundle, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, 0o400);
    try { fsImpl.writeFileSync(privateFd, sourceBytes); fsImpl.fsyncSync(privateFd); } finally { fsImpl.closeSync(privateFd); }
    fsImpl.chmodSync(privateBundle, 0o400);
    const copied = fsImpl.lstatSync(privateBundle);
    if (!copied.isFile() || copied.isSymbolicLink() || copied.nlink !== 1 || copied.size < 1 || copied.size > MAX_BUNDLE_BYTES
        || (copied.mode & 0o777) !== 0o400 || (requireRoot && (copied.uid !== 0 || copied.gid !== 0))) fail("bundle_private_invalid");
    const bytes = fsImpl.readFileSync(privateBundle);
    if (sha256(bytes) !== approvedBundleSha256) fail("bundle_hash_mismatch");
    const entries = parseTar(bytes); const identity = validateTree(entries);
    const publisherSha256 = sha256(fsImpl.readFileSync(__filename));
    const publishedAt = now().toISOString();
    const target = path.join(releases, identity.commit);
    if (fsImpl.existsSync(target) || (() => { try { fsImpl.lstatSync(target); return true; } catch { return false; } })()) {
      if (!publishedTreeMatches(fsImpl, target, entries, requireRoot)) fail("existing_release_mismatch");
      result = { contract_version: CONTRACT, state: "published", code: "already_published", commit: identity.commit,
        bundle_sha256: approvedBundleSha256, manifest_sha256: identity.manifestHash,
        publisher_sha256: publisherSha256, destination: target, observed_at: publishedAt };
    } else {
      const stage = path.join(work, "tree"); fsImpl.mkdirSync(stage, { mode: 0o700 });
      writeTree(fsImpl, stage, entries);
      if (fsImpl.statSync(work).dev !== fsImpl.statSync(releases).dev) fail("destination_filesystem_mismatch");
      for (const directory of ["infra/warehouse", "infra", "warehouse/migrations", "warehouse", ""].map((name) => path.join(stage, name))) fsyncDirectory(fsImpl, directory);
      fsImpl.renameSync(stage, target);
      let durabilityCode = "ok";
      try { fsyncDirectory(fsImpl, releases); } catch { durabilityCode = "published_durability_unconfirmed"; }
      result = { contract_version: CONTRACT, state: "published", code: durabilityCode, commit: identity.commit,
        bundle_sha256: approvedBundleSha256, manifest_sha256: identity.manifestHash,
        publisher_sha256: publisherSha256, destination: target, published_at: publishedAt };
    }
  } finally {
    try { if (work && fsImpl.existsSync(work)) fsImpl.rmSync(work, { recursive: true, force: true }); } catch { cleanupFailed = true; }
  }
  if (cleanupFailed) result.code = "published_cleanup_pending";
  return result;
}
function safeResult(error) { return { contract_version: CONTRACT, state: "failed", code: error instanceof PublishError ? error.code : "publisher_failed" }; }
function cli(argv) {
  let result, status = 0;
  try {
    process.umask(0o077);
    if (argv.length !== 5 || argv[0] !== "publish" || argv[1] !== "--bundle" || argv[3] !== "--approved-bundle-sha256") fail("usage");
    result = publishRelease({ bundlePath: argv[2], approvedBundleSha256: argv[4] });
  } catch (error) { result = safeResult(error); status = 1; }
  process.stdout.write(`${JSON.stringify(result)}\n`); return status;
}
if (require.main === module) process.exitCode = cli(process.argv.slice(2));
module.exports = { publishRelease, parseTar, validateTree, safeResult, cli, PRODUCTION_ROOT };
