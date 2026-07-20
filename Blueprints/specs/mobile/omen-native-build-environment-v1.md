# Omen Native Build Environment v1 (M2-E)

**Status:** Selected 2026-07-19
**Owner:** Justin owns spend/access decisions; Codex owns the local Android-toolchain receipt and later non-signing CI setup when explicitly authorized.
**Purpose:** Make M2 native project scaffolding reproducible without a Mac purchase, a paid hosted-Mac subscription, store credentials, or a production change.

## Decision

### Android — selected and locally verified

- Use Android Studio Quail 2 (2026.1.2) with its bundled JBR.
- Use the Studio-managed SDK, Android SDK Platform 36.1, Build-Tools 36.0.0, Platform-Tools/ADB, and Android Emulator 36.6.11.
- Use one baseline emulator: **Medium Phone**, Android 17 / API 37.1, Google Play x86_64 system image, device name `Medium_Phone`.
- Verification on 2026-07-19: `adb devices` reported `emulator-5554 device`; `emulator -list-avds` reported `Medium_Phone`.
- The SDK is currently app-managed at `C:\Users\JDuve\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\Android\Sdk`. Treat that as local-machine evidence, not a checked-in or portable path. M2 must configure its local SDK path without committing a machine path or changing global environment settings.

### iOS — selected non-purchase validation path

- Use a **non-signing GitHub-hosted macOS simulator CI job** once an iOS scaffold exists and Justin explicitly authorizes CI configuration.
- Cost posture: use only already-included GitHub Actions capacity; no paid macOS minutes, no hosted-Mac subscription, and no billing increase. If included capacity is unavailable, the iOS executable check is blocked rather than billed.
- Evidence required after M2: a macOS simulator build/test receipt tied to the branch, with code signing disabled and no Apple/store credentials.
- Residual limitation: this Windows workstation cannot run Xcode, an iOS simulator, or a signed build on an iPhone. Store signing, TestFlight, App Store submission, and real-iPhone validation remain separately gated.

## Scope boundary

- This decision installs and verifies tooling only. It does not create `mobile/`, native source, a Gradle project, an Xcode project, CI workflow, secrets, store accounts, API/provider behavior, or production configuration.
- Android local runtime evidence does not substitute for the required iOS CI evidence once native iOS code exists.

## M2 handoff requirements

1. Keep the local SDK path out of version control; add no SDK, emulator, or IDE artifacts to the repository.
2. Start Android validation with the verified `Medium_Phone` emulator and record actual API/device evidence.
3. Before enabling an iOS CI job, confirm it cannot create billed usage and still has no signing or store credentials.
4. Do not call either platform store-ready until separate real-device/release gates pass.
