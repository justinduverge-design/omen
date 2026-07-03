# Codex Prompt — Transparent-Background Horizontal Lockup

**Owner:** Codex (execution) / Justin (merge)
**Date drafted:** 2026-07-03
**Branch:** `frontend/transparent-lockup`
**Scope:** single PR, single scoped change — produce a transparent-background horizontal lockup asset and swap references.
**Prerequisite:** the `frontend/logo-suite-swap` PR has landed (merged or at least visible on `main`). The `frontend/phase1-13-discrete-fixes` PR either landed or has no `Header.jsx` / `Landing.jsx` collisions (it shouldn't — Phase 1.13 discrete fixes only touches `nflTeams.js`, `Appearance.jsx`, `AppearancePicker.jsx`, `tailwind.config.*`, and any single font-audit fix component).

---

## Why

The current `omen-horizontal-lockup.png` (`slops-saloon/omen/logos/` and `omen/frontend/public/`) has a baked-in solid black background. In light-theme app chrome, that black background renders as a visible rectangle. Codex correctly flagged this as an asset-production follow-up rather than CSS-hacking it during the logo-suite-swap PR (`bab6b1a`).

We do NOT have the design source file. What we DO have:

- `omen/logos/omen-primary-emblem.png` — the shield emblem, on a solid black background.
- `omen/logos/omen-standalone-wordmark.png` — the bespoke OMEN wordmark, on a solid black background.

The task is to composite these two existing assets into a single horizontal-lockup PNG with a **transparent background**, matching the visual proportions of the current baked-black lockup.

---

## Approach

### Step 1 — Alpha-key the emblem

The emblem is a shield with a gold border, verdigris-green wings, a white football, and a small crimson tip — all on a solid black outer background. **Critical:** the shield's interior background is also near-black (charcoal `#0A0A0B` or similar). A naive `black → transparent` alpha-key will punch through the shield's interior, destroying the design.

Two viable approaches:

**A. Bounding-mask approach (safer, requires more code).**

1. Compute a bounding polygon around the visible shield using edge detection (Canny with tight thresholds on the gold border). Sharp's operations or an OpenCV pass via `opencv4nodejs` handles this — or use `sharp` + a manual mask if edge detection is unreliable.
2. Alpha-key `black → transparent` **only outside the bounding polygon.**
3. The shield's interior black stays intact because it's inside the mask.

**B. Chroma-tolerance approach (simpler, riskier).**

1. Alpha-key with a very tight tolerance — only pixels where `R === 0 && G === 0 && B === 0` become transparent.
2. Because the emblem's black background is typically pure `#000000` in the source PNG (baked flat), and the shield's interior is `#0A0A0B` or `#141414` (charcoal), the tight tolerance may preserve the shield.
3. **Verify against the actual PNG** — sample the exact hex of the outer background vs. the shield interior with a color picker before deciding tolerance. If they're identical, approach A is required.

**Try approach B first.** If it produces holes in the shield, fall back to approach A. Report which was used in the handoff.

### Step 2 — Alpha-key the wordmark

The wordmark is bone-white `#F5F0E8` letters on a solid black `#000000` background. No interior-near-black-collision risk. A simple `black → transparent` alpha-key with generous tolerance works cleanly.

### Step 3 — Composite

1. Place the alpha-keyed emblem on the left.
2. Place the alpha-keyed wordmark to its right, vertically centered on the emblem's center-Y.
3. Use a horizontal gap between emblem and wordmark that matches the ratio in the current `omen-horizontal-lockup.png` — measure the pixel gap on the current lockup and preserve it proportionally.
4. Output canvas: transparent background, dimensions matching the current lockup's aspect ratio.
5. Save as `omen-horizontal-lockup-transparent.png`.

### Step 4 — Write to both locations

- Canonical: `slops-saloon/omen/logos/omen-horizontal-lockup-transparent.png`
- Build-served: `slops-saloon/omen/frontend/public/omen-horizontal-lockup-transparent.png`

Do NOT delete or modify the existing baked-black `omen-horizontal-lockup.png` — leave it as a fallback for now; retirement of that file is a follow-up decision.

### Step 5 — Swap the references

Update these files to reference `omen-horizontal-lockup-transparent.png` instead of `omen-horizontal-lockup.png`:

- `frontend/src/components/layout/Header.jsx` (both the main header and the NavDrawer top)
- `frontend/src/pages/Landing.jsx` (the `OmenLogo` component)
- `frontend/src/pages/OmenLanding.jsx` (the inline logo block)

**No other changes** to these files. The image src swap is the only diff.

---

## Tool suggestions

- **sharp** (Node) — install as a devDependency; supports alpha extraction, compositing, resizing.
- **Jimp** (pure JS) — no native deps, slower but simpler.
- **ImageMagick** — CLI, if available on the runner. `convert emblem.png -fuzz 5% -transparent black emblem-t.png` is the two-line version.

Prefer **sharp** for the composite step (it handles alpha correctly and is deterministic). Prefer **ImageMagick** for the alpha-key step (its `-fuzz` parameter maps directly onto the chroma-tolerance approach).

**If Node/imagemagick are unavailable in the CI environment**, fall back to a one-time script authored locally that Justin runs, committing only the resulting PNGs. Document this fallback path in the handoff.

---

## Out of scope

- Restyling anything else in Header / Landing / OmenLanding.
- Removing the baked-black `omen-horizontal-lockup.png` file — leave both variants for now.
- Producing a transparent-background *standalone wordmark* PNG (`omen-standalone-wordmark.png` currently only appears in doctrine, not in the app UI — no light-theme rectangle bug there yet).
- Producing a transparent-background *emblem* PNG for standalone use — same reason.
- SVG-ifying any of the assets. Real SVG production is a future design-source-file task.
- Any change to `omen-favicon-*.png` or `omen-favicon-app-icon.png` — those live in OS-owned rounded-square badges where the black background is correct.

---

## Acceptance criteria

1. `omen-horizontal-lockup-transparent.png` exists at both `omen/logos/` and `omen/frontend/public/`.
2. The transparent lockup renders cleanly on both `data-theme="dark"` and `data-theme="light"` — no visible rectangle around the mark on either theme. Verify with a Playwright screenshot in both themes at the Header slot on a public route (Landing or `/login`).
3. The shield's interior is intact — no visible holes, no ragged edges, no visible alpha halo around the shield's gold border.
4. The wordmark's letter interiors (the counters of O, M, N) are correctly transparent — no black fills inside them.
5. Header.jsx, Landing.jsx, OmenLanding.jsx now reference the transparent variant.
6. Build clean, tests pass, audit clean, diff whitespace check clean.
7. **If the alpha-key produces visible artifacts on either the shield or the wordmark**, do NOT ship — report as a P1 needing a human-drawn mask asset instead. Better a known gap than a broken lockup.

---

## Verification

```bash
npm --prefix frontend run build
npm test
npm audit --audit-level=moderate
git diff --check
```

Playwright:

- Screenshot Landing header at `data-theme="dark"` — no rectangle around lockup.
- Screenshot Landing header at `data-theme="light"` — no rectangle around lockup.
- Both screenshots attached to the handoff.

If Playwright's theme-switching isn't available in the current test setup, capture screenshots via the dev server manually and attach.

---

## Guardrails / skills

- `slops-code-review` — self-administered pre-merge review; merge verdict required.
- `slops-ui-ux-audit` — verify the transparent lockup respects the shield-is-its-own-frame rule (per `brand-system.md` §12).
- **Do NOT invoke `slops-image-prompt`** for this task — we're compositing existing assets, not generating new ones. If the composite fails, fall back to reporting the failure rather than AI-generating a replacement.
- `slops-ship` — do NOT invoke; deploy is Justin's gate.

---

## Handoff back

Write to `slops-saloon/omen/Blueprints/handoffs/2026-07-0X-transparent-lockup-handoff.md`:

- Which alpha-key approach was used (A or B).
- Emblem outer-background hex vs. shield-interior hex (color-picker sample).
- Composite tool used (sharp vs. Jimp vs. ImageMagick).
- Screenshots dark + light.
- Any P1 flagged (shield artifacts, wordmark counter fills, etc.).
- Whether the baked-black `omen-horizontal-lockup.png` should be retired now that the transparent variant works, or kept as a fallback.

---

## Fallback plan if this PR fails

If Codex reports "alpha-key artifacts on shield / wordmark counters that can't be cleaned automatically," the fallback is a **human-drawn mask asset**:

1. Justin opens `omen-primary-emblem.png` in Photopea (free, browser-based, no install) or GIMP.
2. Uses the magic wand or select-by-color tool to select the outer black background.
3. Feathers the selection by 1–2px.
4. Deletes the selection, leaving transparency around the shield.
5. Exports as `omen-primary-emblem-transparent.png`.
6. Repeats for the wordmark.
7. Drops both files in `omen/logos/` and `omen/frontend/public/`.

Then a follow-up Codex prompt composites the two human-masked files on transparent background — much simpler because the tricky part (the shield's interior boundary) is human-decided instead of algorithm-decided.

The fallback path adds ~15 minutes of Justin's time via Photopea and one clean Codex composite pass, vs. multiple rounds of tuning `-fuzz` values.