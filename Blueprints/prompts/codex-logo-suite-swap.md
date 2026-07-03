# Codex Prompt — Logo Suite Swap

**Owner:** Codex (execution) / Justin (merge)
**Date drafted:** 2026-07-03
**Branch:** `frontend/logo-suite-swap`
**Scope:** single PR, single scoped change — logo assets + logo slots only

---

## Why

Two doctrine documents landed 2026-07-03. Both bind this work:

1. `slops-saloon/Direction/decisions/slops-saloon-fan-experience-doctrine-v1.md` — Look Good — Play Good. The shield is its own frame. Presence of identity, not decoration of identity.
2. `slops-saloon/omen/Brand/brand-system.md` §12 Logo Usage — asset inventory, framing rule (no circles), wordmark-is-asset rule, build-serve requirement.

The `[C]`-in-1px-border-circle placeholder in `Header.jsx` + `NavDrawer` and the `rounded-full` + gold-border + gold-glow circular wrapper around the shield emblem in `Landing.jsx` + `OmenLanding.jsx` both violate the "shield is its own frame" rule and both predate the actual logo suite shipping. Fix in one PR.

The canonical asset suite lives at `slops-saloon/omen/logos/` (13 files). The build serves from `slops-saloon/omen/frontend/public/`. Right now only the emblem + favicons are wired to the build path; the horizontal lockup, standalone wordmark, and app icon are missing from `public/`.

---

## Scope (locked)

### 1. Copy assets from canonical to build-served

Copy these files from `slops-saloon/omen/logos/` → `slops-saloon/omen/frontend/public/`, preserving filenames byte-for-byte:

- `omen-horizontal-lockup.png`
- `omen-standalone-wordmark.png`
- `omen-favicon-48.png`
- `omen-favicon-64.png`
- `omen-favicon-app-icon.png`

**Do not copy** (doctrine reference only, per §12.1):

- `omen-full-brand-board.png`
- `omen-png-preview-sheet.png`

**Do not touch** the existing files already in `public/` (`omen-primary-emblem.png`, `omen-favicon-{16,32,180,256,512}.png`) — they are unchanged.

### 2. `frontend/src/components/layout/Header.jsx` — main site header

Located at lines 329–352 (as of `HEAD` at prompt draft time; verify).

**Replace** the current logo slot — a `<Link to="/">` wrapping (a) a 28×28 `rounded-full` bordered `<div>` containing a text `"C"` and (b) a separate `<span>` rendering `"Omen"` in Alegreya Sans uppercase with `tracking-[0.34em]` — with:

- Same `<Link to="/">` wrapper, same focus-visible ring, same 44px minimum touch target
- Single `<img src="/omen-horizontal-lockup.png" alt="Omen" />` inside
- Height: 32px (`h-8`), width auto. Preserve the lockup's native aspect ratio. Do not mask, do not frame, do not wrap in any bordered / rounded / glowing container.
- Retain the `min-h-[44px]` on the parent `<Link>` for touch-target compliance (per Phase 1.13 a11y work).

### 3. `frontend/src/components/layout/Header.jsx` — NavDrawer

Located at lines 180–199 (as of `HEAD` at prompt draft time; verify).

**Replace** the `[C]`-in-circle-plus-text-`"Omen"` combo at the drawer header with:

