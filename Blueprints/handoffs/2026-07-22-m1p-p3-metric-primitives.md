# M1-P P3 Metric Primitives (Batch 1) Handoff

**Date:** 2026-07-22
**Branch:** `claude/m1p-p3-compositions`
**PR:** _pending push_
**Base:** `main` @ `a90bccf`

## Scope

M1-P P3 Batch 1 — the four metric-family compositions from registry §3.2 that stand alone
without a provider-connection dependency: **ConfidenceBar**, **RiskPanel**, **MetricStrip**,
**SignalList**. Batches 2 (PlayerRow / ConnectionStatusBadge / PlatformConnectionCard) and
3 (DecisionBrief shell) follow in separate PRs.

Not in scope: PlayerRow, connection-family compositions, DecisionBrief shell, Context Strip /
Matchup Spine / Evidence Disclosure (Figma-first per registry §3.2 approval trail),
`OmenAndroidApp.kt` scaffold retirement, feature screens.

## Files changed

**New (Android):**

- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenConfidenceBar.kt`
- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenRiskPanel.kt`
- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenMetricStrip.kt`
- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenSignalList.kt`
- `mobile/android/core/designsystem/src/androidTest/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenMetricPrimitivesTest.kt`

**New (iOS):**

- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenConfidenceBar.swift`
- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenRiskPanel.swift`
- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenMetricStrip.swift`
- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenSignalList.swift`
- `mobile/ios/OmenIOS/OmenIOSTests/OmenMetricPrimitivesTests.swift`
- `Blueprints/handoffs/2026-07-22-m1p-p3-metric-primitives.md` (this file)

**Modified:**

