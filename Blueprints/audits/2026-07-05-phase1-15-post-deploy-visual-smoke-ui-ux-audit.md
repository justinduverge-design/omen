# Phase 1.15 Post-Deploy Visual Smoke - UI/UX Audit

Date: 2026-07-05
Auditor: Codex self-administered `slops-ui-ux-audit`
Verdict: No P0/P1 found

## Accuracy

- `/`, `/about`, and `/login` render an Omen horizontal lockup image in the tested local build.
- The image source is `/omen-horizontal-lockup-transparent.png` on all three routes.
- The retired `[C]` placeholder is absent from the checked route HTML.
- The login page no longer presents the product mark as plain `OMEN` text while the other public routes use the image lockup.

## Accessibility

- The login brand image has `alt="Omen"`.
- No new interactive control was introduced.
- The public routes were checked at a mobile light-theme viewport without horizontal overflow in the captured state.
- The sign-in actions and existing login form remain unchanged by this pass.

## Aesthetic Integrity

- The login brand mark now matches the rest of the public Omen logo treatment.
- The transparent PNG removes the baked-black rectangle regression on light surfaces.
- The "Fantasy Intelligence" label remains below the lockup and uses the existing tokenized typography/color treatment.
- No raw hex literals or new decorative palette were added.

## Browser Evidence

Local Vite + Playwright evidence:

- `output/playwright/phase1-15-post-deploy-visual-smoke/home-light-mobile.png`
- `output/playwright/phase1-15-post-deploy-visual-smoke/about-light-mobile.png`
- `output/playwright/phase1-15-post-deploy-visual-smoke/login-light-mobile.png`
- `output/playwright/phase1-15-post-deploy-visual-smoke/qa-summary.json`

Summary from `qa-summary.json`:

- `/`: one transparent lockup image, rendered 148x48, dark opaque corner pixels 0.
- `/about`: one transparent lockup image, rendered 111x36, dark opaque corner pixels 0.
- `/login`: one transparent lockup image, rendered 148x48, dark opaque corner pixels 0.

## Residual Risks

- The browser evidence is local against this branch, not production after deploy.
- The deploy workflow step does not inspect rendered pixels in CI; it enforces static/bundle regressions and relies on local browser QA for rendered evidence.
- The transparent wordmark is still low-contrast on light surfaces because the source asset is pale. That is a future asset choice, not a black-rectangle defect.
