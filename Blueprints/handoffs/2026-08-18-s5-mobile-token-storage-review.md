# Handoff — 2026-08-18 — S5: Mobile token storage review

**Not deployed. Branch `claude/s5-mobile-token-storage-review`, not yet pushed.** Full findings and evidence: `Direction/reviews/2026-08-18-s5-mobile-token-storage-review.md`. This handoff is the closeout receipt.

## Verdict

Storage was already compliant on both platforms — no plaintext token storage anywhere, no source fix required. iOS uses Keychain Services; Android encrypts with an AndroidKeyStore-backed key before ciphertext ever touches `SharedPreferences`. The real gap against S5's `Done when:` ("verified by inspection **and a test**") was test coverage: `SessionManagerTest`/`SessionManagerTests` on both platforms only exercise `SessionManager` against the `InMemorySecureSessionStore` fake — neither `KeychainSessionStore` nor `AndroidKeystoreSessionStore` had ever been tested directly. Closed that gap; wrote the review record.

## Files changed

- **New:** `mobile/ios/OmenIOS/OmenIOSTests/KeychainSessionStoreTests.swift` — 5 tests against the real Keychain-backed store.
- **New:** `mobile/android/core/session/src/androidTest/kotlin/com/slopssaloon/omen/core/session/AndroidKeystoreSessionStoreTest.kt` — 5 tests against the real Keystore-backed store.
- **Changed:** `mobile/android/core/session/build.gradle.kts` — added `testInstrumentationRunner` + two `androidTestImplementation` lines (both already-cataloged dependencies, no new version-catalog entry) to give `core/session` an `androidTest` source set for the first time, mirroring `core/designsystem`'s existing precedent.
- **Changed:** `mobile/ios/OmenIOS/OmenIOS.xcodeproj/project.pbxproj` — 4 hand-added entries (`PBXBuildFile`, `PBXFileReference`, group child, Sources-phase member) registering the new test file with the `OmenIOSTests` target, mirroring `SessionManagerTests.swift`'s exact structure. New object-ID prefix (`FA…`) checked for zero collisions against the whole file before use, and the file re-validated with `plutil -lint` before rebuilding.
- **New:** `Direction/reviews/2026-08-18-s5-mobile-token-storage-review.md` — the full findings record S5's `Done when:` requires.
- **Changed:** `Direction/current_sprint.md` — S5 → `VERIFIED`, evidence pointer added.
- **Changed:** `Direction/agent_inbox.md` — refreshed the stale 2026-08-16 selected-queue snapshot and recorded the `S5` claim (see the inbox's own 2026-08-18 refresh note for that part; it's a separate, earlier correction from the same session, not S5-specific).

## RED / GREEN

No RED in the classic TDD sense — this was an audit that found the implementation already correct, so there was no defect to reproduce first. The equivalent proof is that the new tests exercise the *real* secure-storage code paths (not fakes) and would fail if either store silently regressed to plaintext; the "regression guard" tests in both files assert directly against the raw underlying storage (`UserDefaults` dump on iOS, raw `SharedPreferences.all` on Android) for exactly that reason.

**GREEN:**

- iOS, targeted: `KeychainSessionStoreTests` 5/5 (`xcodebuild test -project OmenIOS.xcodeproj -scheme OmenIOS -destination 'platform=iOS Simulator,name=iPhone 17 Pro'`, Xcode 26.6 `17F113`).
- iOS, full suite: **229/231** passed. 1 pre-existing pinned `XCTExpectFailure` (`ContextualHelpAccessibilityUITests.testCommandCenterScreenAuditRecordsTwoPreExistingFailures`, unrelated, tracked in `known_issues.md`). 1 failure (`ContextualHelpAccessibilityUITests.testCommandCenterHelpAffordanceIsLabeledAndOpensItsExplanation`) — a different subsystem entirely (Command Center help-affordance UI, nothing to do with session storage); re-ran in isolation and it **passed** (17.8s), confirming a UI-automation flake rather than a regression. Baseline going in was 226 (221 unit + 5 UI, per the 2026-08-16 slice-E entry); 226 + 5 new `KeychainSessionStoreTests` = 231 exactly, so no other test count drifted. Summary pulled from the `.xcresult` bundle via `xcrun xcresulttool get test-results summary`, not hand-counted off truncated log tail.
- Android, targeted: `AndroidKeystoreSessionStoreTest` 5/5 on `medium_phone` API 36 connected instrumentation (`:core:session:connectedDebugAndroidTest`).
- Android, broader: `:app:assembleDebug` green; `:core:session:testDebugUnitTest` green (the existing 6 `SessionManagerTest` cases, unaffected by the `build.gradle.kts` change — confirmed via cache hit, `UP-TO-DATE`).

## Two non-obvious toolchain failures hit and fixed — full detail in the review doc

1. A new `.swift` file on disk is **not** automatically part of an Xcode target on this project (explicit `pbxproj` references, not synchronized folder groups) — first run built clean but silently executed 0 tests.
2. `Blueprints/definition-of-done.md`'s documented local iOS substitute (`CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO`) breaks real Keychain access (`errSecMissingEntitlement`, -34018) — every existing test avoided this because none touched the real Keychain before. Fix: omit those two flags; everything else about the command is unchanged and unaffected.
3. `androidx.test.ext:junit` alone doesn't carry `androidx.test.runner.AndroidJUnitRunner` into the test APK; `espresso-core` (already cataloged) does, transitively.

## Skills

Invoked: `security-privacy-evidence` (this review), native mobile read gate (all six mandated contracts read before any code, via a dedicated Explore-agent pass that also investigated the actual current implementation on both platforms). Considered, not separately invoked: `rbac-risk-review` — no agent/tool/workflow authority changed; the access-scope question it would raise (which processes can read the stored credential) is answered by the Keychain accessibility attribute and Android's app-private-prefs + Keystore key ACL, both already documented in the review record rather than needing a standalone authority review.

**Skill/procedure improvement:** `Blueprints/definition-of-done.md`'s iOS local-substitute table should carry a caveat that `CODE_SIGNING_ALLOWED=NO` is incompatible with any test touching Keychain Services — not fixed in this pass (out of S5's file boundary), flagged here for whoever next edits that doc.

## Branch / commit / PR / deploy status

Local commit(s) on `claude/s5-mobile-token-storage-review`, not yet pushed, no PR opened, nothing deployed. Do not treat any of this as live until it merges to `main` and, separately, deploys.
