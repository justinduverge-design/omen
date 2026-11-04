"use strict";

// B13-HEAL-SD-SYNC: the boot check (booted-from-sd, ssd-missing, sd-sync) and the weekly SD copy, against fakes.
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const DIR = path.join(__dirname, "..", "ops", "pi-fleet", "sd-sync");
const CHECK = path.join(DIR, "slops-boot-check");
const SYNC = path.join(DIR, "slops-sd-sync");
const DISPATCHER = fs.readFileSync(
  path.join(__dirname, "..", "ops", "command-center", "slops-alert-dispatcher"),
  "utf8",
);
const GOOD_LINE =
  "console=tty1 root=PARTUUID=abcd-02 rootwait cgroup_enable=memory cgroup_memory=1";

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sdsync-"));
}

function exe(dir, name, body) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  return p;
}

// root: findmnt's answer; sda: whether /sys/block/sda exists; usb: lsusb -d output; status: sync status content.
function check({
  root = "/dev/sda2",
  sda = true,
  usb = "Bus 002 Device 002: ID 152d:a578",
  status,
  age = 0,
} = {}) {
  const tmp = tmpdir();
  const sys = path.join(tmp, "sys");
  fs.mkdirSync(sys);
  if (sda) fs.mkdirSync(path.join(sys, "sda"));
  const lsusb = exe(tmp, "lsusb", `printf '%s' '${usb}'`);
  const file = path.join(tmp, "status");
  if (status !== undefined) {
    fs.writeFileSync(file, status);
    const t = Date.now() / 1000 - age;
    fs.utimesSync(file, t, t);
  }
  const out = execFileSync("sh", [CHECK, "command-center", file], {
    encoding: "utf8",
    env: {
      ...process.env,
      SLOPS_ROOT_SOURCE: root,
      SLOPS_SYS_BLOCK: sys,
      LSUSB: lsusb,
    },
  });
  return out.trim().split("\n");
}

const HEALTHY_SYNC =
  "result=HEALTHY check=command-center-sd-sync reason=none\n";

test("on the SSD with the enclosure present and a fresh copy, all three lines are HEALTHY", () => {
  assert.deepEqual(check({ status: HEALTHY_SYNC }), [
    "result=HEALTHY check=command-center-booted-from-sd reason=none",
    "result=HEALTHY check=command-center-ssd-missing reason=none",
    "result=HEALTHY check=command-center-sd-sync reason=none",
  ]);
});

const ROOTS = [
  ["/dev/mmcblk0p2", "CRITICAL", "root_on_sd_card"],
  ["/dev/sdb2", "WARNING", "root_not_on_ssd"],
  ["", "DOWN", "root_unreadable"],
];
for (const [root, result, reason] of ROOTS) {
  test(`root ${root || "(none)"} reads ${result} ${reason}`, () => {
    assert.equal(
      check({ root, status: HEALTHY_SYNC })[0],
      `result=${result} check=command-center-booted-from-sd reason=${reason}`,
    );
  });
}

const SSD = [
  [false, "", "CRITICAL", "ssd_not_visible"],
  [false, "ID 152d:a578", "CRITICAL", "enclosure_visible_disk_missing"],
  [true, "", "WARNING", "ssd_enclosure_not_recognised"],
];
for (const [sda, usb, result, reason] of SSD) {
  test(`sda=${sda} usb=${usb ? "yes" : "no"} reads ${result} ${reason}`, () => {
    assert.equal(
      check({ sda, usb, status: HEALTHY_SYNC })[1],
      `result=${result} check=command-center-ssd-missing reason=${reason}`,
    );
  });
}

test("a missing, stale or garbled sync status is a WARNING, never silent", () => {
  assert.match(
    check()[2],
    /result=WARNING check=command-center-sd-sync reason=sync_never_ran$/,
  );
  assert.match(
    check({ status: HEALTHY_SYNC, age: 9 * 86400 })[2],
    /reason=sync_stale$/,
  );
  assert.match(
    check({ status: "rubbish\n" })[2],
    /reason=sync_status_unreadable$/,
  );
  assert.equal(
    check({
      status:
        "result=CRITICAL check=command-center-sd-sync reason=clone_failed\n",
    })[2],
    "result=CRITICAL check=command-center-sd-sync reason=clone_failed",
  );
});

test("an interrupted copy is quiet while it may still run, then CRITICAL; a failed copy never softens to stale", () => {
  const marker =
    "result=CRITICAL check=command-center-sd-sync reason=clone_interrupted\n";
  assert.equal(
    check({ status: marker, age: 1800 })[2],
    "result=HEALTHY check=command-center-sd-sync reason=none",
  );
  assert.match(
    check({ status: marker, age: 7 * 3600 })[2],
    /^result=CRITICAL .*reason=clone_interrupted$/,
  );
  const failed =
    "result=CRITICAL check=command-center-sd-sync reason=clone_failed\n";
  assert.match(
    check({ status: failed, age: 9 * 86400 })[2],
    /reason=clone_failed$/,
  );
});

test("lines carry no device paths, times or counts, so the signature holds", () => {
  for (const l of check({ root: "/dev/mmcblk0p2", sda: false, usb: "" })) {
    assert.match(
      l,
      /^result=[A-Z]+ check=command-center-[a-z-]+ reason=[a-z_]+$/,
    );
  }
});

