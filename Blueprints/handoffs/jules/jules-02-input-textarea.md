# Jules brief — 02 · Input / Textarea primitive

**Queue position:** 02 of 13 (`Blueprints/handoffs/jules/README.md` is the authoritative run order)
**Depends on:** none functionally, but shares migration files with brief 01 (Button) — see sequencing note.
**Status:** Phase A ready immediately. Phase B must wait its turn in the hot-file serialization order — runs second, after brief 01's Phase B.
**⚠ Page-touching brief:** Phase B touches `ConnectLeague.jsx`, `DraftAssistant.jsx`, `TradeAnalyzer.jsx` — three of five hot files. **Do not run Phase B in parallel with any other brief's Phase B against these files.**

---

## Objective

Build two sibling components: canonical `Input` and `Textarea`. Nothing else in Phase A. Sweep the manually-styled input fields across the connect/draft/trade flows into them in Phase B.

## Required reading (in order)

1. `Blueprints/specs/design/omen-ui-north-star-v1.md`
2. `Blueprints/specs/design/README.md`
3. `Blueprints/specs/design/legacy-doc-suppression-banners.md`
4. `Blueprints/specs/design/component-lock-v1.md` §2 only (Input API)
5. `Blueprints/backlog/ui-component-system.md` P0.2
6. `Blueprints/handoffs/jules/jules-01-button.md` — read for the no-new-deps precedent and the token/styling idiom to match; do not re-derive it independently.

## Dependency / sequencing

No functional dependency on `Button`. However both briefs migrate `ConnectLeague.jsx`, `TradeAnalyzer.jsx`, and `DraftAssistant.jsx` in their Phase B. Two safe options:

- **Preferred:** hold this brief's Phase B merge until brief 01's Phase B merges, then rebase onto it.
- **Acceptable:** draft this brief's Phase B in parallel against `main`, but expect conflict resolution at merge time — do not let Jules silently resolve conflicts by guessing at Button's final shape; re-sync first.

Do not start brief 07 (EmptyState/ErrorState/LoadingState) work using this brief's error-state styling as a reference until this brief has actually merged — its `state="error"` treatment is a useful precedent for form-level errors, but EmptyState/ErrorState/LoadingState is a separate, larger surface (see brief 07).

---

## Phase A — component build only

### Objective

`Input.jsx` and `Textarea.jsx` only. No page files. No migration.

### Canonical API (locked)

```jsx
<Input
  type="text|email|number|password"
  size="sm|md|lg"
  state="default|error|success"
  leadingIcon={ReactNode}
  trailingIcon={ReactNode}
  label="…"
  hint="…"
  errorMessage="…"
/>
```

- `type` drives HTML input mode/keyboard — no custom input-mode logic.
- `size`: `sm` 32px, `md` 40px (default), `lg` 48px.
- `state`: `default`, `error` (red border + `errorMessage` rendered below), `success` (green check trailing icon).
- No other variants — no borderless, no filled-only, no "chip-with-textbox."
- `<Textarea />` is a sibling component with the same prop surface (minus `type`).
- Label + hint + error wrap via a small internal `FormField`-style layout, not a separately exported component (keep it private to `Input.jsx`/`Textarea.jsx` unless a second consumer emerges later).

### Tokens consumed (already exist — do not add or rename)

`--color-surface-1`, `--color-border`, `--color-border-hover`, `--color-text-primary`, `--color-text-secondary` (placeholder), `--color-risk-high` (error border).

### Preserve existing behavior — do not regress

