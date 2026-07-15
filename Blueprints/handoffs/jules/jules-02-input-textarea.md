# Jules brief — 02 · Input / Textarea primitive

**Queue position:** 2 of 11 (updated 2026-07-15 — see `Blueprints/handoffs/jules/README.md` for authoritative run order after Badge/Chip and Tooltip were added)
**Depends on:** none functionally, but shares migration files with brief 01 (Button) — see sequencing note.
**Status:** ready to draft immediately; hold merge until brief 01 lands in shared files, or accept a rebase.

**Two-phase split (added retroactively):** open as two PRs. **PR 2a** builds `Input.jsx`/`Textarea.jsx` only, no page touches, parallel-safe with any other primitive-only PR. **PR 2b** does the three-file migration and must be serialized in the `README.md` migration order against every other brief touching the same five hot files.

---

## Objective

Build two sibling components: canonical `Input` and `Textarea`. Nothing else. Sweep the manually-styled input fields across the connect/draft/trade flows into them.

## Required reading (in order)

1. `Blueprints/specs/design/omen-ui-north-star-v1.md`
2. `Blueprints/specs/design/README.md`
3. `Blueprints/specs/design/legacy-doc-suppression-banners.md`
4. `Blueprints/specs/design/component-lock-v1.md` §2 only (Input API)
5. `Blueprints/backlog/ui-component-system.md` P0.2
6. `Blueprints/handoffs/jules/jules-01-button.md` — read for the no-new-deps precedent and the token/styling idiom to match; do not re-derive it independently.

## Dependency / sequencing

No functional dependency on `Button`. However both briefs migrate `ConnectLeague.jsx`, `TradeAnalyzer.jsx`, and `DraftAssistant.jsx`. Two safe options:

- **Preferred:** hold this PR's merge until brief 01 merges, then rebase onto it.
- **Acceptable:** draft this PR in parallel against `main`, but expect conflict resolution at merge time — do not let Jules silently resolve conflicts by guessing at Button's final shape; re-sync first.

Do not start brief 05 (EmptyState/ErrorState/LoadingState) work using this brief's error-state styling as a reference until this brief has actually merged — its `state="error"` treatment is the reference implementation for form-level errors, but EmptyState/ErrorState/LoadingState is a separate, larger surface (see brief 05).

## Implementation scope

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

### Migration targets, in this order

1. `ConnectLeague.jsx` — Sleeper username field and ESPN cookie fields.
2. `DraftAssistant.jsx` — number fields (draft position, round, etc.).
3. `TradeAnalyzer.jsx` — player-name fields (note: these currently have custom autocomplete wiring — preserve the autocomplete behavior, only swap the input chrome, do not touch `data/nflPlayers.js` or the suggestion logic).
4. `TradeAnalyzer.jsx` — share URL field.

## Allowed files

- `frontend/src/components/ui/Input.jsx` (new)
- `frontend/src/components/ui/Textarea.jsx` (new)
- `frontend/src/components/ui/index.js` (barrel, if it now exists from brief 01 — extend it, don't recreate)
- `frontend/src/pages/ConnectLeague.jsx`
- `frontend/src/pages/DraftAssistant.jsx`
- `frontend/src/pages/TradeAnalyzer.jsx`
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/` (new dated handoff)

## Forbidden files

- `frontend/src/index.css` — no token or media-query changes (see preservation note above).
- `frontend/tailwind.config.js`, `frontend/package.json` / lockfile — no new dependencies.
- `frontend/src/components/ui/Button.jsx` — do not modify; if Button's export shape needs to change to compose cleanly with Input, stop and flag rather than editing it in this PR.
- `frontend/src/data/nflPlayers.js` — autocomplete data/logic is out of scope.
- Any file under `Blueprints/specs/design/` or `Blueprints/backlog/ui-component-system.md` — doctrine.
- Any page outside the three listed.
- Backend, `sql/`, `deploy/`, `.env*`, anything outside `frontend/`.

## Explicit non-goals

- No `SegmentedControl`, `TabNav`, `RadioCardGroup`, `PageHero`, or any other primitive.
- No new validation logic — this PR changes chrome, not form behavior.
- No autocomplete/combobox redesign on TradeAnalyzer's player fields.
- No shadcn/Radix/CVA installation.
- No page layout or copy changes.

## Likely test / build commands

- `npm --prefix frontend run build` — must succeed.
- Manual check on an actual touch-device emulation (or DevTools device toolbar) that the 16px iOS zoom-prevention rule still applies to migrated inputs.
- Manual light/dark screenshots for `default`, `error`, and `success` states.
- Manual test that TradeAnalyzer's player-name autocomplete suggestions still appear and are selectable after the swap.

## Risk level

**Low-medium.** The iOS zoom-prevention CSS selector dependency and the TradeAnalyzer autocomplete wiring are the two easy-to-regress spots; everything else is comparable in risk to Button.

## Review notes for Claude/Codex after Jules opens the PR

1. Confirm the iOS 16px rule still applies — check computed font-size on a migrated input via touch emulation, not just visual guess.
2. Confirm TradeAnalyzer autocomplete still functions end-to-end (type a partial name, suggestion list appears, selection populates the field).
3. Confirm zero raw hex literals; confirm error state reads `--color-risk-high`, not a new red.
4. Confirm no merge conflicts were silently "resolved" against a guessed Button shape — diff against brief 01's actual merged `Button.jsx`.
5. Confirm `Textarea` truly shares the prop surface with `Input` rather than drifting into its own API.
6. Confirm ledger + handoff entries exist.
