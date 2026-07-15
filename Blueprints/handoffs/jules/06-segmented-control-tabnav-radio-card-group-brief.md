# Jules brief — 06 · SegmentedControl, TabNav, RadioCardGroup

**Queue position:** 06 of 13 (`Blueprints/handoffs/jules/README.md` is the authoritative run order)
**Depends on:** none
**Status:** Phase A (component build) ready immediately. Phase B (migration) must wait its turn in the hot-file serialization order.
**⚠ Page-touching brief:** Phase B of this brief touches `TradeAnalyzer.jsx`, `DraftAssistant.jsx`, `Football.jsx`, and `ConnectLeague.jsx` — four of the five hot files. **Do not run Phase B in parallel with any other brief's Phase B against these files.** Check `README.md` for current serialization status before opening this PR's migration half.

---

## Objective

Build three sibling components from one shared selection-primitive family, per `component-lock-v1.md` §3/§3.1: `SegmentedControl` (compact form choice), `TabNav` (page/view navigation), `RadioCardGroup` (high-value one-of-N choice with title + description). The backlog explicitly groups these three together — this is the one brief in the queue where combining primitives into one PR is correct, not scope creep.

## Required reading (in order)

1. `Blueprints/specs/design/omen-ui-north-star-v1.md`
2. `Blueprints/specs/design/README.md`
3. `Blueprints/specs/design/legacy-doc-suppression-banners.md`
4. `Blueprints/specs/design/component-lock-v1.md` §3 and §3.1 only
5. `Blueprints/backlog/ui-component-system.md` P0.3
6. `Blueprints/handoffs/jules/jules-01-button.md` — no-new-deps precedent and styling idiom.

## Allowed files

**Phase A:**
- `frontend/src/components/ui/SegmentedControl.jsx` (new)
- `frontend/src/components/ui/TabNav.jsx` (new)
- `frontend/src/components/ui/RadioCardGroup.jsx` (new)
- `frontend/src/components/ui/index.js` (extend existing barrel)

**Phase B:**
- `frontend/src/pages/TradeAnalyzer.jsx` — scoring/deal-shape controls → `SegmentedControl`
- `frontend/src/pages/DraftAssistant.jsx` — scoring format → `SegmentedControl`
- `frontend/src/pages/Football.jsx` — underline tab nav (Trade Analyzer / Omen of the Week / Draft Assistant / History) → `TabNav`
- `frontend/src/pages/ConnectLeague.jsx` — ESPN browser guide picker (Chrome/Edge / Firefox / Safari) → `SegmentedControl`
- `frontend/src/pages/Account.jsx` — MODE picker (System / Team / Omen) → `RadioCardGroup`; OFFICIAL/CALLE OCHO toggle → `SegmentedControl` (note: `Account.jsx` is not one of the five hot files, lower conflict risk)

**Both phases:**
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/` (new dated handoff)

## Forbidden files

- `frontend/src/index.css`, `frontend/tailwind.config.js`, `frontend/package.json` / lockfile.
- `frontend/src/components/ui/Button.jsx`, `Input.jsx`, `Textarea.jsx`, `PageHero.jsx`, `Badge.jsx`, `Chip.jsx`, `Tooltip.jsx` — do not modify other primitives.
- Any file under `Blueprints/specs/design/` or `Blueprints/backlog/ui-component-system.md`.
- Any page outside the five listed above.
- Team theming: `--color-team-*` tokens are runtime-inert since 2026-07-12 — the Account.jsx "Team" mode option in `RadioCardGroup` should render as a disabled/labeled-future option or be omitted per current runtime truth, not rebuilt as functional. If the existing page already handles this correctly, preserve that behavior; do not resurrect Team mode functionality.

## Implementation requirements

### `SegmentedControl` (canonical API)

```jsx
<SegmentedControl value={value} onValueChange={setValue} size="sm|md|lg">
  <SegmentedControl.Item value="ppr">PPR</SegmentedControl.Item>
  <SegmentedControl.Item value="half">Half PPR</SegmentedControl.Item>
  <SegmentedControl.Item value="std">Standard</SegmentedControl.Item>
</SegmentedControl>
```

- Sizes: `sm` 28px, `md` 36px (default), `lg` 44px.
- Fill state: filled accent on selected, transparent-with-1px-border on unselected (both states must show a visible border — this resolves the `/trade` vs `/draft` inconsistency where one had no border on unselected items and the other did).
- Never used for page navigation.

### `TabNav` (canonical API)

```jsx
<TabNav value={activeTab} onValueChange={setActiveTab}>
  <TabNav.Item value="trade">Trade Analyzer</TabNav.Item>
  <TabNav.Item value="omen">Omen of the Week</TabNav.Item>
  <TabNav.Item value="draft">Draft Assistant</TabNav.Item>
  <TabNav.Item value="history">History</TabNav.Item>
</TabNav>
```

- Underline-tab chrome, not pill chrome — visually and semantically distinct from `SegmentedControl`.
- Used only for switching page/tool views, never for form input.

### `RadioCardGroup` (canonical API)

```jsx
<RadioCardGroup value={mode} onValueChange={setMode}>
  <RadioCardGroup.Item value="system" title="System" description="Match your device setting" />
  <RadioCardGroup.Item value="omen" title="Omen" description="Gold default accent" />
