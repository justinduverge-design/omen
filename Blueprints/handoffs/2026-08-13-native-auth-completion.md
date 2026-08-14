# Native auth completion — 2026-08-13

## Outcome

Omen's native authorization paths now work locally across the available Apple and Android toolchains. On the physical iPhone the founder proved Sign in with Apple, Face ID passkeys, Discord OAuth, six-digit email OTP, sign-out, and persisted-session restore. On the Play-enabled Android emulator the founder proved Google and Discord sign-in.

## Implementation

- Supabase keeps ownership of its provider OAuth `state`; Omen places its CSRF state in the native `redirect_to` and validates it before PKCE exchange.
- Android uses `singleTask` callback routing and clears consumed callback replay state.
- iOS forwards the callback captured by `ASWebAuthenticationSession` directly to `AuthViewModel`; `onOpenURL` remains a cold-launch fallback.
- Both clients trim surrounding whitespace from pasted OTP codes before exact numeric validation and verification.

## External configuration

- Supabase redirect allow-list includes the state-bearing Omen callback.
- Supabase custom SMTP uses a Resend sending-only key scoped to `slopssaloon.com`. No credential entered the repository or client.
- Signup and returning-user templates emit `{{ .Token }}`; Email OTP length is six digits.

## Verification

- Xcode 26.6 (`17F113`): 121 tests, 0 failures, `TEST SUCCEEDED`.
- Signed physical-iPhone build: Automatic Signing, team `6RWR5G9894`, bundle `com.slopssaloon.omen`; build/install succeeded.
- Android: `:core:auth:testDebugUnitTest :app:assembleDebug` — `BUILD SUCCESSFUL`.
- Founder interactive proof: iPhone Discord returned to Command Center without callback hang; six-digit email OTP authenticated; force-close/reopen retained the session.

## Honest remaining boundary

M3A-QA remains `READY`, not `VERIFIED`. Destructive deletion was not run against a founder identity. Android email OTP, session restore, account deletion, and log-safety interactive evidence remain open. No Xcode Cloud, archive, TestFlight, production deployment, or UI redesign occurred.
