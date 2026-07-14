# Code Review — Phase 4.20b Public Legal and Support Pages

## Verdict

**Merge.** No P0 or P1 findings.

## Review

- All four routes are public and add no API call, credential input, or trust-boundary behavior.
- `/delete-account` links to the existing authenticated flow rather than creating a second deletion implementation.
- Privacy/deletion copy matches `src/routes/userPrivacy.js`, including the limited hashed audit-record exception.
- Provider attribution, credential handling, no-guarantee language, and no-betting language preserve the Phase 4.16 caveats.
- Footer links meet the 44px touch-target threshold after the mobile finding was corrected.
- Focused tests cover the routes, footer links, and approved contact channels.

## Evidence

- `node --test test/publicLegalPages.test.mjs` — 3/3 pass.
- `npm test` — 391/391 pass.
- `npm audit --audit-level=moderate` — 0 vulnerabilities.
- `npm --prefix frontend run build` — pass.
- `git diff --check` — clean.

## Existing Warnings Outside Scope

- Duplicate `className` prop in `Header.jsx`.
- Existing bundle-size and `.env` `NODE_ENV=production` warnings.
