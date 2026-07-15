# Jules brief — 07 · EmptyState / ErrorState / LoadingState

**Queue position:** 07 of 13 (`Blueprints/handoffs/jules/README.md` is the authoritative run order)
**Depends on:** **01 Button** (hard — the canonical error card embeds `<Button variant="secondary" size="sm">Try again</Button>`)
**Status:** Phase A blocked until 01 merges. Do not start until Button's component (01-A) is available to import; Phase B additionally waits its turn in the hot-file serialization order.
**⚠ Page-touching brief:** Phase B touches `Football.jsx`, `TradeAnalyzer.jsx`, `DraftAssistant.jsx` (three of five hot files). **Do not run Phase B in parallel with any other brief's Phase B against these files.**

---

## Objective

Consolidate drifted empty/error/loading panels into three canonical states built from the existing `Card`/`Alert` components, per `component-lock-v1.md` §4/§4.1. **This is a rework, not a from-scratch build** — `frontend/src/components/ui/` already contains `EmptyState.jsx`, `ErrorState.jsx`, `Spinner.jsx`, and `DisconnectedState.jsx`. Repo inspection (2026-07-15) found real drift already inside these "canonical" files: `ErrorState.jsx` uses raw `red-400`/`red-300` Tailwind color literals instead of `--color-risk-high`, and `Spinner.jsx` uses raw `slate-700`/`amber-400` literals instead of tokens. Fix these in place rather than deleting and rebuilding blind.

## Required reading (in order)

1. `Blueprints/specs/design/omen-ui-north-star-v1.md`
2. `Blueprints/specs/design/README.md`
3. `Blueprints/specs/design/legacy-doc-suppression-banners.md`
4. `Blueprints/specs/design/component-lock-v1.md` §4 and §4.1 only
5. `Blueprints/backlog/ui-component-system.md` P0.5
6. `Blueprints/handoffs/jules/jules-01-button.md` — must be merged before this brief's Phase A starts; read its final `Button.jsx` API, don't assume the brief's draft API is exactly what shipped.
7. Current files: `frontend/src/components/ui/EmptyState.jsx`, `ErrorState.jsx`, `Spinner.jsx`, `DisconnectedState.jsx`, `Card.jsx`, `Alert.jsx` — read all six before writing anything.

## Allowed files

**Phase A:**
- `frontend/src/components/ui/EmptyState.jsx` (rework existing)
- `frontend/src/components/ui/ErrorState.jsx` (rework existing — fix raw hex/Tailwind-color literals)
- `frontend/src/components/ui/LoadingState.jsx` (new — may compose the existing `Spinner.jsx`)
- `frontend/src/components/ui/Spinner.jsx` (rework existing — fix raw Tailwind-color literals)
- `frontend/src/components/ui/index.js` (extend barrel)

**Phase B:**
- `frontend/src/pages/OmenOfTheWeek.jsx` — pink retry card → `Card variant="error"` / `ErrorState`; loading skeleton (lines ~95–108, uses raw `bg-slate-800`) → `LoadingState`
- `frontend/src/pages/TradeAnalyzer.jsx`
- `frontend/src/pages/DraftAssistant.jsx`
- `frontend/src/pages/Football.jsx`
- `frontend/src/pages/Ledger.jsx` — dashed neutral "couldn't load history" card → `EmptyState`
- `frontend/src/pages/Standings.jsx` — same pattern as Ledger

