# M3-A — iOS Auth Parity Spec (for macOS CI)

**Status:** Spec ready; implementation blocked on authorized non-signing macOS CI — 2026-07-19
**Why a spec, not code:** iOS/SwiftUI cannot be compiled or device-proven on the Windows workspace. Per delivery governance, provider/auth paths are not claimed without real compile + device evidence, so shipping unverifiable Swift is out of scope. This spec makes the macOS CI task turnkey by mapping each verified Android artifact to its iOS equivalent.

**Companions:** `omen-native-app-shell-auth-api-contract-v1.md` (M0c), `omen-mobile-onboarding-connection-contract-v1.md` (M0a). Android reference: `Blueprints/handoffs/2026-07-19-m3a-native-auth-scaffolding.md`, commit on `codex/m3a-native-auth-proof`.

## Prereqs already done (founder)
- Apple Developer Team `6RWR5G9894`; App ID `com.slopssaloon.omen` with **Sign in with Apple** capability enabled.
- Supabase Apple provider configured with both Omen client IDs.
- **Not** done / still gated: provisioning profile, Services ID, Apple key, signing — not required for a non-signing simulator compile; required later for device/TestFlight.

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

## Acceptance (macOS CI, non-signing)
1. `xcodebuild -scheme OmenIOS -destination 'generic/platform=iOS Simulator' build` succeeds.
2. XCTest: AuthFlow reducer, validators, SupabaseAuthRepository mapping (fake transport), SessionManager expiry, AccountDeletion phrase — parity with the 37 Android unit tests.
3. Simulator screenshots: Welcome → Sign in with Apple / email OTP → Command Center → delete confirmation.
4. Security: no token in console logs; Keychain item is `ThisDeviceOnly`; opaque errors only.
5. Real-device Apple sign-in + TestFlight remain a later signing-gated step, not part of this compile proof.

## Boundaries
No signing, no provisioning profile/Services ID/Apple key handling by agents, no store submission, no provider connection, no production. macOS CI must use included/non-billed capacity per `omen-native-build-environment-v1.md`.
