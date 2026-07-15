# Jules brief — 09 · DecisionBrief

**Queue position:** 09 of 13 by file number — **but this is the last brief to actually implement.** Numbering follows the order these briefs were requested, not dependency order; do not infer sequencing from the filename.
**Depends on:** **01 Button, 03 Badge/Chip, 05 Tooltip, 07 EmptyState/ErrorState/LoadingState, 11 MetricStrip — all hard, all blocking.** This is the most dependency-heavy brief in the queue.
**Status:** BLOCKED until all five prerequisite briefs have merged. Do not start Phase A early "to save time" — DecisionBrief's whole point is composing already-canonical pieces; building it against draft/unmerged APIs guarantees rework.
**⚠ Page-touching brief:** Phase B touches `OmenOfTheWeek.jsx` only — not one of the five hot files, so no cross-brief serialization conflict is expected. Still, confirm briefs 07 and 11 (which also touch pages, though not this one) have fully merged first, since this brief's correctness depends on their shipped component APIs, not just file-conflict avoidance.

---

## Objective

Build `DecisionBrief`, the premium decision surface for Omen of the Week, per `ui-component-system.md` P1.1. **Ship a narrowed v1**, not the full backlog shape. The backlog's full `DecisionBrief` shape (verdict, recommendation summary, confidence, risk, expected impact, reasoning, input honesty/signal list, alternatives, feedback slot) references three sub-compositions — `SignalList`, `RiskPanel`, `ConfidenceBar` — that **have no briefs anywhere in this queue.** Building the full shape now means inventing three more undocumented components inside this PR, which is exactly the scope creep this queue exists to prevent.

**v1 scope, explicitly:** verdict/move title, recommendation summary, confidence (via `MetricStrip`), risk (via `MetricStrip`), expected impact (via `MetricStrip`), reasoning (plain text/prose block). **Deferred to a future brief:** signal list ("input honesty"), alternatives list, feedback slot. Stub these three as a single "More detail coming soon" `EmptyState` panel or omit them entirely with a flagged gap — do not half-build them.

## Required reading (in order)

1. `Blueprints/specs/design/omen-ui-north-star-v1.md`
2. `Blueprints/specs/design/README.md`
3. `Blueprints/specs/design/legacy-doc-suppression-banners.md`
4. `Blueprints/backlog/ui-component-system.md` P1.1 — read the full intended shape, then read the v1 narrowing above and follow the narrowed scope, not the full backlog shape.
5. `Blueprints/handoffs/jules/jules-01-button.md`, `jules-03-badge-chip.md`, `jules-05-tooltip.md`, `07-state-components-empty-error-loading-brief.md`, `11-metric-strip-brief.md` — all five must be merged; read final shipped APIs, not drafts.
6. Current `frontend/src/pages/OmenOfTheWeek.jsx` in full, including its confidence-bar usage (`confidenceBarStyle` from `frontend/src/lib/confidenceGradient.js`) and its existing loading-skeleton/error-card markup that brief 07 should have already migrated — confirm that migration landed before building on top of it.

## Allowed files

**Phase A:**
- `frontend/src/components/ui/DecisionBrief.jsx` (new)
- `frontend/src/components/ui/index.js` (extend barrel)

**Phase B:**
- `frontend/src/pages/OmenOfTheWeek.jsx` only

