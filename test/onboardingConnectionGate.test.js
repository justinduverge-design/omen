"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("connected platform completes onboarding and the explicit skip cannot redirect-loop", () => {
  const onboarding = read("frontend", "src", "pages", "Onboarding.jsx");
  const connectLeague = read("frontend", "src", "pages", "ConnectLeague.jsx");

  assert.match(onboarding, /apiFetch\('\/api\/platforms'\)/,
    "onboarding must check the platform connection contract, not recommendation readiness");
  assert.match(connectLeague, /function markOnboardingDone\(\)/,
    "connection exit paths need one shared onboarding-completion action");
  assert.match(connectLeague, /function handleSkip\(\)[\s\S]*?markOnboardingDone\(\)/,
    "Skip must mark onboarding complete before navigating to the protected dashboard");
  assert.match(connectLeague, /function handleContinue\(\)[\s\S]*?markOnboardingDone\(\)/,
    "Continue after a visible platform connection must mark onboarding complete");
});
