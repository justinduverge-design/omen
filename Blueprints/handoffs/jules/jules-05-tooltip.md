# Jules brief — 05 · Tooltip / lightweight help affordance primitive

**Queue position:** 05 of 13 (`Blueprints/handoffs/jules/README.md` is the authoritative run order)
**Depends on:** none
**Status:** Phase A ready immediately. **This brief has no Phase B** — component build only, no migration, ever.
**Unblocks:** brief 11 (`MetricStrip`, explanation slot), brief 09 (`DecisionBrief`, reasoning/signal explanations)

---

## Objective

Build one component, `Tooltip`, as the North-Star-named Level-1 primitive (`omen-ui-north-star-v1.md` §4 lists `Tooltip` explicitly). **Component-only PR, no page migration, no Phase B** — same scope discipline as brief 03 (Badge/Chip). This exists so `MetricStrip`'s "explanation tooltip/help" slot (per `ui-component-system.md` P1.4) has a real implementation instead of each consumer inventing its own hover/popover logic.

## Phase A — component build only (the entirety of this brief)

## Required reading (in order)

1. `Blueprints/specs/design/omen-ui-north-star-v1.md` §4 (names `Tooltip` as a locked primitive), §6 (motion rules — hover/focus polish is an allowed motion context, but constant/repeating animation is not)
2. `Blueprints/specs/design/README.md`
3. `Blueprints/specs/design/legacy-doc-suppression-banners.md`
4. `Blueprints/handoffs/jules/jules-01-button.md` — no-new-deps precedent and styling idiom.
5. No dedicated `component-lock-v1.md` section covers Tooltip — same situation as Badge/Chip. Do not invent scope beyond what `MetricStrip`'s known need requires: a short text explanation on hover/focus of an info affordance.

## Implementation requirements

```jsx
<Tooltip content="Value Over Replacement Player — how much better this side is than a replacement-level option.">
  <InfoIcon />
</Tooltip>
```

- Trigger is whatever child is passed in (icon, text, badge) — `Tooltip` wraps it and adds hover + keyboard-focus behavior.
- Content is plain text only in this PR — no rich content (links, lists, nested components) inside the tooltip body. If a future consumer needs rich content, that's a variant to propose later.
- Positioning: default to `top`, with a `side="top|bottom|left|right"` prop and basic viewport-edge flip-avoidance is **out of scope for a from-scratch build** — without Radix/Floating UI (not installed, and not to be installed per the no-new-deps rule), robust collision detection is nontrivial. Ship a simple fixed-position tooltip (CSS `position: absolute` relative to trigger) for the common case, and explicitly flag in the PR that edge-of-viewport collision handling is not implemented. Do not attempt to hand-roll a full floating-UI collision system in this PR — that's scope creep for a P0-adjacent primitive.
- Delay: small show delay (150–200ms) to avoid tooltip flicker on fast mouse movement across a dense row (e.g. a `MetricStrip` full of tooltipped values) — matches the North Star's existing 150ms motion-timing convention referenced in `design-done.md` gate 8.

## Allowed variants

- `side`: `top` (default) | `bottom` | `left` | `right`. No auto-flip logic.
- No size variants — one text size (`body-sm` role, 13/20).
- No "always visible" / non-hover variant in this PR.

## Token usage

`--color-surface-2` or `--color-surface-3` for the tooltip background (needs to read as elevated above card surfaces — verify against existing `--color-surface-*` stack), `--color-text-primary` for text, `--color-border` for a hairline edge if used. No raw hex. No new tokens.

## Accessibility requirements

- Trigger must be reachable by keyboard (Tab) and the tooltip must show on `focus`, not just `mouseenter` — this is the actual accessibility requirement, not optional polish, since it's explicitly named in the objective ("lightweight help affordance").
- Tooltip content is announced to screen readers via `aria-describedby` linking trigger to tooltip content, not via `title` attribute alone (title has poor screen-reader support and delayed/inconsistent triggering).
- Dismissible via `Escape` when triggered by focus.
- `prefers-reduced-motion` — the show/hide transition (if any fade/scale is added) must be instant instead of animated when reduced motion is requested (design-done.md gate 9).
- Tooltip must not be the only way to access critical information — it's supplementary explanation, not a hidden requirement (consistent with North Star §5 "evidence second" principle: the tooltip explains, it doesn't gatekeep).

