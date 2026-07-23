# M1-P P3 DecisionBrief Shell (Batch 3) Handoff

**Date:** 2026-07-22
**Branch:** `claude/m1p-p3-batch-3` (stacked on `claude/m1p-p3-batch-2`, which stacks on `claude/m1p-p3-compositions`)
**PR:** _pending push_
**Base:** `claude/m1p-p3-batch-2` @ `6efd86b`

## Stack

Batch 3 stacks on Batch 2, which stacks on Batch 1. Merge order matters: Batch 1 → Batch 2
→ Batch 3. Each PR will fast-forward automatically as the one below it lands.

## Scope

M1-P P3 Batch 3 — the DecisionBrief shell per `Blueprints/specs/mobile/m1-p-p3-decision-brief-shell-brief-v1.md`.
The final composition in the P3 lane. Closes P3 in full. Consumes every Batch 1 and Batch 2
composition; leaves M4 feature screens unblocked.

Not in scope: fetching recommendations, feedback envelope submission, off-season detection,
provider connect flow launch, motion / transitions beyond reduce-motion, SF Symbol /
Material Symbol selection.

## Files changed

**New (Android):**

- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenDecisionBrief.kt` — state hierarchy, payload, alternative data class, shell composable.
- `mobile/android/core/designsystem/src/androidTest/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenDecisionBriefTest.kt` — 9 connected tests (one per state + feedback slot).

**New (iOS):**

- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenDecisionBrief.swift` — state enum, payload struct, alternative struct, shell view with generic feedback slot.
- `mobile/ios/OmenIOS/OmenIOSTests/OmenDecisionBriefTests.swift` — payload defaults, state routing identity, per-state construction, retry/connect callback firing.

**New (docs):**

- `Blueprints/handoffs/2026-07-22-m1p-p3-decision-brief-shell.md` (this file).

**Modified:**

- Gallery on both platforms — one comprehensive "DecisionBrief — success / stale / mock / empty / loading / error / disconnected / off-season" section that renders all 8 states from one representative payload.
- `mobile/ios/OmenIOS/OmenIOS.xcodeproj/project.pbxproj` — 1 DesignSystem source (`A20000000000000000000040` build / `A20000000000000000000041` file) + 1 test source (`B6000000000000000000000C` / `B6000000000000000000001C`) registered. IDs picked from a fresh block (40+) to avoid the 030–039 FileRef range used by earlier batches.
- `Blueprints/done/LEDGER.md`, `Blueprints/playbooks/skill-usage-ledger.md`, `Direction/current_sprint.md`, `Direction/agent_inbox.md`, `Direction/decision_log.md`.

## Design decisions (resolving the brief's §10 open questions)

### Feedback slot API shape — slot (`@ViewBuilder` / `@Composable`)
Picked over structured props. The consuming feature decides its own feedback UI (thumbs,
stars, text field, HITL survey), and slot APIs let that decision travel forward without
Batch-3 layer churn. Testable via a smoke render of a stub view/composable inside the slot.

### Alternatives — unbounded
Registry doesn't specify a cap. Payload's `alternatives` list is rendered in full via
`OmenPlayerRow`. Upstream is responsible for trimming to a sensible count before handing
the payload in. Adds no scroll or "and N more" affordance today — a callable follow-up if
long lists show up in the wild.

### Stale banner placement — top of the Card, above the payload
Small badge + one-line "Showing your last sync · <time>" sits directly under the outer
Card top edge and above the verdict. Keeps scan order intact and never crowds the verdict
line.

### Outer-Card rule adjusted from the brief
The brief said "the Card remains the outer container in every state so scroll position and
outer chrome stay stable." Implementation reality: `OmenStateSurface` renders its own Card.
Wrapping in a second Card double-nests. So the shell instead delegates:

- **Success / Stale / Mock** → wrap in `OmenCard` (Mock uses `.preview` variant).
- **Empty / Loading / Error / Disconnected / OffSeason** → let `OmenStateSurface` be the
  Card. Same visual result (one Card wrapper); avoids the double-nest.

