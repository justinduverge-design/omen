# Jules brief — 10 · PlayerRow / PlayerChip

**Queue position:** 10 of 13
**Depends on:** **01 Button, 03 Badge/Chip — both hard.**
**Status:** BLOCKED until 01 and 03 merge.
**⚠ Page-touching brief:** Phase B touches `TradeAnalyzer.jsx` and `DraftAssistant.jsx` (two of five hot files), plus `OmenOfTheWeek.jsx` (not hot, lower conflict risk). **Do not run Phase B in parallel with any other brief's Phase B against TradeAnalyzer or DraftAssistant.**
**⚠ Naming collision — read before starting:** `frontend/src/pages/TradeAnalyzer.jsx` already contains a local function literally named `PlayerRow` (confirmed via repo inspection, 2026-07-15) — it is a **form-input row** (name field + position buttons + autocomplete), not a display row. It is unrelated in shape to the canonical `PlayerRow` this brief builds (a **display** row for showing an already-selected player with value/metric/status). Jules must rename the existing local function to **`TradeAnalyzerPlayerRow`** before introducing the canonical `PlayerRow` import, or the two will collide by name and by concept. Do this rename as the first commit in this PR, isolated from the rest of the diff, so it's easy to review on its own.

---

## Objective

Build two components: `PlayerRow` (display row — name, position chip, team, value/metric slot, selected/recommended state, injury/unavailable metadata) and `PlayerChip` (compact inline player reference — name + position tag only, for dense contexts like a recommendation list). Per `ui-component-system.md` P1.3.

## Required reading (in order)

1. `Blueprints/specs/design/omen-ui-north-star-v1.md`
2. `Blueprints/specs/design/README.md`
3. `Blueprints/specs/design/legacy-doc-suppression-banners.md`
4. `Blueprints/backlog/ui-component-system.md` P1.3
5. `Blueprints/handoffs/jules/jules-01-button.md`, `jules-03-badge-chip.md` — must be merged; read final shipped APIs.
6. Current `frontend/src/pages/TradeAnalyzer.jsx` in full, specifically the existing local `PlayerRow` function (~line 63) and `PlayerRows` wrapper (~line 233) — read before touching, to understand the rename scope precisely.
7. Current `frontend/src/pages/DraftAssistant.jsx` and `frontend/src/pages/OmenOfTheWeek.jsx` for their existing player-display markup.

## Allowed files

**Phase A:**
- `frontend/src/components/ui/PlayerRow.jsx` (new — canonical display row)
- `frontend/src/components/ui/PlayerChip.jsx` (new)
- `frontend/src/components/ui/index.js` (extend barrel)

**Phase B:**
- `frontend/src/pages/TradeAnalyzer.jsx` — rename local `PlayerRow`→`TradeAnalyzerPlayerRow` first; then adopt canonical `PlayerRow`/`PlayerChip` anywhere the trade result panel displays already-selected players (not the input rows themselves, which stay as the renamed form component — those are a different job: data entry, not display).
- `frontend/src/pages/DraftAssistant.jsx` — recommendation list player display.
- `frontend/src/pages/OmenOfTheWeek.jsx` — recommended player display within the decision surface (coordinate with brief 09/11 timing if those are in flight — this file is not a hot file so lower risk, but still avoid literal same-line conflicts).

**Both:**
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/` (new dated handoff)

## Forbidden files

- `frontend/src/data/nflPlayers.js` — player search/autocomplete data and logic stay untouched. This brief is display-only.
- `frontend/src/components/ui/Button.jsx`, `Badge.jsx`, `Chip.jsx` — consume, do not modify.
- `frontend/src/index.css`, `frontend/tailwind.config.js` — no changes; position-tone tokens (`--color-pos-*`) already exist, do not add new ones.
- `frontend/package.json` — no new dependencies.
- Package lockfile — no changes, including accidental churn from running `npm install`.
- Any file under `Blueprints/specs/design/` or `Blueprints/backlog/ui-component-system.md`.
- Any page other than the three listed.
- The **input-side** player form fields in `TradeAnalyzer.jsx` (the renamed `TradeAnalyzerPlayerRow`) — this brief does not redesign data entry, only the rename for disambiguation. Do not restyle the form row's internals beyond what the rename requires.
- Team theming tokens (`--color-team-*`) — do not resurrect.

## Implementation requirements

### `PlayerRow` (canonical display row)

```jsx
<PlayerRow
  name="…"
  position="RB|WR|QB|TE|DEF|K"
  team="…"
  valueSlot={<span>…</span>}
  selected={false}
  recommended={false}
  unavailable={false}
  injuryNote="…"
