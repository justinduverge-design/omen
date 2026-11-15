"use strict";

// VC-ALERT-DISPATCHER-SILENT (2026-11-14): long alerts are split under Discord's 2000-character limit, and the
// watcher read names read-state explicitly (Tailscale SSH ignores the key's forced command).
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const DISPATCHER = fs.readFileSync(path.join(__dirname, "..", "ops/command-center/slops-alert-dispatcher"), "utf8");

function split(message) {
  const start = DISPATCHER.indexOf("split_message() {");
  const end = DISPATCHER.indexOf("\n}\n", start) + 3;
  const out = execFileSync(
    "sh",
    ["-c", `${DISPATCHER.slice(start, end)}printf '%s' "$1" | split_message`, "sh", message],
    {
      encoding: "utf8",
    },
  );
  return out
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l).content);
}

test("a short alert is one message, unchanged", () => {
  assert.deepEqual(split("SLOPS ALERT: one line"), ["SLOPS ALERT: one line"]);
});

test("a long alert is split into numbered parts under 2000 characters, nothing lost", () => {
  const lines = Array.from({ length: 120 }, (_, i) => `result=DOWN check=monitor-${i} reason=no_heartbeat_in_window`);
  const message = `SLOPS ALERT: CRITICAL state change\n${lines.join("\n")}`;
  const parts = split(message);
  assert.ok(parts.length > 1);
  for (const [i, p] of parts.entries()) {
    assert.ok(p.length <= 2000, `part ${i + 1} is ${p.length} characters`);
    assert.ok(p.startsWith(`(${i + 1}/${parts.length}) `));
  }
  assert.equal(parts.map((p) => p.replace(/^\(\d+\/\d+\) /, "")).join(""), message);
});

test("a single line longer than the limit is cut, not dropped", () => {
  const parts = split("x".repeat(4500));
  assert.ok(parts.every((p) => p.length <= 2000));
  assert.equal(parts.map((p) => p.replace(/^\(\d+\/\d+\) /, "")).join(""), "x".repeat(4500));
});

test("the watcher read names read-state explicitly", () => {
  assert.match(DISPATCHER, /darthslops@"\$h" \/usr\/local\/lib\/slops-alerting\/read-state /);
});
