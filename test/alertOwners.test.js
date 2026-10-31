"use strict";
// B13-ALERT-OWNERS: every line the dispatcher can emit names an owner and a runbook step.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const dir = path.join(__dirname, "..", "ops", "command-center");
const annotator = path.join(dir, "slops-alert-annotate");
const table = path.join(dir, "alert-owners.tsv");

// One sample per check the dispatcher can emit (fleet spec: 14 Steward/Sentinel checks, plus
// unreachable hosts, Kuma, Pi-hole, GlitchTip, football codes, A4, stale payload).
const STEWARD_CHECKS = [
  "omen-ready", "tls-expiry", "supabase-backup-freshness", "football-backup-freshness",
  "restic-integrity", "command-center-alive", "network-health", "auth-security", "listener-drift",
  "omen-host-patch-kvm1", "omen-host-patch-kvm2", "omen-host-posture-kvm1", "omen-host-posture-kvm2",
  "public-exposure",
];
const FOOTBALL = ["job_failure", "source_loss", "schema_drift", "stale_data", "disk_low", "witness_mismatch", "witness_outage"];
const SAMPLES = [
  ...STEWARD_CHECKS.map((c) => `result=WARNING check=${c} reason=x`),
  "result=DOWN check=steward-unreachable reason=no_response_over_ssh_10min",
  "result=DOWN check=sentinel-unreachable reason=no_response_over_ssh_10min",
  "result=WARNING label=Steward check=tls-expiry reason=x",
  "2026-10-29T03:14Z router unreachable 3 min: reconnecting Wi-Fi",
  "GlitchTip: status=0",
  "recall: search: status=0",
  "Omen API ready: status=0",
  "Pi-hole DNS probe failed: timeout",
  "GlitchTip #2: ESPN API 404",
  ...FOOTBALL.map((c) => `Omen football: ${c} severity=high`),
  "Omen football status payload is STALE: 31 hours old (generated 2026-10-28T00:00:00Z)",
  "Omen football status payload is unreadable or malformed",
  "Omen A4 gates: state_stale severity=medium",
  "Omen A4 gates: ALL GATES PASS",
];

const run = (input) => execFileSync("python3", [annotator, table], { input, encoding: "utf8" });

test("every emittable check maps to a real owner and an existing runbook heading", () => {
  const runbook = fs.readFileSync(path.join(dir, "RUNBOOK.md"), "utf8");
  const headings = new Set([...runbook.matchAll(/^## (\S+)$/gm)].map((m) => m[1]));
  for (const line of SAMPLES) {
    const out = run(line);
    const m = out.match(/ owner=(founder|agent) fix=ops\/command-center\/RUNBOOK\.md#(\S+)$/);
    assert.ok(m, `no owner/fix on: ${out}`);
    assert.notEqual(m[2], "unmapped", `no table row for: ${line}`);
    assert.ok(headings.has(m[2]), `no runbook heading #${m[2]}`);
  }
  assert.equal(STEWARD_CHECKS.length, 14);
});

test("every table row is reachable and has a runbook heading", () => {
  const runbook = fs.readFileSync(path.join(dir, "RUNBOOK.md"), "utf8");
  const anchors = fs.readFileSync(table, "utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split("\t"));
  for (const row of anchors) {
    assert.equal(row.length, 5, `bad row: ${row.join("|")}`);
    assert.match(runbook, new RegExp(`^## ${row[3]}$`, "m"));
  }
  const used = new Set(SAMPLES.map((l) => run(l).match(/#(\S+)$/)[1]));
  for (const row of anchors) assert.ok(used.has(row[3]), `row ${row[0]} has no sample`);
});

test("GlitchTip down routes to the Kuma row, not the issue row", () => {
  assert.match(run("GlitchTip: status=0"), /#kuma-glitchtip$/);
  assert.match(run("GlitchTip #7: boom"), /owner=agent .*#glitchtip-issue$/);
});

test("a new check mentioning dns is unmapped only if nothing else matches", () => {
  assert.match(run("result=WARNING check=tls-expiry reason=dns_timeout"), /#tls-expiry$/);
});

test("headers and blanks pass through; an unknown line is tagged unmapped, never dropped", () => {
  const out = run("SLOPS ALERT: CRITICAL state change\nsomething new\n");
  assert.equal(out, "SLOPS ALERT: CRITICAL state change\nsomething new owner=founder fix=ops/command-center/RUNBOOK.md#unmapped\n");
});

test("the dispatcher annotates at delivery only, with a bare-text fallback", () => {
  const d = fs.readFileSync(path.join(dir, "slops-alert-dispatcher"), "utf8");
  assert.match(d, /printf '%s' "\$1" \| annotate "\$1" \| python3/);
  assert.match(d, /slops-alert-annotate [^\n]*alert-owners\.tsv 2>\/dev\/null \|\| printf '%s' "\$1"/);
  assert.doesNotMatch(d.match(/sig="\$\(printf[^\n]+/)[0], /annotate/);
});
