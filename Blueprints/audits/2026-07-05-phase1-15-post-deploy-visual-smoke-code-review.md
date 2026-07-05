# Phase 1.15 Post-Deploy Visual Smoke - Code Review

Date: 2026-07-05
Reviewer: Codex self-review
Verdict: Mergeable after normal human review

## Findings

No P0/P1 findings found.

## Review Notes

- The deploy workflow change is additive and runs after the existing production health/logo bundle check and before log tailing.
- The new public-route smoke fetches `/`, `/about`, and `/login`, follows the real Vite bundle reference, and fails on the retired `[C]` placeholder, a missing horizontal lockup PNG reference, a missing transparent lockup reference, or the baked-black fallback.
- The workflow step is read-only against production during a normal deploy run. It does not mutate KVM1 state, secrets, DNS, SSL, Docker config, database state, or provider data.
- `Login.jsx` now uses the same transparent Omen horizontal lockup asset as the other public logo slots instead of text-only `OMEN`, closing the route-specific visual gap found by browser QA.
- `test/deployHardening.test.js` pins the workflow step ordering and regression checks; `test/loginBranding.test.js` pins the login brand asset and `alt="Omen"` contract.

## Non-Blocking Notes

- The deploy workflow smoke is bundle/static-route level, not a headless-browser CI visual test. Local Playwright evidence covers actual rendered logo images on `/`, `/about`, and `/login`.
- Current production `/login` remains text-only until this branch is merged and deployed.
- The transparent wordmark remains pale on light surfaces, matching the existing transparent asset limitation. This pass verifies no `[C]` placeholder and no baked-black rectangle.

## Evidence

- RED: `node --test test\deployHardening.test.js` failed before the workflow step existed.
- GREEN focused: `node --test test\deployHardening.test.js test\loginBranding.test.js` passed 5/5.
- Full: `npm test` passed 416/416.
- Build: `npm --prefix frontend run build` passed with existing warnings.
- Legacy client build: `npm --prefix client run build` passed.
- Audit: `npm audit --audit-level=moderate` found 0 vulnerabilities.
- Whitespace: `git diff --check` clean.
- Read-only production probe: `/`, `/about`, and `/login` route shells/bundles passed the logo-placeholder/fallback checks.
- Browser QA: screenshots and `qa-summary.json` under `output/playwright/phase1-15-post-deploy-visual-smoke/`.
