const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

test("production readiness checklist is source-backed and fail-closed", () => {
  const root = path.join(__dirname, "..");
  const output = execFileSync(process.execPath, ["scripts/validate-production-readiness.js"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.match(output, /Production readiness checklist valid/);
});
