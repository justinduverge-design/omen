# 2026-07-05 - Phase 1.15 post-deploy visual smoke

## Summary

Completed Phase 1.15 locally on branch `codex/phase1-15-post-deploy-visual-smoke` in isolated worktree `C:\Users\JDuve\dev\SLOPS\.codex-worktrees\omen-phase1-15-post-deploy-smoke`.

Added an additive post-health deploy workflow smoke for the public logo routes and fixed the route-specific `/login` brand gap that the browser probe exposed. `/login` now uses the transparent Omen horizontal lockup image instead of text-only `OMEN`.

No deploy, push, PR, merge, workflow replay, KVM1 mutation, secret access, package edit, DNS/SSL change, Docker config change, database change, or production config change was performed in this session.

## Files Changed

- `.github/workflows/deploy.yml`
- `frontend/src/pages/Login.jsx`
- `test/deployHardening.test.js`
- `test/loginBranding.test.js`
- `Blueprints/audits/2026-07-05-phase1-15-post-deploy-visual-smoke-code-review.md`
- `Blueprints/audits/2026-07-05-phase1-15-post-deploy-visual-smoke-ui-ux-audit.md`
- `Blueprints/handoffs/2026-07-05-phase1-15-post-deploy-visual-smoke.md`
- `Direction/current_sprint.md`
- `Direction/agent_inbox.md`
- `Direction/decision_log.md`
- `Direction/sprints_completed.md`
- `Blueprints/done/LEDGER.md`
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/specs/page-system.md`
- `output/playwright/phase1-15-post-deploy-visual-smoke/`

## Workflow Change

Added `slops-canary public-route visual smoke` after `Verify deployed Omen logo asset in SPA bundle` and before server log tailing.

The new step:

- Fetches `https://slopssaloon.com/`, `/about`, and `/login`.
- Fails if route HTML contains `[C]`.
- Extracts the route's hashed Vite bundle.
- Fails if the bundle contains `[C]`.
- Fails if the bundle lacks an `omen-horizontal-lockup*.png` reference.
- Fails if the bundle lacks `omen-horizontal-lockup-transparent.png`.
- Fails if the bundle still references the baked-black `omen-horizontal-lockup.png` fallback.

This follows the actual Vite serving shape. The logo reference lives in the JS bundle, not in the static HTML shell.

## UI Change

Browser QA against current production showed `/` and `/about` had the transparent logo image, but `/login` was still text-only.

`frontend/src/pages/Login.jsx` now renders:

- `src="/omen-horizontal-lockup-transparent.png"`
- `alt="Omen"`
- existing "Fantasy Intelligence" label below it

The sign-in form, OAuth buttons, email flow, and deletion-complete notice behavior were not changed.

## Verification

- RED deploy-hardening focused test: failed before the workflow step existed.
- RED login branding focused test: failed before the login logo image existed.
- GREEN focused: `node --test test\deployHardening.test.js test\loginBranding.test.js` passed 5/5.
- GREEN full: `npm test` passed 416/416.
- GREEN frontend build: `npm --prefix frontend run build` passed with existing warnings:
  - duplicate `className` warning in `frontend/src/components/layout/Header.jsx`
  - Vite chunk-size warning
- GREEN root audit: `npm audit --audit-level=moderate` found 0 vulnerabilities.
- GREEN legacy client build: `npm --prefix client run build` passed.
- GREEN diff: `git diff --check` clean.
- Read-only production route smoke passed for `/`, `/about`, and `/login` at the route/bundle level.
- Local browser QA passed for `/`, `/about`, and `/login` at mobile light viewport with transparent lockup images and `darkOpaqueCorners: 0`.

Evidence files:

- `output/playwright/phase1-15-post-deploy-visual-smoke/home-light-mobile.png`
- `output/playwright/phase1-15-post-deploy-visual-smoke/about-light-mobile.png`
- `output/playwright/phase1-15-post-deploy-visual-smoke/login-light-mobile.png`
- `output/playwright/phase1-15-post-deploy-visual-smoke/qa-summary.json`

## Done Notes

Release Done applied as deploy-pipeline hardening, not as a production release.

- Deploy gate N/A: no deploy was performed.
- KVM1 disk/memory N/A: no live release action happened.
- Sentry/Tier-2 authenticated smoke N/A: no authenticated runtime path changed.
- `slops-ship` N/A: no merge or deploy requested.
- Rollback: revert the workflow/test/login-branding commit before the next deploy if the check proves too strict.

Page/Design Done applied because `/login` has a user-visible brand mark change.

- Public-route mobile light screenshots captured for `/`, `/about`, and `/login`.
- Dark-mode screenshots were not captured in this pass because the regression was the light-theme baked-black rectangle and the task targeted public prod route logo visibility; the existing transparent-lockup pass already covered dark/light logo slots for the shared asset. Logged honestly as a skipped gate.

## Skill Receipt

Task: Phase 1.15 - Post-deploy visual smoke on prod.

Change type: deploy workflow hardening + narrow public login UI repair.

Skills invoked:

- `slops-repo-inspector`
- `slops-deploy-guard`
- `slops-git-flow`
- `slops-canary`
- `slops-quality-baseline`
- `slops-code-review`
- `slops-tdd`
- `playwright`
- `run-slops-saloon`
- `slops-investigate`
- `slops-context-markdown`
- `slops-ui-ux-audit`

Conditional skills considered but not applicable:

- `security-privacy-evidence`: no auth, data, secrets, provider credentials, telemetry, retention, external sharing, SQL, package, or logging boundary changed.
- `slops-ship`: no merge or deploy requested/performed.
- `slops-ux-copy`: no user-facing copy changed.
- `slops-taste`: no broader visual redesign; only an existing brand asset slot was aligned.

## Next

After this branch lands, the next normal deploy will run the public-route smoke. Current production `/login` remains text-only until that deploy happens.
