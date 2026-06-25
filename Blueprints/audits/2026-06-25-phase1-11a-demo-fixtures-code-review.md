# Phase 1.11A Demo Fixtures Review

**Date:** 2026-06-25
**Scope:** private frontend fixtures for Omen, Ledger, and Draft Assistant
**Verdict:** merge

## Findings

No P0/P1/P2 findings.

## Review Notes

- `frontend/src/lib/privateFixtureMode.js` resolves only the allowlisted `omen-roster`, `previous-results`, and `mock-draft` keys, and only when `import.meta.env.DEV` is true.
- Routed pages use dev-only dynamic imports for `frontend/src/data/privateDemoFixtures.js`; the production build does not ship the private fixture payload.
- Fixtures are labeled as mock with `mode: "mock"`, `is_mock: true`, `is_demo: false`, and `is_live: false`.
- No public `/demo` or mock-draft route was added; public Demo Mode remains the backend `omen-demo.v1` contract.
- `MoveHistory` now treats explicit mock fixtures as mock even when populated, so Ledger fixture rows cannot enable live moment chrome.

## UX Copy Check

- Final banner pattern is direct and honest: private fixture label first, then the surface-specific statement that data is mock.
- No copy claims live personalization, real roster state, provider-backed ADP, or final fantasy advice for the private fixtures.
- `/draft` keeps the existing Preview Mode banner outside fixture mode because the reachable recommendation path still returns mock recommendations.

## Verification

- RED: `node --test test/phase1_11aPrivateFixtures.test.mjs` failed before implementation with `ERR_MODULE_NOT_FOUND` for `privateDemoFixtures.js`.
- GREEN: `node --test test/phase1_11aPrivateFixtures.test.mjs` passed 3/3.
- Focused nearby contracts: `node --test test/phase1_11aPrivateFixtures.test.mjs test/draftAssistant.test.js test/movesRoute.test.js test/demoMode.test.js` passed 15/15.
- Full suite: `npm test` passed 374/374.
- Frontend build: `npm --prefix frontend run build` passed.
- Audit: `npm audit --audit-level=moderate` found 0 vulnerabilities.
- Runtime smoke: dev `/draft?fixture=mock-draft` renders the fixture; production preview ignores the same query; `/omen` and `/ledger` fixture URLs remain behind auth.
- Mobile spot-check: `/draft?fixture=mock-draft` at 375, 390, and 430px had no JS errors, no horizontal overflow, and visible fixture labeling.
- Diff hygiene: `git diff --check` clean before closeout edits.

## Residual Risk

- Protected `/omen` and `/ledger` fixture render states were not browser-rendered without a valid auth session; source tests and route-gate smoke cover the public/private boundary.
- Full iOS Safari device QA remains Phase 1.13.
