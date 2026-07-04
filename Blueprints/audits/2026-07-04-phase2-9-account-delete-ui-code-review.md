# Phase 2.9 Account Delete UI - Code Review

Date: 2026-07-04
Reviewer: Codex self-review
Verdict: Mergeable after normal human review

## Findings

No P0/P1 findings found.

## Review Notes

- `Account.jsx` uses the existing authenticated `apiFetch` helper, so the bearer token path stays centralized.
- The UI sends only the confirmation phrase and does not handle platform credentials, Vault ids, tokens, or cookies.
- Confirmation phrase matching is exact and covered by `test/accountDeletion.test.mjs`.
- Backend phrase/export redaction remains pinned by `test/userPrivacyRoute.test.js`.
- The success path signs the browser out and routes to `/login?deleted=true`, avoiding a stale protected account screen after deletion.
- Error handling covers exact-phrase failures, expired sessions, and generic server failures without exposing raw backend details.
- Modal accessibility uses `role="dialog"`, `aria-modal`, labelled/described content, Escape close when not submitting, focus trap reuse, body scroll lock, and 44px+ controls.
- Contract docs now point to `DELETE MY OMEN DATA`, replacing the stale Corvus phrase in the active frontend/backend handoff.

## Non-Blocking Notes

- `npm --prefix frontend run build` still reports a pre-existing duplicate `className` warning in `frontend/src/components/layout/Header.jsx`; this branch did not touch that file.
- The old `src/omen_gdpr.js` file still contains legacy delete wording, but `src/server.js` mounts `src/routes/userPrivacy.js` for `/api/user`.

## Evidence

- RED: `node --test test/accountDeletion.test.mjs` initially failed on missing `frontend/src/lib/accountDeletion.js`.
- GREEN focused: `node --test test/accountDeletion.test.mjs test/userPrivacyRoute.test.js` -> 4/4.
- Full: `npm test` -> 403/403.
- Build: `npm --prefix frontend run build` -> pass with existing warnings.
- Audit: `npm audit --audit-level=moderate` -> 0 vulnerabilities.
- Whitespace: `git diff --check` -> clean.
