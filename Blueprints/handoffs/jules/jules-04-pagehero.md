# Jules brief — 04 · PageHero primitive

**Queue position:** 4 of 11 (updated 2026-07-15 — see `Blueprints/handoffs/jules/README.md` for authoritative run order)
**Depends on:** none functionally
**Status:** ready to run immediately (component build phase)

**Two-phase split:** open as two PRs. **PR 4a** builds `PageHero.jsx` only, no page touches, parallel-safe with any other primitive-only PR (Button 1a, Input/Textarea 2a, Badge/Chip 3a, Tooltip 5a, SegmentedControl-family 6a). **PR 4b** does the five-file migration below and must be serialized against every other brief touching `ConnectLeague.jsx`, `DraftAssistant.jsx`, or `Football.jsx` — see `README.md` for the current order.

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

## Implementation scope

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

`MarketingHero` is a distinct component (different shape, marketing pages only) — do not build it in this PR; note it as a gap the same way Button flagged PlatformBadge.

### Migration targets, in this order

1. `frontend/src/pages/Football.jsx`
2. `frontend/src/pages/OmenPage.jsx`
3. `frontend/src/pages/DraftAssistant.jsx`
4. `frontend/src/pages/ConnectLeague.jsx`
5. `frontend/src/pages/WaiverWire.jsx` — currently has no page hero at all; add `<PageHero eyebrow="WAIVER" title="Waiver Wire" subtitle="…" />` using existing page copy, do not invent new copy.

## Allowed files

- `frontend/src/components/ui/PageHero.jsx` (new)
- `frontend/src/components/ui/index.js` (extend existing barrel if present)
- The five migration targets listed above
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/` (new dated handoff)

## Forbidden files

- `frontend/src/index.css`, `frontend/tailwind.config.js` (no font-stack changes — see discrepancy note above), `frontend/package.json` / lockfile.
- `frontend/src/components/ui/Button.jsx`, `Input.jsx`, `Textarea.jsx` — do not modify existing primitives from other briefs.
- Any file under `Blueprints/specs/design/` or `Blueprints/backlog/ui-component-system.md`.
- Any page outside the five listed (in particular do not touch `Landing.jsx` — marketing pages use `MarketingHero`, not `PageHero`).
- Backend, `sql/`, `deploy/`, `.env*`, anything outside `frontend/`.

## Allowed variants

`eyebrow` (string, optional), `title` (string, required), `subtitle` (string, optional), `trailing` (ReactNode slot, optional — chips/badges), `status` (optional slot for live/mock/stale indicators). No size variants — `PageHero` is one fixed shape per the locked type scale. No alternate layouts.

## Token / type usage

Reads `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary` for text colors. Typography comes from the existing Tailwind font classes (`font-display`/`font-sans`/`font-mono`), not new CSS variables. No raw hex.

## Accessibility requirements

- `title` renders as a real `<h1>` — one per page.
- `eyebrow` is decorative/label text, not a heading — render as `<p>` with `aria-hidden` false but not part of heading hierarchy.
- Sufficient contrast for `eyebrow` (DM Mono small-caps) against both dark and light `--color-bg` — verify against existing `--color-text-tertiary` value, don't introduce a new lighter tint.
- `status` slot (if used) must not rely on color alone (pair with text/icon) — consistent with North Star §5 principle 3.

## Testing / build commands

- `npm --prefix frontend run build` — must succeed.
- Manual check: exactly one `<h1>` per migrated page (inspect rendered DOM or grep the page output).
- Manual light/dark screenshots of all five migrated pages.
- Manual check that `WaiverWire.jsx`'s new hero doesn't shift the page's existing input+button layout in a way that breaks the "tight huddle" spacing issue noted in `component-lock-v1.md` (flag if it does — don't silently redesign the rest of that page to compensate).

## Done criteria

1. `PageHero.jsx` implements the full API above with zero raw hex.
2. All five target pages use `<PageHero>` for their top hierarchy; no page-local eyebrow/title/subtitle markup survives in those five files.
3. Exactly one `<h1>` per migrated page, confirmed.
4. Light and dark screenshots attached for all five pages.
5. Font-stack discrepancy (Cinzel/Inter table vs. live Alegreya Sans) is explicitly called out in the PR description, not silently resolved.
6. Ledger row + dated handoff exist.
7. PR answers North Star §10 self-check questions.

## PR title/body template

**Title:** `[UI primitive] PageHero — canonical page hero component + 5-page migration`

**Body:**
```
## What
Adds canonical `PageHero` component per component-lock-v1.md §5 / ui-component-system.md P0.4.
Migrates: Football.jsx, OmenPage.jsx, DraftAssistant.jsx, ConnectLeague.jsx, WaiverWire.jsx.

## Not in scope
MarketingHero (separate primitive, not built here — flagged as a queue gap).
Font-stack reconciliation (Cinzel/Inter per component-lock-v1 vs. live Alegreya Sans) — flagged, not resolved.

## North Star §10 self-check
[answer all 8 questions]

## Screenshots
[dark] [light] × 5 pages

## Evidence
Ledger row: [link]
Handoff: [link]
```

## Explicit non-goals

- No `MarketingHero`.
- No font-stack swap.
- No redesign of any page's layout beyond the hero region.
- No new size/layout variants beyond the one locked shape.
- No shadcn/Radix/CVA installation.

## Which later briefs depend on this

None directly required — `PageHero` is not a hard dependency for any other queued brief, but `EmptyState/ErrorState/LoadingState` (07) and `DecisionBrief` (11) share some of the same pages and should be sequenced after this one merges to reduce diff noise, per the migration-serialization order in `README.md`.

## Risk level

**Low.** Purely additive, but touches five files across three page families — highest file-conflict surface of the queue's independent primitives, hence the strict two-phase split.

## Review notes for Claude/Codex after Jules opens the PR

1. Confirm zero raw hex; confirm no new CSS variables were invented.
2. Confirm exactly one `<h1>` per migrated page.
3. Confirm the Cinzel/Inter discrepancy is flagged in the PR body, not silently patched over by changing `tailwind.config.js`.
4. Confirm `WaiverWire.jsx` spacing wasn't redesigned beyond adding the hero.
5. Confirm `Landing.jsx` was not touched.
6. Confirm ledger + handoff entries exist.
