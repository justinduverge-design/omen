# M0-BE-2 Security and Privacy Evidence

**Date:** 2026-07-23
**Scope:** authenticated native Sleeper-connect replay protection only

## Boundary and controls

- Replay keys are scoped by authenticated application user, provider, and opaque client request ID. A request ID cannot replay another authenticated user's result.
- Request IDs are restricted to 16–128 characters of `[A-Za-z0-9_-]`; invalid input is rejected before the connection mutation.
- The replay record lives in the already-configured Redis dependency and expires after 10 minutes. No database schema, credentials, provider settings, deployment, or production data changed.
- Completed replay returns only the existing safe connection response plus `request_id` and `replayed`; it does not expose the Redis key, user ID, credentials, provider response text, or secret references.
- Missing replay storage fails closed before a native request can write a connection. If final replay storage is unavailable after the existing connection write, the in-progress record remains bounded and inert instead of allowing an immediate duplicate. Both cases use opaque `503 connection_replay_unavailable`; an in-progress duplicate is `409 connection_request_in_progress`.
- Replay-store exceptions are logged with a fixed message. The focused test injects a token-shaped error string and proves the captured logs do not contain it.

## Evidence

- `node --test test/platforms.test.js` — 21/21 passing, including completed replay, unavailable storage before and after the connection write, in-progress duplicate, independent request IDs, and sensitive-error log suppression.
- `git diff --check` — clean.

## Residual limits

- The bounded Redis record protects retries/resume only during its 10-minute TTL. After expiry, an intentional repeated request follows the existing idempotent `platform_connections` upsert behavior, but is not a replay response.
- Yahoo OAuth transactions and ESPN native connection remain outside this slice. Yahoo's mobile-aware return requires its separate current-primary-source research gate (M0-BE-3).
