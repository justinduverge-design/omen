# Omen native apps

| Path | What it is | Status |
|---|---|---|
| `ios/OmenIOS/` | The iPhone app (SwiftUI). Open `OmenIOS.xcodeproj` in Xcode | **Active.** It is the product, shipped to beta testers through TestFlight |
| `android/` | The Android app (Kotlin, Gradle) | Paused |
| `contracts/` | Native auth provisioning checklist and interactive QA runbook | Active |

## iPhone app layout (`ios/OmenIOS/OmenIOS/`)

| Folder | What it holds |
|---|---|
| `App/` | App entry (`OmenIOSApp.swift`), the shell, and the feature screens: Command Center, League, the switcher, Trade, Ledger, Scout, Connect (ESPN, Yahoo, Sleeper), Help, beta reports and the forced-update gate |
| `App/Api/` | API client, repositories and view models, one per server contract |
| `Core/` | Sign-in (Apple, passkey, OAuth, email code via Supabase) and session storage in the Keychain |
| `DesignSystem/` | Shared components (buttons, cards, badges) built on the token registry |
| `Fonts/` | Alegreya Sans and Alegreya (OFL) |
| `OmenIOSTests/`, `OmenIOSUITests/` | Unit tests (including decoding the same contract fixtures as the server, from `test/contracts/`) and UI journeys |

The app talks only to the Omen API. It never talks to ESPN, Yahoo or Sleeper directly.

## Before you change native code

Read the native gate listed in the repo's `CLAUDE.md` (foundation, design house, delivery governance,
onboarding/connection contract, agent capabilities, design delivery workflow) and the approved screen. The
approved screen is the Figma node or the locked canvas in `design/native-visual-lock-2026-09-13/`. If one is
missing or two conflict, stop and flag it.

Per-build release records: `Direction/release/builds/`.
