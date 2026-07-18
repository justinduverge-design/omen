# Jules brief — 01-B (slice 1 of 4) · Button Phase B — ConnectLeague.jsx only

**⚠ SUPERSEDED for execution purposes:** Phase B page migration work moved to a local-agent track (Claude Code/Codex) because Jules cannot run a dev server for live visual/functional verification. See `Blueprints/prompts/phase-b-local-agent-README.md` and `Blueprints/prompts/phase-b-local-agent-01-connectleague.md`, which covers this same page but consolidated with every applicable primitive (Button, Input, Badge, PlatformBadge, PlatformConnectionCard, SegmentedControl) in one pass rather than Button alone. This file is kept for historical/reasoning reference (the "why ConnectLeague first" rationale still applies) — do not execute it as a standalone Jules PR.

**Parent brief:** `jules-01-button.md` — this is a narrower cut of that brief's existing "Phase B — page migration only" section, not a new component or new API. `Button.jsx` Phase A is already merged (PR #125); this brief covers only the first migration target.
**Queue position:** First Phase B PR to run, now that all 19 Phase A primitives are confirmed merged to `main` (through PR #138).
**Depends on:** `Button.jsx` (Phase A, merged).
**Status:** Ready now.
**⚠ Page-touching brief:** Touches `ConnectLeague.jsx` only — one of the five hot files. **Do not run any other brief's Phase B against `ConnectLeague.jsx` in parallel** (in particular, do not overlap with a future `08-B` PlatformConnectionCard migration on this same file — sequence after this PR merges).

---

## Why ConnectLeague first, not all four pages in one PR

`jules-01-button.md`'s existing Phase B section bundles `ConnectLeague.jsx`, `TradeAnalyzer.jsx`, `DraftAssistant.jsx`, and `Landing.jsx` into one migration. Splitting that into four serialized single-page PRs, starting with `ConnectLeague.jsx`, is safer for this first Phase B execution because:

- No naming collisions. `TradeAnalyzer.jsx` has local `SegmentedControl` and `PlayerRow` functions that will collide with canonical imports and need renaming — that's real risk to isolate into its own PR, not bundle with the first-ever Phase B migration.
- No ARIA-combobox surface. `TradeAnalyzer.jsx`'s `PlayerRow` implements a full keyboard-nav combobox pattern; touching that file for buttons alone raises the chance of scope creep into the combobox. `ConnectLeague.jsx` has no equivalent complexity.
- No team-theming adjacency. `Landing.jsx`'s `Button` also collides by name with the canonical import, and `Football.jsx` (not a target of brief 01, but downstream) has inert team-theme-conditional code nearby that any careless pass could disturb. `ConnectLeague.jsx` has neither.
- Smallest reviewable diff for a first-of-its-kind PR, so the review checklist below can be validated cheaply before it's reused for the remaining three pages.

The remaining three pages (`TradeAnalyzer.jsx`, `DraftAssistant.jsx`, `Landing.jsx`) should each become their own follow-up Phase B PR, in that order, each one merging before the next opens — reusing `jules-01-button.md`'s existing Phase B spec, allowed-files list, and verification steps for those pages. This brief does not re-litigate that spec; it only narrows the first slice.

## Objective

Replace `ConnectLeague.jsx`'s local one-off button implementations with the canonical `Button` primitive. No component changes — if `Button.jsx` needs new capability, that's a revision to Phase A, not a workaround here. No other files.

## Required reading (in order)

1. `Blueprints/handoffs/jules/jules-01-button.md` in full (canonical API, Phase B migration targets list, forbidden files, PR templates — this brief inherits all of it, scoped to one page)
2. `Blueprints/handoffs/jules/README.md` — confirm current serialization status before opening this PR (no other Phase-B PR should be in flight against `ConnectLeague.jsx`)
3. `frontend/src/components/ui/Button.jsx` (merged Phase A implementation — the actual API surface, not just the spec)
4. `frontend/src/pages/ConnectLeague.jsx` in full

## Migration targets in this file

- `CTAButton` — used for Sleeper/Yahoo/ESPN connect actions. Uses `platformButtonStyle(platform)` from `frontend/src/lib/platformChip.js` for per-platform brand coloring. Per `jules-01-button.md`'s existing guidance: move platform brand coloring off `Button` chrome onto a `leadingIcon` slot only — do not build `PlatformBadge` in this PR (that's brief 12/08's job); note the gap in the PR description if the visual result is imperfect.
- `GhostButton` — secondary/cancel actions. Maps to `Button variant="tertiary"` or `"secondary"` (pick whichever matches current visual weight most closely; note the choice in the PR description).
- Raw `<button>` elements in the ESPN cookie-guide browser picker (Chrome/Edge, Firefox, Safari) — **do not migrate these to `Button`.** They're a `SegmentedControl` (brief 06) candidate, out of scope for this brief. Leave them as-is.
- Footer "Continue" / "Skip" raw buttons.
- `ErrorMsg` uses a raw `text-red-400` Tailwind literal — **out of scope for this brief** (not a button), but note it in the PR description as an existing drift item for a future cleanup pass. Do not fix it here; fixing it would expand this PR's diff beyond "buttons only."

## Allowed files

- `frontend/src/pages/ConnectLeague.jsx`
- `Blueprints/playbooks/skill-usage-ledger.md` (append a row)
- `Blueprints/handoffs/` (new dated handoff)

## Forbidden files

- `frontend/src/components/ui/Button.jsx` — Phase A is merged and locked; if a gap is found, stop and flag rather than editing it silently in a Phase B PR.
- `frontend/src/index.css`, `frontend/tailwind.config.js` — no token changes.
- `frontend/package.json` and lockfile — no new dependencies.
- `frontend/src/pages/TradeAnalyzer.jsx`, `frontend/src/pages/DraftAssistant.jsx`, `frontend/src/pages/Landing.jsx`, `frontend/src/pages/Football.jsx` — separate PRs, per the serialization note above.
- `frontend/src/lib/platformChip.js` — consume it, don't restructure it.
- Any file under `Blueprints/specs/design/` or `Blueprints/backlog/ui-component-system.md`.
- Auth, API, OAuth, or Supabase session logic in `ConnectLeague.jsx` (Sleeper resolve/connect/disconnect, Yahoo OAuth, ESPN cookie connect/disconnect, `consumeNextUrl`/`storeNextUrl`) — button chrome only, zero behavior change.
- Team theming tokens (`--color-team-*`) — do not resurrect (not present in this file today; keep it that way).

## Phase B verification

- `npm --prefix frontend run build` — must succeed.
- Manual visual check in both `data-theme="dark"` and `data-theme="light"` — screenshots attached to the PR.
- Manual keyboard check: Tab to each migrated button, confirm focus-visible ring appears.
- Manual functional check: Sleeper connect/disconnect, Yahoo OAuth kickoff, ESPN cookie connect/disconnect, and the Continue/Skip footer all still work — behavior must be unchanged, only chrome changes.

## Done criteria

1. `CTAButton` and `GhostButton` are fully removed from `ConnectLeague.jsx` — no dead code left behind.
2. Footer Continue/Skip buttons use canonical `Button`.
3. ESPN browser-picker buttons and `ErrorMsg`'s raw color are explicitly untouched (confirm via diff).
4. Zero raw hex; zero new dependencies; zero lockfile diff.
5. Light/dark screenshots attached.
6. Ledger row + dated handoff exist.
7. PR description states the `leadingIcon`-only platform-coloring deferral and the `variant="tertiary"` vs `"secondary"` choice for `GhostButton`.

## PR title/body template

**Title:** `[UI primitive · Phase B, slice 1/4] Button — ConnectLeague.jsx migration`

**Body:**
```
## What
Migrates ConnectLeague.jsx to canonical Button (Phase A: PR #125, merged).
First of four serialized single-page Phase B slices for brief 01 — see
Blueprints/handoffs/jules/01-b-connectleague-button-phase-b-brief.md for why this
was split from jules-01-button.md's original 4-page Phase B bundle.

## Serialization note
Only ConnectLeague.jsx touched. TradeAnalyzer.jsx, DraftAssistant.jsx, and Landing.jsx
remain for follow-up PRs using jules-01-button.md's existing Phase B spec, each
serialized to merge before the next opens.

## Deferred gaps
- Platform brand coloring moved to leadingIcon-only; full PlatformBadge/PlatformConnectionCard
  treatment lands in a later brief (08/12).
- ESPN browser-picker buttons intentionally left raw — SegmentedControl candidate, brief 06.
- ErrorMsg's raw text-red-400 literal intentionally left untouched — noted as existing drift,
  not in scope here.

## North Star §10 self-check
[answer all 8 questions]

## Screenshots
[dark] [light]

## Evidence
Ledger row: [link]
Handoff: [link]
```

## Explicit non-goals

- No changes to `TradeAnalyzer.jsx`, `DraftAssistant.jsx`, `Landing.jsx`, or `Football.jsx`.
- No `PlatformBadge`, `PlatformConnectionCard`, or `SegmentedControl` work.
- No fix to the `ErrorMsg` raw-hex drift.
- No auth/API/OAuth behavior changes.
- No deploy — this lands on the dev/demo environment per standard flow; do not promote to production as part of this PR. Confirm with Justin before any prod deploy step.

## Risk level

**Low.** Single file, no naming collisions, no ARIA complexity, no team-theming adjacency, real business logic clearly fenced off by the forbidden-files list.

## Claude/Codex review checklist after Jules opens the PR

1. Confirm only `ConnectLeague.jsx` (plus ledger/handoff) changed — no other page touched.
2. Confirm `CTAButton`/`GhostButton` fully removed, not left dead.
3. Confirm ESPN browser-picker buttons and `ErrorMsg` were left untouched.
4. Confirm zero raw hex, zero new deps, zero lockfile diff.
5. Confirm light/dark screenshots attached.
6. Confirm Sleeper/Yahoo/ESPN connect-disconnect flows and Continue/Skip footer still function (behavior unchanged).
7. Confirm ledger + handoff entries exist.
8. Confirm this PR does not merge until `README.md`'s serialization status is clear, and that it explicitly clears the way for the next slice (`TradeAnalyzer.jsx`) rather than bundling it in.