- Single `<img src="/omen-horizontal-lockup.png" alt="Omen" />` inside the existing `flex items-center gap-2.5` parent (drop the `gap` since it's now one element)
- Height: 28px (`h-7`), width auto. Same framing rule as above — no wrapper, no border, no glow.
- Retain the existing `borderBottom` on the drawer-header row.

### 4. `frontend/src/pages/Landing.jsx` — `OmenLogo` component

Located at approximately lines 21–29.

**Replace** the entire `OmenLogo` component body — currently a `flex` container with (a) a 48×48 `rounded-full` container with a gold border + gold glow shadow wrapping the emblem PNG cropped with `object-cover`, and (b) a separate `<span>` rendering `"OMEN"` in Alegreya Sans uppercase — with:

- Single `<img src="/omen-horizontal-lockup.png" alt="Omen" />`
- Height: 48px (`h-12`), width auto. No wrapper, no border, no shadow, no glow.
- The component's caller sites (the Landing header + hero) should now render one clean lockup where they previously rendered a circle-framed emblem next to a text wordmark.

### 5. `frontend/src/pages/OmenLanding.jsx` — inline logo block

Located at approximately lines 8–15.

**Replace** the inline logo `<div>` — currently a `flex` container with (a) a 36×36 `rounded-full` container with a gold border + gold glow shadow wrapping the emblem PNG cropped with `object-cover`, and (b) a separate `<span>` rendering `"OMEN"` — with:

- Single `<img src="/omen-horizontal-lockup.png" alt="Omen" />`
- Height: 36px (`h-9`), width auto. No wrapper, no border, no shadow, no glow.

### 6. `frontend/index.html` and `frontend/public/manifest.webmanifest`

Verify the `apple-touch-icon` slot references the correct 180 favicon and no other head tags are stale.
Confirm the manifest's install icon set is either unchanged (if the existing 256/512 maskables are correct) or extended to reference `omen-favicon-app-icon.png` for the rounded-square install-icon slot — **whichever preserves current PWA behavior.** Do not change PWA start-URL, scope, orientation, theme_color, or background_color.

---

## Out of scope (do not touch this PR)

- Any component outside the five logo slots above (`Header`, `NavDrawer`, `Landing`, `OmenLanding`)
- The team-color / appearance / colorway system (separate spec forthcoming)
- The catchphrase / chant / fan-copy system (separate spec forthcoming)
- Any Trade Analyzer, Omen, Draft, Standings, Dashboard, Football, Account page beyond the incidental Header-rendered logo change
- The stale `omen-ux-ui-design-system-v1.md` spec reconciliation (separate task)
- The zero-byte `omen/logos/omen-favicon-16.png` file lock (Windows FS issue, not a code issue)
- Any refactor to `platformChipStyle`, `positionChipStyle`, `metallicTierStyle`, `confidenceGradient`, or any other Phase 1.x helper
- SVG-ification of the PNG assets (worth doing later, not this PR)

---

## Acceptance criteria

1. All five files copied to `frontend/public/` and referenceable at their `/` paths at runtime.
2. `[C]`-in-circle placeholder gone from Header + NavDrawer. Horizontal lockup renders in both slots.
3. Circular emblem wrapper gone from Landing.jsx + OmenLanding.jsx. Horizontal lockup renders in both slots.
4. No component outside the five logo slots is changed.
5. No new dependencies added. No `package.json` / `package-lock.json` edits.
6. `Header` still meets the 44px minimum touch-target rule (Phase 1.13 a11y).
7. `alt="Omen"` set correctly on every `<img>` for screen readers.
8. Both `data-theme="dark"` and `data-theme="light"` render the lockup correctly — the horizontal lockup PNG has a dark-only background baked in, so the lockup should render cleanly on any current theme surface. If light-theme rendering shows the black lockup background as a visible rectangle, flag as a P1 in the End of Task Report — **do not** attempt to hack around it with CSS blend modes; a background-transparent lockup is a design-asset production item, not a code fix.

---

## Verification

Run (from repo root, `slops-saloon/omen/`):

```bash
npm --prefix frontend run build
npm test
npm audit --audit-level=moderate
git diff --check
```

Then:

- Dev-server visual check on `/` (Landing), `/about` (OmenLanding if that routes there — confirm), and `/login` if reachable. Authenticated routes (`/football`, `/omen`, `/ledger`, `/account`, `/standings`) cannot be verified in the sandbox per the recurring Supabase `getSession()` limitation documented in Phase 1.5d / 1.7 / 1.8 handoffs — hand a manual real-device checklist to Justin.
- Mobile-viewport check at 375 / 390 / 430 px on the unauth routes: confirm the horizontal lockup does not overflow or wrap.

---

## Guardrails / skills

- **`slops-code-review`** — self-administered pre-merge review. Merge verdict required; no P0 / P1 findings.
- **`slops-ui-ux-audit`** — verify the raw lockup framing, alt text, focus rings.
- **`ui-ux-pro-max`** — design-intelligence sanity check (the "shield is its own frame" doctrine explicitly names this skill's default authority).
- **`slops-mobile-smoke`** — proposal-only per its own SKILL.md; substitute manual mobile-viewport check as prior phases have.
- **`slops-ship`** — do NOT invoke this PR — deploy is Justin's gate. Push the branch after verification, do not merge.

---

## Skill receipt template (fill in on completion)

- **Task:** Logo suite swap — horizontal lockup replaces `[C]` placeholder + circular emblem wrappers.
- **Change type:** frontend user-visible behavior (asset + slot swap); asset files added to `public/`.
- **Skills invoked:** …
- **Conditional skills considered but not applicable:** `slops-tdd` (asset-swap, no testable behavior contract); `security-privacy-evidence` (no trust boundary or credential change); `demo-mode-pre-empty-state` (no fixture change).
- **Evidence:** build/test/audit results, diff-check, visual checks, self-review verdict.
- **Procedure gap found:** …

---

## Handoff back

Write the completion handoff to `slops-saloon/omen/Blueprints/handoffs/2026-07-0X-logo-suite-swap-handoff.md` using the standard template. Include: files changed, behavior before / after, verification results, any P1 / P2 flagged, and whether the light-theme lockup rendering needed a follow-up asset production pass (see acceptance criterion 8).