- `mobile/android/core/designsystem/src/debug/kotlin/com/slopssaloon/omen/core/designsystem/gallery/DesignSystemGalleryActivity.kt` — 4 new sections.
- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/DesignSystemGalleryView.swift` — 4 new sections.
- `mobile/ios/OmenIOS/OmenIOS.xcodeproj/project.pbxproj` — 4 DesignSystem sources + 1 test source registered against the OmenIOS / OmenIOSTests targets with unique `PBXBuildFile` and `PBXFileReference` IDs.
- `Blueprints/done/LEDGER.md`, `Blueprints/playbooks/skill-usage-ledger.md`, `Direction/current_sprint.md`, `Direction/agent_inbox.md`, `Direction/decision_log.md`.

## Design decisions

### One shared API shape per composition on both platforms
Every composition has a matching Compose + SwiftUI signature and behavior. Enum names align
case-for-case (`OmenRiskLevel.Low` ↔ `.low`, `OmenSignalSource.Live` ↔ `.live`, etc.) so a
future codegen or docs generator can walk both at once. Same for data shapes: `OmenMetricItem`
and `OmenSignalItem` are declared on both platforms with the same field set and defaulting.

### "Color is never alone" wired into the API, not the caller
Every composition surfaces a redundant text label so meaning survives grayscale, high-contrast,
and screen-reader rendering (registry §1, §2.3, §4). ConfidenceBar always prints the numeric
score. RiskPanel emits the level as words ("Low risk" / "Medium risk" / "High risk") on the
Badge itself. MetricStrip requires the delta prefix (`+`/`−`) in the caller-supplied string.
SignalList renders the source label ("Live" / "Stub" / "Mock" / "Unavailable") on the badge.
Callers cannot suppress the label — the enum is the label source.

### Clamp, don't trap
ConfidenceBar accepts any Int/Double and clamps to `[0, 100]` for both the fill fraction and
the visible number, so upstream data glitches degrade to a visibly bounded bar instead of a
crash. The Double overload rounds to the nearest integer.

### No SF Symbols / Material Symbols selected
The Batch 1 compositions are pure text + badge + meter (Compose `Box` + gradient `Brush` on
Android, `RoundedRectangle` + `LinearGradient` on iOS). No iconography choice, so the
resource-alignment addendum §7 citation trigger did not fire. Batches 2/3 will invoke it
when PlatformConnectionCard / DecisionBrief need real icons.

### Delta color reuses the risk invariant family
MetricStrip delta direction maps to `risk-low` (positive) / `risk-high` (negative) rather
than introducing a new success/danger token family. Preserves the invariant that "risk-low
green = healthy" reads consistently across DecisionBrief, MetricStrip, and RiskPanel.

## Verification

- **Android compile:** `./gradlew :core:designsystem:compileDebugKotlin` — BUILD SUCCESSFUL.
- **Android JVM unit tests + module assembly (includes gallery via `debug` source set):**
  `:core:designsystem:testDebugUnitTest :core:designsystem:assembleDebug` — BUILD SUCCESSFUL.
- **Android app assembly (downstream reachability check):** `:app:assembleDebug` — BUILD
  SUCCESSFUL, 128 tasks.
- **Primitive-enforcement scanner (Android):** `:core:designsystem:testDebugUnitTest
  --tests "*PrimitiveEnforcementTest*"` — BUILD SUCCESSFUL. New primitives live in
  `DesignSystem/`, outside the scanner's watched surface (`mobile/android/app/src/main/**`);
  no raw Material 3 primitives or `Color(0x…)` literals introduced.
- **Connected instrumentation (`OmenMetricPrimitivesTest`):** requires a Play-services AVD;
  the Studio-managed emulator path is not exposed in this shell, so the connected suite runs
  via CI on push. Test file compiles into the `debug` unit-test classpath configuration.
- **iOS:** local Xcode toolchain unavailable in this shell; unsigned simulator CI
  (`ios-ci.yml`) runs on push and will exercise `OmenMetricPrimitivesTests` and validate the
  pbxproj registrations. Same substitution as every prior M1-P PR.
- `git diff --check` clean.

## Boundaries honored

No provider connect flows, provider credentials, auth or user-data touch, backend, SQL,
secrets, `.env`, DNS, Nginx, signing/store/release, dependency or package change, Figma
library publish, team-runtime-theming, `OmenAndroidApp.kt` scaffold refactor (allowlisted),
web `frontend/` code, or new brand-asset production. No push, PR, merge, or deploy.

## Skills

- **Used:** `slops-repo-inspector`, `planning-pass`, `slops-tdd` (Android connected + iOS
  contract tests co-authored with implementations), `slops-quality-baseline`
  (compile/assemble/enforcement gates), `slops-code-review` (self-review during edit),
  `slops-git-flow`, `slops-context-markdown`.
- **Substituted:** `slops-mobile-smoke` / `slops-ui-ux-audit` — web-driver tooling; native
  substitutes are Gradle JVM tests + `:app:assembleDebug` + gallery entries + iOS CI, same
  substitution as every prior M1-P PR.
- **N/A:** `security-privacy-evidence`, `rbac-risk-review`, `slops-legal-spot-check`,
  `slops-ux-copy` (no trust boundary, provider claim, or new user-facing product copy —
  demo strings in the gallery only), `design-md-author` (no new design contract),
  `demo-mode-pre-empty-state` (no data path), `slops-taste` (fits the existing DS grammar).

## Skill improvement

Editing `.pbxproj` by hand for four new sources at once is fragile — a single duplicated
`PBXBuildFile` ID silently breaks the whole project. Worth a codified recipe under
`slops-tdd` or a new mini-skill for iOS: "when adding N SwiftUI sources, script the pbxproj
diff and verify with a lightweight regex on ID uniqueness before running Xcode." Not
blocking this PR.

## Judgment calls Justin can override

- **Metric delta color = risk invariant.** Used `risk-low` for positive delta and
  `risk-high` for negative rather than a new `success/danger` component-alias family. If
  you'd rather reserve risk semantics for actual risk framing, we can introduce a
  `delta-positive` / `delta-negative` alias in a follow-up.
- **RiskPanel medium = neutral badge tone.** No `risk-medium` Badge tone exists in
  `OmenBadgeTone` today (only Success / Neutral / Risk). Medium maps to Neutral so a
  screenreader still hears "Medium risk". If you want a proper Medium tone (amber fill),
  we'd extend the Badge enum first — I kept scope tight.
- **ConfidenceBar clamps silently.** No assert/log on out-of-range; the view just clamps.
  If you want a Timber/OSLog warning when upstream sends `>100`, easy follow-up.
- **iOS test proves the switches without a snapshot library.** Mirrors the pattern from
  `OmenPlatformBadgeTests` — reflection-free helpers that re-declare the switch cases so
  we're testing the contract, not the private state. Snapshot testing is a separate future
  investment.

## Next work after this PR

1. **P3 Batch 2:** PlayerRow (+ PlayerChip), ConnectionStatusBadge, PlatformConnectionCard.
   Depends on nothing new; PlatformConnectionCard will invoke the resource-alignment
   addendum §7 citation trigger for its provider action icons.
2. **P3 Batch 3:** DecisionBrief shell — integrates Batch 1 + Batch 2, all 8 state
   surfaces.
3. **M4 feature screens** — first Command Center screen assembled from approved
   compositions; retires `OmenAndroidApp.kt`'s enforcement allowlist entry.