`frontend/src/index.css` has an iOS Safari rule forcing 16px font-size on touch-device text inputs to prevent auto-zoom (`@media (hover: none) and (pointer: coarse)` block, targets `input:not([type=checkbox])...`, `textarea`, `select`). The canonical `Input`/`Textarea` markup must remain selectable by that existing CSS rule — do not restructure the DOM in a way that breaks the selector, and do not reintroduce the fix as an inline style (it's already handled globally).

### Phase A allowed files

- `frontend/src/components/ui/Input.jsx` (new)
- `frontend/src/components/ui/Textarea.jsx` (new)
- `frontend/src/components/ui/index.js` (barrel, if it now exists from brief 01 — extend it, don't recreate)

### Phase A verification

- `npm --prefix frontend run build` — must succeed with both components present but unused.
- No committed scratch route. No screenshots required at this stage — `Input`/`Textarea` are used on real pages in Phase B, where screenshots are required instead.
- PR description must state how `default`/`error`/`success` states and all three sizes were checked locally (e.g. temporary local render), including a note confirming the iOS 16px selector still matches the new markup (inspect the rendered DOM against the `index.css` selector, don't just assume).

### Phase A done criteria

1. `Input.jsx` and `Textarea.jsx` implement the full API above, zero raw hex.
2. iOS 16px zoom-prevention selector confirmed still matches.
3. `Textarea` genuinely shares the prop surface with `Input`, not a drifted separate API.

---

## Phase B — page migration only

### Migration targets, in this order

1. `ConnectLeague.jsx` — Sleeper username field and ESPN cookie fields.
2. `DraftAssistant.jsx` — number fields (draft position, round, etc.).
3. `TradeAnalyzer.jsx` — player-name fields (note: these currently have custom autocomplete wiring — preserve the autocomplete behavior, only swap the input chrome, do not touch `data/nflPlayers.js` or the suggestion logic).
4. `TradeAnalyzer.jsx` — share URL field.

### Phase B allowed files

- `frontend/src/pages/ConnectLeague.jsx`
- `frontend/src/pages/DraftAssistant.jsx`
- `frontend/src/pages/TradeAnalyzer.jsx`

### Phase B verification

- `npm --prefix frontend run build` — must succeed.
- Manual check on an actual touch-device emulation (or DevTools device toolbar) that the 16px iOS zoom-prevention rule still applies to migrated inputs, on the real pages this time.
- Manual light/dark screenshots for `default`, `error`, and `success` states across the three migrated pages.
- Manual test that TradeAnalyzer's player-name autocomplete suggestions still appear and are selectable after the swap.

### Phase B done criteria

1. All three migration targets fully swept for cases these components cover.
2. Autocomplete on TradeAnalyzer verified end-to-end, not just visually.
3. Screenshots attached for all three states across all three pages.

---

## Both phases — allowed files

- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/` (new dated handoff)

## Forbidden files (both phases)

- `frontend/src/index.css` — no token or media-query changes (see preservation note above).
- `frontend/tailwind.config.js` — no theme extension.
- `frontend/package.json` — no new dependencies.
- Package lockfile — no changes, including accidental churn from `npm install`.
- `frontend/src/components/ui/Button.jsx` — do not modify; if Button's export shape needs to change to compose cleanly with Input, stop and flag rather than editing it in this PR.
- `frontend/src/data/nflPlayers.js` — autocomplete data/logic is out of scope.
- Any file under `Blueprints/specs/design/` or `Blueprints/backlog/ui-component-system.md` — doctrine.
- Any page outside the three Phase B targets.
- Backend, `sql/`, `deploy/`, `.env*`, anything outside `frontend/`.
- Team theming tokens (`--color-team-*`) — runtime-removed 2026-07-12; do not resurrect.

## Explicit non-goals

- No `SegmentedControl`, `TabNav`, `RadioCardGroup`, `PageHero`, or any other primitive.
- No new validation logic — this PR changes chrome, not form behavior.
- No autocomplete/combobox redesign on TradeAnalyzer's player fields.
- No shadcn/Radix/CVA installation.
- No page layout or copy changes.
- No Phase A PR that also includes page migration — keep the two halves separate PRs.

## PR title/body template

**Phase A title:** `[UI primitive · Phase A] Input + Textarea — component build`
**Phase B title:** `[UI primitive · Phase B] Input + Textarea — 3-page migration`

**Phase A body:**
```
## What
Adds canonical Input and Textarea per component-lock-v1.md §2. Component-only — no page migration.

## iOS zoom-prevention check
[confirmed the existing index.css selector still matches the new markup]

## Visual verification
[how default/error/success states and all sizes were checked locally]

## Evidence
Ledger row: [link]
Handoff: [link]
```

**Phase B body:**
```
## What
Migrates ConnectLeague.jsx, DraftAssistant.jsx, TradeAnalyzer.jsx to canonical Input/Textarea
(Phase A: [link to merged Phase A PR]).

## Depends on
Button (01) Phase B: [link] — merged first per hot-file serialization order.

## Autocomplete verification
[steps confirming TradeAnalyzer player-name suggestions still work end-to-end]

## North Star §10 self-check
[answer all 8 questions]

## Screenshots
[dark] [light] × 3 states × 3 pages

## Evidence
Ledger row: [link]
Handoff: [link]
```

## Risk level

**Low-medium.** The iOS zoom-prevention CSS selector dependency and the TradeAnalyzer autocomplete wiring are the two easy-to-regress spots; everything else is comparable in risk to Button.

## Review notes for Claude/Codex after Jules opens the PR

1. Confirm Phase A and Phase B were opened as separate PRs.
2. Confirm the iOS 16px rule still applies — check computed font-size on a migrated input via touch emulation, not just visual guess.
3. Confirm TradeAnalyzer autocomplete still functions end-to-end (type a partial name, suggestion list appears, selection populates the field).
4. Confirm zero raw hex literals; confirm error state reads `--color-risk-high`, not a new red.
5. Confirm no merge conflicts were silently "resolved" against a guessed Button shape — diff against brief 01's actual merged `Button.jsx`.
6. Confirm `Textarea` truly shares the prop surface with `Input` rather than drifting into its own API.
7. Confirm no forbidden file was touched, including the lockfile.
8. Confirm ledger + handoff entries exist.
