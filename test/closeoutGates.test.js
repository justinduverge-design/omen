"use strict";

// STANDARDS card D: closeout.sh finds Valor-Core through VALOR_CORE (one place), runs its valor-brain
// validator, says NOT RUN when it can't, and no longer depends on the Slops-OS tree or truth-gate.
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(ROOT, "scripts", "closeout.sh");
const closeout = (env) => spawnSync("bash", [SCRIPT], { cwd: ROOT, env: { ...process.env, ...env }, encoding: "utf8" });

test("runs the validator from VALOR_CORE", () => {
  const vc = fs.mkdtempSync(path.join(os.tmpdir(), "vc-"));
  fs.mkdirSync(path.join(vc, "ops", "valor-brain"), { recursive: true });
  fs.writeFileSync(path.join(vc, "ops", "valor-brain", "validate.mjs"), 'console.log("stub validator ran");\n');
  const out = closeout({ VALOR_CORE: vc });
  assert.match(out.stdout, /== valor-brain\nstub validator ran/);
  fs.rmSync(vc, { recursive: true, force: true });
});

test("says NOT RUN when VALOR_CORE has no validator", () => {
  const vc = fs.mkdtempSync(path.join(os.tmpdir(), "vc-"));
  const out = closeout({ VALOR_CORE: vc });
  assert.match(out.stdout, /== valor-brain: NOT RUN/);
  fs.rmSync(vc, { recursive: true, force: true });
});

test("no Slops-OS tree, truth-gate or machine path", () => {
  const src = fs.readFileSync(SCRIPT, "utf8").replace(/^#.*$/gm, "");
  assert.doesNotMatch(src, /Slops-OS|SLOPS_OS|truth-gate|\/Users\/|\$HOME\/Documents/);
});
