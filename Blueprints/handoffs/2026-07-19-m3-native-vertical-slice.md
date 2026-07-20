# M3 Native Vertical Slice — 2026-07-19

## Outcome

Implemented local/demo-only parity in the iOS and Android shells:

`Welcome → Try Demo or Get started → local sign-in placeholder → Command Center → Omen mock/recovery`.

The Demo path remains usable without an account. The Omen state is visibly labeled `Mock recommendation`, and the recovery copy says that a league connection is needed for live Omen.

## Proof

- Focused native-shell contract test passed after RED for missing M3 state copy.
- Android `:app:assembleDebug` passed and the APK installed/launched on `Medium_Phone`.
- Visual inspection caught an initial dark-theme content-color issue; the Compose shell now uses a dark Material color scheme and a full-screen surface.
- `git diff --check` passed.

## Hard boundary

The sign-in screen is not authentication. It does not create an account, persist a session, contact Supabase, connect a provider, use credentials, or imply release readiness.

M3-A is required before any external/native release: iOS Sign in with Apple plus email OTP, Android Credential Manager plus email OTP, secure session storage, named failure/recovery states, and safe real-device evidence. It requires separate founder authority for public auth configuration.

## Known limitation

iOS compilation and device evidence remain unavailable on this Windows workspace until separately authorized non-signing macOS simulator CI. No signing, CI, TestFlight, App Store, provider, or production work occurred.
