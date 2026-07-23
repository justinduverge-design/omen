# M0-BE-2 — Idempotent Native Sleeper Connect

**Date:** 2026-07-23
**Branch:** `backend/m0be-idempotent-connect` (stacked on `backend/m0be-provider-state-api`)
**Status:** implemented locally; not pushed, merged, deployed, or production-smoked

## Delivered

- Added optional native `request_id` handling to authenticated `POST /api/platforms/sleeper/connect`.
- Valid IDs are opaque 16–128-character `[A-Za-z0-9_-]` values. A native client generates one ID per user intent and retains it only for retry/resume of that same intent.
- Uses the existing configured Redis capability for a 10-minute, user-scoped replay record. First completion returns `request_id` and `replayed: false`; a completed duplicate returns the cached safe response with `replayed: true` and no additional connection write.
- Concurrent duplicates return opaque `409 connection_request_in_progress`. Invalid IDs return `422 invalid_request_id`. Missing replay storage returns opaque `503 connection_replay_unavailable` before a connection write; a final replay-store failure after the existing write leaves the bounded in-progress record inert rather than allowing an immediate duplicate.
- Legacy callers that omit `request_id` retain their existing response shape and behavior.

## Explicit non-goals

- No Yahoo OAuth start/callback change, provider research, arbitrary redirect support, ESPN-native-flow change, schema/migration, credential, deploy, or production-data action.
- No claim of replay beyond the 10-minute TTL.

## Evidence

- RED: the new route tests initially failed because `request_id` behavior did not exist.
- GREEN: `node --test test/platforms.test.js` — 21/21 passing.
- `npm --prefix frontend run build` — passed.
- `git diff --check` — clean.
- Baseline limits: the full root `npm test` remains blocked by a pre-existing `test/nativeMobileScaffold.test.js` assertion after M4 integration; `npm audit --audit-level=moderate` reports pre-existing transitive advisories. Neither was modified in this slice.

## Frontend contract

See the top entry of `Blueprints/handoffs/backend-to-frontend.md` for the exact request/response shape and retry rules.
