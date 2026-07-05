# Phase 2.11 Signal-Honesty Labels Handoff

Date: 2026-07-05
Branch: `codex/phase2-11-signal-honesty-labels`
Status: Complete locally; not pushed, merged, deployed, or production-smoked.

## What Changed

- Added `frontend/src/lib/omenSignalLabels.js` for Omen signal status metadata, badge styles, and readable signal-key labels.
- Updated `frontend/src/pages/OmenOfTheWeek.jsx` so the shared recommendation view shows an `Input honesty` section for backend `signals`.
- Signal statuses now render as Live, Stub, Mock, or Unavailable with matching data-source tokens and text cues: Used, Limited, Preview, or Not used.
- Backend/public Demo Mode `status: "demo"` signals display as Mock / preview so sample inputs are never presented as live.
- Added focused coverage in `test/omenSignalLabels.test.mjs`.

## Contracts

- No endpoint contract changed.
- Existing `signals` data from the Omen recommendation envelope is consumed as-is.
- No backend route, schema, auth, provider, Supabase, SQL, package, env, deploy, or production infrastructure surface changed.

## Verification

- RED: `node --test test\omenSignalLabels.test.mjs` failed before the helper existed.
- GREEN: `node --test test\omenSignalLabels.test.mjs` passed 2/2.
- Full suite: `npm test` passed 418/418.
- Frontend build: `npm --prefix frontend run build` passed with existing warnings (`NODE_ENV=production` in `.env`, duplicate `Header.jsx` `className`, Vite chunk-size warning).
- Root audit: `npm audit --audit-level=moderate` returned 0 vulnerabilities.
- Diff hygiene: `git diff --check` clean.
- Browser smoke: local Vite + Playwright rendered public `/demo` with a locally fulfilled `GET /api/demo` response from `buildDemoModeResponse(new Date('2026-09-08T12:00:00Z'))`; screenshot/body/summary are under `output/playwright/phase2-11-signal-honesty-labels/`.

## Review

- Code review: `Blueprints/audits/2026-07-05-phase2-11-signal-honesty-labels-code-review.md` — mergeable, no P0/P1.
- UI/UX audit: `Blueprints/audits/2026-07-05-phase2-11-signal-honesty-labels-ui-ux-audit.md` — ready, no P0/P1.
- Security/privacy review was considered N/A as a full gate: no auth, credential, data classification, retention, telemetry, external sharing, SQL, secret, dependency, logging, or provider boundary changed.

## Known Gaps

- Protected `/omen?fixture=omen-roster` redirected to `/login` in this local session, so the browser smoke used public `/demo`, which shares the same `OmenRecommendationView`.
- Light-mode screenshot was not captured; dark mobile render was captured and the badge styling is token-backed.
- Shared app chrome logged a dev-only `/api/dashboard/summary` 500 because Vite was running without the backend proxy. The target `/api/demo` response was fulfilled locally and the recommendation panel rendered correctly.

## Next Backend Step

None required for this phase. The next inbox build is Phase 2.12 — Trade Analyzer form redesign.
