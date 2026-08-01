# F1 — Service-Key Supabase Route-Scoping Audit

**Date:** 2026-07-31
**Authority:** ATA-20260731-03 — audit-preparation only, no production data or secret values.
**Done-when (per `Direction/current_sprint.md`):** every service-key route has a route/query/scoping-column/test mapping; any unscoped query becomes a P0 defect with a failing isolation test.

## Result: no P0 findings

Every route across the 21 files that reference the service-role Supabase client and touch a user-owned table (`profiles`, `moves`, `platform_connections`, `consent_records`, `oauth_state`, `users`) applies an explicit `.eq("user_id", req.user.id)` / `.eq("id", userId)` filter, or a self-scoped upsert keyed to the verified caller. `waitlist_signups` (public insert-only), `local_snapshots` (league-level cache, not per-user), and the Tuesday-scoring cron (admin batch job, no per-request user) are correctly non-scoped by design.

Full route-by-route table (29 routes/helpers reviewed): `GET/POST /api/account/*`, `/api/platforms/*`, `/api/moves`, `/api/dashboard/summary`, `/api/optimizer/*`, `/api/yahoo/*`, `/api/espn/*`, `/api/league/standings`, `/api/omen/*`, `/api/system/*`, `/api/waitlist` — every one classified SCOPED or N/A. Zero UNSCOPED.

## Test-coverage gaps found (not P0 — code is correctly scoped, but no automated isolation test proves it)

1. **`src/routes/userPrivacy.js` — `GET /export`, `POST /consent`, `DELETE /delete`.** Existing tests (`test/userPrivacyRoute.test.js`, `test/accountDeletion.test.mjs`) only cover pure helpers (redaction, confirmation-string constant), not DB-level cross-user isolation. Recommend a test modeled on `test/movesRoute.test.js`'s pattern (real-filtering `FakeQuery`, seed a second user's rows, assert absence/non-mutation).
2. **`src/routes/espn.js` — `GET /roster`.** `test/espnRoute.test.js` doesn't seed a competing user's `platform_connections` row to prove exclusion. Lower priority — mirrors the already-tested `platforms.js`/`league.js` pattern.

`test/movesRoute.test.js` is the best-covered route in the repo and is the right reference pattern for closing both gaps above.

## Gaps closed (2026-07-31, same pass)

Both gaps above are now closed with real-filtering isolation tests (founder-approved same-session extension of this audit-prep task):

- `test/userPrivacyIsolation.test.js` — 4 tests. Seeds two users' rows across `users`, `platform_connections`, `consent_records`, `moves`, `oauth_state`; proves `GET /export` never serializes user-2's data, `POST /consent` scopes to `req.user.id` even when the request body supplies a different `user_id`, and `DELETE /delete` removes only the acting user's rows while leaving user-2's untouched (plus a confirmation-phrase-mismatch no-op check).
- `test/espnRouteIsolation.test.js` — 3 tests. Unlike the existing `espnRoute.test.js` mock (which returns the same row regardless of filter args), this uses a real-filtering fake so it proves `GET /roster` decrypts only the requesting user's own ESPN secrets, resolves a *different* user's own connection (not the first row in the table), and returns 401 for a user with no connection rather than falling back to someone else's.

**Evidence:** `npm test` — 476/476 passing (up from the documented 469/469 baseline; +7 new tests, 0 regressions).

## What did NOT happen

No production data touched. No secret values read or displayed. No code changed — this is a review artifact only, per the audit-prep authority scope.
