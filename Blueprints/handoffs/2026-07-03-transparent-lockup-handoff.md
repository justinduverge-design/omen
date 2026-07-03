# 2026-07-03 - Transparent horizontal lockup handoff

## Summary

Produced `omen-horizontal-lockup-transparent.png` and swapped the existing logo slots from the baked-black lockup to the transparent variant.

Branch: `frontend/transparent-lockup`

Base note: this branch is stacked on `frontend/logo-suite-swap` because `frontend/logo-suite-swap` exists locally and on origin, but is not yet in `origin/main`. The prior logo-suite handoff says the public PNGs match the canonical source assets; this branch used those public copies for source sampling/compositing because the stacked base does not yet carry the tracked `logos/` source directory.

## Files changed

- `logos/omen-horizontal-lockup-transparent.png`
- `frontend/public/omen-horizontal-lockup-transparent.png`
- `frontend/src/components/layout/Header.jsx`
- `frontend/src/pages/Landing.jsx`
- `frontend/src/pages/OmenLanding.jsx`

The existing baked-black `omen-horizontal-lockup.png` was not modified or deleted.

## Alpha-key approach

Emblem: **Approach A variant** — an edge-connected dark-background mask, implemented with `sharp` raw pixel access. The script flood-filled only dark pixels connected to the image edge and made those pixels transparent, preserving the shield's dark interior even though it is nearly the same color family as the outer background.

Wordmark: **Approach B** — simple dark-key alpha removal using a tight threshold. The wordmark has no shield-interior collision, so its counters can safely become transparent with the rest of the background.

Samples:

- Emblem outer background sample: `#070707`
- Emblem shield dark-interior sample: `#060505`
- Final preserved lower shield interior: `#050505 a=255`
- Final exterior gap: `a=0`
- Final first `O` counter: `a=0`

Composite:

- Tool: `sharp` (already installed; no dependency or package-file change)
- Output dimensions: `763 x 248`, matching the baked-black lockup canvas.
- Canonical and served PNG hashes match byte-for-byte.

## Reference swap

Updated only the image source strings:

- `Header.jsx`: main header and NavDrawer now use `/omen-horizontal-lockup-transparent.png`
- `Landing.jsx`: `OmenLogo` now uses `/omen-horizontal-lockup-transparent.png`
- `OmenLanding.jsx`: inline logo now uses `/omen-horizontal-lockup-transparent.png`

No layout, copy, route, package, env, API, auth, provider, SQL, or deploy behavior changed.

## Visual evidence

Local screenshots:

- `.Codex/skills/run-slops-saloon/screenshots/transparent-lockup/trade-header-light.png`
- `.Codex/skills/run-slops-saloon/screenshots/transparent-lockup/trade-header-dark.png`
- `.Codex/skills/run-slops-saloon/screenshots/transparent-lockup/trade-drawer-light.png`
- `.Codex/skills/run-slops-saloon/screenshots/transparent-lockup/landing-header-dark.png`
- `.Codex/skills/run-slops-saloon/screenshots/transparent-lockup/about-header-dark.png`
- `.Codex/skills/run-slops-saloon/screenshots/transparent-lockup/asset-light.png`
- `.Codex/skills/run-slops-saloon/screenshots/transparent-lockup/asset-dark.png`

Result:

- No visible black rectangle in light-theme `/trade` header.
- No visible black rectangle in light-theme NavDrawer.
- Dark header, landing header, and `/about` header render cleanly.
- Shield interior remains intact; no visible holes or ragged alpha cut.
- Wordmark counters are transparent.

Audit note: the wordmark remains the existing pale/bone asset, so it is softer on light chrome than on dark chrome. That is not an alpha artifact. If Justin wants stronger light-theme logo contrast later, that should be a dedicated light-mode lockup variant rather than a CSS background workaround.

## Verification

- `npm --prefix frontend run build` - PASS. Existing Vite chunk-size warning and `.env NODE_ENV` warning remain.
- `npm test` - PASS, 401/401.
- `npm audit --audit-level=moderate` - PASS, 0 vulnerabilities.
- `git diff --check` - PASS.
- Playwright/Chromium screenshot pass - PASS for `/trade` light/dark header, light drawer, `/` landing header, and `/about` header.
- Pixel/asset checks - PASS: output has alpha channel, transparent corners/gaps, transparent `O` counter, preserved shield interior, and matching canonical/public hashes.

## Self-review verdicts

`slops-code-review`: mergeable, no P0/P1. Diff is scoped to the two generated PNGs, three requested source-string swaps, and closeout docs. No dependency, API, auth, data, provider, env, package, SQL, or deploy surface changed.

`slops-ui-ux-audit`: no P0. The shield is presented raw with no CSS wrapper, circle, shadow, or container; the transparent lockup respects the brand-system §12 "shield is its own frame" rule. P2 follow-up only: consider a dedicated light-theme lockup variant if the pale wordmark needs stronger contrast on light app chrome.

## Skill receipt

- **Task:** transparent-background horizontal Omen lockup.
- **Change type:** frontend-visible asset swap + generated PNG asset.
- **Skills invoked:** `slops-repo-inspector`, `slops-git-flow`, `slops-quality-baseline`, `slops-code-review`, `slops-ui-ux-audit`, `playwright`, `run-slops-saloon`.
- **Conditional skills considered but not applicable:** `slops-image-prompt` (explicitly prohibited; no AI image generation), `slops-tdd` (no behavior contract or deterministic unit seam changed), `security-privacy-evidence` (no trust boundary, user data, credentials, auth, provider, telemetry, or retention change), `slops-ship` (explicitly out of scope; deploy is Justin's gate), `slops-mobile-smoke` (not needed for this narrow header asset pass; browser screenshots covered the affected public slots).
- **Evidence:** this handoff; screenshots listed above; build/test/audit/diff checks above.
- **Procedure gap found:** `frontend/logo-suite-swap` has the served public logo files but not the tracked canonical `logos/` source directory, while `frontend/phase1-13-mobile-qa-sweep` has `logos/` but not the logo-suite source swaps. This branch stayed stacked on logo-suite-swap and created only the new transparent canonical asset under `logos/`.

## Recommendation

Keep the baked-black `omen-horizontal-lockup.png` as a fallback until the logo-suite and transparent-lockup branches are merged and visually checked together on the final target branch. After that, retire or archive the baked-black app-UI references; do not delete favicon/app-icon black-background assets.
