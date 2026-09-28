const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const repo = path.resolve(__dirname, "..");

test("Probo manifest validates its control metadata and evidence paths", () => {
  const output = execFileSync(process.execPath, [path.join(repo, "scripts/validate-probo.js")], {
    cwd: repo,
    encoding: "utf8",
  });
  assert.match(output, /Probo manifest valid: 8 controls/);
});

test("Probo manifest records the tracker controls", () => {
  const manifest = require("node:fs").readFileSync(path.join(repo, "probo.yaml"), "utf8");
  for (const id of ["CC6.1", "GDPR_ART_17", "GDPR_ART_5", "CC7.2", "OMEN-ESP-01", "OMEN-MIG-01", "OMEN-RET-01", "OMEN-DR-01"]) {
    assert.match(manifest, new RegExp(`id: "${id}"`));
  }
});