**Both phases:**
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/` (new dated handoff)

## Forbidden files

- `frontend/src/index.css`, `frontend/tailwind.config.js` — no changes.
- `frontend/package.json` — no new dependencies.
- Package lockfile — no changes, including accidental churn from running `npm install`.
- `frontend/src/components/ui/Button.jsx`, `Card.jsx`, `Alert.jsx` — consume them, do not modify their internals. If `Card`'s existing variant set (`solid|outlined|empty|error|preview`, confirmed present in `Card.jsx`) doesn't cleanly support what's needed, stop and flag rather than editing `Card.jsx` in this PR.
- `frontend/src/components/ui/DisconnectedState.jsx` — related but distinct (platform disconnection, not generic error/empty). Leave alone unless it's a near-duplicate of the new `ErrorState`; if so, flag the redundancy in the PR description rather than merging them silently.
- Any file under `Blueprints/specs/design/` or `Blueprints/backlog/ui-component-system.md`.
- Any page outside the five listed above.
- Team theming tokens (`--color-team-*`) — do not resurrect.

## Implementation requirements

### `EmptyState` (rework)

Existing `EmptyState.jsx` already reads tokens correctly (`--color-border`, `--color-surface-1`, `--color-accent`, `--color-text-primary/secondary`) — preserve that pattern. Confirm props (`eyebrow`, `title`, `message`, `cta`) still match what `component-lock-v1.md` §4 calls for a "empty" Card variant: dashed 1px border, transparent fill, muted body copy. Current implementation uses solid border + `--color-surface-1` fill, not dashed/transparent — reconcile against the spec or flag the discrepancy explicitly in the PR rather than silently picking one.

### `ErrorState` (rework — token fix required)

```jsx
<ErrorState title="Failed to load Omen of the Week" message="…" onRetry={fn} />
```

Replace `border-red-400/30 bg-red-400/10 text-red-300` etc. with `--color-risk-high`-derived styling (tinted fill per `component-lock-v1.md` §4: "`--color-risk-high` tinted fill, `--color-text-primary` on top"). Replace the raw `<button>` retry element with `<Button variant="secondary" size="sm">Try again</Button>` from brief 01 — this is the concrete reason this brief depends on 01.

### `LoadingState` (new)

```jsx
<LoadingState variant="skeleton|spinner" rows={3} />
```

- `skeleton` variant: block placeholders (replaces ad-hoc `bg-slate-800` divs currently hand-rolled in `OmenOfTheWeek.jsx`'s loading branch) using a token-based surface color, not raw slate.
- `spinner` variant: wraps the existing `Spinner.jsx` (after its token fix).
- Both must respect `prefers-reduced-motion` — for `skeleton`, this means no pulse animation under reduced motion (static placeholder is fine); for `spinner`, current `Spinner.jsx` already uses `motion-reduce:hidden` which hides it entirely — confirm that's the desired reduced-motion behavior or replace with a static indicator instead of nothing, and document the choice.

### `Spinner` (rework — token fix required)

Replace `border-slate-700 border-t-amber-400` with token-based colors (`--color-border`, `--color-accent`).

## Allowed variants

- `EmptyState`: single shape (eyebrow/title/message/cta), no size variants.
- `ErrorState`: single shape (title/message/onRetry), no size variants.
- `LoadingState`: `skeleton` | `spinner`, optional `rows` count for skeleton.
- No "warning" or "info" fourth state in this PR — those map to `Alert`, already a separate existing component, out of scope.

## Token usage

`--color-risk-high` (error), `--color-border` (empty, spinner), `--color-surface-1`/`--color-surface-2` (skeleton placeholders, empty fill), `--color-accent` (spinner accent, empty CTA), `--color-text-primary`/`--color-text-secondary` (all). No raw hex, no raw Tailwind color-scale literals (`red-400`, `slate-800`, `amber-400`, etc. are all forbidden after this PR).

## Accessibility requirements

- `ErrorState` retry button must be keyboard-reachable and have already-correct `focus-visible` styling inherited from `Button` (brief 01) — don't reimplement focus styling locally.
- `LoadingState` in `spinner` mode needs `aria-live="polite"` or `role="status"` on a wrapping element so screen readers announce the loading state; `aria-hidden="true"` stays on the decorative spinner glyph itself (matches existing `Spinner.jsx` pattern).
- `LoadingState` in `skeleton` mode needs the same `aria-live`/`role="status"` treatment at the container level.
- `prefers-reduced-motion` — see LoadingState note above; must be a deliberate, documented choice, not an oversight.
- Color is never the only differentiator for error vs. empty vs. loading — text content must always distinguish them, not tint alone.

## Phase A verification

- `npm --prefix frontend run build` — must succeed.
- No committed scratch route. No automated component tests in `frontend/`; verify manually.
- Manual check: search the diff for `red-`, `slate-`, `amber-` Tailwind color-scale utility classes in the four touched `components/ui/` files — none should remain.
- No screenshots required at the Phase A stage — `EmptyState`/`ErrorState`/`Spinner` already render on real pages today (this is a rework, not a from-scratch build), so their *current* on-page appearance is the baseline; the PR description must instead state how the token/color fixes were checked locally against that baseline before Phase B rolls them out further.
- `prefers-reduced-motion: reduce` emulation check on `LoadingState`.

## Phase B verification

- `npm --prefix frontend run build` — must succeed.
- Manual light/dark screenshots of all three states across all five migration targets (15 screenshots, can be batched per page) — required here since these are real, live pages.
- Manual re-check that the token/color fixes from Phase A actually reached every migrated page (no stale `red-`/`slate-`/`amber-` literals reintroduced at the call sites).

## Done criteria

1. `EmptyState.jsx`, `ErrorState.jsx`, `LoadingState.jsx`, `Spinner.jsx` all read tokens only — zero raw hex, zero raw Tailwind color-scale literals.
2. `ErrorState`'s retry action uses the canonical `Button`, not a hand-rolled `<button>`.
3. `EmptyState`'s dashed-vs-solid border discrepancy against `component-lock-v1.md` §4 is either fixed or explicitly flagged in the PR — not silently ignored.
4. All five migration targets fully swept — no `bg-slate-800`, `bg-red-400/10`, or similar ad-hoc panels survive for cases these three components cover.
5. `aria-live`/`role="status"` present on loading states.
6. Reduced-motion behavior is a documented choice.
7. Light/dark screenshots attached.
8. Ledger row + dated handoff exist.

## PR title/body template

**Title:** `[UI primitives] EmptyState + ErrorState + LoadingState — token fixes + canonical rework + 5-location migration`

**Body:**
```
## What
Reworks existing EmptyState.jsx / ErrorState.jsx / Spinner.jsx (fixes raw Tailwind-color
literals found in repo inspection) and adds new LoadingState.jsx, per component-lock-v1.md §4/§4.1.
Migrates: OmenOfTheWeek.jsx, TradeAnalyzer.jsx, DraftAssistant.jsx, Football.jsx, Ledger.jsx, Standings.jsx.

