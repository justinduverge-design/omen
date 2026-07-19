# M2 Native App-Shell Project Scaffold — 2026-07-19

## Outcome

Created the first native Omen project shells after Justin explicitly authorized M2.

- Android: Gradle/Compose app at `mobile/android` with `app` plus `core:auth`, `core:designsystem`, `core:models`, `core:network`, and `core:session` modules.
- iOS: non-signing SwiftUI/Xcode project at `mobile/ios/OmenIOS`.
- Both shells declare the approved `com.slopssaloon.omen` bundle/deep-link contract, hold only `https://example.invalid` placeholder API values, and provide a local `Enter demo` path from Welcome to the shell.
- The session and navigation structures are deliberately placeholders for M3. They contain no provider integration, persistence, backend call, credential, signing identity, or store configuration.

## Evidence

- TDD: `test/nativeMobileScaffold.test.js` was RED for the missing iOS project, then RED again for the missing local demo entry; final focused test is GREEN (1/1).
- Android: `:app:assembleDebug` passed with Android Gradle Plugin 8.11.1 / Gradle 8.13 and Java/Kotlin 17 targets; the debug APK installed and launched on the local `Medium_Phone` emulator.
- Repository: `npm test` 396/396, `npm --prefix frontend run build`, `npm audit --audit-level=moderate` (0 vulnerabilities), and `git diff --check` all passed.

## Boundary and next safe action

This is only a scaffold. It does not implement real sign-in, provider connection, API requests, secure storage, signing, TestFlight, App Store Connect, CI, deployment, or production configuration.

iOS compilation is still unverified on this Windows workspace. The safe next validation step is a separately authorized non-signing GitHub-hosted macOS simulator CI job using included capacity only. The next product step is M3, a contract-backed vertical slice.

## Skill receipt

```text
Task: M2 native app-shell project scaffolding
Skills invoked: slops-repo-inspector, planning-pass, slops-context-markdown, slops-git-flow, slops-tdd, slops-quality-baseline, slops-code-review
Evidence: focused RED/GREEN test, Android debug build, local emulator install/launch, full repository test/build/audit/diff checks.
Skipped: provider, security implementation, signing, CI, store, and deployment skills because those scopes were explicitly excluded.
```
