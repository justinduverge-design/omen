# Phase 2.9 Account Delete UI Handoff

Date: 2026-07-04
Branch: `codex/phase2-9-account-delete-ui`
Status: Complete; pushed on `codex/phase2-9-account-delete-ui`; merge approved 2026-07-04; not deployed in the build session

## What Changed

- Added `frontend/src/lib/accountDeletion.js` with the exact confirmation phrase `DELETE MY OMEN DATA` and strict matcher.
- Added `test/accountDeletion.test.mjs` for the frontend confirmation contract.
- Added a Privacy subsection to `/account`.
- Added an accessible delete-confirmation dialog that calls `DELETE /api/user/delete` through `apiFetch`.
- On success, the browser signs out and redirects to `/login?deleted=true`.
- Added a short `/login?deleted=true` completion notice.
- Updated active API/contract docs to replace the stale Corvus phrase with the mounted Omen route phrase.

## Behavior Contract

- User must type `DELETE MY OMEN DATA` exactly.
- Frontend request body: `{ confirmation: "DELETE MY OMEN DATA" }`.
- Backend route: `DELETE /api/user/delete`, auth required.
- UI copy must continue saying "Omen data" because provider-held data and sign-in-provider data are outside this route.

## Verification

- RED: `node --test test/accountDeletion.test.mjs` failed before `frontend/src/lib/accountDeletion.js` existed.
- Focused GREEN: `node --test test/accountDeletion.test.mjs test/userPrivacyRoute.test.js` -> 4/4.
- Full: `npm test` -> 403/403.
- Build: `npm --prefix frontend run build` -> pass with existing warnings.
- Audit: `npm audit --audit-level=moderate` -> 0 vulnerabilities.
- Whitespace: `git diff --check` -> clean.
- Browser: local Vite + Chrome on `/login?deleted=true` at 390px; notice rendered and no horizontal overflow. Expected dev-only `/api/dashboard/summary` proxy 500 occurred because backend was not running.
- Protected modal screenshots: local Vite + Chrome with a throwaway browser-local Supabase session and stubbed local `/api` responses. Output:
  - `output/playwright/phase2-9-account-delete-ui/account-privacy-section-desktop.png`
  - `output/playwright/phase2-9-account-delete-ui/account-delete-modal-desktop.png`
  - `output/playwright/phase2-9-account-delete-ui/account-delete-modal-mobile.png`
  Both modal screenshots show `/account`, dialog open, confirmation input focused, exact phrase typed, submit enabled, and no horizontal overflow.

## Known Gaps

- `Header.jsx` duplicate `className` Vite warning is pre-existing and left out of this branch.
- Legacy `src/omen_gdpr.js` still has old delete wording; mounted current truth is `src/routes/userPrivacy.js`.

## Next Backend Step

The next backend-oriented queue item remains Phase 3.15 only after Justin logs an approved cloud-AI budget cap. Otherwise pull the next unblocked item from `Direction/current_sprint.md`.
