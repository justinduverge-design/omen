# S5 — Mobile Token Storage Review

**Date:** 2026-08-18
**Author:** Claude
**Verdict:** Storage was already compliant on both platforms. No plaintext token storage found; no source fix was required. The actual gap was test coverage — closed in this pass.

## Scope

Per `Direction/current_sprint.md` S5: confirm no session or provider token is written to plaintext `UserDefaults` (iOS) or `SharedPreferences` (Android); iOS must use Keychain, Android must use `EncryptedSharedPreferences` or equivalent; review certificate/transport handling on both.

## What's stored, where, and for how long

### iOS

- **Mechanism:** iOS Keychain Services (`kSecClassGenericPassword`), via [`KeychainSessionStore.swift`](../../mobile/ios/OmenIOS/OmenIOS/Core/Session/KeychainSessionStore.swift).
- **Accessibility:** `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` — never migrates via device backup, never syncs via iCloud Keychain, unreadable before first unlock.
- **What's stored:** `userID`, `accessToken`, `refreshToken`, `expiresAtEpochSeconds` as one JSON blob in a single Keychain item (service `com.slopssaloon.omen.session`, account `current`).
- **Lifetime:** persists until explicit `clear()` (sign-out / account deletion). `AccountView` and `DeleteAccountConfirmationView` both call it.
- **Funnel:** every sign-in mechanism (Apple ID token, email OTP, OAuth/PKCE for Discord, Passkey) routes through one call site — `SessionManager.onAuthenticated` → `store.save` — so there is one write path, not one per provider, and no parallel path to miss.
- **Only non-Keychain preference use found:** one `UserDefaults` boolean (`passkey-pairing-dismissed`, keyed by the non-secret user ID). No token or credential value.

### Android

- **Mechanism:** AES-256/GCM with the key held in `AndroidKeyStore` (hardware-backed where available), via [`AndroidKeystoreSessionStore.kt`](../../mobile/android/core/session/src/main/kotlin/com/slopssaloon/omen/core/session/AndroidKeystoreSessionStore.kt). Only Base64 ciphertext + IV land in `SharedPreferences("omen_session", MODE_PRIVATE)` — the plaintext token never reaches the preferences file.
- **What's stored:** the same four fields as iOS, length-prefix-encoded (no JSON dependency) before encryption.
- **Lifetime:** persists until explicit `clear()`. A decrypt failure (key rotation, corruption, tampering) fails safe — clears and returns no session rather than surfacing bad data.
- **Funnel:** same single-call-site pattern as iOS, across Google ID-token, email OTP, OAuth/PKCE (Discord), and Passkey sign-in.
- This is "`EncryptedSharedPreferences` or equivalent" per the task's own acceptance bar — a hand-rolled `AndroidKeyStore`-backed layer rather than the `androidx.security.crypto` library, chosen per the source comment to add no new supply-chain surface.

### Certificate / transport

- **iOS:** no `NSAppTransportSecurity` exceptions anywhere in `Info.plist` — Apple's strict ATS default applies (HTTPS-only, TLS 1.2+, forward secrecy required).
- **Android:** no `usesCleartextTraffic`, no network security config file — the platform default (cleartext disabled) applies at `targetSdk 36`.
- **No certificate pinning on either platform.** Not required by any of the six native mobile read-gate contracts or by the M0c app-shell/auth contract — a factual absence, not a violation.
- No hardcoded `http://` endpoint anywhere in either native codebase; all configured API base URLs are `https://`.

### Provider-specific

- **Sleeper:** no distinct Sleeper token stored client-side — Omen's own access token is sent server-side per request; Sleeper credentials never reach the device.
- **Yahoo:** on hold (`YAHOO_ENABLED=false`); no live fantasy-token exchange exists in the shipped native flow to examine.
- **ESPN:** no cookie-handling code anywhere in either native codebase. ESPN connects via the website (`.useWeb`), never natively.
- No WebView-based auth on either platform.

## Contract alignment

`Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md` §7 and its companion `omen-native-app-shell-auth-api-contract-v1.md` §2.2 already specify this exact mechanism — *"Session/auth tokens are stored only in platform secure storage — iOS Keychain and Android Keystore-backed storage — never plain files, logs, or unencrypted preferences."* The shipped implementation matches, including the exact Keychain attributes named in `m3a-ios-auth-parity-spec.md`.

## The real gap: "verified by inspection **and a test**"

Inspection confirmed compliance, but neither `KeychainSessionStore` nor `AndroidKeystoreSessionStore` had any direct test coverage — `SessionManagerTest`/`SessionManagerTests` on both platforms only exercise `SessionManager` against the `InMemorySecureSessionStore` fake. A regression that quietly reverted either store to plaintext would not have been caught by the existing suite.

