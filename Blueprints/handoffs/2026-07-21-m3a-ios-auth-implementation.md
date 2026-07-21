# Handoff — M3-A iOS Native Auth Implementation

**Date:** 2026-07-21
**Branch:** `claude/omen-git-issues-l0ygck`
**Scope:** iOS SwiftUI auth implementation against `Blueprints/specs/mobile/m3a-ios-auth-parity-spec.md`, closing GitHub issue #159 / sprint item `M3A-iOS`. No signing, provisioning, store, provider (Yahoo/Sleeper/ESPN) connection, or production/deploy action.
**Authority:** Founder-granted M3-A authority (2026-07-19); Apple provisioning already complete per `Blueprints/handoffs/2026-07-19-apple-sign-in-provisioning.md`.

## Outcome

Replaced the M3 static local-preview placeholder (`SessionStore`, inline `AppShellView` stubs) with a real, testable auth stack that mirrors the merged Android implementation's *behavior* (PR #157) — state names, status→outcome mapping rules, and security posture — using idiomatic Swift/SwiftUI rather than a line-for-line port, per the issue's own instruction.

### Delivered

**`Core/Session`** (`mobile/ios/OmenIOS/OmenIOS/Core/Session/`)
- `SessionState` (`.loading/.signedOut/.signedIn/.needsReauth`), `Session` with a token-redacted `description`/`debugDescription` (facts-of-record #6: never log tokens).
- `SecureSessionStore` protocol + `InMemorySecureSessionStore` fake.
- `KeychainSessionStore` — production store using Keychain Services directly (`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`). Unlike Android (which must manually AES/GCM-encrypt `SharedPreferences` via the Keystore), the Keychain itself encrypts at rest, so no manual encryption step is needed — a deliberate, documented platform difference. Any decode failure fails safe to "no session," matching Android.
- `SessionManager` — restore/authenticated/refresh-failed/sign-out/demo transitions, injectable clock for deterministic expiry testing.

**`Core/Auth`** (`mobile/ios/OmenIOS/OmenIOS/Core/Auth/`)
- `AuthMechanism`, `AuthOutcome`/`RetryableCode` (opaque codes only, M0c §8), `EmailValidator`/`OtpCodeValidator` (pure).
- `GoTrueTransport` protocol + `TransportResult` — generalized over `provider` (not Google-only) since iOS's primary native mechanism is Apple.
- `AuthRepository` protocol; `AppleIDTokenProviding` protocol + `AppleIDTokenResult` + `SecureNonce` generator (iOS analog of Android's `GoogleIdTokenProvider` seam, retargeted at Sign in with Apple — App Store 4.8 requires Apple whenever any third-party login is offered).
- `SupabaseAuthRepository` — implements the **same status-mapping rules** as Android's `SupabaseAuthRepository.kt`: OTP request Ok/SessionTokens→OtpSent, verify 400–403→InvalidCode, Apple-token 400–403→Unsupported (mirrors Android's Google 400–403→Unsupported), 408/504→timeout, 5xx→server, network→network, refresh HttpError(any)/Ok/Malformed→NeedsReauth.
- `AccountDeletion` (exact-match phrase `DELETE MY OMEN DATA`, no trim, case-sensitive) + `mapDeleteStatus` + `AccountRepository` protocol.
- `FakeAuthRepository` — deterministic, network-free double (default OTP `123456`), used both in tests and as the production fallback when Supabase isn't configured for a build.
- `AuthFlow` — pure `AuthFlowState`/`AuthEvent`/`AuthFailure`/`AuthFlowReducer`. Apple states (`.launchingApple`/`.exchangingAppleToken`) replace Android's Google states; every failure path is a named `AuthFailure` with `.userMessage` (opaque, no raw provider text).

**App layer** (`mobile/ios/OmenIOS/OmenIOS/App/Auth/`)
- `URLSessionGoTrueTransport` — plain `URLSession`, no Supabase SDK (mirrors Android avoiding the Supabase SDK via OkHttp), same three GoTrue REST endpoints (`/auth/v1/otp`, `/auth/v1/verify`, `/auth/v1/token?grant_type=id_token|refresh_token`).
- `NativeAppleIDTokenProvider` — `ASAuthorizationController` wrapped in `async/await`; SHA-256-hashed nonce to Apple, raw nonce to Supabase; cancel/failure mapped to named outcomes.
- `URLSessionAccountRepository` — `DELETE /api/user/delete`, client-side phrase guard runs before any request leaves the device (mirrors Android).
- `AuthViewModel` — dispatches `AuthEvent`s through the pure reducer and performs the matching repository/provider call; not unit-tested directly (everything it composes is tested independently).
- Real screens: `WelcomeView`, `SignInView` (Apple + email OTP, reauth-prompt mode), `CommandCenterView` (preserves the existing mock Command/Omen/Trade/Draft tab content, adds a real `AccountView` tab), `AccountView` (sign-out + Danger Zone), `DeleteAccountConfirmationView` (phrase-gated sheet). Built entirely from existing design-system primitives (`OmenButton`, `OmenTextField`, `OmenFormField`, `OmenModalSheet`, `OmenStateSurface`, `OmenCard`) — no new primitives introduced.
- `AppEnvironment` extended with `supabaseURL`/`supabaseAnonKey`/`supabaseConfigured`, sourced from Info.plist `$(...)` substitution. `OmenIOSApp.init()` wires `SupabaseAuthRepository`+`NativeAppleIDTokenProvider` when configured, else `FakeAuthRepository`+`UnconfiguredAppleIDTokenProvider` — never silently claims a live path it can't back.
- `AppShellView` rewritten to drive off `SessionManager.state`/`AuthViewModel.flowState` instead of the old `SessionStore` placeholder (deleted).

**Config injection** (`mobile/ios/OmenIOS/Config/`)
- `Base.xcconfig` (committed, safe defaults) + `#include? "Local.xcconfig"` + `Local.xcconfig.example` template. `Local.xcconfig` is git-ignored — the iOS analog of Android's `local.properties` → `BuildConfig` pattern. Wired via `baseConfigurationReference` on both target build configurations.

**Test target**
- Added a new `OmenIOSTests` unit-test target to `OmenIOS.xcodeproj` (none existed before — `TEST_HOST`/`BUNDLE_LOADER` wired for `@testable import OmenIOS`, `GENERATE_INFOPLIST_FILE = YES`, unsigned) and wired it into the shared scheme's `TestAction`/`Testables`.
- **37 unit tests** across 6 files — exact count parity with the Android suite: `SessionManagerTests` (6), `AuthFlowReducerTests` (9, Apple-flow cases replacing Android's Google-flow cases), `ValidatorsTests` (5), `FakeAuthRepositoryTests` (5), `SupabaseAuthRepositoryTests` (9, `FakeTransport` double), `AccountDeletionTests` (3).

**CI** — `.github/workflows/ios-ci.yml`: pinned an explicit Xcode version (`maxim-lobanov/setup-xcode@v1`, `16.2`) instead of the runner's floating default, logs `xcodebuild -version`/`swift -version`, and switched the `build` action to `xcodebuild test -destination 'platform=iOS Simulator,name=iPhone 16'`.

## Verification

**Honest limitation:** this environment has no macOS/Xcode/Swift toolchain (Linux container), matching the situation the Android-session handoff already flagged for the *previous* (Windows) session — so, exactly as that handoff did for iOS, this pass could not run `xcodebuild` locally. Per `Blueprints/specs/mobile/omen-native-build-environment-v1.md` (M2-E), the authorized verification path for iOS is non-signing GitHub macOS simulator CI.

**Update — CI is green (same day, 2026-07-21).** The first `ios-ci.yml` run failed and surfaced three real, hand-editing-a-pbxproj-by-hand mistakes, each fixed in a small follow-up commit and re-verified by the next CI run:
1. `TEST_HOST`/`BUNDLE_LOADER` pointed at `OmenIOS.app/OmenIOS`; the app target's actual `PRODUCT_NAME` is `Omen`, so the built bundle is `Omen.app` with executable `Omen`.
2. All 6 test files did `@testable import OmenIOS`; same root cause — the importable Swift module name comes from `PRODUCT_NAME` (`Omen`), not the target name. Fixed to `@testable import Omen`.
3. The app target's Debug configuration was missing `ENABLE_TESTABILITY = YES`, so the `Omen` module wasn't compiled with `-enable-testing` and `@testable import` failed with "module 'Omen' was not compiled for testing" even once the name was correct.

`xcodebuild test -scheme OmenIOS -destination 'platform=iOS Simulator,name=iPhone 16'` now passes (both duplicate push/pull_request CI runs green, ~1m40s each). PR #171 (draft) is otherwise clean/mergeable with no open review threads as of this update.

What *was* checked locally without a compiler:
- Every new/changed Swift file was hand-written against the exact, previously-read source of the design-system components it composes (`OmenButton`, `OmenTextField`, `OmenFormField`, `OmenModalSheet`, `OmenStateSurface`, `OmenCard`, `OmenTypography`, `OmenColor`, `OmenSpacing`) — no guessed APIs.
- `project.pbxproj`: verified no duplicate 24-character object IDs and balanced `{}`/`()` via a script; every object ID referenced from a group/build-phase/target resolves to a defined object (one expected false positive: the root `PBXGroup` has no name comment, matching the original file's own formatting).
- Test count verified by `grep -c "func test"`: 37 exactly, matching the Android parity target.

## Parity status

- **iOS:** implemented — Keychain session store, Sign in with Apple, email OTP, `URLSession`-based GoTrue transport and account deletion, 37 XCTest cases. Pending: CI green run (see above), and the same real-device/interactive QA gate Android still has open (`M3A-QA`, founder/human — Sign in with Apple on a real device, OTP-inbox round trip).
- **Android:** unchanged, still the merged reference (PR #157).

## Documented platform differences (intentional, per issue #159's "parity not translation")

1. **No manual encryption layer.** Keychain encrypts at rest; Android must AES/GCM-encrypt `SharedPreferences` via Keystore because `SharedPreferences` itself is plaintext.
2. **Apple, not Google, is the primary native ID-token mechanism**, per App Store 4.8. `AuthMechanism.googleIDToken` kept only for contract-name parity, unimplemented.
3. **`URLSession`'s single `timeoutInterval`** (20s) stands in for OkHttp's separate connect/read timeouts (10s/20s in Android) — Foundation doesn't expose that granularity per-request without a custom `URLSessionConfiguration`.
4. **Custom `OmenButton`-styled "Continue with Apple"** (SF Symbol + text) rather than the stock `SignInWithAppleButton` control, to keep the tap surface behind the same testable `AppleIDTokenProviding` abstraction used everywhere else, matching Android's own custom-styled "Continue with Google" (not the stock Credential Manager chrome). Swappable later without touching tested logic.

## Next steps

1. Watch `ios-ci.yml` on this PR; fix any real build/test failures it surfaces (expected iteration — this pass had no compiler).
2. `M3A-QA`-equivalent for iOS: real-device Sign in with Apple + OTP-inbox round trip (founder/human — agents cannot enter Apple credentials or read a personal inbox).
3. Confirm Supabase's Apple provider is actually enabled in the dashboard (asserted done in `2026-07-19-apple-sign-in-provisioning.md`; worth a live double-check per `mobile/contracts/m3a-auth-provisioning-checklist.md`'s own note).
4. Set a real `omen.apiBaseUrl`/`OMEN_SUPABASE_URL`/`OMEN_SUPABASE_ANON_KEY` in a local (git-ignored) `Config/Local.xcconfig` to exercise live sign-in/delete end to end.

## Skills

Used: `slops-repo-inspector` (read M0c/M0a contracts, Android reference, parity spec, existing iOS shell before writing anything), `slops-tdd` (test suite authored alongside/against the exact Android-parity behavior list), `security-privacy-evidence` (Keychain-only tokens, redacted `description`, opaque error codes, phrase-gated deletion, no secret in committed config), `rbac-risk-review` (auth boundary — confirmed founder authority already granted for M3-A before touching auth code), `slops-git-flow` (single scoped branch/PR). Skipped: `slops-ui-ux-audit`/`slops-mobile-smoke` (web-driver tooling only; this session has no device/simulator to drive — CI + a follow-up interactive QA pass are the real verification surface).

**Skill improvement:** same gap the Android handoff already named — there's no native iOS equivalent of a "build + test + screenshot" smoke procedure for a session without macOS. Worth a `native-ios-ci-watch` procedure that formalizes "push, subscribe to PR CI events, iterate on real failures" as the expected verification loop when no local toolchain exists, so it's not reinvented per session.

## Boundaries honored

No secrets committed (`Local.xcconfig` git-ignored, `Base.xcconfig` ships only empty/placeholder values); no signing/provisioning/Services ID/Apple key handling; no store submission; no provider (Yahoo/Sleeper/ESPN) connection code touched; no production/deploy/SQL action; account-deletion phrase unchanged (`DELETE MY OMEN DATA`, matches `src/routes/userPrivacy.js`).
