# 2026-09-02 — Native onboarding screens: sign-in, email code, connect league

**Branch:** `codex/native-onboarding-screens`
**Worktree:** `/Users/justinduvergecatalino/Documents/GitHub/Slops-OS/slops-saloon/omen-native-onboarding`

## What Changed

Built the Wave 1 native onboarding screens together on iOS and Android:

- Replaced the separate Welcome handoff with provider-first sign-in.
- Added six-digit email-code screens using visible code boxes and hidden native text input.
- Added connect-your-league provider cards for ESPN, Yahoo, and Sleeper.
- Kept Demo Mode available for first review access.
- Added "Connect another league" next to "Go to Command Center" in the connected state.
- Added screenshot scenarios for `onboarding.sign-in`, `onboarding.email-code`, and `onboarding.connect-league` on both platforms.
- Fast-forwarded the original `/omen` checkout to inspect repo skill updates; no new native skill was added, and the updated visual-evidence workflow reinforced deterministic screenshot evidence.

## Design Correction

After the first screenshots, the founder pointed to `design/app-rework-canvas` as the actual visual source. The native screens were corrected against:

- `design/app-rework-canvas/SignInB.dc.html`
- `design/app-rework-canvas/EmailCode.dc.html`
- `design/app-rework-canvas/ConnectLeague.dc.html`

Android sign-in now has no Apple option. Google is the full-width primary action, with Discord and email in the row below. The onboarding surfaces use the canvas black background `#0A0A0B`.

The native implementations now use the canvas auth, chevron, and shield artwork directly. Android uses a clean stacked Omen lockup PNG generated from the source SVG so it matches the canvas lockup instead of the older horizontal mark.

## Evidence

- Android: `./gradlew :app:testDebugUnitTest :app:assembleDebug` — passed.
- iOS: `xcodebuild test -project mobile/ios/OmenIOS/OmenIOS.xcodeproj -scheme OmenIOS -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:OmenIOSTests/ConnectFlowTests -only-testing:OmenIOSTests/AuthFlowReducerTests -only-testing:OmenIOSTests/ValidatorsTests` — 43/43 passed.
- iOS result bundle: `/Users/justinduvergecatalino/Library/Developer/Xcode/DerivedData/OmenIOS-aufpntxivvooogcgjtrilalwkzmw/Logs/Test/Test-OmenIOS-2026.09.02_16-16-39--0400.xcresult`
- `git diff --check` — clean.
- `scripts/check-sprint-staleness.js` — still reports 7 pre-existing direction findings for A4, B2-D3-S2, and issue #308 wording conflicts.

## Screenshots

- `References/evidence/2026-09-02-native-onboarding/ios-onboarding-sign-in.png`
- `References/evidence/2026-09-02-native-onboarding/ios-onboarding-email-code.png`
- `References/evidence/2026-09-02-native-onboarding/ios-onboarding-connect-league.png`
- `References/evidence/2026-09-02-native-onboarding/android-onboarding-sign-in.png`
- `References/evidence/2026-09-02-native-onboarding/android-onboarding-email-code.png`
- `References/evidence/2026-09-02-native-onboarding/android-onboarding-connect-league.png`

All six captures were visually inspected after reinstalling rebuilt artifacts. Android capture initially hit a System UI ANR/focus issue; app focus was checked before accepting the final Android screenshots.

## Caveats

- Full all-iOS tests were not rerun after the final visual correction; the focused auth/connect suite passed.
- Existing Swift 6 actor-isolation warning in `ConnectViewModel.swift` remains unchanged.
- The sprint staleness script still flags pre-existing cleanup in direction files; this pass did not touch those planning records.
