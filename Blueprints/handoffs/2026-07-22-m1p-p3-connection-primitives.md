# M1-P P3 Connection Primitives (Batch 2) Handoff

**Date:** 2026-07-22
**Branch:** `claude/m1p-p3-batch-2` (stacked on `claude/m1p-p3-compositions`)
**PR:** _pending push_
**Base:** `claude/m1p-p3-compositions` @ `0c97a2f` (which itself branches from `main` @ `a90bccf`)

## Stack

This PR stacks on the P3 Batch 1 PR (metric primitives) to avoid gallery + `pbxproj`
conflicts. If Batch 1 lands as-is, Batch 2 will fast-forward after rebase; if Batch 1
receives review-driven changes, Batch 2 needs a rebase.

## Scope

M1-P P3 Batch 2 — the identity + connection compositions from registry §3.2:
**PlayerRow**, **PlayerChip**, **ConnectionStatusBadge**, **PlatformConnectionCard**. Batch
3 (DecisionBrief shell) follows in a separate PR; a preparation brief for it lands in this
PR as `Blueprints/specs/mobile/m1-p-p3-decision-brief-shell-brief-v1.md`.

Not in scope: DecisionBrief shell implementation, Context Strip / Matchup Spine / Evidence
Disclosure (Figma-first per registry §3.2 approval trail), `OmenAndroidApp.kt` scaffold
retirement, feature screens.

## Files changed

**New (Android):**

- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenPlayerRow.kt` — PlayerRow + PlayerChip.
- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenConnectionStatusBadge.kt`
- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenPlatformConnectionCard.kt`
- `mobile/android/core/designsystem/src/androidTest/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenConnectionPrimitivesTest.kt`

**New (iOS):**

- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenPlayerRow.swift` — PlayerRow + PlayerChip.
- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenConnectionStatusBadge.swift`
- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenPlatformConnectionCard.swift`
- `mobile/ios/OmenIOS/OmenIOSTests/OmenConnectionPrimitivesTests.swift`

**New (docs):**

- `Blueprints/specs/mobile/m1-p-p3-decision-brief-shell-brief-v1.md` — Batch 3 preparation.
- `Blueprints/handoffs/2026-07-22-m1p-p3-connection-primitives.md` (this file).

**Modified:**

- Gallery on both platforms — 3 new sections (PlayerRow/PlayerChip, ConnectionStatusBadge, PlatformConnectionCard).
- `mobile/ios/OmenIOS/OmenIOS.xcodeproj/project.pbxproj` — 3 DesignSystem sources + 1 test source registered with unique `PBXBuildFile` / `PBXFileReference` IDs.
- `Blueprints/done/LEDGER.md`, `Blueprints/playbooks/skill-usage-ledger.md`, `Direction/current_sprint.md`, `Direction/agent_inbox.md`, `Direction/decision_log.md`.

## Design decisions

### One shared `OmenConnectionStatus` for both badge and card
Registry §3.2 names two overlapping vocabularies for ConnectionStatusBadge
(connected/disconnected/reauth/recovery) and PlatformConnectionCard (adds error/pending).
Rather than declare two enums that clients would have to keep in sync, I picked a single
union enum with six cases: `Connected`, `Disconnected`, `NeedsReauth`, `Error`, `Pending`,
`Recovering`. Native clients get one status vocabulary; badge tone + label are derived from
the enum, not from caller strings.

### Position abbreviation folded into PlayerChip label
PlayerRow leads with a position chip (`RB`) plus a name subtitle; PlayerChip is a compact
single-chip form. To keep meaning readable in the compact form, I fold the position
abbreviation into the chip label (`RB · Christian McCaffrey`), rather than relying on
position color alone. Same "color is never alone" rule as elsewhere.

### PlatformConnectionCard card tone stays neutral even for Error / NeedsReauth
Registry states include error, pending, recovery. I resisted painting the whole card red
for error states — the ConnectionStatusBadge (Risk tone) carries the urgency, and the
action button escalates to `Danger` variant for `NeedsReauth` / `Error`. Painting the whole
card red would over-signal for a compact status surface and clash with DecisionBrief's own
tone system later.

