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

test("Docker builds use npm ci without Yarn-only lockfile flags", () => {
  const dockerfiles = [read("Dockerfile"), read("Dockerfile.cron")];

  for (const dockerfile of dockerfiles) {
    assert.match(dockerfile, /RUN npm ci\b/);
    assert.doesNotMatch(dockerfile, /--frozen-lockfile/);
  }
});