**Both:**
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/` (new dated handoff)

## Forbidden files

- Recommendation-generation logic — anything backend, anything under `frontend/src/lib/` that computes the actual recommendation (as opposed to `confidenceGradient.js`, which is styling math and is fine to *consume*, not modify). This brief presents a recommendation it's given; it does not change how recommendations are computed.
- `frontend/src/components/ui/Button.jsx`, `Badge.jsx`, `Chip.jsx`, `Tooltip.jsx`, `MetricStrip.jsx`, `EmptyState.jsx`, `ErrorState.jsx`, `LoadingState.jsx` — consume only.
- `frontend/src/lib/confidenceGradient.js` — consume its exports, do not modify.
- `frontend/src/index.css`, `frontend/tailwind.config.js` — no changes.
- `frontend/package.json` — no new dependencies.
- Package lockfile — no changes, including accidental churn from running `npm install`.
- Any file under `Blueprints/specs/design/` or `Blueprints/backlog/ui-component-system.md`.
- Any page other than `OmenOfTheWeek.jsx`.
- Team theming tokens (`--color-team-*`) — do not resurrect.
- Do not build `SignalList`, `RiskPanel`, or `ConfidenceBar` as new standalone components in this PR — see scope note above. If existing confidence-bar styling from `confidenceGradient.js` is reused inline within `DecisionBrief`, that's fine; a new named `ConfidenceBar` *component* is not, since it hasn't been through this queue's brief process.

## Implementation requirements

```jsx
<DecisionBrief
  verdict="Start Player X over Player Y"
  summary="…"
  confidence={{ label: 'Confidence', value: '82%', tone: 'positive' }}
  risk={{ label: 'Risk', value: 'Low', tone: 'positive' }}
  expectedImpact={{ label: 'Expected Impact', value: '+4.2 pts', tone: 'positive' }}
  reasoning="…prose…"
  status="live|mock|stale|error|loading"
/>
```

- `confidence`/`risk`/`expectedImpact` each render via `MetricStrip` (11) — do not hand-roll metric display here.
- `verdict` is the visually dominant element (North Star §5 principle 1: "the call must be visually dominant") — largest text, top of the card.
- `reasoning` is supporting prose, visually subordinate to `verdict` (principle 2: "evidence second").
- `status` drives which of `LoadingState`/`ErrorState`/live content renders (07) — this replaces `OmenOfTheWeek.jsx`'s existing hand-rolled loading skeleton and error card, assuming brief 07 already did the base swap; this brief wires `DecisionBrief` itself into that same state machine rather than reintroducing a parallel one.
- Confidence coloring may use `confidenceBarStyle` from `confidenceGradient.js` directly for the confidence metric's visual treatment, passed through to `MetricStrip`'s tone or as a supplementary inline style — document which approach was used.

## Allowed variants

`status`: `live` | `mock` | `stale` | `error` | `loading` — matches the existing live/mock/stale/disconnected status vocabulary used elsewhere in the app (North Star §5 principle 3: "status is visible"). No other props beyond what's listed in the API above for v1.

## Token usage

Reads tokens only through child components (`MetricStrip`, `EmptyState`, `ErrorState`, `LoadingState`) plus its own layout chrome (`--color-surface-1`, `--color-border`, `--color-text-primary` for verdict, `--color-text-secondary` for reasoning). No raw hex.

## Accessibility requirements

- `verdict` renders as a heading (`<h2>` or `<h3>` depending on where `DecisionBrief` sits relative to the page's `<h1>` from `PageHero`, if `PageHero` has been adopted on `/omen` by the time this ships — check `OmenOfTheWeek.jsx`'s current heading structure and don't create a duplicate `<h1>`).
- Status changes (live→stale, loading→loaded) should be announced via `aria-live="polite"` on the status-sensitive region, consistent with the live/mock/stale honesty principle — a sighted user sees the badge change, a screen-reader user needs the same information.
- All child components' accessibility (Tooltip focus, MetricStrip sign/glyph, EmptyState/ErrorState/LoadingState live-region behavior) is inherited, not reimplemented.

## Phase A verification

- `npm --prefix frontend run build` — must succeed with the component present but unused.
- No committed scratch route. No screenshots required at this stage — PR description must state how verdict/summary/MetricStrip composition/status-driven rendering were checked locally across all five `status` values before Phase B wires it into the real page.

## Phase B verification

- `npm --prefix frontend run build` — must succeed.
- No automated test framework in `frontend/`; verify manually.
- Manual test of all five `status` values rendering correctly (live, mock, stale, error, loading) on the real `OmenOfTheWeek.jsx` page — it should already have code paths that produce these states; exercise each one, don't just visually inspect the default.
- Manual light/dark screenshots of all five states — required here since this is a real, live page.
- Confirm the confidence-gradient coloring still matches pre-migration visual output (spot-check a couple of confidence values against the old `confidenceBarStyle` rendering).

## Done criteria

1. `DecisionBrief.jsx` implements the **v1 narrowed** API above — verdict, summary, confidence/risk/expectedImpact via `MetricStrip`, reasoning, status-driven state rendering.
2. No `SignalList`/`RiskPanel`/`ConfidenceBar` components invented.
3. Deferred v1 gaps (signal list, alternatives, feedback slot) are either omitted with a flagged note or stubbed as a single "more detail coming" panel — not half-built.
4. All five status values manually exercised and verified, not just the default.
5. `verdict` is the visually dominant element; `reasoning` is visually subordinate.
6. No duplicate `<h1>` created if `PageHero` is already present on the page.
7. Zero raw hex.
8. Screenshots attached for all five states, both themes.
9. Ledger row + dated handoff exist.

## PR title/body template

**Title:** `[UI composition] DecisionBrief v1 — Omen of the Week decision surface (narrowed scope)`

**Body:**
```
## What
Adds DecisionBrief per ui-component-system.md P1.1, v1 narrowed scope (see brief 09 for full
rationale): verdict, summary, confidence/risk/expectedImpact via MetricStrip, reasoning,
status-driven rendering (live/mock/stale/error/loading via EmptyState/ErrorState/LoadingState).
Migrates OmenOfTheWeek.jsx.

