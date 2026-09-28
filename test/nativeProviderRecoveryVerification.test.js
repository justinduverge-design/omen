"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const checklistPath = path.join(root, "Blueprints", "handoffs", "2026-09-28-native-provider-recovery-verification.md");

test("native provider recovery checklist is endpoint-led and evidence-honest", () => {
  const checklist = fs.readFileSync(checklistPath, "utf8");
  for (const literal of [
    "reconnect_required",
    "temporarily_unavailable",
    "Partial directory failure",
    "Stale response",
    "last known league context is retained",
    "Physical\nverification requires fresh captures",
    "must not be reported as physical-device verification",
    "test/providerConnectionState.test.js",
    "mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/feature/api/LeagueDirectory.kt",
  ]) {
    assert.equal(checklist.includes(literal), true, literal);
  }
});

test("native recovery source seams still exist", () => {
  for (const relativePath of [
    "src/routes/platforms.js",
    "src/routes/leagues.js",
    "src/services/providerConnectionState.js",
    "mobile/ios/OmenIOS/OmenIOS.xcodeproj/project.pbxproj",
    "mobile/android/app/build.gradle.kts",
  ]) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), true, `${relativePath} is required`);
  }
});
