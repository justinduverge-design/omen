"use strict";
// B13-HEAL-REMEDIATOR-SHADOW: the refusal, kill-switch, cap and reboot tests from the design, run locally
// against a temp root. Shadow mode reports "would have run" and has no code path that executes an action.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const remDir = path.join(__dirname, "..", "ops", "remediation");
const remediator = path.join(remDir, "slops-remediator");
const bundlePy = path.join(remDir, "bundle.py");
const owners = path.join(__dirname, "..", "ops", "command-center", "alert-owners.tsv");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "remediator-shadow-"));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const key = path.join(tmp, "throwaway");
execFileSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-C", "test", "-f", key]);
const pub = fs.readFileSync(`${key}.pub`, "utf8").trim().split(" ").slice(0, 2).join(" ");

let n = 0;
// A fresh fake root: signed bundle (seq), public key, owner table, dispatcher signature.
function root({ seq = 5, signature = "GlitchTip: status=0\n", mutate } = {}) {
  const r = path.join(tmp, `root${n++}`);
  const put = (p, data) => {
    fs.mkdirSync(path.dirname(r + p), { recursive: true });
    fs.writeFileSync(r + p, data);
  };
  put("/etc/slops-remediator/allowed_signers", `slops-remediation-ci namespaces="slops-remediation" ${pub}\n`);
  put("/usr/local/lib/slops-alerting/alert-owners.tsv", fs.readFileSync(owners));
  put("/var/lib/slops-alerting/last-signature", signature);
  const b = `${r}/var/lib/slops-remediator/bundle.json`;
  fs.mkdirSync(path.dirname(b), { recursive: true });
  execFileSync("python3", [bundlePy, "build", b, "abc", String(seq)]);
  if (mutate) fs.writeFileSync(b, mutate(fs.readFileSync(b, "utf8")));
  execFileSync("ssh-keygen", ["-Y", "sign", "-q", "-f", key, "-n", "slops-remediation", b]);
  return r;
}
// One remediator run in its own process (a reboot between runs changes nothing but the process).
function run(r, minutes = 0) {
  const code = `import sys,datetime,importlib.machinery as m
mod=m.SourceFileLoader("rem",sys.argv[1]).load_module()
t=datetime.datetime(2026,10,30,3,0,tzinfo=datetime.timezone.utc)+datetime.timedelta(minutes=int(sys.argv[3]))
print(mod.run(mod.Paths(sys.argv[2]),t))`;
  return execFileSync("python3", ["-c", code, remediator, r, String(minutes)], { encoding: "utf8" }).trim();
}
const events = (r) => {
  try {
    return fs.readFileSync(`${r}/var/lib/slops-remediator/events`, "utf8");
  } catch {
    return "";
  }
};
const ledger = (r) => {
  try {
    return fs
      .readFileSync(`${r}/var/lib/slops-remediator/ledger.jsonl`, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(JSON.parse);
  } catch {
    return [];
  }
};

test("an active check with a signed playbook reports 'would have run' and records a shadow entry", () => {
  const r = root();
  assert.match(run(r), /would_run/);
  assert.match(
    events(r),
    /SHADOW: would have run compose_up glitchtip for kuma-glitchtip \(1\/2 today\)\. Nothing was run\./,
  );
  assert.deepEqual(
    ledger(r).map((e) => [e.outcome, e.mode, e.action]),
    [["would_run", "shadow", "compose_up glitchtip"]],
  );
});

test("no code path executes an action: no process, shell or socket APIs in the remediator", () => {
  const src = fs.readFileSync(remediator, "utf8");
  for (const api of [
    "subprocess",
    "os.system",
    "os.exec",
    "os.spawn",
    "Popen",
    "socket",
    "urllib",
    "shutil",
    "pty",
    "eval(",
    "exec(",
  ]) {
    assert.ok(!src.includes(api), `remediator uses ${api}`);
  }
  // bundle.py's only process call is ssh-keygen -Y verify.
  const b = fs.readFileSync(bundlePy, "utf8");
  assert.equal((b.match(/subprocess\.run\(/g) || []).length, 1);
  assert.match(b, /\["ssh-keygen", "-Y", "verify"/);
});

test("a quiet check does nothing", () => {
  const r = root({ signature: "" });
  assert.equal(run(r), "[]");
  assert.equal(events(r), "");
});

test("refusal: a tampered bundle stops all action and reports a bad signature once", () => {
  const r = root();
  const b = `${r}/var/lib/slops-remediator/bundle.json`;
  fs.writeFileSync(b, fs.readFileSync(b, "utf8").replace('"cooldown_minutes":30', '"cooldown_minutes":15'));
  assert.equal(run(r), "refused");
  assert.equal(run(r, 5), "refused");
  assert.equal((events(r).match(/remediation disabled: bad signature/g) || []).length, 1);
  assert.deepEqual(ledger(r), []);
});

test("refusal: a signed bundle with an unknown action is refused", () => {
  const r = root({ mutate: (s) => s.replace('"target":"glitchtip","type":"compose_up"', '"type":"reboot"') });
  assert.equal(run(r), "refused");
  assert.match(events(r), /unknown action/);
  assert.deepEqual(ledger(r), []);
});

test("refusal: no public key, or an older signed bundle replayed, is refused", () => {
  const r = root();
  fs.writeFileSync(`${r}/etc/slops-remediator/allowed_signers`, "# none\n");
  assert.equal(run(r), "refused");
  const r2 = root({ seq: 5 });
  fs.writeFileSync(`${r2}/var/lib/slops-remediator/highest-seq`, "9\n");
  assert.equal(run(r2), "refused");
  assert.match(events(r2), /replayed bundle seq 5 < 9/);
});

test("kill switch: the disabled file stops everything, reported once, and resuming is reported", () => {
  const r = root();
  fs.writeFileSync(`${r}/etc/slops-remediator/disabled`, "");
  assert.equal(run(r), "disabled");
  assert.equal(run(r, 5), "disabled");
  assert.equal((events(r).match(/disabled by kill switch/g) || []).length, 1);
  assert.deepEqual(ledger(r), []);
  fs.rmSync(`${r}/etc/slops-remediator/disabled`);
  assert.match(run(r, 10), /would_run/);
  assert.match(events(r), /kill switch removed/);
});

test("cooldown: a second run inside the cooldown adds nothing", () => {
  const r = root();
  run(r, 0);
  assert.match(run(r, 10), /cooldown/);
  assert.equal(ledger(r).length, 1);
});

test("cap: a permanently broken target escalates once with its owner and does not loop", () => {
  const r = root();
  run(r, 0);
  run(r, 31);
  assert.match(run(r, 62), /escalated/);
  assert.match(run(r, 93), /escalated/);
  assert.match(run(r, 124), /escalated/);
  const outcomes = ledger(r).map((e) => e.outcome);
  assert.deepEqual(outcomes, ["would_run", "would_run", "escalated"]);
  assert.match(
    events(r),
    /kuma-glitchtip still failing after 2 would-be attempts today; would escalate\. owner=founder fix=ops\/command-center\/RUNBOOK\.md#kuma-glitchtip/,
  );
  assert.match(run(r, 60 * 25), /would_run/, "a new day gets fresh attempts");
});

test("reboot: attempts survive a restart (state on disk, timer catches up)", () => {
  const r = root();
  run(r, 0); // first boot, separate process
  assert.match(run(r, 31), /would_run/); // after a "reboot": another process, same disk
  assert.match(events(r), /\(2\/2 today\)/);
  const src = fs.readFileSync(remediator, "utf8");
  assert.match(src, /"\/var\/lib\/slops-remediator\/ledger\.jsonl"/);
  assert.doesNotMatch(src, /"\/(run|tmp)\//);
  const timer = fs.readFileSync(path.join(remDir, "slops-remediator.timer"), "utf8");
  assert.match(timer, /OnBootSec=/);
  assert.match(timer, /Persistent=true/);
});

test("a corrupt ledger, seq file or owner table is reported, never a silent crash", () => {
  const r = root();
  fs.writeFileSync(
    `${r}/var/lib/slops-remediator/ledger.jsonl`,
    '1\n[]\n{"outcome":"would_run"}\n{"at":"2026-10-30T02:59:00","playbook":"glitchtip-stack-up","outcome":"would_run"}\nnot json\n',
  );
  assert.match(run(r), /would_run/);
  assert.match(events(r), /ledger has 5 unreadable lines/);
  const r2 = root();
  fs.writeFileSync(`${r2}/var/lib/slops-remediator/highest-seq`, "garbage\n");
  assert.equal(run(r2), "refused");
  assert.match(events(r2), /highest-seq file is corrupt/);
  const r3 = root();
  fs.appendFileSync(`${r3}/usr/local/lib/slops-alerting/alert-owners.tsv`, "broken-row\n");
  assert.equal(run(r3), "refused");
  assert.match(events(r3), /owner table unreadable/);
});

test("an unexpected crash is reported to the events file and exits 1", () => {
  const r = root();
  fs.mkdirSync(`${r}/var/lib/slops-alerting/last-signature.d`);
  fs.rmSync(`${r}/var/lib/slops-alerting/last-signature`);
  fs.renameSync(`${r}/var/lib/slops-alerting/last-signature.d`, `${r}/var/lib/slops-alerting/last-signature`);
  const res = require("node:child_process").spawnSync("python3", [remediator, "--root", r]);
  assert.equal(res.status, 1);
  assert.match(events(r), /remediator crashed: IsADirectoryError/);
});

test("the events file is capped, and the cut is said", () => {
  const r = root({ signature: "" });
  const ev = `${r}/var/lib/slops-remediator/events`;
  fs.writeFileSync(ev, "x\n".repeat(200));
  fs.writeFileSync(`${r}/etc/slops-remediator/disabled`, "");
  run(r);
  const lines = fs.readFileSync(ev, "utf8").trim().split("\n");
  assert.ok(lines.length <= 102);
  assert.match(lines[0], /100 older unsent reports trimmed/);
});

test("the service runs unprivileged, and the dispatcher only relays the reports", () => {
  const unit = fs.readFileSync(path.join(remDir, "slops-remediator.service"), "utf8");
  assert.match(unit, /User=slops-remediator/);
  assert.match(unit, /NoNewPrivileges=yes/);
  assert.match(unit, /ProtectSystem=strict/);
  const d = fs.readFileSync(path.join(__dirname, "..", "ops", "command-center", "slops-alert-dispatcher"), "utf8");
  assert.match(d, /SLOPS REMEDIATOR \(shadow, nothing was run\)/);
  assert.match(d, /mv "\$remediator_events" "\$remediator_batch"/);
  assert.match(d, /earlier lines not shown/);
  assert.doesNotMatch(unit, /slops-alerting/);
  // The dispatcher touches remediator files only to collect reports: no unit control, no bundle access.
  assert.doesNotMatch(d, /systemctl[^\n]*remediator|bundle\.json/);
});
