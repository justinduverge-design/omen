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

  assert.match(onboarding, /resolveOnboardingStatus\(apiFetch\)/,
    "onboarding must check the platform connection contract, not recommendation readiness");
  // The shared action moved to `frontend/src/lib/onboarding.js` (2026-08-16,
  // P1-ConnectContinueRoute) so the gate, the help drawer, and both exit paths
  // read one record instead of four inline localStorage reads.
  assert.match(connectLeague, /import \{ markOnboardingDone \} from '\.\.\/lib\/onboarding\.js'/,
    "connection exit paths need one shared onboarding-completion action");
  assert.match(connectLeague, /function handleSkip\(\)[\s\S]*?markOnboardingDone\(\)/,
    "Skip must mark onboarding complete before navigating to the protected dashboard");
  assert.match(connectLeague, /function handleContinue\(\)[\s\S]*?markOnboardingDone\(\)/,
    "Continue after a visible platform connection must mark onboarding complete");
});
