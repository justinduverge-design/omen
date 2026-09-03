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

  // iOS split the M3 placeholder's single AppShellView into per-screen files
  // (M3A-iOS, #159). M4 moved signed-in Command content into the feature-layer
  // OmenCommandCenterScreen. The shell must wire that composition in; it must
  // not retain copy from the retired placeholder implementation.
  //
  // Updated 2026-09-03: this asserted `WelcomeView(` and read `Auth/WelcomeView.swift`.
  // `feat(native): match onboarding screens to canvas` (5936142) deleted that type and folded
  // the welcome surface into `SignInView`, so the assertion referenced a file that no longer
  // exists and the read would have thrown. The commit sat unpushed on local main, so CI never
  // saw it until 2026-09-03 — the first push after it went red on this test.
  //
  // What is pinned now is the *contract*, not the filenames: onboarding-connection contract §4
  // requires the signed-out surface to offer two honest paths — try the demo, or get started —
  // and the shell to route the signed-in one to Command Center. Copy is deliberately not
  // asserted verbatim; it has been reworded twice and the rule is that both paths exist.
  const appShellSource = read("mobile/ios/OmenIOS/OmenIOS/App/AppShellView.swift");
  assert.match(appShellSource, /SignInView\(/);
  assert.match(appShellSource, /CommandCenterView\(/);
  // The demo path must be wired from the shell, not merely rendered — a demo button with no
  // session behind it is the dead end this line exists to prevent.
  assert.match(appShellSource, /onTryDemo:/);

  const signInSource = read("mobile/ios/OmenIOS/OmenIOS/App/Auth/SignInView.swift");
  assert.match(signInSource, /onTryDemo/, "the signed-out surface must offer a demo path");
  assert.match(signInSource, /demoModeEnabled/, "the demo path must be gated by environment");

  const commandCenterSource = read("mobile/ios/OmenIOS/OmenIOS/App/Auth/CommandCenterView.swift");
  assert.match(commandCenterSource, /OmenCommandCenterScreen\(/);
  assert.match(commandCenterSource, /OmenStateSurface\(/);

  // Android carried the same stale copy assertions as iOS, for the same reason: the onboarding
  // rework moved the welcome surface into the auth flow and reworded both paths. Pinning the
  // seam (`onTryDemo` wired, gated by `demoModeEnabled`) survives a rewording; pinning the
  // marketing string did not, twice.
  const androidShell = read("mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/OmenAndroidApp.kt");
  assert.match(androidShell, /onTryDemo/, "the signed-out surface must offer a demo path");
  assert.match(androidShell, /demoModeEnabled/, "the demo path must be gated by environment");
  assert.match(androidShell, /OmenCommandCenterScreen\(/);
  assert.match(androidShell, /OmenStateSurface\(/);
  assert.match(androidShell, /NavigationBar/);

  assert.doesNotMatch(read("mobile/android/app/build.gradle.kts"), /SUPABASE_SERVICE_KEY|OAUTH.*SECRET|ESPN.*COOKIE/);
});
