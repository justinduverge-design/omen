"use strict";
// B13-HEAL-PLAYBOOKS: the schema refuses unknown actions, shell fields, missing caps and missing verify checks.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const dir = path.join(__dirname, "..", "ops", "remediation");
const glitchtip = JSON.parse(fs.readFileSync(path.join(dir, "playbooks", "glitchtip-stack.json"), "utf8"));

// Runs validate_bundle in Python, the same code the remediator imports on the Pi.
function errors(playbooks) {
  const code =
    "import json,sys; sys.path.insert(0, sys.argv[1]); import playbook_schema as s; " +
    "print(json.dumps(s.validate_bundle(json.load(sys.stdin), s.owner_checks())))";
  return JSON.parse(execFileSync("python3", ["-c", code, dir], { input: JSON.stringify(playbooks), encoding: "utf8" }));
}
const with_ = (patch) => ({ ...structuredClone(glitchtip), ...patch });
const without = (key) => {
  const p = structuredClone(glitchtip);
  delete p[key];
  return p;
};

test("the checked-in playbooks validate", () => {
  const r = spawnSync("python3", [path.join(dir, "playbook_schema.py")], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(errors([glitchtip]), []);
});

test("there is a GlitchTip stack playbook answering the Kuma GlitchTip check", () => {
  assert.equal(glitchtip.check, "kuma-glitchtip");
  assert.deepEqual(glitchtip.action, { type: "compose_up", target: "glitchtip" });
});

test("an unknown action is refused", () => {
  assert.match(errors([with_({ action: { type: "reboot" } })]).join(), /unknown action/);
  assert.match(errors([with_({ action: { type: "run_shell", target: "x" } })]).join(), /unknown action/);
});

test("shell-like fields are refused at the top level and inside the action", () => {
  for (const key of ["shell", "command", "cmd", "exec", "args", "script"]) {
    assert.match(errors([with_({ [key]: "rm -rf /" })]).join(), new RegExp(`unknown key: ${key}`));
    assert.match(
      errors([with_({ action: { type: "compose_up", target: "glitchtip", [key]: "x" } })]).join(),
      new RegExp(`unknown action key: ${key}`),
    );
  }
});

test("targets are plain names; shell metacharacters and human-only targets are refused", () => {
  for (const target of ["glitchtip; reboot", "$(id)", "../etc", "Glitchtip", "", "glitchtip\n", 7]) {
    assert.match(errors([with_({ action: { type: "compose_up", target } })]).join(), /bad target/);
  }
  for (const target of [
    "ssh.service",
    "networking.service",
    "pihole-FTL.service",
    "docker.service",
    "apt-daily.service",
    "slops-remediator.service",
  ]) {
    const e = errors([with_({ action: { type: "restart_unit", target } })]).join();
    assert.match(e, /human-only|bad target/, target);
  }
  assert.match(errors([with_({ action: { type: "restart_unit", target: "glitchtip" } })]).join(), /bad target/);
  assert.match(
    errors([with_({ action: { type: "docker_prune_images", target: "x" } })]).join(),
    /unknown action key: target/,
  );
});

test("missing caps or verify checks are refused", () => {
  for (const key of ["max_attempts_per_24h", "cooldown_minutes", "verify", "escalate_to", "check"]) {
    assert.match(errors([without(key)]).join(), new RegExp(`missing key: ${key}`));
  }
  assert.match(errors([with_({ max_attempts_per_24h: 0 })]).join(), /max_attempts/);
  assert.match(errors([with_({ max_attempts_per_24h: 10 })]).join(), /max_attempts/);
  assert.match(errors([with_({ cooldown_minutes: 1 })]).join(), /cooldown/);
  assert.match(errors([with_({ verify: { check: "kuma-glitchtip" } })]).join(), /verify must have/);
  assert.match(errors([with_({ verify: { check: "made-up", wait_seconds: 60 } })]).join(), /verify check/);
});

test("targets must be on the per-action allowlist", () => {
  assert.match(errors([with_({ action: { type: "compose_up", target: "otherstack" } })]).join(), /allowlist/);
  for (const target of ["getty@tty1.service", "cron.service", "dbus.service"]) {
    assert.match(errors([with_({ action: { type: "restart_unit", target } })]).join(), /allowlist/, target);
  }
});

test("wrong types are refused, not crashed on", () => {
  for (const patch of [
    { check: ["x"] },
    { escalate_to: {} },
    { preconditions: [["x"]] },
    { action: { type: ["compose_up"] } },
    { verify: { check: ["x"], wait_seconds: 60 } },
  ]) {
    assert.ok(errors([with_(patch)]).length > 0, JSON.stringify(patch));
  }
});

test("docker actions need the docker_daemon_up precondition", () => {
  assert.match(errors([with_({ preconditions: [] })]).join(), /docker_daemon_up/);
});

test("a playbook must answer a check in the alert owner map", () => {
  assert.match(errors([with_({ check: "not-a-check" })]).join(), /not in alert-owners/);
});

test("one playbook per check and unique ids", () => {
  assert.match(errors([glitchtip, glitchtip]).join(), /duplicate id/);
  assert.match(errors([glitchtip, with_({ id: "other" })]).join(), /second playbook for check/);
});
