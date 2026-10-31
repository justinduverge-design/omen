"use strict";
// B13-HEAL-SIGNING: a signed bundle verifies; a tampered one, a wrong key or no key is refused.
// The key is a throwaway generated in a temp dir for this test; no real signing key exists in the repo.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const bundlePy = path.join(__dirname, "..", "ops", "remediation", "bundle.py");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "remediation-bundle-"));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

function keypair(name) {
  const key = path.join(tmp, name);
  execFileSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-C", "test", "-f", key]);
  const pub = fs.readFileSync(`${key}.pub`, "utf8").trim().split(" ").slice(0, 2).join(" ");
  const signers = path.join(tmp, `${name}.allowed`);
  fs.writeFileSync(signers, `slops-remediation-ci namespaces="slops-remediation" ${pub}\n`);
  return { key, signers };
}
const sign = (key, file) =>
  execFileSync("ssh-keygen", ["-Y", "sign", "-q", "-f", key, "-n", "slops-remediation", file]);
const verify = (file, sig, signers) =>
  spawnSync("python3", [bundlePy, "verify", file, sig, signers], { encoding: "utf8" });

const ci = keypair("ci");
const bundle = path.join(tmp, "bundle.json");
execFileSync("python3", [bundlePy, "build", bundle, "abc123", "41"]);
sign(ci.key, bundle);

test("a CI-signed bundle verifies and lists its playbooks", () => {
  const r = verify(bundle, `${bundle}.sig`, ci.signers);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /glitchtip-stack-up/);
});

test("the bundle carries the CI sequence number for replay checks", () => {
  assert.equal(JSON.parse(fs.readFileSync(bundle, "utf8")).seq, 41);
});

test("the build is canonical: rebuilding gives identical bytes", () => {
  const again = path.join(tmp, "again.json");
  execFileSync("python3", [bundlePy, "build", again, "abc123", "41"]);
  assert.ok(fs.readFileSync(again).equals(fs.readFileSync(bundle)));
});

test("a tampered bundle fails verification", () => {
  const tampered = path.join(tmp, "tampered.json");
  fs.writeFileSync(
    tampered,
    fs.readFileSync(bundle, "utf8").replace('"max_attempts_per_24h":2', '"max_attempts_per_24h":3'),
  );
  const r = verify(tampered, `${bundle}.sig`, ci.signers);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /refused: bad signature/);
});

test("one flipped byte fails verification", () => {
  const flipped = path.join(tmp, "flipped.json");
  const b = Buffer.from(fs.readFileSync(bundle));
  b[b.length - 2] ^= 1;
  fs.writeFileSync(flipped, b);
  assert.match(verify(flipped, `${bundle}.sig`, ci.signers).stderr, /bad signature/);
});

test("a bundle signed by any other key (a compromised Pi) is refused", () => {
  const rogue = keypair("rogue");
  const forged = path.join(tmp, "forged.json");
  fs.copyFileSync(bundle, forged);
  sign(rogue.key, forged);
  assert.match(verify(forged, `${forged}.sig`, ci.signers).stderr, /bad signature/);
});

test("a validly signed bundle with a bad playbook is still refused by the schema", () => {
  const evil = path.join(tmp, "evil.json");
  const doc = JSON.parse(fs.readFileSync(bundle, "utf8"));
  doc.playbooks[0].action = { type: "reboot" };
  fs.writeFileSync(evil, JSON.stringify(doc));
  sign(ci.key, evil);
  const r = verify(evil, `${evil}.sig`, ci.signers);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /unknown action/);
});

test("no public key or no signature refuses everything", () => {
  const empty = path.join(tmp, "empty.allowed");
  fs.writeFileSync(empty, "# no key yet\n");
  assert.match(verify(bundle, `${bundle}.sig`, empty).stderr, /no public key/);
  assert.match(verify(bundle, path.join(tmp, "missing.sig"), ci.signers).stderr, /signature file missing/);
});

test("the checked-in allowed_signers holds no key yet, and no private key is in the repo", () => {
  const signers = fs.readFileSync(path.join(__dirname, "..", "ops", "remediation", "allowed_signers"), "utf8");
  assert.equal(signers.split("\n").filter((l) => l.trim() && !l.startsWith("#")).length, 0);
  const files = execFileSync("git", ["ls-files", "ops/remediation"], { encoding: "utf8" });
  assert.doesNotMatch(files, /signing_key|id_ed25519|\.pem$/m);
});

test("CI signs only on main, with the secret, and never publishes unsigned", () => {
  const wf = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "remediation-bundle.yml"), "utf8");
  assert.match(wf, /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.doesNotMatch(wf, /event_name != 'pull_request'/);
  assert.match(wf, /secrets\.REMEDIATION_SIGNING_KEY/);
  assert.match(wf, /if: steps\.sign\.outputs\.signed == 'true'/);
  assert.match(wf, /bundle\.py verify bundle\.json bundle\.json\.sig ops\/remediation\/allowed_signers/);
});