/>
```

- `position` renders via `PlayerChip` (or a shared internal position-tag piece) using the existing `--color-pos-*` tokens from `index.css` (rb/wr/qb/te/def/k, both themes already defined).
- `selected`/`recommended` states get a visually distinct treatment (e.g. accent border or background tint) — no new tokens, reuse `--color-accent`/`--color-omen`.
- `unavailable`/`injuryNote` render a muted/warning treatment — reuse `--color-risk-medium` or `--color-text-tertiary` as appropriate, not a new color.

### `PlayerChip`

```jsx
<PlayerChip name="…" position="RB|WR|QB|TE|DEF|K" size="sm|md" />
```

- Compact inline reference: name text + `Chip`-style position tag. Built from/alongside `Chip` (03), not a divergent implementation.

## Allowed variants

`PlayerRow`: boolean states (`selected`, `recommended`, `unavailable`) — no size variants, one row height. `PlayerChip`: `size` = `sm` | `md` only.

## Token usage

`--color-pos-rb`, `--color-pos-wr`, `--color-pos-qb`, `--color-pos-te`, `--color-pos-def`, `--color-pos-k` (both themes, already exist), `--color-accent`, `--color-omen`, `--color-risk-medium`, `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-surface-1`, `--color-border`. No raw hex, no new tokens.

## Accessibility requirements

- Position chip color is never the only way to identify position — text label ("RB", "WR", etc.) is always present, not color-only.
- `selected`/`recommended` state must be conveyed by more than border-color alone where feasible (e.g. an icon or text badge), consistent with North Star §7.
- `PlayerRow` as a whole should be keyboard-focusable only if it's interactive in a given context (e.g. selectable in a list) — the base component itself is presentational; interactivity (onClick/onSelect) is an optional prop, and when present, must have proper button/role semantics and focus styling, not a bare `onClick` on a `div`.

## Phase A verification

- `npm --prefix frontend run build` — must succeed with both components present but unused.
- No committed scratch route. No screenshots required at this stage — PR description must state how `PlayerRow`'s default/selected/recommended/unavailable states and `PlayerChip`'s two sizes were checked locally, including all six position-chip tones.

## Phase B verification

- `npm --prefix frontend run build` — must succeed.
- No automated test framework in `frontend/`; verify manually.
- **Critical manual check:** after the `TradeAnalyzer.jsx` rename (`PlayerRow`→`TradeAnalyzerPlayerRow`), confirm the trade form still submits correctly end-to-end (add players, compare trade, view result) — the rename touches a function used throughout that file's render tree; a missed reference is a silent breakage risk.
- Manual light/dark screenshots of `PlayerRow` in default/selected/recommended/unavailable states, and `PlayerChip` at both sizes, across the real migrated pages — required here since these are real, live pages.

## Done criteria

1. `TradeAnalyzer.jsx`'s local `PlayerRow` is renamed to `TradeAnalyzerPlayerRow` and all internal references updated, isolated as its own commit.
2. Trade Analyzer form still works end-to-end after the rename, manually verified.
3. `PlayerRow.jsx` and `PlayerChip.jsx` exist, implement the APIs above, zero raw hex.
4. Position tags use existing `--color-pos-*` tokens correctly across all six positions, both themes.
5. All three migration targets adopt the canonical display components where they display (not input) player data.
6. Screenshots attached for all states/sizes.
7. Ledger row + dated handoff exist.

## PR title/body template

**Title:** `[UI composition] PlayerRow + PlayerChip — shared player display grammar (includes TradeAnalyzer rename)`

**Body:**
```
## What
Adds canonical PlayerRow (display) and PlayerChip per ui-component-system.md P1.3.
Renames TradeAnalyzer.jsx's existing local `PlayerRow` (a form-input row) to
`TradeAnalyzerPlayerRow` to resolve a naming/concept collision with the new canonical
display component — see commit 1.
Migrates: TradeAnalyzer.jsx (result display), DraftAssistant.jsx, OmenOfTheWeek.jsx.

## Rename verification
Trade Analyzer form tested end-to-end post-rename: [steps taken, confirm no broken references]

## North Star §10 self-check
[answer all 8 questions]

## Screenshots
[dark] [light] × states × sizes

## Evidence
Ledger row: [link]
Handoff: [link]
```

## Explicit non-goals

- No autocomplete/search logic changes.
- No redesign of the trade-entry form beyond the disambiguating rename.
- No new position or status tokens.
- No shadcn/Radix/CVA installation.

## Downstream dependencies

**09 DecisionBrief** may want `PlayerRow`/`PlayerChip` for its recommended-player display, but does not hard-depend on this brief per its own scope (DecisionBrief's harder dependency is MetricStrip, brief 11) — treat this as a nice-to-have ordering, not a blocker either direction.

## Risk level

**Medium-high.** The rename is the specific risk: `TradeAnalyzer.jsx` is a working, real-money-adjacent-feeling user flow (trade comparisons people rely on), and a missed reference during rename is a silent runtime break, not a build error (JS won't always fail to build on a stale reference if scoping still technically resolves — verify by actually exercising the flow, not just trusting `npm run build`).

## Claude/Codex review checklist after Jules opens the PR

1. Confirm the rename commit is isolated and reviewable on its own.
2. Confirm every reference to the old local `PlayerRow` name was updated — grep the full diff and the unchanged parts of the file for stray references.
3. Manually re-run the trade flow yourself (or verify Jules's documented steps are thorough) — don't accept "build succeeded" as sufficient proof.
4. Confirm position tags always show text, not color-only.
5. Confirm zero raw hex, zero new tokens.
6. Confirm no concurrent Phase-B collision on TradeAnalyzer/DraftAssistant.
7. Confirm ledger + handoff entries exist.