## Phase A allowed files

- `frontend/src/components/ui/Tooltip.jsx` (new)
- `frontend/src/components/ui/index.js` (extend existing barrel if present)
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/` (new dated handoff)

## Forbidden files (applies to this brief's only phase, Phase A)

- **No page files** — same constraint as brief 03. Do not touch any page or component outside `components/ui/`.
- `frontend/src/index.css`, `frontend/tailwind.config.js` — no changes.
- `frontend/package.json` — no new dependencies. In particular, do not add `@floating-ui/react` or any positioning library; the simple fixed-position approach above is the deliberate scope boundary.
- Package lockfile — no changes, including accidental churn from `npm install`.
- Any other `components/ui/*` primitive file.
- Any file under `Blueprints/specs/design/` or `Blueprints/backlog/ui-component-system.md`.
- Team theming tokens (`--color-team-*`) — do not resurrect.

## Phase A verification

- `npm --prefix frontend run build` — must succeed with the component present but unused.
- No committed scratch route. No screenshots required — this component isn't used on any real page yet (that happens when brief 11 or 09 adopt it in their own Phase B).
- No automated test framework in `frontend/`. PR body must state how hover/focus/keyboard/reduced-motion behavior was manually verified, since there's no fixture route in this PR.
- Manual keyboard test: Tab to trigger, tooltip appears, `Escape` dismisses.
- Manual `prefers-reduced-motion: reduce` emulation check (DevTools).

## Done criteria

1. `Tooltip.jsx` exists, implements the API above, zero raw hex.
2. Keyboard focus triggers the tooltip (not just mouse hover) — verified and documented.
3. `aria-describedby` wiring present, not `title`-attribute-only.
4. Reduced-motion respected.
5. Zero page files touched, zero new dependencies.
6. PR explicitly states the viewport-collision limitation (no auto-flip) as a known, deliberate gap.
7. Ledger row + dated handoff exist.

## PR title/body template

**Title:** `[UI primitive] Tooltip — lightweight help affordance (no migration)`

**Body:**
```
## What
Adds Tooltip per omen-ui-north-star-v1.md §4. Component-only PR — no page migration, no Phase B.
Unblocks: MetricStrip (11) explanation slot, DecisionBrief (09) reasoning/signal explanations.

## Known limitation (deliberate)
No viewport-edge collision/auto-flip logic — ships as fixed top/bottom/left/right positioning
only. Full floating-UI collision handling would require a new dependency, which is out of
scope per the no-new-deps rule. Revisit if a real overflow case appears during MetricStrip
or DecisionBrief adoption.

## Accessibility verification
[keyboard focus test, aria-describedby check, reduced-motion check — how each was done]

## Evidence
Ledger row: [link]
Handoff: [link]
```

## Explicit non-goals

- No viewport collision/auto-flip.
- No rich tooltip content (links, lists, nested interactive elements).
- No page migration.
- No new positioning/floating-UI dependency.
- No "always visible" popover variant.

## Which later briefs depend on this

- **11 MetricStrip** — explanation tooltip/help slot per `ui-component-system.md` P1.4. If this brief hasn't shipped when 11 is ready, `MetricStrip`'s tooltip slot should stub to a native `title` attribute fallback rather than blocking, per that brief's own scoping note — but real `Tooltip` is preferred once available.
- **09 DecisionBrief** — hard-depends on this brief (see brief 09's dependency list); reasoning/signal-list items use it for inline explanations once both exist.

## Risk level

**Low.** No page touches. Main risk is scope creep into a full positioning-library reimplementation — the brief explicitly caps that.

## Review notes for Claude/Codex after Jules opens the PR

1. Confirm zero page files in the diff.
2. Confirm keyboard-focus trigger actually works (test it, don't take the PR description's word for it) and that `aria-describedby` is real, not decorative.
3. Confirm reduced-motion handling.
4. Confirm the viewport-collision limitation is documented, not silently missing.
5. Confirm zero raw hex, zero new dependencies.
6. Confirm ledger + handoff entries exist.
