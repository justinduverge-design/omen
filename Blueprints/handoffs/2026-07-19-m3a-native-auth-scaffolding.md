# Handoff — M3-A Native Auth Scaffolding (Android, config-independent)

**Date:** 2026-07-19
**Branch:** `codex/m3a-native-auth-proof` (not pushed, no PR, no merge — Justin gates push/merge)
**Scope:** Android + shared auth contract only. iOS deferred; no provider connection, signing, store, or production work.
**Authority:** Justin granted M3-A authority 2026-07-19 and elected to provision Supabase/Google config himself. Contracts: `omen-native-app-shell-auth-api-contract-v1.md` (M0c), `omen-mobile-onboarding-connection-contract-v1.md` (M0a), `omen-native-delivery-governance-v1.md`, `omen-native-agent-capabilities-canvas-v1.md`.

## Outcome

Built the config-independent Android authentication foundation and wired it into the app shell, replacing the M3 static placeholder with a real, testable sign-in state machine. Live Supabase/Credential-Manager network calls are the next wiring step (gated only on the Google Web client ID + Supabase SDK addition); everything else is done and proven.

### Delivered

**`core:session`**
- `SessionState` expanded: `Loading / SignedOut / SignedIn / NeedsReauth` (persistent session, independent of provider sync — M0c §2.2).
- `Session` model with token material and a redacted `toString()` (never logs tokens — facts-of-record #6).
- `SecureSessionStore` abstraction + `InMemorySecureSessionStore` (tests).
- `AndroidKeystoreSessionStore` — real AES-256/GCM encryption with a key held in AndroidKeyStore; only ciphertext+IV in app-private prefs; **no external dependency** (no security-crypto). Corrupt/rotated payload fails safe to "no session".
- `SessionManager` — restore/authenticated/refresh-failed/sign-out/demo transitions; injectable clock for deterministic expiry.

**`core:auth`**
- `AuthMechanism` (Google ID-token, email OTP, Apple-for-parity), `AuthOutcome` with **opaque safe error codes only** (M0c §8), `RetryableCode`.
- `AuthRepository` interface + `FakeAuthRepository` (network-free, scriptable).
- `EmailValidator` / `OtpCodeValidator` (pure).
- `GoogleIdTokenProvider` seam + `UnconfiguredGoogleIdTokenProvider` (reports unavailable honestly until the Web client ID lands).
- `AuthFlow` — pure `AuthFlowState` + `AuthEvent` + `AuthFlowReducer`. Every non-success state is a named `AuthFailure` mapped to a recovery affordance (no endless "Loading…").

**`app`**
- `AppEnvironment` extended with `supabaseUrl/supabaseAnonKey/googleWebClientId` + `googleSignInConfigured`/`supabaseConfigured` flags, injected via `BuildConfig` from **git-ignored `local.properties`** (nothing committed).
- `OmenAndroidApp` drives the real reducer: Welcome → Get started → email/OTP or Google → Keystore-backed session; handles `NeedsReauth`; Demo path is isolated/non-persisted (M0c §6). UI honestly labeled "Local auth flow (fake backend) — live Supabase wiring pending config."

### Provisioning status (from Justin, 2026-07-19)
- ✅ Supabase URL + anon key received (anon key is RLS-protected public config; stored only in git-ignored `local.properties`, never committed/echoed).
- ✅ Email provider enabled in Supabase (OTP path live-ready).
- ⏳ **Still needed:** Google **Web client ID** string; and confirmation the Web client ID is in Supabase Google provider "Client IDs" + secret set. See `mobile/contracts/m3a-auth-provisioning-checklist.md`.
- Apple (Team `6RWR5G9894`, App ID with Sign in with Apple) noted; untouched — Android scope only.

## Verification

- **RED→GREEN:** `:core:session:testDebugUnitTest` + `:core:auth:testDebugUnitTest` — **25 tests pass** (SessionManager 6, AuthFlowReducer 9, Validators 5, FakeAuthRepository 5). Reducer/session logic authored test-first.
- **Build:** `:app:assembleDebug` BUILD SUCCESSFUL.
- **Device:** installed + launched on `Medium_Phone` emulator (API boot verified). Captured Welcome, sign-in (email + "Google (not configured)"), and OTP-entry-after-email states — state machine advances correctly on-device. Screenshots in session scratchpad (`m3a-welcome/auth/otp.png`).
- **Security:** `git diff --check` clean; `local.properties` untracked (verified); anon key not present in any tracked file (grep verified); token `toString()` redacted; error surface is opaque codes only.

## Update — live wiring landed (same session, 2026-07-19)

Justin confirmed the Google Web client ID (`40496165411-…`, in git-ignored `local.properties`) and added it to Supabase's Google "Client IDs" list. Live Android auth is now wired:

- **`core:auth`:** `GoTrueTransport` seam + `TransportResult`; `SupabaseAuthRepository` maps results to opaque outcomes (verify 400–403 → `InvalidCode`, google 400–403 → `Unsupported`, 5xx/timeout/network → `RetryableError`, refresh failure → `NeedsReauth`); expiry computed from injected clock. **+9 unit tests** (34 total across both modules).
- **`app`:** `OkHttpGoTrueTransport` (OkHttp + org.json, bounded timeouts, only status+session fields leave the class — no Supabase SDK); `CredentialManagerGoogleIdTokenProvider` (Credential Manager + googleid, SHA-256 hashed nonce, raw nonce to Supabase, cancel/no-credential/failure mapped). App selects live repo/provider when config present, fake otherwise. `INTERNET` permission added.
- **Deps added:** `androidx.credentials` + `credentials-play-services-auth` 1.3.0, `googleid` 1.1.1, `okhttp` 4.12.0.

**Live evidence:**
- Zero-side-effect Supabase smoke (no email queued): `POST /auth/v1/token?grant_type=refresh_token` (bogus) → **HTTP 400** `validation_failed`; `POST /auth/v1/otp` (malformed email) → **HTTP 400**. Both 400 (not 401) prove the project is reachable over HTTPS, the anon key is accepted, and the endpoint shapes match the transport.
- Emulator: auth screen now renders the **live** subtitle ("Sign in with your email code or Google") and **"Continue with Google"** (configured) — confirms `supabaseConfigured`/`googleSignInConfigured` flow through to the real repo/provider.
- 34 unit tests pass; `:app:assembleDebug` green with the new deps.

**Still needs real-device interactive proof:** a full Google sign-in requires a Play-services emulator/device with a signed-in Google account (the AOSP `Medium_Phone` image has no Play services); a full email-OTP round trip requires reading the code from a real inbox. Neither was exercised to avoid sending mail / needing a Google account. In-app account deletion surface (M0c §2.3) and iOS remain outstanding.

## Parity status

- **iOS:** NOT built. No macOS/Xcode on this Windows workspace; iOS Sign in with Apple + OTP + Keychain remain for authorized non-signing macOS CI. Contract parity is preserved (`AuthMechanism.APPLE_ID_TOKEN`, shared state names).
- **Android:** foundation complete; live network wiring pending config.

## Next steps (follow-up PRs)

1. Justin returns Google Web client ID → set `omen.googleWebClientId` in `local.properties`.
2. Add `androidx.credentials` + `googleid` + Supabase-kt deps; implement `CredentialManagerGoogleIdTokenProvider` and `SupabaseAuthRepository` behind the existing interfaces; swap the app off `FakeAuthRepository`.
3. Real-device evidence for live Google + email-OTP sign-in; add in-app account deletion surface (M0c §2.3) before any release gate.
4. iOS implementation on authorized macOS CI.

## Skills

Used: `slops-repo-inspector` (M0/M2/M3 stack read), `planning-pass` (kickoff plan), `slops-tdd` (reducer/session tests first), `slops-git-flow` (scoped branch), `security-privacy-evidence` (token/secret non-exposure), `rbac-risk-review` (auth boundary, least-privilege), `slops-quality-baseline` (tests+build+diff-check). Skipped: `slops-ui-ux-audit`/`slops-mobile-smoke` (web-driver tools; native screens got manual platform checks), `slops-legal-spot-check` (no public claims).

**Skill improvement:** the run-slops-saloon / mobile-smoke skills are web-driver only; native Android verification needed ad-hoc `adb`/`gradlew` steps. Worth a small `native-android-smoke` procedure (SDK discovery, `local.properties` bootstrap, `testDebugUnitTest`, `assembleDebug`, emulator install + screenshot) — the SDK here lives under the Codex sandbox path, not the default, which cost discovery time.

## Boundaries honored

No secrets committed; no Supabase schema; no deploy; no provider (Yahoo/Sleeper/ESPN) connection; no signing/store; no Apple credential use; account-deletion phrase unchanged. Not pushed/merged.