</RadioCardGroup>
```

- Card-radio chrome — each choice needs a title + description slot. Only use where that shape fits; do not use for simple binary toggles (those are `SegmentedControl`).

### Shared behavior across all three

- Keyboard navigable (arrow keys move selection within the group, matching native radio-group / tab conventions).
- `focus-visible` outline on the active/focused item using the existing `--color-accent` outline convention.
- No entrance/selection animation beyond the existing 150ms ease-in-out state-change convention (`design-done.md` gate 8) — no springy/bouncy motion.

## Token usage

`--color-accent`, `--color-text-on-accent`, `--color-surface-1` (unselected fill), `--color-surface-2`, `--color-border`, `--color-text-primary`, `--color-text-secondary`. All already exist in `index.css`. No raw hex, no new tokens.

## Accessibility requirements

- `SegmentedControl` and `TabNav` use proper ARIA roles (`radiogroup`/`radio` or `tablist`/`tab`/`tabpanel` per their actual semantics — `TabNav` is real page navigation, so `tablist` semantics are correct there; `SegmentedControl` is a value picker, so `radiogroup` semantics fit better than `tablist`, even though the previous local markup conflated them).
- `RadioCardGroup` uses native `radiogroup`/`radio` semantics under the card styling — it must remain operable via keyboard and screen reader as a real radio group, not a div-soup fake.
- All three respect `prefers-reduced-motion` for their selection-transition.
- Minimum 44×44px touch target per item on touch devices, consistent with existing button/link sizing conventions in the codebase (see `HelpButton.jsx`'s `h-11 w-11` precedent).

## Testing / build commands

- `npm --prefix frontend run build` — must succeed.
- No automated component tests in `frontend/`; verify manually.
- Keyboard test: Tab into each control, arrow-key navigate between options, confirm selection changes and focus-visible ring follows.
- Manual light/dark screenshots of all five migrated locations.
- Confirm `Football.jsx`'s `TabNav` migration doesn't change actual routing behavior — it's a visual/semantic swap, not a routing refactor.

## Done criteria

1. All three components implement the APIs above, zero raw hex.
2. Correct ARIA roles per component (not copy-pasted from one to the other).
3. All five migration targets fully swapped — no local underline-tab, card-radio, or old segmented markup survives in those files for cases the canonical components cover.
4. Keyboard navigation verified for all three.
5. Account.jsx's "Team" mode option does not resurrect functional team theming.
6. Light/dark screenshots attached.
7. Ledger row + dated handoff exist.

## PR title/body template

**Title:** `[UI primitives] SegmentedControl + TabNav + RadioCardGroup — sibling selection family + 5-location migration`

**Body:**
```
## What
Adds SegmentedControl, TabNav, RadioCardGroup per component-lock-v1.md §3/§3.1.
Migrates: TradeAnalyzer.jsx, DraftAssistant.jsx, Football.jsx, ConnectLeague.jsx, Account.jsx.

## Serialization note
This PR's Phase B touches 4 of the 5 hot files (all but Landing.jsx). Confirm no other
Phase-B PR is in flight against TradeAnalyzer/DraftAssistant/Football/ConnectLeague before merging.
See Blueprints/handoffs/jules/README.md for current serialization order.

## Team mode handling
Account.jsx "Team" option in RadioCardGroup: [describe how current runtime-inert state was preserved]

## North Star §10 self-check
[answer all 8 questions]

## Screenshots
[dark] [light] × 5 locations

## Evidence
Ledger row: [link]
Handoff: [link]
```

## Explicit non-goals

- No fourth selection primitive.
- No functional team-theme resurrection in the Account.jsx migration.
- No routing logic changes in Football.jsx.
- No shadcn/Radix/CVA installation.
- No redesign of any page beyond the specific control being swapped.

## Downstream dependencies

None of the later briefs hard-depend on this one. It's independent, but its Phase B shares hot files with 01, 02, 04, and 07 — see `README.md` serialization order (this brief runs third in the Phase B sequence, after 01 and 02).

## Risk level

**Medium.** Largest Phase-A scope in the queue (three components), and the largest Phase-B hot-file footprint after Button. ARIA-role correctness across three visually similar but semantically distinct components is the main technical risk.

## Claude/Codex review checklist after Jules opens the PR

1. Confirm `SegmentedControl` uses `radiogroup`/`radio`, not `tablist`/`tab` — this is a common mix-up given the visual similarity to tabs.
2. Confirm `TabNav` uses real `tablist` semantics and didn't get built as a styled `SegmentedControl` wrapper.
3. Confirm `RadioCardGroup` is a native radio group under the hood, keyboard-testable.
4. Confirm zero raw hex, zero new tokens.
5. Confirm Account.jsx's Team option doesn't silently reactivate team theming logic.
6. Confirm this PR did not merge concurrently with another Phase-B PR touching the same hot files — check merge timestamps/base commit against `README.md`'s serialization log.
7. Confirm ledger + handoff entries exist.
