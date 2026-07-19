"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("native app-shell scaffold keeps platform projects, safe environment seams, and the approved deep link", () => {
  for (const relativePath of [
    "mobile/ios/OmenIOS/OmenIOS.xcodeproj/project.pbxproj",
    "mobile/ios/OmenIOS/OmenIOS/App/OmenIOSApp.swift",
    "mobile/android/settings.gradle.kts",
    "mobile/android/app/build.gradle.kts",
    "mobile/android/app/src/main/AndroidManifest.xml",
    "mobile/contracts/README.md",
  ]) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), true, `${relativePath} is required`);
  }

  assert.match(read("mobile/ios/OmenIOS/OmenIOS/Info.plist"), /com\.slopssaloon\.omen/);
  assert.match(read("mobile/android/app/src/main/AndroidManifest.xml"), /com\.slopssaloon\.omen/);
  assert.match(read("mobile/ios/OmenIOS/OmenIOS/App/AppEnvironment.swift"), /apiBaseURL/);
  assert.match(read("mobile/android/app/src/main/kotlin/com/slopssaloon/omen/core/network/AppEnvironment.kt"), /apiBaseUrl/);
  assert.match(read("mobile/ios/OmenIOS/OmenIOS/App/AppShellView.swift"), /Enter demo/);
  assert.match(read("mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/OmenAndroidApp.kt"), /Enter demo/);
  assert.match(read("mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/OmenAndroidApp.kt"), /NavigationBar/);
  assert.doesNotMatch(read("mobile/android/app/build.gradle.kts"), /SUPABASE_SERVICE_KEY|OAUTH.*SECRET|ESPN.*COOKIE/);
});
