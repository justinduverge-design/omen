# Jules brief — 03 · Badge / Chip primitive

**Queue position:** 3 of 11 (added 2026-07-15 as a dependency gap-fill — see `Blueprints/handoffs/jules/README.md` for the authoritative run order)
**Depends on:** none
**Status:** ready to run immediately (component build only — no migration in this brief, see scope note)
**Unblocks:** brief 08 (`PlatformConnectionCard`), brief 09 (`PlayerRow`/`PlayerChip`), and gives brief 04 (`PageHero`) and brief 11 (`DecisionBrief`) a real `trailing`/status-chip implementation instead of ad-hoc markup.

---

## Objective

Build two small, closely related components — `Badge` and `Chip` — as locked Level-1 primitives per `omen-ui-north-star-v1.md` §4. **This brief builds the components only. It does not migrate any page.** Repo inspection (2026-07-15) found badge/chip-like markup scattered across 13+ files (`LeagueStandings.jsx`, `MoveHistory.jsx`, `PlatformConnections.jsx`, `ConnectLeague.jsx`, `DraftAssistant.jsx`, `Football.jsx`, `Landing.jsx`, `Omen.jsx`, `OmenOfTheWeek.jsx`, `Standings.jsx`, `StartSit.jsx`, `TradeAnalyzer.jsx`, `TradeShare.jsx`, `WaiverWire.jsx`) — sweeping all of that in one PR would violate the "favor smaller PRs" rule and would collide with nearly every other brief's migration files. Downstream briefs (08, 09) each adopt `Badge`/`Chip` narrowly, in their own scope, when they need it.

## Required reading (in order)

1. `Blueprints/specs/design/omen-ui-north-star-v1.md` §4 (Level 1 primitive list names `Badge` and `Chip` explicitly)
2. `Blueprints/specs/design/README.md`
3. `Blueprints/specs/design/legacy-doc-suppression-banners.md`
4. `Blueprints/handoffs/jules/jules-01-button.md` — read for the no-new-deps precedent and styling idiom; do not re-derive it.
5. There is no `component-lock-v1.md` section dedicated to Badge/Chip — that doc's six locked systems are Button, Input, Segmented control, Card, Type scale, Spacing. Badge/Chip is North-Star-only scope; do not invent API surface beyond what's needed for the known consumers below.

## Implementation requirements

Build two components since they serve different jobs, but keep them in one file or two adjacent files sharing a base:

### `Badge`

Status/state indicator — short, often paired with a dot or icon. Known current uses this must be able to replace: connection status ("Connected", "Disconnected", "Needs reconnect" in `PlatformConnections.jsx`/`ConnectLeague.jsx`), live/mock/stale data indicators (`--color-data-live`/`--color-data-mock`/`--color-data-stub`/`--color-data-unavailable` tokens already exist in `index.css`).

```jsx
<Badge tone="live|mock|stale|unavailable|success|risk|neutral" size="sm|md">
  Connected
</Badge>
```

### `Chip`

