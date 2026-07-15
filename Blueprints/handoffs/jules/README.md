# Jules UI Implementation Brief Queue — Omen

**Date:** 2026-07-15 (updated same day — added briefs 06–13, corrected PlatformBadge dependency)
**Status:** Active queue index — authoritative run order
**Authority chain:** `Blueprints/specs/design/omen-ui-north-star-v1.md` → `Blueprints/specs/design/README.md` → `Blueprints/backlog/ui-component-system.md` → this file → individual briefs in this directory.

This file does not change the North Star, the design README, the suppression banners, or the component backlog. It is operational sequencing only — which brief runs when, and which ones must not run concurrently.

---

## The rule that drives everything below

**Jules builds primitives first, then migrates pages second.** Every brief in this queue is really two PRs:

- **Phase A — component build.** New/reworked file(s) under `frontend/src/components/ui/`. Touches no page (unless the brief explicitly justifies a tiny inline usage example in the PR description, never a committed page route). Always safe to run in parallel with any other Phase A, **provided the dependency graph below is respected** — Phase A of a composition brief still needs its primitive dependencies merged first, even though it touches no pages.
- **Phase B — page migration.** Swaps page-local markup for the new component. Only safe to run in parallel with another brief's Phase B if the two briefs touch **zero overlapping page files**.

The five hot files — `ConnectLeague.jsx`, `TradeAnalyzer.jsx`, `DraftAssistant.jsx`, `Football.jsx`, `Landing.jsx` — are where almost every brief's Phase B collides. Any brief touching one of these five must be serialized against every other brief touching the same file. Do not open two Phase-B PRs against the same hot file at the same time, even if their component halves (Phase A) are unrelated.

---

## Full queue (13 briefs)

| # | Brief | File | Depends on | Hot files touched (Phase B) | Status |
|---|---|---|---|---|---|
| 01 | Button | `jules-01-button.md` | none | ConnectLeague, TradeAnalyzer, DraftAssistant, Landing | **Written** |
| 02 | Input / Textarea | `jules-02-input-textarea.md` | none (shares files w/ 01) | ConnectLeague, TradeAnalyzer, DraftAssistant | **Written** |
| 03 | Badge / Chip | `jules-03-badge-chip.md` | none | *(none — component-only)* | **Written** |
| 04 | PageHero | `jules-04-pagehero.md` | none | Football, DraftAssistant, ConnectLeague *(+ OmenPage, WaiverWire — not hot)* | **Written** |
| 05 | Tooltip | `jules-05-tooltip.md` | none | *(none — component-only)* | **Written** |
| 06 | SegmentedControl + TabNav + RadioCardGroup | `06-segmented-control-tabnav-radio-card-group-brief.md` | none | TradeAnalyzer, DraftAssistant, Football, ConnectLeague *(+ Account.jsx — not hot)* | **Written** |
| 07 | EmptyState / ErrorState / LoadingState | `07-state-components-empty-error-loading-brief.md` | **01** (hard) | Football, TradeAnalyzer, DraftAssistant *(+ OmenOfTheWeek, Ledger, Standings — not hot)* | **Written** |
| 08 | PlatformConnectionCard | `08-platform-connection-card-brief.md` | **01, 03, 12** (all hard) | ConnectLeague only | **Written** |
| 09 | DecisionBrief | `09-decision-brief-brief.md` | **01, 03, 05, 07, 11** (all hard) | *(none hot — OmenOfTheWeek.jsx only)* | **Written** |
| 10 | PlayerRow / PlayerChip | `10-player-row-player-chip-brief.md` | **01, 03** (both hard) | TradeAnalyzer, DraftAssistant *(+ OmenOfTheWeek — not hot)* | **Written** |
| 11 | MetricStrip | `11-metric-strip-brief.md` | **01** (hard), **05** (soft — falls back to `title` attribute if unmerged) | TradeAnalyzer, DraftAssistant | **Written** |
| 12 | PlatformBadge | `12-platform-badge-brief.md` | **03** (soft) | *(none — component-only)* | **Written** |
| 13 | MarketingHero | `13-marketing-hero-brief.md` | none (non-blocking either direction) | Landing *(only if Phase B included, optional)* | **Written** |

