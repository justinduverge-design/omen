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
  return runTemp(vcgencmdOutput, "temp=45.1'C", ...args);
}

function runTemp(throttled, temp, ...args) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "power-"));
  const fake = path.join(tmp, "vcgencmd");
  fs.writeFileSync(
    fake,
    `#!/bin/sh\ncase "$1" in get_throttled) printf '%s\\n' '${throttled}' ;; measure_temp) printf '%s\\n' "${temp}" ;; esac\n`,
    { mode: 0o755 },
  );
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

const THERMAL = [
  ["throttled=0x0", "temp=45.1'C", "HEALTHY", "none", "40-49C"],
  ["throttled=0x0", "temp=72.0'C", "WARNING", "warm_now", "70-79C"],
  ["throttled=0x0", "temp=81.3'C", "CRITICAL", "hot_now", "80-89C"],
  ["throttled=0x40000", "temp=55.0'C", "WARNING", "throttled_since_boot", "50-59C"],
  [
    "throttled=0xa0008",
    "temp=79.9'C",
    "WARNING",
    "warm_now,soft_temp_limit_now,capped_since_boot,soft_temp_limit_since_boot",
    "70-79C",
  ],
  ["throttled=0x2", "temp=60.0'C", "WARNING", "capped_now", "60-69C"],
  ["throttled=0x0", "error", "DOWN", "measure_temp_unreadable", "unknown"],
  ["error", "temp=45.1'C", "DOWN", "get_throttled_unreadable", "unknown"],
];
for (const [raw, temp, result, reason, band] of THERMAL) {
  test(`thermal ${raw} ${temp} reads ${result} ${reason}`, () => {
    const second = runTemp(raw, temp).out.split("\n")[1];
    assert.equal(
      second.split(" throttled=")[0],
      `result=${result} check=steward-thermal reason=${reason} temp_band=${band}`,
    );
  });
}

test("the thermal line carries a band, not the exact reading, so the signature holds still", () => {
  const a = runTemp("throttled=0x40000", "temp=61.2'C").out;
  const b = runTemp("throttled=0x40000", "temp=64.8'C").out;
  assert.equal(a, b);
});

test("the history file gets the exact reading and keeps 7 days", () => {
  const { tmp } = runTemp("throttled=0x40000", "temp=61.2'C", "s.status", "history");
  const hist = path.join(tmp, "history");
  assert.match(fs.readFileSync(hist, "utf8"), /^\d{4}-\d\d-\d\dT\d\d:\d\dZ temp=61\.2 throttled=0x40000\n$/);
  fs.writeFileSync(hist, "old\n".repeat(2100));
  const fake = path.join(tmp, "vcgencmd");
  execFileSync("sh", [CHECK, "steward", path.join(tmp, "s.status"), hist], { env: { ...process.env, VCGENCMD: fake } });
  const lines = fs.readFileSync(hist, "utf8").trim().split("\n");
  assert.equal(lines.length, 2016);
  assert.match(lines.at(-1), /temp=61\.2/);
});

const READER = path.join(DIR, "read-power-state");
const read = (file) => execFileSync("sh", [READER, "steward", file], { encoding: "utf8" }).trim();

test("the status reader passes both lines through", () => {
  const { tmp } = run("throttled=0x0", "s.status");
  assert.match(
    read(path.join(tmp, "s.status")),
    /^result=HEALTHY check=steward-under-voltage .*\nresult=HEALTHY check=steward-thermal /,
  );
});

test("a missing or stale status file is DOWN, never silent", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reader-"));
  const missing = read(path.join(tmp, "nope"));
  assert.match(missing, /check=steward-under-voltage reason=status_missing/);
  assert.match(missing, /check=steward-thermal reason=status_missing/);
  const old = path.join(tmp, "old.status");
  fs.writeFileSync(old, "result=HEALTHY check=steward-thermal reason=none\n");
  const t = Date.now() / 1000 - 1200;
  fs.utimesSync(old, t, t);
  assert.match(read(old), /reason=status_stale/);
});

test("hardware alerts for heat get the parts link", () => {
  assert.match(DISPATCHER, /under-voltage\|thermal\|ssd-missing/);
});
