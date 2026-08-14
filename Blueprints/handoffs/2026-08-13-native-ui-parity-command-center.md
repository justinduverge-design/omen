# Native Command Center UI parity — 2026-08-13

## Outcome

The existing Omen native projects now render the Command Center in a modern full-device iOS viewport and expose contextual Account access on both platforms. The approved Ledger Preview and League Pulse compositions replace their placeholders in SwiftUI and Compose. Figma was inspected read-only and did not need revision.

## Authority checked

- Omen native mobile foundation, design-house, delivery-governance, onboarding/connection, and agent-capabilities contracts.
- Native design delivery workflow and Definition of Done.
- Figma file `mWjrAKPi4JSIP5lAmGAtB3`: golden Command Centers `31:2` / `34:2`, Ledger Preview `72:2`, League Pulse `74:2`.
- Sprint items `M4-CC-LedgerPreview` and `M4-CC-LeaguePulse`.

## Delivered

- Added modern `UILaunchScreen` metadata to the existing iOS project. This fixes the legacy compatibility viewport that produced large black bars; no deployment target or project identity changed.
- Made the existing contextual Account/profile affordance part of both deterministic screenshot hosts.
- Constrained the Android headline column so the Account control remains displayed at phone widths.
- Added a distinct Android League group glyph instead of reusing the Account icon.
- Implemented approved Ledger Preview rows and League Pulse cards/states on both platforms.
- Routed Ledger actions to the existing Omen destination and League Pulse to the existing League destination.
- Preserved truth boundaries: demo content is labeled; disconnected/empty/unavailable states do not claim provider data; no activity events are invented.

## Verification

- `xcodebuild -version`: Xcode 26.6 (`17F113`).
- Repository-prescribed iOS simulator command: **123 tests, 0 failures, TEST SUCCEEDED** on iPhone 16.
- iPhone `iPhone15,4`: Automatic Signing under team `6RWR5G9894`, bundle `com.slopssaloon.omen`; build, install, and launch succeeded.
- iOS simulator framebuffer: full modern viewport and visible Account control. Accessibility inspection also exposed Ledger and League Pulse headings/actions/content below the fold.
- Android API 36 Play-enabled AVD: Command Center instrumentation **4/4**, including displayed Account control and routed Ledger/League actions.
- Android primitive enforcement: green.
- Android `:app:assembleDebug`: green.
- Android framebuffer review: full-screen shell, visible Account control, distinct League glyph, Ledger rows, and League Pulse honest demo card all rendered correctly.
- `git diff --check`: green before closeout; rerun as the final pre-commit gate.

## Warnings and boundaries

The signed Xcode build emitted the existing orientation-support warning and reported one stale keychain developer-account record missing `Xcode-Username`; signing still used `Apple Development: Justin Duverge Catalino (3T2S69GA3Y)` and the existing team provisioning profile successfully. Neither warning was changed in this UI pass.

`M4-CC-PlatformsCompact` remains open. The full Trade and League destinations remain explicit placeholders for separate approved screen slices. No web UI, provider/backend wiring, auth behavior, entitlements, signing configuration, production infrastructure, archive, TestFlight, Figma write, or secret/local configuration changed.

Local framebuffer evidence is under `/tmp/omen-native-ui-final/` and contains only labeled demo fixtures; it is not committed. `mobile/android/gradle/gradle-daemon-jvm.properties` is a pre-existing/generated untracked file and remains untouched.