Callers see a single wrapped block in every state. Documented inline in the shell source.

## Verification

- **Android:** `:core:designsystem:compileDebugKotlin` + `:testDebugUnitTest` +
  `:core:designsystem:assembleDebug` + `:app:assembleDebug` — BUILD SUCCESSFUL. Primitive-
  enforcement scanner still green.
- **Connected instrumentation (`OmenDecisionBriefTest`):** 9 tests. Runs via CI on push.
- **iOS:** local Xcode toolchain unavailable in this shell; unsigned simulator CI
  (`ios-ci.yml`) runs on push and validates the pbxproj registrations +
  `OmenDecisionBriefTests`. Same substitution as every prior M1-P PR.
- `git diff --check` clean.

## Boundaries honored

No provider connect flows, provider credentials, auth or user-data touch, backend, SQL,
secrets, `.env`, DNS, Nginx, signing/store/release, dependency or package change, Figma
library publish, team-runtime-theming, `OmenAndroidApp.kt` scaffold refactor (allowlisted),
web `frontend/` code, or new brand-asset production. No push, PR, merge, or deploy.

## Skills

- **Used:** `slops-repo-inspector`, `planning-pass`, `slops-tdd`,
  `slops-quality-baseline`, `slops-code-review`, `slops-git-flow`,
  `slops-context-markdown`.
- **Substituted:** `slops-mobile-smoke` / `slops-ui-ux-audit` — same native substitution.
- **N/A:** `security-privacy-evidence`, `rbac-risk-review`, `slops-legal-spot-check`,
  `slops-ux-copy` (state-surface copy is scaffold text — real Omen copy lands per screen
  when M4 features arrive), `design-md-author`, `demo-mode-pre-empty-state`,
  `slops-taste`.

## Skill improvement

The "prepare next batch inside current PR" pattern from Batch 2 paid off — Batch 3 opened
with a resolved state list, field set, and 3 open questions already flagged. Time from
"pull the task" to first line of shell code was minimal. Worth codifying as a
`compositions-batching` playbook entry: when a lane splits into N slices, author slice
N+1's contract inside slice N's handoff.

Not codified this session; recorded here as the recurring practice.

## Judgment calls Justin can override

- **Slot API for feedback.** If you'd rather structured props (`(rating: Int) -> Unit`),
  we can swap; the shell only wires it through.
- **Alternatives unbounded.** If long lists start hurting scan, we cap.
- **Stale banner at the top of the Card, not above the Card.** If you want the banner
  outside the payload chrome, easy move.
- **Card-in-Card avoidance via outer-Card delegation.** Only wrap payload states; let
  state surfaces render their own Card. Documented in source. Alternative would be to
  strip Cards from `OmenStateSurface` — much larger blast radius.

## What P3 closes

- Registry §3.2 lists 16 compositions total. P3 shipped 8: ConfidenceBar, RiskPanel,
  MetricStrip, SignalList, PlayerRow (+ PlayerChip), ConnectionStatusBadge,
  PlatformConnectionCard, DecisionBrief.
- Deferred to Figma-first tracks (registry §3.2 approval trail): Context Strip, Matchup
  Spine, Evidence Disclosure. These need `03 — Components` proposals in Figma before
  implementation.
- Other §3.2 rows (`OmenRecommendationCard`, `TradeResultCard`, `ShareResultPanel`,
  `PlayerCompareCard`, `StepGuide`, `MarketingHero`, `CTAGroup`) are feature-adjacent and
  will land as the M4 feature screens that need them do — no reason to build them up
  front.

## Next work after this PR

1. **M4 feature screens** — first Command Center or Omen tab screen assembled entirely
   from approved primitives + P3 compositions. Retires `OmenAndroidApp.kt`'s enforcement
   allowlist entry.
2. **Figma-first proposals** for Context Strip / Matchup Spine / Evidence Disclosure if
   any M4 feature needs them.
3. **M3A-QA** — real-device interactive QA (founder/human).
