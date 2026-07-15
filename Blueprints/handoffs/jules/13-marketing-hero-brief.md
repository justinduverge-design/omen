# Jules brief — 13 · MarketingHero

**Queue position:** 13 of 13
**Depends on:** none
**Status:** Ready whenever — **this brief is not blocking and not blocked.** It is useful for public-page migration (Landing, `/about`) but the primitive/component foundation (briefs 01–08, 12) does not need it and should not wait for it. Justin/Claude may deprioritize this brief indefinitely without stalling the rest of the queue.
**⚠ Page-touching brief (if Phase B is done):** Phase B touches `Landing.jsx`, one of the five hot files. **Do not run Phase B in parallel with brief 01's Phase B** (the only other brief in the queue that also touches `Landing.jsx`) — sequence after 01-B merges, since `Landing.jsx`'s `asChild`/Sign-in-link pattern from brief 01 should land first.

---

## Objective

Build `MarketingHero`, the distinct marketing-page hero shape referenced by both `omen-ui-north-star-v1.md` §4 and `component-lock-v1.md` §5 ("Marketing pages use `<MarketingHero>` — different shape — see Landing") but never actually specified in detail in either doc. This brief exists to close that gap, not because a page migration is currently urgent.

## Required reading (in order)

1. `Blueprints/specs/design/omen-ui-north-star-v1.md` §4, §11 (P1 backlog item)
2. `Blueprints/specs/design/README.md`
3. `Blueprints/specs/design/legacy-doc-suppression-banners.md`
4. `Blueprints/specs/design/component-lock-v1.md` §5 (type scale — `display` role: Cinzel serif, 48/56, 700, "Marketing hero only (Landing) — one per page max"; also the Landing-hero-glitch note, tracked as a separate bug, not this brief's concern)
5. `Blueprints/backlog/ui-component-system.md` P1 (`MarketingHero` listed as priority P1)
6. `Blueprints/handoffs/jules/jules-04-pagehero.md` — read for context on how `PageHero` (the product-page sibling) was scoped and for the font-stack discrepancy note (Cinzel/Inter table vs. live Alegreya Sans) already flagged there; the same discrepancy applies here and should not be re-litigated independently.
7. Current `frontend/src/pages/Landing.jsx` hero section in full (top of file through the `Header`/hero region) — this is the only real-world reference for what `MarketingHero`'s shape needs to cover, since no other doc specifies it precisely.

## Allowed files

**Phase A:**
- `frontend/src/components/ui/MarketingHero.jsx` (new)
- `frontend/src/components/ui/index.js` (extend barrel)

**Phase B (optional, may be deferred to a separate future PR entirely — see note below):**
- `frontend/src/pages/Landing.jsx`

**Both:**
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/` (new dated handoff)

**Note on Phase B being optional:** Because this brief is explicitly non-blocking, Jules (or whoever picks this up) may choose to ship Phase A alone and leave Landing's migration for a later, separately-scoped PR. If Phase B is included, it must still follow the standard hot-file serialization rule below.

## Forbidden files

- `frontend/src/index.css`, `frontend/tailwind.config.js`, `frontend/package.json` / lockfile — no font-stack changes (see discrepancy note; do not resolve Cinzel/Inter vs. Alegreya Sans in this PR, same constraint as brief 04).
- `frontend/src/components/ui/PageHero.jsx` — `MarketingHero` is a sibling, not a variant of `PageHero`; do not merge them into one component or make one wrap the other unless a future doc explicitly calls for that.
- Any file under `Blueprints/specs/design/` or `Blueprints/backlog/ui-component-system.md`.
- Any page other than `Landing.jsx` — in particular, do not touch `/about` or the public Trade Analyzer demo surfaces in this brief even though `ui-component-system.md` P2.1 eventually wants `MarketingHero` there too; that's page-migration (P2) scope, not primitive (P0/P1) scope, and belongs to a future brief.
- The Landing hero glitch bug (noted in `component-lock-v1.md` as a separate tracked issue, likely a rendering/animation timing bug) — do not attempt to fix it as part of this brief; if it's visible while building, note it in the PR but leave it alone.

## Implementation requirements

```jsx
<MarketingHero
  eyebrow="…"          {/* optional */}
  headline="…"          {/* the `display` role text, Cinzel serif per spec / Alegreya Sans per live stack */}
  subheadline="…"
  primaryCTA={<Button variant="primary" size="lg">…</Button>}
  secondaryCTA={<Button variant="link">…</Button>}
  visual={ReactNode}    {/* optional supporting visual/illustration slot */}
/>
```

- `headline` uses the `display` type role (48/56, 700) — one per page maximum, matching the North Star's "one display-role heading per page" constraint noted in `component-lock-v1.md` §5.
- CTAs are composed from `Button` (01) — if 01 hasn't merged when this brief's Phase A starts, this component cannot be meaningfully completed; treat 01 as a practical (if not formally declared) prerequisite for a *usable* `MarketingHero`, even though this brief's own dependency line says "none" because the North Star doesn't gate marketing-hero *existence* on it — a stub without real buttons is fine to draft, but don't fake button chrome locally.
- Unlike `PageHero`, `MarketingHero` is allowed a `visual` slot for imagery/illustration — this is the one place Level-3 "branded module" flourish per North Star §4 is more acceptable, but interaction states, accessibility, and token usage still apply per that section's rules.

## Allowed variants

One shape — no size/layout variants in v1. `visual` slot is optional (renders without it fine for a text-only hero).

## Token usage

`--color-text-primary` (headline), `--color-text-secondary` (subheadline), `--color-accent` (eyebrow, if styled with accent per existing Landing patterns). No raw hex. Font family via existing Tailwind `font-display`/`font-sans` classes, not new CSS.

## Accessibility requirements

- `headline` renders as the page's single `<h1>` — confirm no competing `<h1>` exists elsewhere on `Landing.jsx` if Phase B is done.
- CTAs inherit accessibility from `Button` (01) — no local reimplementation.
- `visual` slot, if used, needs `aria-hidden="true"` if purely decorative, or proper alt text if it conveys information not present in the text content.

## Testing / build commands

- `npm --prefix frontend run build` — must succeed.
- No automated test framework in `frontend/`; verify manually.
- If Phase B is included: manual check that exactly one `<h1>` exists on `Landing.jsx` post-migration, and that the existing hero glitch bug's behavior is unchanged (not fixed, not worsened) by this PR.
- Manual light/dark screenshots.

## Done criteria

1. `MarketingHero.jsx` exists, implements the API above, zero raw hex.
2. CTAs composed from `Button` (01), not local button markup.
3. If Phase B included: `Landing.jsx` has exactly one `<h1>`, hero glitch bug behavior unchanged, font-stack discrepancy flagged not resolved.
4. If Phase B deferred: PR explicitly states that and leaves `Landing.jsx` untouched.
5. Screenshots attached (component-only screenshots are acceptable if Phase B is deferred — render in a documented manual check rather than a committed fixture route).
6. Ledger row + dated handoff exist.

## PR title/body template

**Title:** `[UI primitive] MarketingHero — marketing-page hero component (Phase B optional/deferred: state which)`

**Body:**
```
## What
Adds MarketingHero per omen-ui-north-star-v1.md §4 / component-lock-v1.md §5 / ui-component-system.md P1.
[Phase B included: migrates Landing.jsx | Phase B deferred: component-only, Landing.jsx untouched]

## Non-blocking status
This brief does not block and is not blocked by the primitive/component foundation (briefs
01-08, 12). Confirmed per Blueprints/handoffs/jules/README.md.

## Font-stack discrepancy
Same as brief 04 (PageHero) — Cinzel/Inter per component-lock-v1.md §5 vs. live Alegreya Sans
stack. Flagged, not resolved, consistent with prior precedent.

## Landing hero glitch bug
[confirmed unchanged | N/A if Phase B deferred]

## North Star §10 self-check
[answer all 8 questions]

## Screenshots
[dark] [light]

## Evidence
Ledger row: [link]
Handoff: [link]
```

## Explicit non-goals

- No `/about` or public Trade Analyzer demo migration (future P2 brief).
- No font-stack resolution.
- No fixing the Landing hero glitch bug.
- No merging with `PageHero`.
- No shadcn/Radix/CVA installation.

## Downstream dependencies

None. No later brief in this queue depends on `MarketingHero`. A future page-migration brief (P2.1 per `ui-component-system.md`, not yet numbered in this queue) would consume it for `/about` and public demo surfaces.

## Risk level

**Low.** Non-blocking, single optional page touch, no dependents. The main risk is scope drift into fixing the tracked hero-glitch bug or resolving the font-stack discrepancy — both explicitly out of bounds.

## Claude/Codex review checklist after Jules opens the PR

1. Confirm CTAs use real `Button` (01), not local markup — if 01 hasn't merged, confirm this PR either waited or clearly stubbed CTAs without faking button chrome.
2. Confirm the font-stack discrepancy is flagged, not silently resolved.
3. Confirm the hero glitch bug wasn't touched.
4. Confirm exactly one `<h1>` if Phase B was included.
5. Confirm zero raw hex.
6. Confirm ledger + handoff entries exist.