All 13 briefs are now written. Numbering reflects the order briefs were requested and drafted, **not** dependency order — see the dependency-corrected run order below. Do not infer sequencing from the filename number alone.

---

## ⚠ Dependency correction: PlatformBadge (12) blocks PlatformConnectionCard (08)

`PlatformBadge` was numbered 12 specifically to avoid renumbering the eight briefs that already existed when the gap was discovered. **The number does not reflect priority.** `component-lock-v1.md`'s own deprecated-pattern note requires platform brand color to move off Button/Card chrome onto a dedicated badge — `PlatformConnectionCard` (08) cannot be correctly implemented without it.

**Hard rule: Jules must not implement `08-platform-connection-card-brief.md` before `12-platform-badge-brief.md` has merged.** This is enforced in brief 08's own "Depends on" line and blocking-status note, but is restated here because it's the queue's most important cross-file-number dependency and the easiest one to miss by reading numbers in order.

**MarketingHero (13) is the opposite case — it blocks nothing and is blocked by nothing.** It is useful once page migration of Landing/`/about` begins, but the primitive/component foundation (01–08, 12) is complete without it. Deprioritize freely.

---

## Dependency-corrected run order (authoritative — use this, not the file numbers)

### Tier 0 — no dependencies, Phase A parallel-safe with each other
01 Button, 02 Input/Textarea, 03 Badge/Chip, 04 PageHero, 05 Tooltip, 06 SegmentedControl family, 13 MarketingHero (Phase A only for 13; its optional Phase B waits on 01's Phase B per the Landing.jsx note in brief 13)

### Tier 1 — depends on exactly one Tier-0 brief
07 EmptyState/ErrorState/LoadingState (needs 01)
12 PlatformBadge (needs 03)

### Tier 2 — depends on two Tier-0/Tier-1 briefs
08 PlatformConnectionCard (needs 01, 03, **12**)
10 PlayerRow/PlayerChip (needs 01, 03)
11 MetricStrip (needs 01 hard, 05 soft)

### Tier 3 — depends on multiple Tier-1/Tier-2 briefs
09 DecisionBrief (needs 01, 03, 05, 07, 11 — all hard, the queue's heaviest dependency load)

Build tiers in order. Within a tier, Phase A work can proceed in any sequence or in parallel (subject to the Phase-B hot-file rule below); do not start a brief's Phase A until every brief in its "depends on" list has fully merged, not just opened a PR.

---

## Phase B — page migration serialization order (hard sequence, do not parallelize within a hot file)

1. **01-B** Button (ConnectLeague, TradeAnalyzer, DraftAssistant, Landing)
2. **02-B** Input/Textarea (ConnectLeague, TradeAnalyzer, DraftAssistant)
3. **06-B** SegmentedControl/TabNav/RadioCardGroup (TradeAnalyzer, DraftAssistant, Football, ConnectLeague)
4. **04-B** PageHero (Football, DraftAssistant, ConnectLeague, + OmenPage, WaiverWire)
5. **07-B** EmptyState/ErrorState/LoadingState (Football, TradeAnalyzer, DraftAssistant, + OmenOfTheWeek, Ledger, Standings)
6. **08-B** PlatformConnectionCard (ConnectLeague only — requires 12 merged first, not just its turn in this list)
7. **10-B** PlayerRow/PlayerChip (TradeAnalyzer, DraftAssistant, + OmenOfTheWeek) — includes the mandatory `PlayerRow`→`TradeAnalyzerPlayerRow` rename in `TradeAnalyzer.jsx` as an isolated first commit
8. **11-B** MetricStrip (TradeAnalyzer, DraftAssistant)
9. **09** DecisionBrief (OmenOfTheWeek only — no hot-file conflict, but requires 07 and 11 merged first)
10. **13-B** MarketingHero (Landing only — optional; if done, must come after 01-B since both touch Landing.jsx)

`12-B` does not exist — PlatformBadge (12) is component-only, no Phase B.
`03` and `05` have no Phase B — component-only.

Each Phase-B PR should rebase onto `main` after the prior one in this list merges, not draft against a stale base.

---

## Cross-cutting constraints (apply to every brief in this queue)

- No new UI libraries (no shadcn, Radix, class-variance-authority, floating-ui, etc.) unless a currently active doc explicitly requires it. None do as of 2026-07-15.
- No resurrection of removed team theming (`--color-team-*` tokens exist but are runtime-inert since 2026-07-12 — do not wire any new primitive's tone/variant to them). Brief 06 explicitly calls this out for the Account.jsx "Team" mode option.
- No changes to `omen-ui-north-star-v1.md`, `Blueprints/specs/design/README.md`, `legacy-doc-suppression-banners.md`, or `Blueprints/backlog/ui-component-system.md` from any brief in this queue — those are read-only inputs.
- No production code written by Claude/Codex in the planning stage — these are briefs for Jules (or another implementation worker) to execute; Claude/Codex's role is drafting the brief and reviewing the resulting PR.
- Component-build (Phase A) briefs are component-only unless a tiny, PR-description-only usage example is explicitly justified (briefs 03, 05, 12 use this allowance for visual verification since `frontend/` has no test/fixture framework — none of them add a committed route).
- Every brief's PR must close with a `Blueprints/playbooks/skill-usage-ledger.md` row and a dated `Blueprints/handoffs/` entry, per `Blueprints/definition-of-done.md`.
- Every brief's PR description must answer the North Star §10 self-check questions.
- Any brief touching `ConnectLeague.jsx`, `TradeAnalyzer.jsx`, `DraftAssistant.jsx`, `Football.jsx`, or `Landing.jsx` carries an explicit parallel-run warning in its own file — treat that warning as binding, not advisory.

---

## Known gaps still open after this batch

- `SignalList`, `RiskPanel`, `ConfidenceBar` (named in `ui-component-system.md` P1.1's full `DecisionBrief` shape) still have no briefs. Brief 09 ships a deliberately narrowed v1 without them. A future v2 brief should be numbered 14+ if these are wanted as real standalone components rather than staying inline.
- `ui-component-system.md` P2.1 (public front-door page migration: `/`, `/about`, public Trade Analyzer demo) is not yet represented in this queue at all — `MarketingHero` (13) is the primitive it would need, but the actual page-migration work is a future brief.
- Platform icon/logo assets for `PlatformBadge` (12) were not confirmed present in the repo during this planning pass — brief 12 requires Jules to check and flag rather than source new brand assets.

---

## Summary: readiness at a glance

**Ready for Jules immediately (no unmet dependencies):** 01, 02, 03, 04, 05, 06, 13 (Phase A only for 13).

**Blocked, waiting on earlier primitives:** 07 (waits on 01), 12 (waits on 03), 08 (waits on 01, 03, **and 12** — the corrected dependency), 10 (waits on 01, 03), 11 (waits on 01; soft-waits on 05), 09 (waits on 01, 03, 05, 07, 11 — all five).

**Safe to draft in parallel (Phase A only, no shared files, no dependency conflict):** 01, 02, 03, 04, 05, 06, 13 can all have their component-build halves in flight at once. Once 03 merges, 12 joins that parallel-safe set. Once 01 merges, 07 joins it.

**Must be serialized because they touch the same page files (Phase B only):** every brief touching `ConnectLeague.jsx`, `TradeAnalyzer.jsx`, `DraftAssistant.jsx`, `Football.jsx`, or `Landing.jsx` — that's 01, 02, 04, 06, 07, 08, 10, 11, and optionally 13. Follow the numbered Phase-B order above exactly; do not merge two of these concurrently regardless of how ready they otherwise are. Briefs 03, 05, 09, 12 touch no hot files and are exempt from this constraint (09 touches `OmenOfTheWeek.jsx`, which isn't hot, but still carries its own five-way dependency block above).