Compact label/tag — used for position tags, chant/moment labels, "THE 305"-style trailing decorations in `PageHero`, mode tags. Not interactive by default (no built-in click handler contract in this PR — if a consumer needs a clickable chip, that's a variant to add later, not now).

```jsx
<Chip tone="accent|omen|neutral|pos-rb|pos-wr|pos-qb|pos-te|pos-def|pos-k" size="sm|md">
  RB
</Chip>
```

Position tones read the existing `--color-pos-*` tokens already defined in `index.css` (rb/wr/qb/te/def/k, both dark and light variants exist). Do not invent new position tokens.

## Allowed variants

- `Badge` tone: `live`, `mock`, `stale`, `unavailable` (reading `--color-data-*` tokens), `success` (`--color-risk-low`), `risk` (`--color-risk-high`), `neutral` (`--color-text-secondary`/`--color-surface-2`). No other tones.
- `Chip` tone: `accent`, `omen`, `neutral`, and the six `pos-*` position tones. No other tones.
- Both: `size` = `sm` | `md` only. No `lg`.
- No animated/pulsing variant in this PR — motion is a separate future concern per North Star §6, and "constant animated" chrome is explicitly disallowed there.

## Token usage

`--color-data-live`, `--color-data-mock`, `--color-data-stub`, `--color-data-unavailable`, `--color-risk-low`, `--color-risk-high`, `--color-text-secondary`, `--color-surface-2`, `--color-accent`, `--color-omen`, `--color-pos-rb`, `--color-pos-wr`, `--color-pos-qb`, `--color-pos-te`, `--color-pos-def`, `--color-pos-k`, and their `--color-on-*`/contrast pairs where they exist. All already defined in `frontend/src/index.css` — do not add, rename, or change values. No raw hex in the component.

## Accessibility requirements

- Color is never the only differentiator (North Star §7 rule) — `Badge` must render a text label, not just a colored dot. If a dot-only compact mode is added later, it needs an `aria-label`; not in scope now.
- Minimum text contrast AA against each tone's background in both themes — verify against the light-mode token values in `index.css` (`:root[data-theme="light"]` block), which differ from dark.
- `Chip`/`Badge` are inline, non-interactive elements by default — no button semantics, no implicit focus stop, unless a future variant adds `onClick` (not in this PR).

## Allowed files

- `frontend/src/components/ui/Badge.jsx` (new)
- `frontend/src/components/ui/Chip.jsx` (new)
- `frontend/src/components/ui/index.js` (extend existing barrel if present from brief 01/02/04)
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/` (new dated handoff)

## Forbidden files

- **No page files at all in this brief** — this is the key constraint distinguishing it from every other queued brief. Do not touch `ConnectLeague.jsx`, `TradeAnalyzer.jsx`, `DraftAssistant.jsx`, `Football.jsx`, `Landing.jsx`, `Omen.jsx`, `OmenOfTheWeek.jsx`, `Standings.jsx`, `StartSit.jsx`, `TradeShare.jsx`, `WaiverWire.jsx`, or any component under `components/league/`, `components/moves/`, `components/platforms/`.
- `frontend/src/index.css`, `frontend/tailwind.config.js`, `frontend/package.json` / lockfile.
- `frontend/src/components/ui/Button.jsx`, `Input.jsx`, `Textarea.jsx`, `PageHero.jsx` — do not modify existing primitives.
- Any file under `Blueprints/specs/design/` or `Blueprints/backlog/ui-component-system.md`.
- Team theming tokens (`--color-team-*`) — do not wire Badge/Chip tone to team color.

## Testing / build commands

- `npm --prefix frontend run build` — must succeed with the new components present but unused (no consumer imports them yet in this PR — that's expected and correct).
- No automated component tests exist in `frontend/` (confirmed). Verification is a small standalone check: temporarily render both components with all documented tones/sizes in `frontend/src/pages/NotFound.jsx` or a scratch route is **not** allowed (that would be an unrequested page edit) — instead verify via a local Storybook-less manual render is acceptable only in a throwaway branch that is not part of the PR diff, or via a quick script/Vite dev inspection that leaves no trace in the committed files. State in the PR description how visual verification was done since there's no in-repo fixture to point to.

## Done criteria

1. `Badge.jsx` and `Chip.jsx` exist, implement the full variant list above, zero raw hex.
2. Zero page files touched.
3. Zero new dependencies.
4. Both light and dark token values verified for AA contrast (documented in PR body, not just claimed).
5. Ledger row + dated handoff exist.

## PR title/body template

**Title:** `[UI primitive] Badge + Chip — status and label primitives (no migration)`

**Body:**
```
## What
Adds Badge and Chip per omen-ui-north-star-v1.md §4. Component-only PR — no page migration.
Unblocks: PlatformConnectionCard (08), PlayerRow/PlayerChip (09), PageHero trailing slot, DecisionBrief (11).

## Why no migration here
13+ files have drifted badge/chip markup. Sweeping them in one PR would violate the
"favor smaller PRs" rule and collide with nearly every other queue item's own migration
scope. Each consuming brief adopts Badge/Chip narrowly within its own PR.

## Verification
[how tones/sizes/contrast were checked, since no fixture route exists]

## Evidence
Ledger row: [link]
Handoff: [link]
```

## Explicit non-goals

- No page migration of any kind.
- No clickable/interactive chip variant.
- No dot-only compact badge mode.
- No animation/pulse states.
- No new position or status tokens — only wraps what already exists in `index.css`.
- No shadcn/Radix/CVA installation.
- No team-color wiring.

## Which later briefs depend on this

- **08 PlatformConnectionCard** — needs `Badge` for connection status, needs `Chip`/`Badge`-adjacent for the platform identity marker (may still need a dedicated `PlatformBadge` composition — flag that gap again if it emerges, don't build it here).
- **09 PlayerRow / PlayerChip** — needs `Chip` for the position tag (`pos-*` tones exist specifically for this).
- **11 DecisionBrief** — likely wants `Badge` for risk/confidence-adjacent labeling, though its primary confidence/risk display is `MetricStrip` (10), not this.
- **04 PageHero** — its `trailing` slot example in `component-lock-v1.md` §5 (`<Chip>THE 305</Chip>`) can be filled for real once this merges, but PageHero does not require this brief to ship first (the slot accepts any `ReactNode` already).

## Risk level

**Low.** No page touches at all — the lowest file-conflict risk in the queue. Primary risk is scope creep into a page sweep; the brief explicitly forbids that.

## Review notes for Claude/Codex after Jules opens the PR

1. Confirm literally zero page files appear in the diff.
2. Confirm zero raw hex.
3. Confirm both `Badge` and `Chip` read existing tokens only — no new CSS variables invented for position/status colors.
4. Confirm the PR description explains how visual/contrast verification was done, given there's no in-repo fixture.
5. Confirm ledger + handoff entries exist.
