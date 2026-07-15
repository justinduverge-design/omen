# Jules brief — 04 · PageHero primitive

**Queue position:** 04 of 13 (`Blueprints/handoffs/jules/README.md` is the authoritative run order)
**Depends on:** none functionally
**Status:** Phase A ready immediately. Phase B must wait its turn in the hot-file serialization order (runs fourth, after briefs 01, 02, 06).
**⚠ Page-touching brief:** Phase B touches `Football.jsx`, `DraftAssistant.jsx`, `ConnectLeague.jsx` (three of five hot files), plus `OmenPage.jsx` and `WaiverWire.jsx` (not hot). **Do not run Phase B in parallel with any other brief's Phase B against the three hot files.**

---

## Objective

Build one component: canonical `PageHero`. Every product page should use one consistent eyebrow/title/subtitle/trailing hierarchy instead of each route inventing its own.

## Required reading (in order)

1. `Blueprints/specs/design/omen-ui-north-star-v1.md`
2. `Blueprints/specs/design/README.md`
3. `Blueprints/specs/design/legacy-doc-suppression-banners.md`
4. `Blueprints/specs/design/component-lock-v1.md` §5 only (type scale + canonical page hero shape — ignore the rest of that doc)
5. `Blueprints/backlog/ui-component-system.md` P0.4
6. `Blueprints/handoffs/jules/jules-01-button.md` — read for the no-new-deps precedent and token/styling idiom; do not re-derive it.

---

## Phase A — component build only

### Canonical API (locked)

```jsx
<PageHero
  eyebrow="OMEN · HALL OF RECORDS"
  title="Hall of Records"
  subtitle="…"
  trailing={<Chip>THE 305</Chip>}   {/* optional */}
  status={...}                       {/* optional */}
/>
```

### Locked type scale this component must implement

| Role | Font | Size / Line | Weight | Tracking |
|---|---|---|---|---|
| `h1` | Cinzel serif | 32/40 | 700 | 0 |
| `body` | Inter sans | 15/24 | 400 | 0 |
| `eyebrow` | DM Mono | 12/16 | 500 | 0.12em, uppercase |

Note: `frontend/tailwind.config.js` currently maps `font-display`/`font-sans` to Alegreya Sans, not Cinzel or Inter — the type-scale table above comes from `component-lock-v1.md` and has not been reconciled against the live font stack. **Do not silently swap fonts.** Use the app's actual current heading font (`Alegreya Sans`, per `index.css` `body { font-family: 'Alegreya Sans', ... }` and `tailwind.config.js` `font-display`) for `h1` and eyebrow roles unless a font-loading change is separately approved — flag the Cinzel/Inter discrepancy in the PR description rather than resolving it unilaterally.

`MarketingHero` is a distinct component (different shape, marketing pages only, built in brief 13) — do not build it in this PR.

### Allowed variants

`eyebrow` (string, optional), `title` (string, required), `subtitle` (string, optional), `trailing` (ReactNode slot, optional — chips/badges), `status` (optional slot for live/mock/stale indicators). No size variants — `PageHero` is one fixed shape per the locked type scale. No alternate layouts.

### Token / type usage

Reads `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary` for text colors. Typography comes from the existing Tailwind font classes (`font-display`/`font-sans`/`font-mono`), not new CSS variables. No raw hex.

### Accessibility requirements

- `title` renders as a real `<h1>` — one per page.
- `eyebrow` is decorative/label text, not a heading — render as `<p>` with `aria-hidden` false but not part of heading hierarchy.
- Sufficient contrast for `eyebrow` (DM Mono small-caps) against both dark and light `--color-bg` — verify against existing `--color-text-tertiary` value, don't introduce a new lighter tint.
- `status` slot (if used) must not rely on color alone (pair with text/icon) — consistent with North Star §5 principle 3.

### Phase A allowed files

- `frontend/src/components/ui/PageHero.jsx` (new)
- `frontend/src/components/ui/index.js` (extend existing barrel if present)

### Phase A verification

- `npm --prefix frontend run build` — must succeed with the component present but unused.
- No committed scratch route. No screenshots required at this stage — deferred to Phase B, where the component appears on real pages.
- PR description must state how the type scale (h1/body/eyebrow) and the `trailing`/`status` slots were checked locally.

### Phase A done criteria

1. `PageHero.jsx` implements the full API above with zero raw hex.
2. `title` renders as a real, single `<h1>`.
3. Font-stack discrepancy (Cinzel/Inter table vs. live Alegreya Sans) is explicitly called out in the PR description, not silently resolved.

---

## Phase B — page migration only

### Migration targets, in this order

