"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");
const { publishRelease, parseTar, validateTree, cli, PRODUCTION_ROOT } = require("../infra/warehouse/publish-release-root");

const repo = path.join(__dirname, "..");
const builder = path.join(repo, "infra/warehouse/build-release.sh");
const publisher = path.join(repo, "infra/warehouse/publish-release-root.js");
const releaseFiles = ["infra/warehouse/build-release.sh", "infra/warehouse/docker-compose.yml", "infra/warehouse/verify-release.sh", "infra/warehouse/provision-credentials.sh", "warehouse/migrations/0001_football_warehouse.sql", "warehouse/migrations/0002_record_migration.sh"];
function fixture(t, { marker } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "omen-publisher-")); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const file of releaseFiles) { const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(repo, file), target); }
  if (marker) {
    fs.writeFileSync(path.join(root, "infra/warehouse/provision-credentials.sh"), `#!/bin/sh\ntouch '${marker}'\n`);
    fs.chmodSync(path.join(root, "infra/warehouse/provision-credentials.sh"), 0o755);
  }
  execFileSync("git", ["init", "-q"], { cwd: root }); execFileSync("git", ["config", "user.email", "test@omen.invalid"], { cwd: root }); execFileSync("git", ["config", "user.name", "test"], { cwd: root }); execFileSync("git", ["add", "."], { cwd: root }); execFileSync("git", ["commit", "-qm", "fixture"], { cwd: root });
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); const release = path.join(root, "release"); execFileSync(builder, [commit, release], { cwd: root });
  const bundle = `${release}.tar`; const hash = fs.readFileSync(`${bundle}.sha256`, "utf8").trim(); return { root, commit, bundle, hash };
}
test("deterministic outer bundle excludes independently trusted publisher", (t) => {
  const item = fixture(t); const second = path.join(item.root, "second"); execFileSync(builder, [item.commit, second], { cwd: item.root });
  assert.deepEqual(fs.readFileSync(item.bundle), fs.readFileSync(`${second}.tar`));
  const names = parseTar(fs.readFileSync(item.bundle)).map((entry) => entry.name);
  assert.equal(names.includes("infra/warehouse/publish-release-root.js"), false);
});
test("publisher authenticates private bundle and atomically publishes without executing payload", (t) => {
  const marker = path.join(os.tmpdir(), `omen-publisher-marker-${process.pid}-${Date.now()}`);
  t.after(() => { if (fs.existsSync(marker)) fs.rmSync(marker); });
  const item = fixture(t, { marker }); const destination = path.join(item.root, "destination");
  const result = publishRelease({ bundlePath: item.bundle, approvedBundleSha256: item.hash, destinationRoot: destination, requireRoot: false, now: () => new Date("2026-10-07T12:00:00Z") });
  const published = path.join(destination, "releases", item.commit);
  assert.equal(result.state, "published"); assert.equal(result.commit, item.commit); assert.equal(fs.existsSync(published), true); assert.equal(fs.existsSync(marker), false);
  assert.equal(fs.statSync(published).mode & 0o777, 0o755);
  assert.equal(fs.statSync(path.join(published, "infra/warehouse/provision-credentials.sh")).mode & 0o777, 0o755);
  assert.equal(fs.statSync(path.join(published, "infra/warehouse/docker-compose.yml")).mode & 0o777, 0o644);
  assert.deepEqual(fs.readdirSync(destination).sort(), ["releases"]);
});
test("publisher rejects malicious archive metadata and incomplete inner manifests", (t) => {
  const item = fixture(t);
  const original = fs.readFileSync(item.bundle);
  const malicious = Buffer.from(original);
  let header = -1;
  for (let offset = 0; offset < malicious.length; offset += 512) {
    if (malicious.subarray(offset, offset + 100).toString("ascii").replace(/\0.*$/, "") === "infra/warehouse/provision-credentials.sh") { header = offset; break; }
  }
  assert.notEqual(header, -1);
  malicious[header + 156] = "2".charCodeAt(0);
  malicious.fill(0x20, header + 148, header + 156);
  let sum = 0; for (let i = header; i < header + 512; i += 1) sum += malicious[i];
  malicious.write(`${sum.toString(8).padStart(6, "0")}\0 `, header + 148, "ascii");
  const bad = path.join(item.root, "link-entry.tar"); fs.writeFileSync(bad, malicious);
  const badHash = crypto.createHash("sha256").update(malicious).digest("hex");
  assert.throws(() => publishRelease({ bundlePath: bad, approvedBundleSha256: badHash, destinationRoot: path.join(item.root, "bad-destination"), requireRoot: false }), /archive_entry_invalid/);

  const entries = parseTar(original);
  const files = new Map(entries.filter((entry) => entry.type === "0").map((entry) => [entry.name, entry]));
  const manifest = files.get("SHA256SUMS");
  manifest.contents = Buffer.from(manifest.contents.toString("utf8").split("\n").filter((line) => !line.includes("docker-compose.yml")).join("\n"));
  const manifestHash = crypto.createHash("sha256").update(manifest.contents).digest("hex");
  files.get("MANIFEST-SHA256").contents = Buffer.from(`${manifestHash}\n`);
  assert.throws(() => validateTree(entries), /inner_manifest_invalid/);
});
test("publisher rejects outer tampering, links, wrong approval, and existing targets", (t) => {
  const item = fixture(t); const destination = path.join(item.root, "destination");
  const bad = path.join(item.root, "bad.tar"); fs.copyFileSync(item.bundle, bad); fs.chmodSync(bad, 0o600); fs.appendFileSync(bad, "x");
  assert.throws(() => publishRelease({ bundlePath: bad, approvedBundleSha256: item.hash, destinationRoot: destination, requireRoot: false }), /bundle_hash_mismatch/);
  const link = path.join(item.root, "link.tar"); fs.symlinkSync(item.bundle, link);
  assert.throws(() => publishRelease({ bundlePath: link, approvedBundleSha256: item.hash, destinationRoot: destination, requireRoot: false }), /bundle_source_invalid/);
  assert.throws(() => publishRelease({ bundlePath: item.bundle, approvedBundleSha256: "0".repeat(64), destinationRoot: destination, requireRoot: false }), /bundle_hash_mismatch/);
  publishRelease({ bundlePath: item.bundle, approvedBundleSha256: item.hash, destinationRoot: destination, requireRoot: false });
  const repeated = publishRelease({ bundlePath: item.bundle, approvedBundleSha256: item.hash, destinationRoot: destination, requireRoot: false });
  assert.equal(repeated.code, "already_published");
  fs.chmodSync(path.join(destination, "releases", item.commit, "COMMIT"), 0o644);
  fs.appendFileSync(path.join(destination, "releases", item.commit, "COMMIT"), "x");
  assert.throws(() => publishRelease({ bundlePath: item.bundle, approvedBundleSha256: item.hash, destinationRoot: destination, requireRoot: false }), /existing_release_mismatch/);
});
test("production CLI exposes no destination override and emits sanitized failures", () => {
  assert.equal(PRODUCTION_ROOT, "/opt/omen/warehouse");
  const writes = []; const original = process.stdout.write; process.stdout.write = (value) => { writes.push(String(value)); return true; };
  try { assert.equal(cli(["publish", "--bundle", "/missing", "--approved-bundle-sha256", "0".repeat(64)]), 1); } finally { process.stdout.write = original; }
  const parsed = JSON.parse(writes.join("")); assert.deepEqual(Object.keys(parsed).sort(), ["code", "contract_version", "state"]); assert.equal(parsed.state, "failed");
  const source = fs.readFileSync(publisher, "utf8");
  assert.doesNotMatch(source, /require\(["']node:child_process["']\)|require\(["']child_process["']\)|systemctl|execFile|spawn/);
  assert.doesNotMatch(source, /(?:symlink|link)Sync\([^\n]*current/);
});