// The sync with a fake rpi-clone that writes the SD boot line it is given.
function sync({
  root = "/dev/sda2",
  ssdLine = GOOD_LINE,
  sdLine = GOOD_LINE,
  cloneExit = 0,
  partuuid = "abcd-02",
  fstab = "PARTUUID=abcd-02  /  ext4  defaults,noatime  0  1\n",
} = {}) {
  const tmp = tmpdir();
  const ssd = path.join(tmp, "ssd-cmdline.txt");
  fs.writeFileSync(ssd, ssdLine);
  const boot = path.join(tmp, "sdboot");
  fs.mkdirSync(boot);
  const marker = path.join(tmp, "cloned");
  const clone = exe(
    tmp,
    "rpi-clone",
    `echo "$@" > '${marker}'\nprintf '%s' '${sdLine}' > '${boot}/cmdline.txt'\nexit ${cloneExit}`,
  );
  const status = path.join(tmp, "state", "status");
  const fstabFile = path.join(tmp, "fstab");
  fs.writeFileSync(fstabFile, fstab);
  const r = spawnSync("sh", [SYNC, status], {
    encoding: "utf8",
    env: {
      ...process.env,
      SLOPS_ROOT_SOURCE: root,
      SSD_CMDLINE: ssd,
      RPI_CLONE: clone,
      SD_BOOT_DIR: boot,
      SD_PARTUUID: partuuid,
      SD_FSTAB: fstabFile,
      SD_SYNC_LOCKED: "1",
      SD_SYNC_LOG: path.join(tmp, "log"),
    },
  });
  return {
    code: r.status,
    line: fs.existsSync(status) ? fs.readFileSync(status, "utf8").trim() : "",
    cloneArgs: fs.existsSync(marker)
      ? fs.readFileSync(marker, "utf8").trim()
      : null,
  };
}

test("a good copy writes HEALTHY and clones the SD card unattended", () => {
  const r = sync();
  assert.equal(r.code, 0);
  assert.equal(
    r.line,
    "result=HEALTHY check=command-center-sd-sync reason=none",
  );
  assert.equal(r.cloneArgs, "-U mmcblk0");
});

test("booted from SD, it refuses and never runs rpi-clone", () => {
  const r = sync({ root: "/dev/mmcblk0p2" });
  assert.equal(r.code, 1);
  assert.match(r.line, /reason=refused_root_not_ssd$/);
  assert.equal(r.cloneArgs, null);
});

test("an SSD boot line without the cgroup flag is never copied", () => {
  const r = sync({ ssdLine: "console=tty1 root=PARTUUID=x rootwait" });
  assert.match(r.line, /reason=ssd_boot_line_missing_cgroup$/);
  assert.equal(r.cloneArgs, null);
});

const AFTER = [
  [{ cloneExit: 3 }, "clone_failed"],
  [
    { sdLine: "console=tty1 root=PARTUUID=abcd-02 rootwait" },
    "sd_boot_line_missing_cgroup",
  ],
  [{ partuuid: "ffff-02" }, "sd_boot_line_wrong_root"],
  [{ partuuid: "" }, "sd_boot_line_wrong_root"],
  [
    { fstab: "PARTUUID=old-02  /  ext4  defaults  0  1\n" },
    "sd_fstab_wrong_root",
  ],
  [{ cloneExit: 137 }, "clone_failed"],
];
for (const [opts, reason] of AFTER) {
  test(`after the copy, ${reason} reads CRITICAL`, () => {
    const r = sync(opts);
    assert.equal(r.code, 1);
    assert.equal(
      r.line,
      `result=CRITICAL check=command-center-sd-sync reason=${reason}`,
    );
  });
}

test("the dispatcher's power block carries the boot check and never reads a missing one as healthy", () => {
  assert.match(DISPATCHER, /reason=boot_check_no_output/);
  assert.match(DISPATCHER, /reason=boot_check_not_installed/);
  const start = DISPATCHER.indexOf(
    "if [ -x /usr/local/sbin/slops-boot-check ]",
  );
  const end = DISPATCHER.indexOf(
    'power="$(printf \'%s\\n%s\' "$power" "$boot"',
    start,
  );
  assert.ok(start > 0 && end > start);
  const block = DISPATCHER.slice(start, DISPATCHER.indexOf("\n", end) + 1)
    .replaceAll("/usr/local/sbin/slops-boot-check", "fake_check")
    .replace("[ -x fake_check ]", "true");
  const run = (fn) =>
    execFileSync(
      "sh",
      [
        "-euc",
        `power='result=WARNING check=command-center-thermal reason=x'\n${fn}\n${block}printf '%s' "$power"`,
      ],
      {
        encoding: "utf8",
      },
    );
  assert.equal(
    run("fake_check() { return 2; }"),
    "result=WARNING check=command-center-thermal reason=x\nresult=DOWN check=command-center-booted-from-sd reason=boot_check_no_output",
  );
  assert.equal(
    run(
      `fake_check() { echo 'result=HEALTHY check=command-center-booted-from-sd reason=none'; echo 'result=CRITICAL check=command-center-ssd-missing reason=ssd_not_visible'; }`,
    ),
    "result=WARNING check=command-center-thermal reason=x\nresult=CRITICAL check=command-center-ssd-missing reason=ssd_not_visible",
  );
});
