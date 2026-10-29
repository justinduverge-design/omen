"use strict";

// STANDARDS card E (rule 7): every runnable ops/ script and merge-pr.sh answers --help before anything
// runs. Before this, `omen-football-restore --help` would have started a restore.
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const SHELL = execFileSync("git", ["ls-files", "ops"], { cwd: ROOT, encoding: "utf8" })
  .split("\n")
  .filter((f) => f && /^#!.*\b(bash|sh)\b/.test(fs.readFileSync(path.join(ROOT, f), "utf8").split("\n")[0]));
const SCRIPTS = [...SHELL, "scripts/merge-pr.sh"];

// Any tool a script could reach for fails loudly, so a --help that runs real work is caught.
const stubs = fs.mkdtempSync(path.join(os.tmpdir(), "help-stubs-"));
const TRIPWIRE = path.join(stubs, "tripped");
for (const tool of [
  "ssh",
  "docker",
  "restic",
  "psql",
  "gh",
  "git",
  "systemctl",
  "curl",
  "sudo",
  "logger",
  "nmcli",
  "runuser",
  "python3",
  "sqlite3",
]) {
  fs.writeFileSync(path.join(stubs, tool), `#!/bin/sh\necho ${tool} >> "${TRIPWIRE}"\nexit 99\n`, { mode: 0o755 });
}
const BASH = spawnSync("bash", ["-c", "command -v bash"], { encoding: "utf8" }).stdout.trim();

test("ops/ has the scripts this test expects", () => {
  assert.ok(SHELL.length >= 20, `found only ${SHELL.length}`);
});

for (const script of SCRIPTS) {
  // #!/bin/sh scripts run under sh (dash on Linux CI), so a bashism in the guard fails here.
  const posix = fs.readFileSync(path.join(ROOT, script), "utf8").startsWith("#!/bin/sh");
  for (const flag of ["--help", "-h"])
    test(`${script} ${flag} prints usage, exits 0 and runs nothing`, () => {
      fs.rmSync(TRIPWIRE, { force: true });
      const out = spawnSync(posix ? "/bin/sh" : BASH, [path.join(ROOT, script), flag], {
        env: { PATH: `${stubs}:/usr/bin:/bin`, HOME: stubs },
        encoding: "utf8",
      });
      assert.equal(out.status, 0, out.stderr);
      assert.ok(out.stdout.trim().split("\n").length >= 2, "usage text is too short");
      assert.ok(!fs.existsSync(TRIPWIRE), `called ${fs.existsSync(TRIPWIRE) && fs.readFileSync(TRIPWIRE, "utf8")}`);
    });
}

test("merge-pr.sh: usage errors exit 2 on stderr, before any gh call", () => {
  for (const args of [[], ["abc"], ["12", "--rebase"]]) {
    fs.rmSync(TRIPWIRE, { force: true });
    const out = spawnSync(BASH, [path.join(ROOT, "scripts/merge-pr.sh"), ...args], {
      env: { PATH: `${stubs}:/usr/bin:/bin` },
      encoding: "utf8",
    });
    assert.equal(out.status, 2, JSON.stringify(args));
    assert.match(out.stderr, /usage/);
    assert.ok(!fs.existsSync(TRIPWIRE));
  }
});
