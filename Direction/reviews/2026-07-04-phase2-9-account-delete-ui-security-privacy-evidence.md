# Phase 2.9 Account Delete UI - Security/Privacy Evidence

Date: 2026-07-04
Owner: Codex
Branch: `codex/phase2-9-account-delete-ui`
Status: Local, not pushed/merged/deployed

## Scope

Expose the existing mounted `DELETE /api/user/delete` route from the authenticated `/account` page after Justin approved the destructive flow. This pass adds no new backend route, table, migration, dependency, provider integration, telemetry path, Sentry path, env value, or production config.

## Data Boundary

- Frontend sends only `{ confirmation }` to `DELETE /api/user/delete` through the existing authenticated `apiFetch` helper.
- Required phrase is exactly `DELETE MY OMEN DATA`, shared from `frontend/src/lib/accountDeletion.js` and pinned by `test/accountDeletion.test.mjs`.
- Mounted backend truth is `src/routes/userPrivacy.js`, not legacy `src/omen_gdpr.js`.
- The route deletes Omen-side rows: moves, platform connections, OAuth state, consent records, subscription records, and user profile data.
- The route attempts Supabase Vault cleanup for platform secret ids before deleting platform rows.
- The route writes only a hashed deletion audit record and logs only `user_hash`.
- The route does not delete data held by Yahoo, Sleeper, ESPN, Google, Discord, Apple, or Supabase Auth providers.

## Copy Boundary

UI copy says "Delete Omen data" and explicitly states that provider-held and sign-in-provider data are not changed. It does not promise provider deletion, permanent auth-provider erasure, or legal/compliance completeness.

## Secrets/PII Review

- No `.env`, secret, cookie, token, Vault value, Supabase key, Stripe key, or production data was read or changed.
- No ESPN cookie values are logged, displayed, or echoed.
- No raw OAuth token or Vault secret id is exposed by the new UI.
- Error copy is generic and does not display backend exception details.

## Evidence

- Focused: `node --test test/accountDeletion.test.mjs test/userPrivacyRoute.test.js` -> 4/4.
- Full: `npm test` -> 403/403.
- Frontend build: `npm --prefix frontend run build` passed. Existing warnings remain: Vite chunk size, unsupported `NODE_ENV=production` in `.env`, and pre-existing duplicate `className` in `Header.jsx`.
- Audit: `npm audit --audit-level=moderate` -> 0 vulnerabilities.
- Diff check: `git diff --check` clean.
- Browser check: local Vite + Chrome at `/login?deleted=true`, 390px viewport, confirmed "Omen data deleted." notice and no horizontal overflow. The expected dev-server `/api/dashboard/summary` proxy 500 appears because backend was not running and is not specific to this flow.
- Protected modal screenshot check: local Vite + Chrome at `/account`, using a throwaway browser-local Supabase session plus stubbed local `/api` responses. Screenshots saved under `output/playwright/phase2-9-account-delete-ui/`; desktop and mobile modal captures show the dialog open, confirmation input focused, exact phrase typed, submit enabled, and no horizontal overflow.

## Residual Risk

- The `/account` modal screenshot now exists, but the session was seeded locally for visual QA rather than coming from a real signed-in Omen account.
- Legacy `src/omen_gdpr.js` still contains the historical `DELETE MY ACCOUNT` phrase. It is not the mounted `/api/user` route, but future privacy copy should continue using `src/routes/userPrivacy.js` as current truth.
