# M4-Auth-Providers-v1 — Implementation Brief (Discord + Passkeys)

**Status:** DRAFT — awaiting founder approval before implementation begins
**Owner:** Claude
**Sprint item:** `Direction/current_sprint.md` → M lane → M4-Auth-Providers-v1
**Depends on merged:** M4-Auth retirement (#193) — landed in `main` as `d3625f8`

---

## 1. Problem framing

Supabase project `xyudxfhqejbwvjngiwhw` has five enabled auth providers: Email, Google, Apple, **Discord**, and **Passkeys (WebAuthn)**. The app currently exposes only Email + Google (Android) / Email + Apple (iOS). This brief scopes wiring the two remaining enabled providers on both platforms in one review pass.

Discord and Passkeys are **different technologies** and demand **different seams**:

- Discord uses `signInWithOAuth(provider="discord")` → browser redirect → deep link. Same shape works for any future OAuth provider Supabase supports; the seam is provider-agnostic.
- Passkeys use `signInWithWebAuthn` (technically Supabase's `verifyWebAuthn` / `registerWebAuthn` endpoints, or the newer `signInWithSSO`-style WebAuthn flow) driven by platform passkey APIs. No browser round-trip after first pairing — biometric or platform authenticator resolves the challenge locally.

Both extend the existing `AuthFlow` state machine and `AuthRepository` boundary, following the pattern already established for Google + Apple.

---

## 2. Contract-layer changes (shape shared by both platforms)

The existing `AuthFlowState` / `AuthEvent` / `AuthOutcome` shape is duplicated in Kotlin (`core/auth`) and Swift (`OmenIOS/App/Auth`), matching per-platform provider-event names (`GoogleRequested` on Android, `appleRequested` on iOS). This brief adds symmetric branches to both.

### 2.1 New `AuthFlowState` variants (both platforms)

- `LaunchingOAuth(providerId: String)` — browser tab / auth session opening. Corresponds to `LaunchingGoogle`.
- `ExchangingOAuthCode(providerId: String)` — deep-link received, exchanging the returned auth code for a session. Corresponds to `ExchangingGoogleToken`.
- `LaunchingPasskey` — platform passkey UI presenting. Corresponds to `LaunchingGoogle`.
- `ExchangingPasskeyAssertion` — sending the platform assertion to Supabase for verification. Corresponds to `ExchangingGoogleToken`.

### 2.2 New `AuthEvent` variants (both platforms)

- `OAuthRequested(providerId: String)` — user tapped a "Continue with X" button.
- `OAuthCallbackReceived(providerId: String, code: String, state: String)` — deep link resolved.
- `OAuthExchangeResult(providerId: String, outcome: AuthOutcome)` — Supabase code-exchange returned.
- `PasskeyRequested` — user tapped "Sign in with a passkey".
- `PasskeyAssertionResult(result: PasskeyResult)` — platform passkey API returned (either an assertion or a named failure: `Canceled`, `Unavailable`, `NoCredential`, `Failed`).
- `PasskeyExchangeResult(outcome: AuthOutcome)` — Supabase assertion-verification returned.

### 2.3 New `AuthFailure` variants (both platforms)

- `OAUTH_PROVIDER_NOT_CONFIGURED` — Supabase project doesn't have the provider enabled (defensive; UI should already gate on this).
- `OAUTH_CALLBACK_MISMATCH` — deep-link state parameter didn't match the value we sent (CSRF defense).
- `PASSKEY_UNAVAILABLE` — device has no platform authenticator or the API isn't installed (below API 34 on Android without Play services).
- `PASSKEY_NO_CREDENTIAL` — user has no registered passkey for this account on this device.

### 2.4 Deep link parsing (Android + iOS)

The `com.slopssaloon.omen://auth/callback` scheme is already reserved in the M0c contract. This work adds the **first actual consumer** on each platform (Yahoo's callback consumer is a separate M0-BE item).

- Callback URL shape (Supabase default): `com.slopssaloon.omen://auth/callback?code=<pkce_code>&state=<opaque>` for OAuth; passkey flows do not use deep links.
- App-side: parse `code` + `state`; hand to `AuthRepository.exchangeOAuthCode(code, verifier)` where `verifier` is the PKCE code_verifier we stashed before opening the browser.
- CSRF: `state` is a random 32-byte URL-safe value we generate + store, and verify on return.

---

## 3. Android implementation surface

### 3.1 New files (`mobile/android/core/auth/`)

- `SupabaseOAuthProvider.kt` — interface + real impl. Opens Chrome Custom Tabs with the Supabase authorize URL, generates + stores PKCE verifier and CSRF state, exposes `parseCallback(uri)` that returns `Result<AuthCode>` for the app to hand back to the repository.
- `AndroidChromeTabsOAuthProvider.kt` (in `app` module) — concrete Custom Tabs launcher, since Custom Tabs depends on `androidx.browser` which is an app-layer concern.
- `PasskeyProvider.kt` — interface: `suspend fun getAssertion(challenge: String): PasskeyResult`, `suspend fun register(challenge: String, userId: String): PasskeyResult`, `val isSupported: Boolean`.
- `CredentialManagerPasskeyProvider.kt` (in `app` module) — uses `androidx.credentials.CredentialManager` with `GetPublicKeyCredentialOption` / `CreatePublicKeyCredentialRequest`. Same Credential Manager the Google flow already uses; we're adding a passkey option, not a new dependency.
- Fake variants of both for JVM unit tests, sitting alongside `FakeAuthRepository`.

### 3.2 Changed files

- `core/auth/AuthFlow.kt` — add the states/events/failures from §2.
- `core/auth/AuthRepository.kt` — add `suspend fun exchangeOAuthCode(providerId, code, verifier): AuthOutcome`, `suspend fun signInWithPasskey(assertion): AuthOutcome`, `suspend fun registerPasskey(session, credential): AuthOutcome`, `suspend fun startPasskeyChallenge(): Result<Challenge>`.
- `core/auth/GoTrueTransport.kt` — add matching transport methods. `SupabaseAuthRepository` maps to them.
- `app/auth/OkHttpGoTrueTransport.kt` — implement the new REST calls against Supabase's GoTrue.
- `app/auth/OmenAuthFlow.kt` — add the two new buttons: Passkey primary CTA (top slot when `PasskeyProvider.isSupported`), Discord secondary under a "More ways to sign in" divider.
- `app/OmenAndroidApp.kt` — wire the new providers into the composable, register the deep-link intent filter, handle `onNewIntent` → dispatch `OAuthCallbackReceived`.
- `app/src/main/AndroidManifest.xml` — add `<intent-filter>` for `com.slopssaloon.omen://auth/callback` on `MainActivity`.

### 3.3 New Account settings surface

- `app/settings/PasskeysSection.kt` — composable that lists registered passkeys for the current account (from Supabase), an "Add a passkey" button, and a per-row "Remove" button. Rendered inside the existing Account tab.
- Repository additions: `listPasskeys(session): Result<List<PasskeyInfo>>`, `removePasskey(session, credentialId): AuthOutcome`.
- `PasskeyInfo` shape: `{ credentialId: String, createdAt: Instant, lastUsedAt: Instant?, aaguid: String? }` — never the raw public key.

### 3.4 Post-sign-in pairing prompt

- After any successful non-passkey sign-in, if `PasskeyProvider.isSupported && !userHasRegisteredPasskey(session)`, present a one-time `OmenModalSheet` titled "Save a passkey for faster sign-in?" with primary "Save passkey" + secondary "Not now".
- "Not now" persists a dismissal flag in `SessionManager` scoped to `userId` so we don't re-nag on next sign-in; user can still add from Account settings.

### 3.5 Dependencies

- **No new libraries** for Passkeys — `androidx.credentials:credentials` and `credentials-play-services-auth` are already in the Google flow's dep tree.
- **New dep** for Discord OAuth: `androidx.browser:browser` (Chrome Custom Tabs). Flagged as a package-file edit — requires explicit approval before adding.

---

## 4. iOS implementation surface

### 4.1 New files (`mobile/ios/OmenIOS/OmenIOS/App/Auth/`)

- `SupabaseOAuthProvider.swift` — protocol + `ASWebAuthenticationSessionOAuthProvider` impl. Uses `ASWebAuthenticationSession` with `callbackURLScheme = "com.slopssaloon.omen"`.
- `PasskeyProvider.swift` — protocol + `ASAuthorizationPlatformPasskeyProvider` impl. Uses `ASAuthorizationPlatformPublicKeyCredentialProvider` for both assertion and registration.
- Fake variants for XCTest.

### 4.2 Changed files

- `App/Auth/AuthFlow.swift` (or wherever the Swift `AuthFlowState`/`AuthEvent` live) — mirror §2 additions.
- `App/Auth/AuthRepository.swift` — mirror §3.2 method additions.
- `App/Auth/URLSessionGoTrueTransport.swift` — implement the new REST calls.
- `App/Auth/AuthViewModel.swift` — add `signInWithOAuth(providerId:)`, `signInWithPasskey()`, and completion handling that mirrors the existing `signInWithApple()` pattern.
- `App/Auth/SignInView.swift` — add Passkey primary button (top slot when available) + Discord secondary button under "More ways to sign in".
- `App/OmenIOSApp.swift` — register deep-link handler via `.onOpenURL { url in ... }`, dispatch `OAuthCallbackReceived`.
- `App/Info.plist` — add `CFBundleURLTypes` entry for `com.slopssaloon.omen` (may already exist for Yahoo — verify).

### 4.3 New Account settings surface

- `App/Auth/PasskeysSection.swift` — mirrors §3.3. Inserted into `AccountView` between "Sign out" and "Danger Zone".

### 4.4 Post-sign-in pairing prompt

- Same logic as §3.4; SwiftUI `.sheet` presenting a passkey pairing offer. Dismissal flag stored in `SessionManager` (Swift side).

### 4.5 Dependencies

- **No new libraries.** `AuthenticationServices` (both `ASWebAuthenticationSession` and `ASAuthorizationPlatform*`) is a first-party framework already available.
- **`Info.plist`** change is not a package edit but does need review.

---

## 5. Backend / Supabase changes

**None required.** All five providers are already enabled in Supabase Studio and the anon key + project URL are already in `local.properties`. No new client secrets in the repo (they stay in Studio).

**Verify before implementation:**
- Redirect URLs in Supabase Studio → Authentication → URL Configuration include `com.slopssaloon.omen://auth/callback`. If not, flag and request Justin add it before we ship — one-line dashboard change.
- Passkey configuration in Supabase Studio → Authentication → Passkeys has a valid RP ID matching a domain we control (`slopssaloon.com` or the Supabase-hosted default). Founder confirmation needed.

Both are dashboard checks, no code.

---

## 6. Test surface

### 6.1 Reducer unit tests (both platforms)

- `OAuthRequested → LaunchingOAuth`
- `OAuthCallbackReceived → ExchangingOAuthCode`
- `OAuthExchangeResult(Success) → Authenticated`
- `OAuthExchangeResult(RetryableError) → Failed(NETWORK/etc.)`
- `PasskeyRequested → LaunchingPasskey`
- `PasskeyAssertionResult(NoCredential) → Failed(PASSKEY_NO_CREDENTIAL)`
- All existing tests still pass.

### 6.2 Repository tests with fake transport

- Discord code-exchange happy path
- Discord CSRF state mismatch → `Failed(OAUTH_CALLBACK_MISMATCH)`
- Passkey assertion happy path
- Passkey no-credential path

### 6.3 Android connected tests (`:app` androidTest)

Adding these requires `:app`'s `build.gradle.kts` to gain androidTest deps — a **package-file edit**, flagged as a separately-approved side-quest. Alternative: keep connected-test coverage in `:core:designsystem` only (existing pattern) and prove the app-layer behavior via UI smoke + Compose preview + primitive-enforcement scanner. Recommend the alternative — do not open the `:app` androidTest can of worms in this PR.

### 6.4 iOS XCTest

- New passkey / oauth reducer tests in `OmenIOSTests`.
- Provider seams tested with fakes (real Custom Tabs / passkey UI can't run in headless simulator).

### 6.5 Primitive-enforcement scanner

Must stay green — no new files may sneak past the empty allowlist. `OmenAuthFlow` and the new Account settings composables all consume approved primitives only.

### 6.6 Manual real-device smoke (Justin gate)

- Android: fresh install → Discord sign-in → success. Then pair a passkey. Sign out. Sign back in with passkey.
- iOS: same flow with SIWA baseline still working + Discord + Passkey.
- Sanitized QA matrix in `mobile/contracts/m3a-interactive-qa-runbook.md` — extend, don't fork.

---

## 7. Out of scope (deferred to future items)

- **Other Supabase OAuth providers** (GitHub, Slack, Twitch, etc.) — none enabled; the seam is provider-agnostic so adding one later is config + one button.
- **Passkey cross-device sync surfaces** — iCloud Keychain / Google Password Manager handle sync automatically; no in-app UI.
- **Multi-account switching** — one session at a time remains the model.
- **Yahoo callback backend requirement** — separate M0-BE-1 item; not blocking this PR because sign-in providers use Supabase's own `auth/v1/callback`, not `/api/yahoo/callback`.
- **Web app parity** — not built here; web sign-in continues on its current path.
- **Sign-in analytics** — no PostHog events added in this PR; if needed, filed as a follow-up so the shape gets reviewed against the privacy contract.

---

## 8. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Chrome Custom Tabs dep addition (`androidx.browser`) needs approval | High | Blocking | Flagged up front; ask before adding |
| Supabase redirect-URL config missing `com.slopssaloon.omen://auth/callback` | Medium | Blocking on real device | Verify before implementation; one-line dashboard fix |
| Passkey RP ID misconfigured in Supabase | Medium | Passkeys fail silently on real device | Founder confirms RP ID + hosting-domain match before implementation |
| iOS `Info.plist` collision with Yahoo URL scheme | Low | Build failure | Read `Info.plist` first, additive only |
| Deep-link intent-filter conflict with future providers | Low | Callbacks misrouted | Route on `code`/`state` presence; providerId is embedded in the state we generate |
| Passkey user-experience regressions when a passkey exists but is unusable (e.g. device restore) | Medium | User locked out of passkey path | Fall back to email OTP; never leave the user stuck |
| State-machine ambiguity when two providers race (user taps Discord then Passkey quickly) | Low | Wrong terminal state | Reducer's existing pattern already ignores events that don't match current state; new branches inherit that behavior |

---

## 9. Rollout gates (in order)

1. Founder approval of this brief — no code before that.
2. Founder confirms Supabase dashboard state (redirect URL + passkey RP ID). Blocks real-device smoke, not code.
3. Founder approves the `androidx.browser` dependency add. Blocks Android Discord code.
4. Contract-layer + repository + fake-provider changes land first (JVM/XCTest green).
5. Platform-specific provider impls land next (build green, unsigned iOS CI green).
6. UI changes + Account settings + pairing prompt land last (primitive scanner still green, `:app:assembleDebug` green).
7. Justin runs the extended M3A-QA matrix on real devices before merge.

---

## 10. Non-goals for this brief

This brief does not decide:
- **Passkey copy** (button labels, pairing-prompt wording, empty-state copy). Route through `slops-ux-copy` after the mechanical build works — copy tuning shouldn't gate the seam.
- **Icon assets** for Discord + Passkey buttons. Discord's brand guidelines require their exact wordmark + color for "Continue with Discord"; passkey UI conventionally uses the shared passkey glyph. Both are asset drops that follow the founder-approved design pass.
- **Analytics events.** Deliberate deferral — see §7.

---

## 11. Estimated size

- Contract + repository + fake transports: small-medium, cross-platform mirror
- Android Chrome Custom Tabs + deep-link intent filter: medium
- Android Credential Manager passkey wiring: medium (new API surface)
- iOS ASWebAuthenticationSession seam: small-medium
- iOS ASAuthorizationPlatform passkey seam: medium
- UI additions (2 buttons per platform + Account settings section + pairing sheet): medium
- Total: **medium-large PR**. One reviewable pass. No stacking recommended — the two providers share too many files to split cleanly.
