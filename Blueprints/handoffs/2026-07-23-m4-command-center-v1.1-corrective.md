# M4 Command Center v1.1 Corrective Handoff

**Date:** 2026-07-23
**Branch:** `claude/m4-command-center-v1.1`
**PR:** _pending push_
**Base:** `main` @ merge commit of PR #185 (`3d88878`)
**Corrective for:** merged PR #185 — resolves all four Codex P1/P2 findings inline (see per-finding table below).

## Scope

Corrective follow-up to the shipped M4 Command Center v1. Not a new feature slice. Four
independent corrections:

1. **Restore approved permanent navigation** (Command · Omen · Trade · League). Draft
   becomes seasonal inside League; Account becomes contextual, reached via the Command
   Center header profile control.
2. **Rebuild Command Center around its approved ownership per mobile-visual-briefs
   §1.1** — header + Context Strip + Matchup Hero + honest placeholders for Waiver Watch
   / Ledger preview / League Pulse. Remove the full `OmenDecisionBrief` (which belongs
   to the Omen destination).
3. **Never expose `demoConnected` to real signed-in users.** Real users see
   `realDisconnected` (honest empty context + `NoMatchup` matchup) until live wiring
   exists. Demo mode (`SessionManager.DEMO_USER_ID` / `.demoUserID`) is the only path
   that renders explicitly-labelled mock fixtures.
4. **Remove enabled no-op connection actions.** Disconnected fixtures no longer supply
   empty closures — `OmenPlatformConnectionCard` renders no button when action closure
   is absent; the DecisionBrief `Disconnected(onConnect = null/nil)` path elsewhere in
   the app renders no CTA rather than a tappable dead-end.

Also lands in this PR:

- Two approved §3.2 compositions built for real (Context Strip node `25:2`, Matchup
  Spine / Matchup Hero node `25:26`) — reusable across future screens.
- Reusable `native-visual-evidence.yml` CI workflow that produces iOS simulator + Android
  emulator screenshots on every PR touching `mobile/**`, with deterministic in-app
  fixtures behind a launch-argument short-circuit.

Not in scope: live wiring, Trade / Draft / Omen tab content, Waiver Watch / Ledger
preview / League Pulse content (all Figma-first follow-ups filed as sprint items).

## Codex finding → resolution

| # | Codex file:line (v1) | Finding (short) | Resolution in v1.1 |
|---|---|---|---|
| P1 | `OmenAndroidApp.kt:279` | Restore League as fourth top-level destination | `NavDestination` = Command · Omen · Trade · League. Draft removed from permanent tabs; documented as seasonal inside League. Account removed from tabs; wired as Command Center header profile control opening an `OmenModalSheet` with the existing `AccountView` on iOS. |
| P1 | `OmenCommandCenterScreen.kt:63` | Build the approved Command Center hierarchy | Command Center rebuilt per mobile-visual-briefs §1.1. Header + `OmenContextStrip` (approved node 25:2) + `OmenMatchupHero` (approved node 25:26) + honest `OmenStateSurface` placeholders for Waiver Watch / Ledger preview / League Pulse (each names its own follow-up sprint item). The full `OmenDecisionBrief` is removed — it will land on the Omen destination via **M4-Omen-Screen**. |
| P1 | `OmenAndroidApp.kt:326` | Do not show the connected demo fixture to real users | `SignedInDestination` branches on `s.userId == SessionManager.DEMO_USER_ID`. Real users get `OmenCommandCenterFixtures.realDisconnected` — empty context strip, `NoMatchup` matchup, no fabricated provider claim. Same branch in `CommandCenterView.swift`. Fixture names carry the label: `demoConnected` includes the word "Demo" in every visible string; `realDisconnected` invites connection instead of asserting one. |
| P2 | `OmenCommandCenterScreen.swift:165` | Remove or wire the enabled connection buttons | v1.1 `realDisconnected` fixture supplies no action closures. `OmenPlatformConnectionCard` already renders no button when `actionLabel == null || onAction == null` (existing contract); the fixture takes that path. The DecisionBrief `Disconnected` path — which was never on Command Center's real-user render anyway — likewise renders no CTA when `onConnect == null/nil`. |

## Files changed

**New (DS compositions):**

- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenContextStrip.kt` — sealed `OmenContextStripState` with four required variants + composition consuming `OmenPlatformBadge` / `OmenBadge` inside a Material 3 `Surface` (unbanned). Public accessibility-label helper.
- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenMatchupHero.kt` — sealed `OmenMatchupHeroState` (BeforeGames / Live / Final / NoMatchup) + composition. Narrow-width rail collapse via `BoxWithConstraints`. Public accessibility-label helper.
- `mobile/android/core/designsystem/src/androidTest/kotlin/.../component/OmenContextStripTest.kt` — 6 connected tests (one per state + interactive + display-only).
- `mobile/android/core/designsystem/src/androidTest/kotlin/.../component/OmenMatchupHeroTest.kt` — 5 connected tests (one per temporal state + interactive open).
- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenContextStrip.swift` — symmetric SwiftUI counterpart.
- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenMatchupHero.swift` — symmetric SwiftUI counterpart with `GeometryReader` narrow-width behavior.
- `mobile/ios/OmenIOS/OmenIOSTests/OmenContextStripTests.swift` — contract tests.
- `mobile/ios/OmenIOS/OmenIOSTests/OmenMatchupHeroTests.swift` — contract tests.

**New (screenshot fixture registry, per-platform mirror):**

- `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/screenshot/ScreenshotScenarios.kt` — registry object + `ScreenshotScenarioHost` composable + a `FauxShell` that mirrors the production 4-tab Scaffold so screenshots include the permanent bottom navigation. Naming rule: `<screen-slug>.<state-slug>`.
- `mobile/ios/OmenIOS/OmenIOS/App/Screenshot/ScreenshotScenarios.swift` — parallel registry + `ScreenshotScenarioHost` + `FauxShell` mirroring the production 4-tab `TabView`.

**New (CI + handoff):**

- `.github/workflows/native-visual-evidence.yml` — reusable workflow, matrix over scenario slugs, iOS `xcrun simctl io screenshot` + Android `adb exec-out screencap`. Deterministic — no network, no real accounts, no fabricated provider state. Adding a future screen scenario = one row per matrix + one entry per registry file. Nothing else changes.
- `Blueprints/handoffs/2026-07-23-m4-command-center-v1.1-corrective.md` (this file).

**Modified (feature screens + shell):**