## Explicitly deferred (not built in this PR)
SignalList, RiskPanel as standalone components, alternatives list, feedback slot.
[how the gap is presented to users: omitted | stubbed with "more detail coming" panel]

## Dependencies confirmed merged before this PR started
- Button (01): [link]
- Badge/Chip (03): [link]
- Tooltip (05): [link]
- EmptyState/ErrorState/LoadingState (07): [link]
- MetricStrip (11): [link]

## Status states verified
[live] [mock] [stale] [error] [loading] — each manually exercised, not just visually inferred

## North Star §10 self-check
[answer all 8 questions]

## Screenshots
[dark] [light] × 5 status states

## Evidence
Ledger row: [link]
Handoff: [link]
```

## Explicit non-goals

- No `SignalList`, `RiskPanel`, or `ConfidenceBar` as new standalone components.
- No alternatives list, no feedback slot in v1.
- No recommendation-generation logic changes.
- No pages other than `OmenOfTheWeek.jsx`.
- No shadcn/Radix/CVA installation.

## Downstream dependencies

None — this is currently the terminal brief in the queue's dependency chain. A future v2 brief (not yet numbered) would add `SignalList`/alternatives/feedback once those get their own queue entries.

## Risk level

**High.** Five hard dependencies means the largest integration-correctness surface in the queue — a subtle API mismatch against any of the five prerequisite components (if their shipped API drifted from what their brief described) will surface here first. The scope-narrowing decision itself is also a judgment call worth double-checking against Justin's expectations before Jules proceeds.

## Claude/Codex review checklist after Jules opens the PR

1. Confirm all five dependency briefs actually merged before this PR's base commit — check branch point, not just claims.
2. Confirm `DecisionBrief.jsx` calls the *actual shipped* `MetricStrip`/`Tooltip`/etc. APIs, not the draft APIs from their brief files (component APIs may have shifted slightly during their own review).
3. Confirm no `SignalList`/`RiskPanel`/`ConfidenceBar` components were invented despite the explicit prohibition.
4. Confirm all five status states were actually exercised (ask for the specific test steps if the PR description is vague).
5. Confirm `verdict` reads as visually dominant and `reasoning` as subordinate — this is a judgment call, look at the screenshots yourself.
6. Confirm no duplicate `<h1>`.
7. Confirm zero raw hex.
8. Confirm ledger + handoff entries exist, and that the deferred-scope decision is clearly logged for whoever picks up a future v2.