Added:

- [`KeychainSessionStoreTests.swift`](../../mobile/ios/OmenIOS/OmenIOSTests/KeychainSessionStoreTests.swift) — 5 tests against the real Keychain-backed store: round-trip, overwrite, clear, nil-when-empty, and a regression guard asserting saved tokens never appear in `UserDefaults`.
- [`AndroidKeystoreSessionStoreTest.kt`](../../mobile/android/core/session/src/androidTest/kotlin/com/slopssaloon/omen/core/session/AndroidKeystoreSessionStoreTest.kt) — 5 equivalent tests against the real Keystore-backed store, plus a regression guard asserting the raw `SharedPreferences` file never contains a saved token in the clear.
- `core/session` had no `androidTest` source set before this. Added `testInstrumentationRunner` and `androidTestImplementation(libs.androidx.test.ext.junit, libs.androidx.espresso.core)` to its `build.gradle.kts`, mirroring `core/designsystem`'s existing precedent — no new entry was added to the version catalog, only an already-cataloged dependency wired into one more module.

## Two non-obvious failures hit while adding the tests — worth recording

1. **A new Swift file on disk is not automatically part of an Xcode target.** This project uses explicit `PBXFileReference`/`PBXBuildFile` entries (`project.pbxproj`), not Xcode 16's synchronized-folder groups. The first test run built successfully but silently executed 0 tests — the new file existed on disk but wasn't wired into `OmenIOSTests`' Sources build phase. Fixed by adding the four matching pbxproj entries by hand, mirroring `SessionManagerTests.swift`'s exact structure, then validating with `plutil -lint` before rebuilding.
2. **The documented local iOS test substitute breaks real Keychain access.** `Blueprints/definition-of-done.md`'s committed command (`CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO`) produced `errSecMissingEntitlement` (status `-34018`) on every test that called `SecItemAdd` — a fully-unsigned test binary cannot use Keychain Services at all, even in the simulator. Every pre-existing test avoided this because none touched the real Keychain before mine. Running the identical command **without** those two flags (letting the already-configured Automatic Signing ad-hoc-sign the test bundle) passes cleanly, with no other change. **Any future test exercising `KeychainSessionStore` directly must omit `CODE_SIGNING_ALLOWED=NO`/`CODE_SIGNING_REQUIRED=NO`.** The rest of the suite is unaffected by dropping those flags.
3. **`androidx.test.ext:junit` alone does not carry the `androidx.test.runner.AndroidJUnitRunner` class into the test APK.** First connected-test attempt crashed instrumentation with `ClassNotFoundException` for the runner named in `testInstrumentationRunner`. `androidx.test.espresso:espresso-core` (already in the version catalog, unused by `core/session` until now) carries it transitively. Fixed by adding it as an `androidTestImplementation`.

## Evidence

- iOS: `KeychainSessionStoreTests` 5/5, `xcodebuild test -project OmenIOS.xcodeproj -scheme OmenIOS -destination 'platform=iOS Simulator,name=iPhone 17 Pro'` (Xcode 26.6, `17F113`). Full-suite run recorded in the handoff.
- Android: `AndroidKeystoreSessionStoreTest` 5/5 on `medium_phone` API 36 connected instrumentation (`:core:session:connectedDebugAndroidTest`); `:app:assembleDebug` and `:core:session:testDebugUnitTest` (existing 6 `SessionManagerTest` cases) both green, confirming no regression from the `build.gradle.kts` change.

## Open items (not blocking S5, flagged for the record)

- iOS Keychain items are not automatically cleared on app uninstall — documented Apple platform behavior, not an Omen defect. The account-deletion flow doesn't depend on it: `store.clear()` is called explicitly on deletion. Noted for completeness, not an action item.
- No certificate pinning on either platform. Not contract-required today; worth a founder call later if provider trust posture changes. Not scoped into S5.

## Skill receipt

```text
Task: S5 — Mobile token storage review
Change type: Security review (trust boundary) — read-only audit, plus new regression tests
Skills invoked: security-privacy-evidence (this document), native mobile read gate (all 6 contracts read before code)
Conditional skills considered but not applicable: rbac-risk-review — no agent/tool/workflow authority changed; the relevant access-scope question (which processes/apps can read the stored credential) is answered by the Keychain accessibility attribute and Android's app-private SharedPreferences + Keystore key ACL, both already covered above rather than as a separate authority review
Evidence: this file; Blueprints/handoffs/2026-08-18-s5-mobile-token-storage-review.md
Procedure gap found: Blueprints/definition-of-done.md's iOS local-substitute command needs a caveat for Keychain-touching tests (see finding #2 above)
```