- `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/feature/commandcenter/OmenCommandCenterScreen.kt` — full rewrite per §1.1 hierarchy. Uses `OmenIconButton` for the header profile control (fix for enforcement scanner catching `IconButton`). Ships three fixtures: `demoConnected` (explicitly labelled), `realDisconnected` (honest empty), `realLoading`.
- `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/OmenAndroidApp.kt` — 4-tab `NavDestination` (Command · Omen · Trade · League); Account moved to Command Center header + Account bottom sheet via `OmenModalSheet` (opens AccountSheetBody with sign-out / delete-account); `SignedInDestination` branches on demo vs real user; Omen/Trade/League destinations render honest "coming next" state surfaces naming their follow-up sprint items.
- `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/MainActivity.kt` — reads `OMEN_SCREENSHOT_SCENARIO` intent extra; on match, renders `ScreenshotScenarioHost` instead of the production shell.
- `mobile/ios/OmenIOS/OmenIOS/App/OmenIOSApp.swift` — reads `-OMEN_SCREENSHOT_SCENARIO` launch arg (or matching env var); on match, renders `ScreenshotScenarioHost` instead of the production shell.
- `mobile/ios/OmenIOS/OmenIOS/App/Auth/CommandCenterView.swift` — 4-tab `TabView` (Command · Omen · Trade · League); Account moved to `.sheet(isPresented: $showAccountSheet)` with existing `AccountView`; demo vs real branch on Command tab.
- `mobile/ios/OmenIOS/OmenIOS/App/CommandCenter/OmenCommandCenterScreen.swift` — SwiftUI mirror of the Android rewrite. Same fixture names / state shape.
- `mobile/ios/OmenIOS/OmenIOSTests/OmenCommandCenterScreenTests.swift` — rewritten for the new v1.1 hierarchy. Screenshot-registry contract tests added.
- `mobile/android/core/designsystem/src/debug/kotlin/.../gallery/DesignSystemGalleryActivity.kt` — new sections for Context Strip (4 states) and Matchup Hero (4 states).
- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/DesignSystemGalleryView.swift` — mirror. Updates the Command Center gallery to use the v1.1 fixture names (`realDisconnected` / `realLoading`) since v1's `demoDisconnected` / `demoReauth` names were retired.
- `mobile/ios/OmenIOS/OmenIOS.xcodeproj/project.pbxproj` — registers OmenContextStrip.swift + OmenMatchupHero.swift + ScreenshotScenarios.swift + a new `App/Screenshot` group, plus OmenContextStripTests.swift + OmenMatchupHeroTests.swift. Six unique IDs added (A100...0005/0016/0035; A200...0042/0043/0044/0045; B600...000E/000F/001E/001F).
- `Blueprints/specs/mobile/omen-native-design-system-registry-v1.md` — v1.1 pointer explaining the corrected hierarchy + records Context Strip / Matchup Spine as implemented; DecisionBrief is now called out as Omen-destination-only, not Command Center.
- `Direction/current_sprint.md` — updates M4 row + Next-build-order; files M4-CC-WaiverWatch, M4-CC-LedgerPreview, M4-CC-LeaguePulse, M4-Omen-Screen as new sprint items with scope + blocked-by + do-not-touch.
- `Direction/agent_inbox.md`, `Direction/decision_log.md`, `Blueprints/done/LEDGER.md`, `Blueprints/playbooks/skill-usage-ledger.md`.

**No new drawables. No dependency changes.** All five Material Symbols XMLs from the v1
PR stay. `ic_nav_account.xml` moves from tab-bar use to header profile control use. Also
temporarily reused for the League tab as a neutral "group / league" pointer — recorded
as a follow-up in the `NavDestination.League` inline doc to swap for a dedicated Material
Symbol when the next drawable pass lands.

## Visual-evidence CI — artifact names and capture states

**Workflow:** `.github/workflows/native-visual-evidence.yml`
**Trigger:** any PR / push touching `mobile/**` or the workflow file; also `workflow_dispatch`.

**Scenarios (captured this run):**

| Scenario slug | State captured | iOS artifact | Android artifact |
|---|---|---|---|
| `command-center.demo-connected` | Demo/mock connected — labelled Demo team + Sleeper (mock league) + live Matchup Hero with What to Watch signal + placeholders. Bottom nav visible (Command · Omen · Trade · League). | `visual-evidence-ios-command-center-demo-connected` | `visual-evidence-android-command-center-demo-connected` |
| `command-center.disconnected` | Honest real-user disconnected — empty Context Strip + `NoMatchup` matchup ("No matchup yet — connect Sleeper, Yahoo, or ESPN to see your team's week.") + placeholders. Bottom nav visible. No fabricated provider state. No no-op CTAs. | `visual-evidence-ios-command-center-disconnected` | `visual-evidence-android-command-center-disconnected` |

**Adding a future screen scenario:**

1. Add one line to `ScreenshotScenarios.entries` on each platform (renders the desired
   state against a fixture).
2. Add one row per platform to the matrix in `native-visual-evidence.yml`.
3. Nothing else. Workflow untouched, shell untouched, production code untouched.

## Verification

- **Android:** `:core:designsystem:testDebugUnitTest` (primitive-enforcement scanner
  green with `OmenAndroidApp.kt` still off the allowlist, plus the two M4-Auth files
  still on it), `:core:designsystem:assembleDebug`, `:app:assembleDebug` — all BUILD
  SUCCESSFUL. Note the enforcement caught one v1.1-introduced violation during
  implementation (`IconButton` import in the CC header) and forced the swap to
  `OmenIconButton` before the file could land.
- **Android device / Studio-managed AVD instrumentation:** NOT run in this shell — the
  new `native-visual-evidence.yml` workflow produces this evidence in CI as named
  artifacts. **Not claimed passed locally.** Required-evidence pointer: the two
  `visual-evidence-android-command-center-*` artifacts on the PR.
- **iOS:** local Xcode toolchain unavailable — the existing `ios-ci.yml` runs unit tests
  on push; the new `native-visual-evidence.yml` runs the iOS simulator + screenshot job
  in parallel. **Treated as pending verification on push.**
- **`slops-ux-copy` lightweight pass:** every visible string audited against
  `Brand/brand-system.md` voice anchors before commit. Fixture greetings are declarative;
  section labels mirror the mobile brief's own phrasing; placeholder copy names its
  follow-up sprint item so a reader sees exactly why the section is a state surface
  rather than a proper composition.
- `git diff --check` clean.

## Accessibility notes (both platforms)

- Every navigation icon carries `contentDescription` (Android) / `Label(...)` (iOS).
- `OmenContextStrip` renders a single tap target with an accessibility label that reads
  the current state (team / league / platform / recovery reason) so screen readers get
  full context in one gesture.
- `OmenMatchupHero` combines its team rows via `accessibilityElement(children: .combine)`
  on iOS + `Modifier.semantics` on Android; the composition's public
  `matchupHeroAccessibilityLabel` produces the human-readable summary reused by tests.
- Records sit beside team names in smaller muted type per brief §1.2 — never beneath,
  never in body-weight.
- Touch targets: Android nav tabs and the Context Strip use ≥ 48dp; iOS TabView tabs
  are system-native 44pt; the CC header profile control uses `OmenIconButton` at Md
  size (40dp — matches existing DS button-scale sizing).
- Dynamic Type / font scale flows through `OmenTheme.typography` / `OmenTypography`.
- Reduce Motion: no animations added in v1.1.

## Parity notes

- Same field set, same enum shape, same fixture data drives both platforms.
- Nav chrome remains platform-native (Compose `NavigationBar` on Android, SwiftUI
  `TabView` on iOS) per registry §6.1/§6.2.
- Icon parity: SF Symbols on iOS ↔ local Material Symbols on Android, both filled style.
  League tab currently reuses `person.crop.circle` (iOS) / `ic_nav_account.xml` (Android)
  as a neutral group pointer — matching-substitute pair, not a mismatch; documented
  in-line as a follow-up when a dedicated Material Symbol lands.
- Screenshot-mode registry lives at the same relative path on both platforms
  (`app/screenshot/ScreenshotScenarios.{kt,swift}`).
- Fixture names are identical strings across platforms
  (`OmenCommandCenterFixtures.demoConnected`/`realDisconnected`/`realLoading`) so the
  CI captures produce comparable content.

## Boundaries honored

No provider connect flows, provider credentials, auth wiring changes (session/store/
reducer/repos untouched), backend, SQL, secrets, `.env`, DNS, Nginx, signing/store/
release, dependency/package change (no androidTest deps added; no
`material-icons-extended`; no new drawables), Figma library publish, team-runtime-
theming, `frontend/` web, or real network calls. Branch push + PR will be opened per
approval; no merge or deploy performed before Codex re-review resolution.

## Skills

- **Used:** `slops-repo-inspector`, `planning-pass`, `slops-tdd`, `slops-quality-baseline`
  (compile + enforcement scanner + assembly gates), `slops-code-review`, `slops-git-flow`,
  `slops-context-markdown`, `slops-ux-copy` (lightweight brand-voice pass per revised
  gate).
- **Substituted:** `slops-mobile-smoke` / `slops-ui-ux-audit` — same native substitution
  as prior M1-P PRs (Gradle + iOS CI + new visual-evidence CI).
- **N/A:** `security-privacy-evidence`, `rbac-risk-review`, `slops-legal-spot-check`,
  `design-md-author`, `demo-mode-pre-empty-state` (this PR reinforces it via the fixture
  branch), `slops-taste`.

## Skill improvement

The v1 P1 findings all traced to skipping mobile-visual-briefs §1.1 in the original
planning-pass. Codifying: for every M4 screen assembly PR, the planning-pass output must
name the exact §-numbered visual brief section it implements and quote its first-screen
order + required states, before any implementation begins. If the section doesn't exist
in the brief, the correct answer is a Figma-first follow-up item, not a made-up hierarchy.
Recorded in the skill ledger; a small update to `planning-pass` doctrine will follow.

## Judgment calls Justin can override

- **League tab icon reuses the account_circle silhouette temporarily.** No dedicated
  "group / league" Material Symbol was picked in this pass; documented as a follow-up
  in `NavDestination.League`'s inline comment (a `groups` or `group_work` symbol under
  addendum §4 is the natural next choice). If you'd rather add that fifth drawable in
  this PR, one-line diff — just needs the XML from `google/material-design-icons` at
  `mobile/android/app/src/main/res/drawable/ic_nav_league.xml`.
- **iOS League tab uses `person.3.fill`.** Semantic pair with the Android
  account_circle placeholder — communicates "group" clearly enough for v1.1. Swap for
  a more team-specific SF Symbol later if desired.
- **Waiver Watch / Ledger preview / League Pulse are honest empty state surfaces**
  rather than mocked-up composition drafts. Each names its follow-up sprint item in
  the copy so the reader knows exactly what's blocked. If you'd rather they were
  hidden entirely until the composition ships, one-line diff per platform.
- **Account is a bottom sheet (Android) / modal sheet (iOS) triggered from the CC
  header profile control.** Alternative would be a full-screen Account destination
  route reachable from the same control. Sheet is lighter-weight for a signed-in
  utility; route would suit richer account settings later.

## Follow-ups filed

- **M4-CC-WaiverWatch** — Waiver Watch composition + wiring (Figma-first blocked).
- **M4-CC-LedgerPreview** — Ledger preview composition + wiring (Figma-first blocked).
- **M4-CC-LeaguePulse** — League Pulse composition + wiring (needs brief + Figma).
- **M4-Omen-Screen** — Omen destination screen assembly that owns the full DecisionBrief.
- **M4-Auth** — pre-existing retirement item for the two allowlisted auth files.
- **Registry §3.2 "approved but unimplemented" surfacing** — the Context Strip and
  Matchup Spine rows were §3.2-approved-in-Figma for months without implementations; a
  small registry column would make this obvious to future planning gates.

## Next work after this PR

1. **Push, wait for iOS CI + visual-evidence CI, download the 4 screenshot artifacts,
   spot-check them for bottom-nav visibility and honest disconnected state.**
2. **Codex re-review** — resolve every remaining P1/P2 finding before requesting merge.
3. **M4-Omen-Screen** — the natural next screen assembly, unblocked by v1.1.
4. **M0-BE-0** — backend-lean, still the standing follow-up for live wiring.
