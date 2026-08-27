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

test("deploy workflows use sudo only when Compose must read the root-owned production env", () => {
  const workflows = [
    read(".github", "workflows", "deploy.yml"),
    read(".github", "workflows", "deploy-kvm1-tailscale-fallback.yml"),
  ];

  for (const workflow of workflows) {
    assert.match(
      workflow,
      /sudo docker compose -f docker-compose\.prod\.yml --project-name omen up -d --no-build api cron/,
    );
    assert.doesNotMatch(
      workflow,
      /sudo docker compose -f docker-compose\.prod\.yml --project-name omen pull api cron/,
    );
  }
});

test("Docker builds use npm ci without Yarn-only lockfile flags", () => {
  const dockerfiles = [read("Dockerfile"), read("Dockerfile.cron")];

  for (const dockerfile of dockerfiles) {
    assert.match(dockerfile, /RUN npm ci\b/);
    assert.doesNotMatch(dockerfile, /--frozen-lockfile/);
  }
});

test("both images bake build provenance so a running container can name its commit", () => {
  // GET /api/version has always read GITHUB_SHA / BUILD_ID / IMAGE_TAG and has
  // always returned null for all three, because nothing set them. On 2026-08-26
  // two deploys failed silently for ~25 hours and working out which commit
  // production was actually serving took archaeology through Actions logs.
  //
  // This asserts the whole chain, not just one end of it. The route reading an
  // env var nobody sets is exactly the failure being fixed, so a test that only
  // checked the route would have passed throughout.
  for (const dockerfile of ["Dockerfile", "Dockerfile.cron"]) {
    const contents = read(dockerfile);
    for (const arg of ["ARG GIT_SHA", "ARG BUILD_ID", "ARG IMAGE_TAG"]) {
      assert.ok(contents.includes(arg), `${dockerfile} must declare ${arg}`);
    }
    assert.ok(contents.includes("ENV GITHUB_SHA=$GIT_SHA"), `${dockerfile} must export GITHUB_SHA`);
    assert.ok(contents.includes("ENV BUILD_ID=$BUILD_ID"), `${dockerfile} must export BUILD_ID`);
    assert.ok(contents.includes("ENV IMAGE_TAG=$IMAGE_TAG"), `${dockerfile} must export IMAGE_TAG`);
  }

  const workflow = read(".github", "workflows", "deploy.yml");
  // Both images, not just the API one — the cron container is where a silent
  // stale deploy is hardest to notice.
  assert.equal(
    (workflow.match(/GIT_SHA=\$\{\{ github\.sha \}\}/g) || []).length, 2,
    "both image builds must receive GIT_SHA"
  );
  assert.equal(
    (workflow.match(/BUILD_ID=\$\{\{ github\.run_id \}\}/g) || []).length, 2,
    "both image builds must receive BUILD_ID"
  );

  // And the route must still be reading the name the Dockerfile exports.
  const versionRoute = read("src", "routes", "system.js");
  assert.ok(versionRoute.includes("process.env.GITHUB_SHA"), "the version route must read GITHUB_SHA");
  assert.ok(versionRoute.includes("process.env.IMAGE_TAG"), "the version route must read IMAGE_TAG");
});
