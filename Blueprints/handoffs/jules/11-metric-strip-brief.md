# Jules brief — 11 · MetricStrip

**Queue position:** 11 of 13
**Depends on:** **01 Button** (soft — only if a metric ever needs an inline action, otherwise not strictly required), **05 Tooltip** (soft — explanation slot; falls back to a native `title` attribute if 05 hasn't merged yet, see below)
**Status:** Ready once 01 has merged. Does not need to wait on 05 if a `title`-attribute fallback is acceptable for the explanation slot — Jules should check whether 05 has merged and use the real `Tooltip` if so, otherwise use the fallback and flag it for a follow-up swap.
**⚠ Page-touching brief:** Phase B touches `TradeAnalyzer.jsx` and `DraftAssistant.jsx` (two of five hot files). **Do not run Phase B in parallel with any other brief's Phase B against these files.**

---

## Objective

Build `MetricStrip`, the standard display for VORP, confidence, risk, expected value, ADP, and matchup-delta values, per `ui-component-system.md` P1.4. This replaces one-off metric displays currently hand-rolled per page (e.g. the VORP tooltip already present in `TradeAnalyzer.jsx` around the "Value Over Replacement Player" explanation text).

## Required reading (in order)

1. `Blueprints/specs/design/omen-ui-north-star-v1.md`
2. `Blueprints/specs/design/README.md`
3. `Blueprints/specs/design/legacy-doc-suppression-banners.md`
4. `Blueprints/backlog/ui-component-system.md` P1.4
5. `Blueprints/handoffs/jules/jules-01-button.md`, `jules-05-tooltip.md` — read final shipped APIs if merged; if 05 is not yet merged, read its brief anyway to understand the intended future integration shape.
6. `frontend/src/lib/confidenceGradient.js` — existing confidence-to-color logic used by `OmenOfTheWeek.jsx` (`confidenceBarStyle` import). `MetricStrip` should be able to consume this for confidence-type metrics rather than reimplementing gradient math.
7. Current `frontend/src/pages/TradeAnalyzer.jsx` VORP display (~line 365 area) and `frontend/src/pages/DraftAssistant.jsx` ADP display (~lines 96–130) for existing patterns to replace.

## Allowed files

**Phase A:**
- `frontend/src/components/ui/MetricStrip.jsx` (new)
- `frontend/src/components/ui/index.js` (extend barrel)

**Phase B:**
- `frontend/src/pages/TradeAnalyzer.jsx` — VORP display in the trade result panel.
- `frontend/src/pages/DraftAssistant.jsx` — ADP chips/display, draft recommendation card metrics.

**Both:**
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/` (new dated handoff)

## Forbidden files

- `frontend/src/lib/confidenceGradient.js` — consume its exports, do not modify its gradient math in this PR.
- `frontend/src/components/ui/Button.jsx`, `Tooltip.jsx` — consume, do not modify.
- `frontend/src/index.css`, `frontend/tailwind.config.js` — no changes.
- `frontend/package.json` — no new dependencies.
- Package lockfile — no changes, including accidental churn from running `npm install`.
- Any file under `Blueprints/specs/design/` or `Blueprints/backlog/ui-component-system.md`.
- Any page other than the two listed. In particular, do not touch `OmenOfTheWeek.jsx`'s confidence bar in this PR even though it uses related gradient logic — that page is brief 09's (DecisionBrief) territory; coordinate rather than reaching into it here.
- Team theming tokens (`--color-team-*`) — do not resurrect.

## Implementation requirements

```jsx
<MetricStrip
  label="VORP"
  value="12.4"
  delta="+2.1"
  tone="positive|negative|neutral"
  explanation="Value Over Replacement Player — how much better this side is than a replacement-level option."
/>
```

- `label`/`value`/`delta` are plain text/number display — no calculation logic lives in this component, it only formats and colors what it's given.
- `tone` drives delta color: `positive` reads a success-adjacent token, `negative` reads a risk-adjacent token, `neutral` reads `--color-text-secondary`. Do not invent a fourth tone.
- `explanation`: if `Tooltip` (05) has merged, wrap the label in `<Tooltip content={explanation}>`; if not yet merged, render a native `title` attribute on the label as a temporary fallback and add a `// TODO: swap to <Tooltip> once brief 05 merges` comment plus a note in the PR description — this is a deliberate, documented interim state, not a silent gap.
- Confidence-type metrics may consume `confidenceBarStyle` from `confidenceGradient.js` for their coloring instead of the generic `tone` prop, when the metric specifically represents confidence — document which path (generic tone vs. confidence gradient) each migrated instance uses.

## Allowed variants

`tone`: `positive` | `negative` | `neutral`. No size variants — one strip height, designed to sit in a row of several (hence "strip"). No layout variant beyond horizontal (label/value/delta in a row) — a future stacked/vertical variant is not in scope.

## Token usage

`--color-risk-low` (positive delta), `--color-risk-high` (negative delta), `--color-text-secondary` (neutral delta), `--color-text-primary` (value), `--color-text-tertiary` (label). For confidence-specific metrics: whatever `confidenceGradient.js` already exports (do not duplicate its token reads locally). No raw hex, no new tokens.

## Accessibility requirements

- Delta tone (positive/negative) must be paired with a visible `+`/`-` sign or arrow glyph, not color alone — consistent with North Star §7.
- If using the `Tooltip` (05) integration, inherits its accessibility (keyboard focus, `aria-describedby`) automatically — don't rebuild that here.
- If using the `title`-attribute fallback, note in the PR that this is a known-weaker accessibility path (title has poor screen-reader support) and is explicitly temporary, not a permanent design decision.

## Phase A verification

- `npm --prefix frontend run build` — must succeed with the component present but unused.
- No committed scratch route. No screenshots required at this stage — PR description must state how all three tones and the confidence-gradient variant were checked locally.

## Phase B verification

- `npm --prefix frontend run build` — must succeed.
- No automated test framework in `frontend/`; verify manually.
- Manual check that VORP and ADP values displayed via the new component match the values previously shown by the old markup (a formatting regression here would be a data-trust issue, not just a style issue — spot-check a few real values).
- Manual light/dark screenshots of `MetricStrip` in all three tones, plus the confidence-gradient variant if used, on the real migrated pages — required here since these are real, live pages.

## Done criteria

1. `MetricStrip.jsx` exists, implements the API above, zero raw hex.
2. Explanation slot uses real `Tooltip` if 05 has merged, or a clearly-flagged `title` fallback with a TODO if not.
3. Confidence-type metrics correctly reuse `confidenceGradient.js` rather than reimplementing gradient math.
4. VORP and ADP displayed values spot-checked against pre-migration output for correctness.
5. Delta tone always paired with a sign/glyph, not color-only.
6. Screenshots attached.
7. Ledger row + dated handoff exist.

## PR title/body template

**Title:** `[UI composition] MetricStrip — standard metric display (VORP/ADP first)`

**Body:**
```
## What
Adds MetricStrip per ui-component-system.md P1.4. Migrates VORP display in TradeAnalyzer.jsx
and ADP display in DraftAssistant.jsx.

## Tooltip integration status
[Tooltip (05) merged — using real <Tooltip> | Tooltip (05) not yet merged — using title-attribute
fallback with TODO, see MetricStrip.jsx line N]

## Confidence gradient reuse
[which migrated instances, if any, use confidenceGradient.js vs. the generic tone prop]

## Value correctness spot-check
[specific VORP/ADP values compared pre/post migration]

## North Star §10 self-check
[answer all 8 questions]

## Screenshots
[dark] [light] × 3 tones

## Evidence
Ledger row: [link]
Handoff: [link]
```

## Explicit non-goals

- No metric calculation logic — display/formatting only.
- No touching `confidenceGradient.js` internals.
- No `OmenOfTheWeek.jsx` migration (deferred to brief 09).
- No vertical/stacked layout variant.
- No shadcn/Radix/CVA installation.

## Downstream dependencies

**09 DecisionBrief — hard depends on this brief.** DecisionBrief's confidence/risk/expected-impact display is built from `MetricStrip`. Do not start 09 until this brief has merged.

## Risk level

**Medium.** Value-correctness (VORP/ADP must display the same numbers as before) is the main risk — a formatting bug here erodes user trust in the numbers Omen shows, which is core to the product's "roster decision assistant" job per the North Star.

## Claude/Codex review checklist after Jules opens the PR

1. Confirm displayed VORP/ADP values match pre-migration output exactly (spot-check the PR's documented comparison).
2. Confirm the Tooltip-vs-fallback decision is correctly stated and matches what's actually in the code.
3. Confirm delta tone always shows a sign/glyph, not color-only.
4. Confirm `confidenceGradient.js` wasn't modified.
5. Confirm zero raw hex, zero new tokens.
6. Confirm no concurrent Phase-B collision on TradeAnalyzer/DraftAssistant.
7. Confirm ledger + handoff entries exist.
