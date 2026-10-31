"use strict";

// B13-HEAL-WATCHDOG: the watchdog config, and the under-voltage check against faked get_throttled values.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const DIR = path.join(__dirname, "..", "ops", "pi-fleet", "watchdog");
const CHECK = path.join(DIR, "slops-power-check");
const DISPATCHER = fs.readFileSync(
  path.join(__dirname, "..", "ops", "command-center", "slops-alert-dispatcher"),
  "utf8",
);

function run(vcgencmdOutput, ...args) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "power-"));
  const fake = path.join(tmp, "vcgencmd");
  fs.writeFileSync(fake, `#!/bin/sh\nprintf '%s\\n' '${vcgencmdOutput}'\n`, { mode: 0o755 });
  const out = execFileSync("sh", [CHECK, "steward", ...args.map((a) => path.join(tmp, a))], {
    encoding: "utf8",
    env: { ...process.env, VCGENCMD: fake },
  });
  return { out: out.trim(), tmp };
}

test("the watchdog fires at the bcm2835 ceiling and bounds a hung reboot", () => {
  const conf = fs.readFileSync(path.join(DIR, "10-slops-watchdog.conf"), "utf8");
  assert.match(conf, /^\[Manager\]$/m);
  assert.match(conf, /^RuntimeWatchdogSec=15s$/m);
  assert.match(conf, /^RebootWatchdogSec=2min$/m);
});

const CASES = [
  ["throttled=0x0", "HEALTHY", "none"],
  ["throttled=0x1", "CRITICAL", "under_voltage_now"],
  ["throttled=0x50005", "CRITICAL", "under_voltage_now"],
  ["throttled=0x50000", "WARNING", "under_voltage_since_boot"],
  ["throttled=0x4", "WARNING", "throttled_now"],
  ["error", "DOWN", "get_throttled_unreadable"],
  ["throttled=0xzz", "DOWN", "get_throttled_unreadable"],
  ["throttled=0x", "DOWN", "get_throttled_unreadable"],
];
for (const [raw, result, reason] of CASES) {
  test(`get_throttled ${raw} reads ${result} ${reason}`, () => {
    assert.match(run(raw).out, new RegExp(`^result=${result} check=steward-under-voltage reason=${reason} `));
  });
}

test("the state file gets the same line for the status reader", () => {
  const { out, tmp } = run("throttled=0x10000", "under-voltage.status");
  assert.equal(fs.readFileSync(path.join(tmp, "under-voltage.status"), "utf8").trim(), out);
});

test("the dispatcher reports Command Center's bits and never reads a missing check as healthy", () => {
  assert.match(DISPATCHER, /reason=power_check_no_output/);
  assert.match(DISPATCHER, /reason=power_check_not_installed/);
  assert.match(DISPATCHER, /"\$stale" "\$power"/);
});

test("the dispatcher's power block turns a crashed check into DOWN", () => {
  const start = DISPATCHER.indexOf("if [ -x /usr/local/sbin/slops-power-check ]");
  const end = DISPATCHER.indexOf("\nfi\n", start) + 4;
  const block = DISPATCHER.slice(start, end).replaceAll("/usr/local/sbin/slops-power-check", "false_check");
  const out = execFileSync(
    "sh",
    ["-euc", `false_check() { return 2; }\n${block.replace("[ -x false_check ]", "true")}printf '%s' "$power"`],
    {
      encoding: "utf8",
    },
  );
  assert.equal(out, "result=DOWN check=command-center-under-voltage reason=power_check_no_output");
});
