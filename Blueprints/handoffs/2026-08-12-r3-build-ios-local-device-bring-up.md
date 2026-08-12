# Handoff — R3-BUILD-iOS local Mac and physical-device bring-up

**Date:** 2026-08-12
**Branch:** `main`
**Implementation commit:** none — uncommitted working tree
**Status:** local development path verified; R3-BUILD-iOS remains `READY` because TestFlight is outstanding.

## Outcome

- Kept the existing `mobile/ios/OmenIOS/OmenIOS.xcodeproj`; no project, feature, UI, entitlement, capability, bundle identifier, or deployment target was created or changed.
- Replaced the project's CI-only signing prohibition with Automatic Signing for team `6RWR5G9894` in the app and test targets, Debug and Release. The bundle identifier remains `com.slopssaloon.omen`.
- Confirmed `.github/workflows/ios-ci.yml` still disables signing explicitly at the command line for its release-branch/manual simulator job.
- Added a git-ignored `Config/Local.xcconfig` for founder-supplied client-safe values. Its contents are intentionally absent from Git and this handoff.
- Corrected the committed Xcode 26 URL-construction pattern so fallback/example `https://` values do not silently truncate to `https:`.
- Narrowly ignored Xcode's generated self-workspace manifest and all per-user `xcuserdata`, while leaving future shared workspace metadata visible to Git.
- Registered the connected iPhone through Xcode's normal Apple Development provisioning path; Omen built, installed, and launched on the phone.

## Working-tree provenance

### KEEP — intentional bring-up work

- `.gitignore` — narrow generated/self-workspace and per-user Xcode-state exclusions.
- `mobile/ios/OmenIOS/Config/Base.xcconfig` — Xcode 26-safe fallback URL construction.
- `mobile/ios/OmenIOS/Config/Local.xcconfig.example` — safe local structure and non-printing length-check guidance; contains placeholders only.
- `mobile/ios/OmenIOS/OmenIOS.xcodeproj/project.pbxproj` — Automatic Signing/team configuration; bundle ID and deployment target unchanged.
- The dated Direction/Blueprints records added or corrected by this reconciliation.

### SEPARATE — pre-existing Xcode rewrite

- `mobile/ios/OmenIOS/OmenIOS.xcodeproj/xcshareddata/xcschemes/OmenIOS.xcscheme` was modified before the intentional bring-up edits. Xcode rewrote the stale `BuildableName` from `OmenIOS.app` to the project's actual `PRODUCT_NAME` output `Omen.app` and added current launch/profile metadata, while also changing the scheme-format version from `1.7` to `1.3`. It is potentially legitimate current-Xcode normalization but is not attributed to this bring-up and should be reviewed/committed separately or reverted only with founder approval.

### REVERT

- None identified. Generated workspace/user state is ignored rather than deleted; no existing change was reverted, reset, stashed, or overwritten.

## Verification

- Toolchain: Xcode 26.6, build `17F113`.
- Simulator: iPhone 16 on the locally installed iOS 26.5 runtime; the repository-prescribed command shape ran with signing disabled and passed **108 tests, 0 failures**. Because the current Done row pins Xcode 16.2, this is local regression evidence rather than exact CI-toolchain equivalence.
- Physical device: `iPhone15,4`; Automatic Signing resolved the documented team and bundle ID; build succeeded with an Apple Development identity and automatically managed development profile; install and launch succeeded.
- Configuration: with local config absent from a controlled test, the committed fallback resolves to `https://example.invalid`; with local config present, all three required entries resolve as populated without printing values.
- Security/diff: `Local.xcconfig` remains ignored and absent from status/diff. No local value, service-role/backend secret, entitlement, capability file, UI/feature source, archive, TestFlight action, production mutation, or Infisical action is part of the diff.
- Existing warning debt was observed but not changed: `NativeAppleIDTokenProvider.swift:16` calls a main-actor-isolated initializer from a synchronous nonisolated context; the app target also warns about launch configuration and interface-orientation support. None blocked this development build, but the auth warning should be resolved before treating Xcode 26/Swift-concurrency readiness as clean.

## Remaining gates

1. Interactively prove physical-device auth/capability behavior—Sign in with Apple first, plus the M3A-QA email/session/delete/log-safety matrix—under separately approved entitlement/capability scope.
2. Archive/export with distribution signing and verify dSYM handling.
3. Upload the signed build to TestFlight and open the approved internal-testing path. Only step 3 satisfies the current `R3-BUILD-iOS` done-when.

## Skill receipt

- **Skills invoked:** `engineering:code-review` for provenance/signing/config/security review; `engineering:documentation` for the minimal status, decision, readiness, and handoff reconciliation.
- **Conditional skills considered but not applicable:** UI/UX, Figma, copy, provider research, Supabase, release/ship/canary, and deployment skills—no UI, provider, production, archive, upload, or release action changed. The full mobile release/device-matrix skill is deferred because this was one-device development bring-up, not release certification.
- **Procedure gap found:** the repository's local iOS substitute requires Xcode 16.2 while the new Mac runs Xcode 26.6. Preserve both facts; do not silently call the newer-toolchain run equivalent CI evidence.
- **Publication state:** not committed, pushed, merged, archived, uploaded, or deployed.