1. `frontend/src/pages/Football.jsx`
2. `frontend/src/pages/OmenPage.jsx`
3. `frontend/src/pages/DraftAssistant.jsx`
4. `frontend/src/pages/ConnectLeague.jsx`
5. `frontend/src/pages/WaiverWire.jsx` — currently has no page hero at all; add `<PageHero eyebrow="WAIVER" title="Waiver Wire" subtitle="…" />` using existing page copy, do not invent new copy.

### Phase B allowed files

- The five migration targets listed above.

### Phase B verification

- `npm --prefix frontend run build` — must succeed.
- Manual check: exactly one `<h1>` per migrated page (inspect rendered DOM or grep the page output).
- Manual light/dark screenshots of all five migrated pages.
- Manual check that `WaiverWire.jsx`'s new hero doesn't shift the page's existing input+button layout in a way that breaks the "tight huddle" spacing issue noted in `component-lock-v1.md` (flag if it does — don't silently redesign the rest of that page to compensate).

### Phase B done criteria

1. All five target pages use `<PageHero>` for their top hierarchy; no page-local eyebrow/title/subtitle markup survives in those five files.
2. Exactly one `<h1>` per migrated page, confirmed.
3. Light and dark screenshots attached for all five pages.
4. `Landing.jsx` was not touched (marketing pages use `MarketingHero`, brief 13, not `PageHero`).

---

## Both phases — allowed files

- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/` (new dated handoff)

## Forbidden files (both phases)

- `frontend/src/index.css` — no token changes.
- `frontend/tailwind.config.js` — no font-stack changes (see discrepancy note above).
- `frontend/package.json` — no new dependencies.
- Package lockfile — no changes, including accidental churn from `npm install`.
- `frontend/src/components/ui/Button.jsx`, `Input.jsx`, `Textarea.jsx` — do not modify existing primitives from other briefs.
- Any file under `Blueprints/specs/design/` or `Blueprints/backlog/ui-component-system.md`.
- Any page outside the five Phase B targets (in particular do not touch `Landing.jsx`).
- Backend, `sql/`, `deploy/`, `.env*`, anything outside `frontend/`.
- Team theming tokens (`--color-team-*`) — do not resurrect.

## Explicit non-goals

- No `MarketingHero` (that's brief 13).
- No font-stack swap.
- No redesign of any page's layout beyond the hero region.
- No new size/layout variants beyond the one locked shape.
- No shadcn/Radix/CVA installation.
- No Phase A PR that also includes page migration — keep the two halves separate PRs.

## PR title/body template

**Phase A title:** `[UI primitive · Phase A] PageHero — component build`
**Phase B title:** `[UI primitive · Phase B] PageHero — 5-page migration`

**Phase A body:**
```
## What
Adds canonical PageHero per component-lock-v1.md §5 / ui-component-system.md P0.4. Component-only.

## Font-stack discrepancy
Cinzel/Inter per component-lock-v1.md §5 vs. live Alegreya Sans stack — flagged, not resolved.

## Visual verification
[how type scale and slots were checked locally]

## Evidence
Ledger row: [link]
Handoff: [link]
```

**Phase B body:**
```
## What
Migrates Football.jsx, OmenPage.jsx, DraftAssistant.jsx, ConnectLeague.jsx, WaiverWire.jsx to
canonical PageHero (Phase A: [link]).

## Not in scope
MarketingHero (separate primitive, brief 13).

## Serialization note
Confirm against Blueprints/handoffs/jules/README.md that no concurrent Phase-B PR is
targeting Football.jsx/DraftAssistant.jsx/ConnectLeague.jsx.

## North Star §10 self-check
[answer all 8 questions]

## Screenshots
[dark] [light] × 5 pages

## Evidence
Ledger row: [link]
Handoff: [link]
```

## Which later briefs depend on this

None directly required — `PageHero` is not a hard dependency for any other queued brief, but `EmptyState/ErrorState/LoadingState` (07) and `DecisionBrief` (09) share some of the same pages and should be sequenced after this one merges to reduce diff noise, per the migration-serialization order in `README.md`.

## Risk level

**Low.** Purely additive, but touches five files across three page families — highest file-conflict surface of the queue's independent primitives, hence the strict Phase A/B split.

## Review notes for Claude/Codex after Jules opens the PR

1. Confirm Phase A and Phase B were opened as separate PRs.
2. Confirm zero raw hex; confirm no new CSS variables were invented.
3. Confirm exactly one `<h1>` per migrated page.
4. Confirm the Cinzel/Inter discrepancy is flagged in the PR body, not silently patched over by changing `tailwind.config.js`.
5. Confirm `WaiverWire.jsx` spacing wasn't redesigned beyond adding the hero.
6. Confirm `Landing.jsx` was not touched.
7. Confirm no forbidden file was touched, including the lockfile.
8. Confirm ledger + handoff entries exist.
