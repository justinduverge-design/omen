# M2-E Native Build Environment — 2026-07-19

## Outcome

Selected and validated the no-purchase native build environment required before M2 scaffolding.

- Android Studio Quail 2 (2026.1.2) is installed locally.
- Studio installed Android SDK Platform 36.1, Build-Tools 36.0.0, Platform-Tools/ADB, Emulator 36.6.11, and an Android 17 / API 37.1 Google Play system image.
- Created and booted `Medium_Phone`; workspace evidence confirmed `emulator-5554 device` and `Medium_Phone`.
- iOS path is non-signing GitHub-hosted macOS simulator CI only, using included capacity with no billed usage; it is not configured yet.

## Evidence and limitation

- The Studio-managed SDK is app-local at `C:\Users\JDuve\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\Android\Sdk`; it is local evidence only and must not be committed or made a global requirement.
- Windows still has no local Xcode, iOS simulator, or real-iPhone/signed-build validation path.
- No native project, source code, CI workflow, credentials, account, provider/API behavior, package file, deploy, or production configuration was created or changed.

## Skill receipt

```text
Task: M2-E native build-environment decision and Android local setup
Skills invoked: slops-repo-inspector, planning-pass, slops-context-markdown, slops-git-flow, computer-use
Evidence: Android Studio installer SHA-256 matched published metadata and Google signature; Studio setup completed; Medium_Phone Android 17/API 37.1 booted; ADB observed emulator-5554.
Skipped: native implementation/test/release skills — no application project or code exists. Figma/provider/security/CI implementation skills N/A — no contract, account, credential, or workflow change.
Procedure gap found: Android Studio SDK storage was virtualized under the Codex app-local cache rather than the expected user SDK path. Recorded it as non-portable local evidence; M2 must not commit or globalize it.
```

## Next safe action

M2 native project scaffolding is unblocked by the environment decision, but still requires Justin's separate explicit authorization before any `mobile/` project, Gradle/Xcode file, or CI workflow is created.