### Button variant escalation follows status semantics
`NeedsReauth` and `Error` → `Danger` variant (crimson). Everything else → `Primary` (brass).
Symmetric on both platforms.

### No provider icons or brand chrome
PlatformConnectionCard composes PlatformBadge (which already carries brand identity
redundantly with its text label) + ConnectionStatusBadge + optional description +
optional Button. No SF Symbols / Material Symbols picked — the addendum §7 citation
trigger stays cold for Batch 2. Provider action icons remain an M4 feature-screen call.

## Verification

- **Android:** `:core:designsystem:testDebugUnitTest :core:designsystem:assembleDebug
  :app:assembleDebug` — BUILD SUCCESSFUL. Primitive-enforcement scanner still green
  (new sources live in `core/designsystem/`, outside the scanned surface).
- **Connected instrumentation (`OmenConnectionPrimitivesTest`):** 6 tests. Requires a
  Play-services AVD; Studio-managed emulator path is not exposed in this shell, so the
  connected suite runs via CI on push.
- **iOS:** local Xcode toolchain unavailable in this shell; unsigned simulator CI
  (`ios-ci.yml`) runs on push and validates the pbxproj registrations +
  `OmenConnectionPrimitivesTests`. Same substitution as every prior M1-P PR.
- `git diff --check` clean.

## Boundaries honored

No provider connect flows, provider credentials, auth or user-data touch, backend, SQL,
secrets, `.env`, DNS, Nginx, signing/store/release, dependency or package change, Figma
library publish, team-runtime-theming, `OmenAndroidApp.kt` scaffold refactor
(allowlisted), web `frontend/` code, or new brand-asset production. No push, PR, merge,
or deploy.

## Skills

- **Used:** `slops-repo-inspector`, `planning-pass`, `slops-tdd`,
  `slops-quality-baseline`, `slops-code-review`, `slops-git-flow`,
  `slops-context-markdown`.
- **Substituted:** `slops-mobile-smoke` / `slops-ui-ux-audit` — native substitutes are
  Gradle + iOS CI, same as every prior M1-P PR.
- **N/A:** `security-privacy-evidence`, `rbac-risk-review`, `slops-legal-spot-check`
  (no trust boundary or provider claim; PlatformConnectionCard's "Reconnect Yahoo"
  string is UI copy for the composition demo, not a live provider claim),
  `slops-ux-copy` (component-level demo strings only), `design-md-author`,
  `demo-mode-pre-empty-state` (no data path), `slops-taste`.

## Skill improvement

Reaffirms the Batch 1 finding: hand-editing `.pbxproj` for multiple new sources is
error-prone. Batch 2 added 3 sources + 1 test source with 4 fresh IDs; still would
benefit from a scripted registration helper.

## Judgment calls Justin can override

- **Merged badge + card status vocabularies.** If you'd rather keep them separate
  (perhaps because the "card" states will eventually include ones the "badge" never
  does), we can split the enums. Merging is cheaper today.
- **PlayerChip label format `POS · Name`.** Alternative: `Name` alone with color as
  identity. I chose the folded label because compact chips lose color contrast on some
  backgrounds and screen readers gain from hearing position + name in one gesture.
- **Card tone stays neutral for error states.** If you want the whole card to redden
  under Error / NeedsReauth, we can add a tone-escalation rule.

## Batch 3 preparation

`Blueprints/specs/mobile/m1-p-p3-decision-brief-shell-brief-v1.md` in this PR describes
the DecisionBrief shell contract: field set, 8 state surfaces, composition matrix, API
sketch on both platforms, no-icon posture. That brief is the starting point for the
Batch 3 session.

## Next work after this PR

1. **P3 Batch 3:** DecisionBrief shell per the Batch 3 preparation brief. Integrates
   Batch 1 (ConfidenceBar / RiskPanel / MetricStrip / SignalList) + connection state
   from Batch 2, and defines the 8 state-surface treatments (success / empty / loading
   / error / disconnected / stale / mock / off-season).
2. **M4 feature screens** — first Command Center screen assembled entirely from
   approved shared primitives + compositions. Retires `OmenAndroidApp.kt`'s
   enforcement allowlist entry.
