# Handoff — M0-BE F2 Omen Readiness Truth

## Objective

Resolve the native app-shell ambiguity between `ready` and `pending_live_engine` without changing provider credentials, native UI, or public response shape.

## Delivered

- Added `src/services/omenReadiness.js` as the shared readiness classification for active connections.
- Routed dashboard status and Sleeper/ESPN live-MVP selection through that rule.
- Authored the shared M0-BE contract, workflow tree, acceptance matrix, and security/RBAC evidence before implementation.

## Contract

`ready` means the canonical POST may safely attempt a live recommendation; it does not guarantee a recommendation. The native client calls `POST /api/omen/mvp-move` only after dashboard `ready`, then renders the returned success, empty, or recovery envelope.

## Verification

- RED: `node --test test/omenReadiness.test.js` — failed because the new shared module was absent.
- GREEN: focused suite 25/25.
- Full suite: `npm test` 395/395.
- Frontend build: passed with existing Vite warnings.
- Diff check: clean.

## Limits

- Root development audit has an existing high-severity `promptfoo` → `adm-zip` chain; no package file changed here. Production audit remains clean.
- Yahoo deep-link return, safe provider-state API, and connection idempotency remain the next three separate M0-BE PRs.
- No push, PR, merge, deploy, production action, real-account test, secret, cookie, schema, or native project work occurred.
