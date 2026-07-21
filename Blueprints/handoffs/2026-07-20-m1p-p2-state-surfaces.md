# M1-P P2 — State Surfaces Foundation — 2026-07-20

## Scope

Added six distinct shared content states: Empty, contextual Loading, Error, Disconnected, Stale,
and Mock. Empty uses the registry-required dashed outline; Error uses risk treatment; Loading has
a reduced-motion static alternative. Every state exposes an explicit accessibility description.

## Evidence

- Code commit: `6167c60`.
- Android: 16 emulator instrumentation tests and `:app:assembleDebug` passed.
- Merge: PR #168 (`9680b17`).
- iOS unsigned simulator CI: `29791212316` passed.

## Limitation and next gate

No direct gallery screenshot is claimed because the Studio-managed ADB path is unavailable to
this shell. ListRow is the next shared P2 primitive; no feature-local state panel may replace
these distinct states.
