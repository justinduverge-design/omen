# 2026-09-08 — Command Center Matchup And League Context

## Scope

Fixed the scoped native issues raised in the Command Center / League discussion:

- Command Center matchup rows now render compact labels for the user's team only, preventing the current user's long fantasy team name from competing with score columns.
- Opponent rows keep the full opponent fantasy team name visible, with tail truncation only when the name exceeds the available row width.
- The compact-label rule is shared on iOS and Android: multi-word names use initials; one-word names use the first up-to-three uppercase alphanumeric characters.
- Team switcher chips use compact names while preserving full names in accessibility labels and sheet rows.
- The Command Center carousel selected-league header keeps the full team name under `Matchup`; only the score-card row for the user's team uses the compact label.
- League overview reloads now carry the selected Command Center provider and league id, so the League matchup request follows the active context rather than falling back to the default overview.
- Added deterministic `command-center.long-matchup` screenshot fixtures on iOS and Android to keep this defect reproducible.
- Follow-up correction from the founder's physical-phone screenshots: the carousel page no longer wraps its selected-league header in an internal vertical scroll, the selected-league header uses the full team name, Command Center `+ Add League` uses the Verdigris green token, and the pager height was reduced after clipping was fixed so Waiver/Ledger/Pulse move up.

## Verification

- iOS targeted tests:
  - `xcodebuild test -project mobile/ios/OmenIOS/OmenIOS.xcodeproj -scheme OmenIOS -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:OmenIOSTests/OmenMatchupHeroTests -only-testing:OmenIOSTests/LeagueOverviewTests -derivedDataPath /tmp/omen-ios-test`
  - Result: 31 tests, 0 failures.
- Android targeted tests:
  - `cd mobile/android && ./gradlew :core:designsystem:testDebugUnitTest --tests 'com.slopssaloon.omen.core.designsystem.component.MatchupHeroLabelTest' :app:testDebugUnitTest --tests 'com.slopssaloon.omen.app.feature.api.LeagueOverviewTest'`
  - Result: build successful.
- Android app assembly and reinstall:
  - `cd mobile/android && ./gradlew :app:assembleDebug`
  - `adb install -r app/build/outputs/apk/debug/app-debug.apk`
  - Result: build successful, install successful.

## Visual Evidence

Deterministic simulator/emulator evidence:

- `References/evidence/2026-09-08-switcher-matchup-defect-pass/ios-simulator/command-center.long-matchup.after.png`
- `References/evidence/2026-09-08-switcher-matchup-defect-pass/ios-simulator/switcher.team-sheet.after.png`
- `References/evidence/2026-09-08-switcher-matchup-defect-pass/android-emulator/command-center.long-matchup.after.png`
- `References/evidence/2026-09-08-switcher-matchup-defect-pass/android-emulator/command-center.demo-connected.after.png`

Observed after fix:

- iOS long matchup shows `Scaries` as `SCA`; the opponent keeps `The Wildly Unreasonable Playoff Machines` as readable full-name text with ellipsis.
- Android long matchup follows the same user-team compact / opponent full-name rule.
- iOS switcher top rail shows compact chips (`SS`, `JT`, `TT`) while the sheet rows still show full team names.
- Android normal command-center fixture shows the user's team compacted while the opponent remains a readable team name.

## Physical Device Install

- Built a signed iPhoneOS Debug app with `xcodebuild build -project mobile/ios/OmenIOS/OmenIOS.xcodeproj -scheme OmenIOS -destination 'id=0435D47A-97E4-5EAE-8C5C-89D80917AF61' -derivedDataPath /tmp/omen-ios-device`.
- Installed to the paired iPhone with `xcrun devicectl device install app --device 0435D47A-97E4-5EAE-8C5C-89D80917AF61 /tmp/omen-ios-device/Build/Products/Debug-iphoneos/Omen.app`.
- First launch was blocked because the phone was locked; after the founder unlocked it, `xcrun devicectl device process launch --device 0435D47A-97E4-5EAE-8C5C-89D80917AF61 com.slopssaloon.omen` succeeded.

## Limits

The founder's physical iPhone was paired and launchable through Xcode/device tooling, but the local CLI path available in this session did not provide a safe physical-device screenshot capture. The screenshots above are deterministic fixture evidence, not a claim that the founder's real ESPN/Yahoo/Sleeper leagues were visually captured on the phone.

The broader app-wide defect inventory requested in the planning conversation remains separate from this scoped fix. The pre-fix pass produced deterministic screenshots under the same evidence directory, but this handoff closes only the matchup clipping, compact-label, and League active-context issues.

## 2026-09-10 Addendum — Waiver Watch and Ledger Detail

Extended the Command Center pass after founder review:

- Waiver Watch now has live analysis wiring on iOS and Android through the existing waiver-analysis API contract.
- Confirmed opportunities surface the best move and alternatives; availability-unknown, no-low-cost-drop, no-credible-move, engine-limitation, and off-season responses map to honest Command Center states.
- Waiver-analysis fetch failures preserve the dashboard-derived Waiver Watch state instead of blanking the section or inventing a recommendation.
- The Waiver pill opens a Command Center-owned Waiver Watch sheet instead of routing to Omen.
- The Ledger pill and Ledger rows open a Command Center-owned Ledger sheet with the selected entry and the preview list, rather than jumping to the Omen tab.
- Opponent matchup names remain full-name, one-line, tail-truncated text for carousel stability. A two-line opponent-name layout remains a founder/design decision rather than a silent behavior change.

Additional verification:

- iOS targeted tests:
  - `xcodebuild test -project mobile/ios/OmenIOS/OmenIOS.xcodeproj -scheme OmenIOS -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:OmenIOSTests/CommandCenterViewModelTests -only-testing:OmenIOSTests/DashboardSummaryTests -derivedDataPath /tmp/omen-ios-test`
  - Result: 32 tests, 0 failures.
- Android targeted tests:
  - `cd mobile/android && ./gradlew :app:testDebugUnitTest --tests 'com.slopssaloon.omen.app.feature.api.CommandCenterLedgerTest' :app:compileDebugKotlin`
  - Result: build successful.
