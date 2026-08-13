# M3-A — iOS Auth Parity Spec (for macOS CI)

**Status:** Implemented locally; full M3A interactive matrix remains open — updated 2026-08-12
**Why this remains an active acceptance spec:** the Mac/Xcode/device path now exists and native Sign in with Apple has one founder-observed happy-path proof. M3A still requires the complete sanitized iOS and Android interactive matrix; local compile and unit tests do not replace those human credential/device cases.

**Companions:** `omen-native-app-shell-auth-api-contract-v1.md` (M0c), `omen-mobile-onboarding-connection-contract-v1.md` (M0a). Android reference: `Blueprints/handoffs/2026-07-19-m3a-native-auth-scaffolding.md`, commit on `codex/m3a-native-auth-proof`.

> **Environment update — 2026-08-12:** the former compile/device blocker is cleared. The existing project uses Automatic Signing under team `6RWR5G9894`, builds/installs on the registered iPhone, and passes 121/121 simulator tests on Xcode 26.6 (`17F113`). Signed entitlements contain Sign in with Apple and `webcredentials:slopssaloon.com`. The founder completed one real native Apple authorization and Omen authenticated successfully. Passkey code and AASA hosting support are prepared under the separate `M4-Auth-Passkeys-iOS-Onramp`; its end-to-end ceremony remains blocked until the AASA file is reviewed, merged, and deployed. Email OTP, the remaining Apple edge cases, session restore, account deletion, log safety, and Android still require the M3A matrix.

## Prereqs already done (founder)
- Apple Developer Team `6RWR5G9894`; App ID `com.slopssaloon.omen` with **Sign in with Apple** capability enabled.
- Supabase Apple provider configured with both Omen client IDs.
- Development certificate, device registration, and an Automatic Signing provisioning profile now exist and work locally. Distribution/archive/TestFlight credentials remain a separate R3 release gate.

## Parity map (Android → iOS)

| Android (shipped) | iOS equivalent | Notes |
|---|---|---|
| `SessionState` (Loading/SignedOut/SignedIn/NeedsReauth) | same enum in Swift | pure model |
| `Session` (redacted description) | `struct Session` with redacted `debugDescription` | never log tokens |
| `SecureSessionStore` + `AndroidKeystoreSessionStore` | `SecureSessionStore` protocol + **Keychain** impl (`kSecClassGenericPassword`, `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`) | M0c §2.2 Keychain requirement |
| `SessionManager` (restore/authenticated/refresh-failed/signOut/demo) | `SessionManager` `@Observable`/ObservableObject | inject a clock for tests |
| `AuthOutcome` / `RetryableCode` | same enums | opaque codes only (M0c §8) |
| `AuthFlow` reducer + `AuthFailure` | same pure reducer | unit-test with XCTest |
| `EmailValidator` / `OtpCodeValidator` | same | pure |
| `GoTrueTransport` + `SupabaseAuthRepository` | protocol + repository; `URLSessionGoTrueTransport` | same endpoints: `/auth/v1/otp`, `/verify`, `/token?grant_type=id_token\|refresh_token` |
| `CredentialManagerGoogleIdTokenProvider` | **`AuthenticationServices` Sign in with Apple** (`ASAuthorizationAppleIDProvider`) as the primary native mechanism; Google optional later | iOS uses Apple ID token → Supabase `signInWithIdToken(provider: apple)` |
| `AccountDeletion` + `OkHttpAccountRepository` | `AccountDeletion` + `URLSession` repository | `DELETE /api/user/delete`, phrase `DELETE MY OMEN DATA` |
| `OmenAndroidApp` Compose shell | SwiftUI `AppShellView` (already scaffolded in M2) extended with the auth flow | reuse existing `mobile/ios/OmenIOS` |

## Auth mechanisms (M0c §2.1)
- **Sign in with Apple** (required on iOS when any third-party login is offered): native `ASAuthorizationController` → Apple ID token + raw nonce (SHA-256 hashed into the request, raw nonce to Supabase). No browser.
- **Email OTP**: 6-digit code via the same GoTrue `/otp` + `/verify` REST calls; no magic link.
- Session tokens in **Keychain** only.

## macOS CI (in place)
`.github/workflows/ios-ci.yml` builds the `OmenIOS` scheme on `macos-14` against the iOS Simulator SDK with signing disabled, triggered only on `mobile/ios/**` changes + manual dispatch (narrow to limit runner minutes — M2-E "non-billed capacity" intent). A shared scheme (`OmenIOS.xcodeproj/xcshareddata/xcschemes/OmenIOS.xcscheme`) is committed so CI has a stable target. When the iOS unit-test target lands, switch the workflow's `build` to `test` with a concrete simulator destination.

## Acceptance (macOS CI, non-signing)
1. `xcodebuild -scheme OmenIOS -destination 'generic/platform=iOS Simulator' build` succeeds (now wired in `ios-ci.yml`).
2. XCTest: AuthFlow reducer, validators, SupabaseAuthRepository mapping (fake transport), SessionManager expiry, AccountDeletion phrase — parity with the 37 Android unit tests.
3. Simulator screenshots: Welcome → Sign in with Apple / email OTP → Command Center → delete confirmation.
4. Security: no token in console logs; Keychain item is `ThisDeviceOnly`; opaque errors only.
5. Real-device Apple happy path is founder-observed; the remaining cases in `Direction/reviews/2026-08-01-m3a-qa-device-matrix.md` stay mandatory. TestFlight remains a separate release gate.

## Boundaries
No certificate/private-key exposure, archive, TestFlight/store submission, provider-secret handling, or production deployment in M3A implementation work. Normal Apple Development Automatic Signing is now the approved local device path. macOS CI remains unsigned and uses its command-line signing overrides.
