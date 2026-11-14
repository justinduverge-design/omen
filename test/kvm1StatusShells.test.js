"use strict";
// The steward-status and sentinel-status login shells on KVM1 (ops/kvm1-status). Under Tailscale SSH the
// shell runs as `<shell> -c "<command>"` with no SSH_ORIGINAL_COMMAND; each serves only its named exports.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const DIR = path.join(__dirname, "..", "ops", "kvm1-status");

const SHELLS = {
  "omen-status-dispatch": {
    status: "omen-backup-status-export",
    "football-status": "omen-football-backup-status-export",
    "restic-status": "omen-restic-check-status-export",
  },
  "omen-sentinel-status-dispatch": {
    posture: "omen-host-posture-status-export",
    status: "omen-host-patch-status-export",
  },
};

// A copy of the shell whose export directory is a temp dir of stub exports that print their own name.
function harness(shell) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kvm1-status-"));
  for (const exp of Object.values(SHELLS[shell])) {
    const stub = path.join(tmp, exp);
    fs.writeFileSync(stub, `#!/bin/sh\necho "${exp} $#"\n`);
    fs.chmodSync(stub, 0o755);
  }
  const src = fs.readFileSync(path.join(DIR, shell), "utf8");
  assert.match(src, /^dir=\/usr\/local\/sbin$/m, "the export directory is fixed, not taken from the environment");
  const copy = path.join(tmp, shell);
  fs.writeFileSync(copy, src.replace(/^dir=\/usr\/local\/sbin$/m, `dir=${tmp}`));
  return (args, env = {}) =>
    spawnSync("sh", [copy, ...args], { encoding: "utf8", env: { PATH: process.env.PATH, ...env } });
}

for (const [shell, routes] of Object.entries(SHELLS)) {
  test(`${shell}: each named command runs only its export, with no arguments`, () => {
    const run = harness(shell);
    for (const [cmd, exp] of Object.entries(routes)) {
      const viaShell = run(["-c", cmd]);
      assert.equal(viaShell.status, 0, cmd);
      assert.equal(viaShell.stdout, `${exp} 0\n`, cmd);
      const viaForced = run([], { SSH_ORIGINAL_COMMAND: cmd });
      assert.equal(viaForced.status, 0, cmd);
      assert.equal(viaForced.stdout, `${exp} 0\n`, cmd);
    }
  });

  test(`${shell}: no command means "status"`, () => {
    const run = harness(shell);
    const res = run([]);
    assert.equal(res.status, 0);
    assert.equal(res.stdout, `${routes.status} 0\n`);
  });

  test(`${shell}: anything but exactly one known name exits 64 and runs nothing`, () => {
    const run = harness(shell);
    const refusedArgs = [
      ["-c"], ["-c", ""], ["-c", "status", "extra"], ["-l"], ["-i"], ["status"], ["--login"],
      ["-c", "status extra"], ["-c", "status; id"], ["-c", "id"], ["-c", " status"], ["-c", "status\n"],
      ["-c", "internal-sftp"], ["-c", "/usr/lib/openssh/sftp-server"], ["-c", "scp -t /tmp"], ["-c", "bash"],
    ];
    for (const args of refusedArgs) {
      const res = run(args);
      assert.equal(res.status, 64, JSON.stringify(args));
      assert.equal(res.stdout, "", JSON.stringify(args));
    }
    for (const cmd of ["status; id", "bash", "posture extra", "football-status extra"]) {
      const res = run([], { SSH_ORIGINAL_COMMAND: cmd });
      assert.equal(res.status, 64, cmd);
      assert.equal(res.stdout, "", cmd);
    }
  });

  test(`${shell}: --help prints usage and runs nothing`, () => {
    const res = spawnSync("sh", [path.join(DIR, shell), "--help"], { encoding: "utf8" });
    assert.equal(res.status, 0);
    assert.match(res.stdout, /login shell/);
  });

  test(`${shell}: committed executable`, () => {
    assert.equal(fs.statSync(path.join(DIR, shell)).mode & 0o111, 0o111);
  });
}

test("steward and sentinel shells refuse each other's commands", () => {
  assert.equal(harness("omen-status-dispatch")(["-c", "posture"]).status, 64);
  assert.equal(harness("omen-sentinel-status-dispatch")(["-c", "restic-status"]).status, 64);
});
