"use strict";

// STANDARDS card J: a PR that changes a file a test reads must run the tests. pr-quality.yml is
// path-filtered, so every top-level repo entry a test file names has to appear in its trigger list.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
// Reviewed: named by tests, but not as a top-level path, or covered by another workflow.
const EXEMPT = {
  frontend: "tests read only frontend/src and the package files, which are listed",
  design: "only as Blueprints/specs/design",
  memory: "a string in a test, not a repo path",
  ".github": "tests read only .github/workflows, which is listed",
  ".claude": "tests read only .claude/hooks, which is listed",
  "README.md": "only as nested paths such as infra/warehouse/backup/README.md",
};

function triggerPaths() {
  const yml = fs.readFileSync(path.join(ROOT, ".github/workflows/pr-quality.yml"), "utf8");
  const after = yml.split(/\n {4}paths:\n/)[1];
  assert.ok(after, "pr-quality.yml has no pull_request paths: list");
  const block = after.split(/\n\S|\n\n/)[0];
  return [...block.matchAll(/^\s+- "([^"]+)"/gm)].map((m) => m[1]);
}

test("pr-quality.yml triggers on every top-level path the tests read", () => {
  const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
  const tops = [...new Set(git("ls-files").map((f) => f.split("/")[0]))];
  const tests = git("ls-files", "test").filter((f) => /\.m?js$/.test(f));
  const triggers = triggerPaths();
  const covered = (top) =>
    triggers.some(
      (t) => t === top || t === `${top}/**` || (t.endsWith("*") && !t.includes("/") && top.startsWith(t.slice(0, -1))),
    );
  const missing = [];
  for (const top of tops) {
    if (EXEMPT[top] || covered(top)) continue;
    const quoted = new RegExp(`["'\`/](\\.\\./)?${top.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`/]`);
    const user = tests.find((f) => quoted.test(fs.readFileSync(path.join(ROOT, f), "utf8")));
    if (user) missing.push(`${top} (read by ${user})`);
  }
  assert.deepEqual(missing, [], "add these to pr-quality.yml paths, or to EXEMPT with a reason");
});
