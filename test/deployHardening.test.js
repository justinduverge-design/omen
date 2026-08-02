"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(root, ...parts), "utf8");
}

test("deploy workflow has a quality gate before image build", () => {
  const workflow = read(".github", "workflows", "deploy.yml");

  assert.match(workflow, /\n\s+quality:\n/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm audit --audit-level=moderate/);
  assert.match(workflow, /npm --prefix frontend run build/);
  assert.match(workflow, /npm --prefix client run build/);
  assert.match(workflow, /\n\s+build:\n[\s\S]*?\n\s+needs: quality\n/);
});

test("deploy workflow verifies the production SPA contains the Omen lockup", () => {
  const workflow = read(".github", "workflows", "deploy.yml");

  const healthIndex = workflow.indexOf("Smoke test /api/health");
  const logoIndex = workflow.indexOf("Verify deployed Omen logo asset in SPA bundle");

  assert.notEqual(healthIndex, -1);
  assert.notEqual(logoIndex, -1);
  assert.ok(logoIndex > healthIndex);
  assert.match(workflow, /base_url="https:\/\/slopssaloon\.com"/);
  assert.match(workflow, /grep -oE 'src="\/assets\/\[\^"\]\+\\\.js"'/);
  assert.match(workflow, /\|\| true/);
  assert.match(workflow, /curl -fsS --max-time 8 "\$base_url\$bundle_src"/);
  assert.match(workflow, /grep -q "omen-horizontal-lockup-transparent\.png"/);
  assert.match(workflow, /"\$base_url\/omen-horizontal-lockup-transparent\.png"/);
});

test("deploy workflow runs a public-route visual smoke for logo regressions", () => {
  const workflow = read(".github", "workflows", "deploy.yml");

  const logoIndex = workflow.indexOf("Verify deployed Omen logo asset in SPA bundle");
  const visualSmokeIndex = workflow.indexOf("slops-canary public-route visual smoke");
  const tailLogsIndex = workflow.indexOf("Tail recent server logs");

  assert.notEqual(logoIndex, -1);
  assert.notEqual(visualSmokeIndex, -1);
  assert.notEqual(tailLogsIndex, -1);
  assert.ok(visualSmokeIndex > logoIndex);
  assert.ok(visualSmokeIndex < tailLogsIndex);
  assert.match(workflow, /routes=\("\/" "\/about" "\/login"\)/);
  assert.ok(workflow.includes("grep -Fq '\"[C]\"'"));
  assert.match(workflow, /grep -Eq "omen-horizontal-lockup\[\^\\\\\\"\]\*\\\\\.png"/);
  assert.match(workflow, /grep -Fq "omen-horizontal-lockup\.png"/);
  assert.match(workflow, /grep -Fq "omen-horizontal-lockup-transparent\.png"/);
});

test("Docker builds use npm ci without Yarn-only lockfile flags", () => {
  const dockerfiles = [read("Dockerfile"), read("Dockerfile.cron")];

  for (const dockerfile of dockerfiles) {
    assert.match(dockerfile, /RUN npm ci\b/);
    assert.doesNotMatch(dockerfile, /--frozen-lockfile/);
  }
});
