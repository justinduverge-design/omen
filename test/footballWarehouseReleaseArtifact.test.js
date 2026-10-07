"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.join(__dirname, "..");
const build = path.join(root, "infra/warehouse/build-release.sh");
const verify = path.join(root, "infra/warehouse/verify-release.sh");
const files = [
  "infra/warehouse/build-release.sh",
  "infra/warehouse/docker-compose.yml",
  "infra/warehouse/verify-release.sh",
  "infra/warehouse/provision-credentials.sh",
  "infra/warehouse/provision-login-roles.sh",
  "warehouse/migrations/0001_football_warehouse.sql",
  "warehouse/migrations/0002_record_migration.sh",
  "warehouse/migrations/0003_warehouse_access_policy.sql",
  "warehouse/migrations/0004_apply_access_policy.sh",
];

function treeManifest(directory) {
  return execFileSync("find", [".", "-mindepth", "1", "-print"], { cwd: directory, encoding: "utf8" })
    .trim().split("\n").sort().map((relative) => {
      const full = path.join(directory, relative);
      const stat = fs.lstatSync(full);
      return `${relative}|${stat.isDirectory() ? "d" : "f"}|${(stat.mode & 0o7777).toString(8)}|${stat.isFile() ? fs.readFileSync(full).toString("hex") : ""}`;
    });
}

function approvedManifest(release) {
  return fs.readFileSync(path.join(release, "MANIFEST-SHA256"), "utf8").trim();
}

function refreshManifest(release) {
  const listed = fs.readFileSync(path.join(release, "SHA256SUMS"), "utf8")
    .trim().split("\n").map((line) => line.slice(line.indexOf("  ") + 2));
  const sums = execFileSync("sha256sum", listed, { cwd: release });
  fs.chmodSync(path.join(release, "SHA256SUMS"), 0o644);
  fs.writeFileSync(path.join(release, "SHA256SUMS"), sums);
  const manifest = execFileSync("sha256sum", ["SHA256SUMS"], { cwd: release, encoding: "utf8" }).split(/\s+/)[0];
  fs.chmodSync(path.join(release, "SHA256SUMS"), 0o444);
  fs.chmodSync(path.join(release, "MANIFEST-SHA256"), 0o644);
  fs.writeFileSync(path.join(release, "MANIFEST-SHA256"), `${manifest}\n`);
  fs.chmodSync(path.join(release, "MANIFEST-SHA256"), 0o444);
  return manifest;
}

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omen-warehouse-release-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const file of files) {
    const target = path.join(dir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, file), target);
  }
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "release-test@omen.invalid"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Omen Release Test"], { cwd: dir });
  execFileSync("git", ["add", "."], { cwd: dir });
  execFileSync("git", ["commit", "-qm", "fixture"], { cwd: dir });
  return { dir, commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim() };
}

test("release builder exports exact committed bytes and is reproducible despite dirty working files", (t) => {
  const item = fixture(t);
  fs.appendFileSync(path.join(item.dir, "infra/warehouse/docker-compose.yml"), "\n# dirty shadow\n");
  const one = path.join(item.dir, "release-one");
  const two = path.join(item.dir, "release-two");
  execFileSync(build, [item.commit, one], { cwd: item.dir });
  execFileSync(build, [item.commit, two], { cwd: item.dir });
  assert.deepEqual(treeManifest(one), treeManifest(two));
  assert.doesNotMatch(fs.readFileSync(path.join(one, "infra/warehouse/docker-compose.yml"), "utf8"), /dirty shadow/);
  assert.equal(fs.readFileSync(path.join(one, "COMMIT"), "utf8").trim(), item.commit);
  execFileSync("sha256sum", ["--check", "--strict", "SHA256SUMS"], { cwd: one, stdio: "ignore" });
});

test("release builder rejects an existing destination and unknown commit", (t) => {
  const item = fixture(t);
  const output = path.join(item.dir, "already");
  fs.mkdirSync(output);
  assert.notEqual(spawnSync(build, [item.commit, output], { cwd: item.dir }).status, 0);
  assert.notEqual(spawnSync(build, ["not-a-commit", path.join(item.dir, "other")], { cwd: item.dir }).status, 0);
});

test("release verifier accepts approved bytes and rejects tampering", (t) => {
  const item = fixture(t);
  const release = path.join(item.dir, "release");
  execFileSync(build, [item.commit, release], { cwd: item.dir });
  const manifest = approvedManifest(release);
  execFileSync(verify, [release, manifest], { cwd: item.dir });
  fs.appendFileSync(path.join(release, "infra/warehouse/docker-compose.yml"), "\n# tampered\n");
  assert.notEqual(spawnSync(verify, [release, manifest], { cwd: item.dir }).status, 0);
});

test("release verifier fails closed across structural, mode, contract, and approval drift", (t) => {
  const item = fixture(t);
  const base = path.join(item.dir, "release-base");
  execFileSync(build, [item.commit, base], { cwd: item.dir });
  let sequence = 0;
  const mutate = (name, change, refresh = false) => {
    const release = path.join(item.dir, `reject-${sequence++}-${name}`);
    fs.cpSync(base, release, { recursive: true, preserveTimestamps: true });
    change(release);
    const manifest = refresh ? refreshManifest(release) : approvedManifest(release);
    assert.notEqual(spawnSync(verify, [release, manifest], { cwd: item.dir }).status, 0, name);
  };

  mutate("unexpected-directory", (release) => fs.mkdirSync(path.join(release, "unexpected")));
  mutate("symlink", (release) => {
    const target = path.join(release, "infra/warehouse/docker-compose.yml");
    fs.rmSync(target);
    fs.symlinkSync("provision-credentials.sh", target);
  });
  mutate("hardlink", (release) => fs.linkSync(
    path.join(release, "infra/warehouse/docker-compose.yml"),
    path.join(item.dir, `outside-link-${sequence}`),
  ));
  mutate("world-writable", (release) => fs.chmodSync(path.join(release, "infra/warehouse/docker-compose.yml"), 0o666));
  mutate("noncanonical-contract", (release) => {
    fs.chmodSync(path.join(release, "RELEASE-CONTRACT"), 0o644);
    fs.appendFileSync(path.join(release, "RELEASE-CONTRACT"), "unexpected=true\n");
    fs.chmodSync(path.join(release, "RELEASE-CONTRACT"), 0o444);
  }, true);
  mutate("commit-mismatch", (release) => {
    fs.chmodSync(path.join(release, "COMMIT"), 0o644);
    fs.writeFileSync(path.join(release, "COMMIT"), `${"0".repeat(40)}\n`);
    fs.chmodSync(path.join(release, "COMMIT"), 0o444);
  }, true);
  assert.notEqual(spawnSync(verify, [base, "0".repeat(64)], { cwd: item.dir }).status, 0, "wrong approved manifest");
});

test("release verifier is read-only and authenticates the complete artifact", () => {
  const source = fs.readFileSync(verify, "utf8");
  assert.match(source, /approved-manifest-sha256/);
  assert.match(source, /sha256sum SHA256SUMS/);
  assert.match(source, /release inventory is invalid/);
  assert.match(source, /hard-linked file/);
  assert.match(source, /file mode is invalid/);
  assert.doesNotMatch(source, /docker\s+(?:compose|run|exec|start)/);
  assert.doesNotMatch(source, /systemctl|service\s|\bmv\s|\bcp\s/);
});
