"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const cron = require("../src/omen_tuesday_cron");

const root = path.join(__dirname, "..");

test("Tuesday cron is disabled unless explicitly enabled", () => {
  assert.equal(cron.isScoringEnabled({}), false);
  assert.equal(cron.isScoringEnabled({ OMEN_CRON_SCORING_ENABLED: "false" }), false);
  assert.equal(cron.isScoringEnabled({ OMEN_CRON_SCORING_ENABLED: "true" }), true);
  assert.equal(cron.isScoringEnabled({ CORVUS_CRON_SCORING_ENABLED: "true" }), true);
});

test("Tuesday cron requires only Supabase for public nflverse scoring", () => {
  assert.deepEqual(cron.missingScoringEnv({}), [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
  ]);

  assert.deepEqual(
    cron.missingScoringEnv({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_KEY: "service-role",
    }),
    []
  );
});

test("cron Dockerfile runs the Omen worker from the crond spool path", () => {
  const dockerfile = fs.readFileSync(path.join(root, "Dockerfile.cron"), "utf8");

  assert.match(dockerfile, /node \/app\/src\/omen_tuesday_cron\.js/);
  assert.match(dockerfile, /> \/var\/spool\/cron\/crontabs\/ssffmvp/);
  assert.doesNotMatch(dockerfile, /ssffmvp_tuesday_cron\.js/);
  assert.doesNotMatch(dockerfile, /> \/etc\/crontabs\/ssffmvp/);
});

test("cron runtime config keeps scoring explicitly gated", () => {
  const compose = fs.readFileSync(path.join(root, "docker-compose.yml"), "utf8");
  const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");

  assert.match(compose, /OMEN_CRON_SCORING_ENABLED:\s*\$\{OMEN_CRON_SCORING_ENABLED:-\$\{CORVUS_CRON_SCORING_ENABLED:-false\}\}/);
  assert.match(compose, /SPORTRADAR_API_KEY:\s*\$\{SPORTRADAR_API_KEY\}/);
  assert.match(envExample, /OMEN_CRON_SCORING_ENABLED=false/);
  assert.match(envExample, /SPORTRADAR_API_KEY=/);
});
