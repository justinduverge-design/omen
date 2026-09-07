"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const SCRIPT = path.join(__dirname, "..", "scripts", "check-sprint-staleness.js");

function run(args) {
  try {
    return { status: 0, out: execFileSync("node", [SCRIPT, ...args], { encoding: "utf8" }) };
  } catch (e) {
    return { status: e.status, out: `${e.stdout || ""}${e.stderr || ""}` };
  }
}

/**
 * Why this test exists.
 *
 * The orchestrator crashed with `Cannot read properties of undefined (reading 'map')` after
 * printing every one of its findings, on every run that had informational output. Two
 * checkers wrote into `informational` with different shapes — a keyed item with `prs`, and a
 * bare sentence about references deliberately not read — and the reporter assumed the first.
 * The findings were correct and the exit code was correct; the crash landed after them, which
 * is exactly the kind of failure that gets read as "the tool is broken" and then ignored.
 *
 * `--only known-issues-missing-paths` is the local, network-free path: it makes zero GitHub
 * calls, so this test runs the same way on a laptop and on a runner.
 */

test("a local run completes and exits 0 with no findings", () => {
  const { status, out } = run(["--only", "known-issues-missing-paths"]);
  assert.equal(status, 0);
  assert.doesNotMatch(out, /TypeError/);
  assert.match(out, /Coverage —/);
});

test("both informational shapes render without crashing", () => {
  // The two real producers: a keyed item with PRs, and a bare sentence with no `prs` field.
  const { normalizeNote, describeInformational } = require(SCRIPT);

  const item = normalizeNote(
    { kind: "sprint-item", key: "S5", status: "VERIFIED", prs: [{ number: 331 }] },
    "sprint-vs-merged-prs"
  );
  const note = normalizeNote("Not read: 67 issue reference(s) in decision_log.md.",
    "issue-state-conflicts");

  assert.match(describeInformational(item).join("\n"), /S5 \(VERIFIED\).*#331/);
  assert.match(describeInformational(note).join("\n"),
    /Not read: 67 issue reference\(s\).*\[issue-state-conflicts\]/);
  assert.equal(note.kind, "note");
});

test("JSON output gives every informational item a kind and a checker", () => {
  const { status, out } = run(["--json", "--only", "known-issues-missing-paths"]);
  assert.equal(status, 0);
  for (const i of JSON.parse(out).informational) {
    assert.ok(i.kind && i.checker);
  }
});