## Depends on
Button (01) — ErrorState's retry action now uses <Button variant="secondary" size="sm">.

## Discrepancies found and how handled
- EmptyState.jsx: solid border + surface-1 fill vs. spec's dashed/transparent — [fixed | flagged, not fixed, because: ...]
- DisconnectedState.jsx overlap with new ErrorState — [left alone | flagged as redundant]
- Spinner.jsx reduced-motion: hidden entirely vs. static fallback — [decision + rationale]

## Serialization note
Phase B touches Football/TradeAnalyzer/DraftAssistant — 3 of 5 hot files. Confirm no
concurrent Phase-B PR against these before merging.

## North Star §10 self-check
[answer all 8 questions]

## Screenshots
[dark] [light] × 3 states × 5 pages (representative subset acceptable if all three states
don't appear on every page)

## Evidence
Ledger row: [link]
Handoff: [link]
```

## Explicit non-goals

- No new fourth state (warning/info stays on `Alert`).
- No `Card.jsx`/`Alert.jsx` internal changes.
- No retry-logic changes — presentation only.
- No merging `DisconnectedState.jsx` into `ErrorState.jsx` without flagging it first.
- No shadcn/Radix/CVA installation.

## Downstream dependencies

**09 DecisionBrief** depends on this brief (uses these states inside `OmenOfTheWeek.jsx`'s decision surface). Sequence 07 before 09.

## Risk level

**Medium.** Six migration targets is the widest single-brief page footprint in the queue tied with brief 06's four. The "rework existing files with hidden drift" nature means Jules must actually read the current files carefully rather than assume they're already correct — that's the main risk (silently trusting stale "canonical" components that aren't actually canonical yet).

## Claude/Codex review checklist after Jules opens the PR

1. Grep the diff for `red-`, `slate-`, `amber-` in the four `components/ui/` files touched — should return nothing.
2. Confirm `ErrorState` imports and uses `Button` from brief 01, not a local button.
3. Confirm the `EmptyState` dashed-border discrepancy was addressed one way or the other, not silently dropped.
4. Confirm `DisconnectedState.jsx` wasn't quietly deleted or merged without a flag.
5. Confirm `aria-live`/`role="status"` present on loading indicators.
6. Confirm reduced-motion behavior is intentional and documented.
7. Confirm no concurrent Phase-B collision with briefs 01/02/04/06 on Football/TradeAnalyzer/DraftAssistant.
8. Confirm ledger + handoff entries exist.
