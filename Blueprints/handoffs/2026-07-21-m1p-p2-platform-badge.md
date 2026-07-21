# M1-P P2 PlatformBadge Foundation Handoff

**Date:** 2026-07-21
**Branch:** `claude/m1p-p2-platform-badge`
**PR:** _pending_
**Base:** `main` @ `1d6e690`

## Scope

Shared native `OmenPlatformBadge` foundation primitive for Android Compose and iOS SwiftUI —
a reusable pill that renders Sleeper / Yahoo / ESPN provider identity using registry §2.3
invariant `platform-*` tokens. Not a `PlatformConnectionCard` (P3 composition) and not a
provider-connect surface.

## Files changed

- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenPlatformBadge.kt`
- `mobile/android/core/designsystem/src/androidTest/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenPlatformBadgeTest.kt`
- `mobile/android/core/designsystem/src/debug/kotlin/com/slopssaloon/omen/core/designsystem/gallery/DesignSystemGalleryActivity.kt`
- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenPlatformBadge.swift`
- `mobile/ios/OmenIOS/OmenIOSTests/OmenPlatformBadgeTests.swift`
- `mobile/ios/OmenIOS/OmenIOS.xcodeproj/project.pbxproj` (new build files + file refs + group + Sources phase entries for the two Swift files)
- `Blueprints/done/LEDGER.md` (row)
- `Blueprints/playbooks/skill-usage-ledger.md` (row)
- `Blueprints/handoffs/2026-07-21-m1p-p2-platform-badge.md` (this file)

## Verification

- **RED:** New `OmenPlatformBadgeTest` and iOS `OmenPlatformBadgeTests` reference
  `OmenPlatformBadge`/`OmenPlatform` types before they exist, so they fail to resolve without
  the implementation files.
- **GREEN — Android JVM:** `:core:designsystem:testDebugUnitTest :app:assembleDebug` passed
  from `mobile/android` (23s; app packages debug APK).
- **GREEN — Android device:** `:core:designsystem:connectedDebugAndroidTest` passed 20/20 on
  `Medium_Phone` AVD (Android 17 / API 37), previously 17/17 before this change.
- **iOS:** local toolchain unavailable in this shell; the authorized verification path is
  the non-signing `ios-ci.yml` GitHub simulator run per `omen-native-build-environment-v1.md`.
  Will run once the PR is pushed.
- `git diff --check` clean.

## Design decisions

- **Tinted-surface treatment, not fill-on-platform.** Registry §2.3 line 77 names
  `platform-*` plus `-chip legibility overrides` and `on-platform-*` foreground tokens for
  a Yahoo-purple-with-white-text style badge, but those overrides are **not yet defined** in
  `OmenColor` on either platform — only the three base hexes ship today. This primitive uses
  the same tinted-surface recipe as `OmenBadge` (platform color at 15% alpha as fill,
  platform color as text) so it passes AA on both `surface1` and `bg` without depending on
  tokens that don't exist yet. Swap to fill-on-platform once the registry token expansion
  lands. Documented in both source files.
- **Label always visible, color as redundant signal only** (registry §4 accessibility
  contract; facts-of-record #7 rule that data source must be labeled, not implied). Tests
  assert label presence for every case, not color.

## Boundaries honored

No provider connect flow, no provider credentials, no auth or user-data touch, no backend,
no SQL, no secrets, no signing/store/release action, no `.env`/DNS/Nginx, no dependency or
package change, no Figma library publish, no team-runtime-theming revival. Only new Swift
files were added to `project.pbxproj`; no existing IDs mutated.

## Skills

- Used: `slops-repo-inspector`, `planning-pass`, `slops-git-flow`, `slops-tdd`,
  `slops-quality-baseline`, `slops-code-review`.
- Substituted: `slops-mobile-smoke`/`slops-ui-ux-audit` — web-driver tooling; native
  substitutes are the Gradle connected instrumentation test + unsigned iOS simulator CI,
  same substitution ratified in `2026-07-20-m1p-p2-list-row.md`.
- N/A: `security-privacy-evidence`, `rbac-risk-review`, `slops-legal-spot-check`,
  `slops-ux-copy`, `design-md-author`, `demo-mode-pre-empty-state` — no trust boundary,
  authority change, provider claim, new user-facing copy beyond literal provider names, or
  new design contract.

## Skill improvement

None new. Same open gap as ListRow: no CLI-accessible ADB path for direct gallery
screenshot capture; not blocking here because the gallery visibility is verified by the
connected test's `assemble + install + run` cycle plus the assembleDebug output. A
registry-token expansion PR should follow to add `on-platform-*` and `-chip` legibility
overrides so this primitive can switch to fill-on-platform without opening a new debate.

## Next work after this PR

- **M1P-Next-2 — ConfirmationDialog foundation** (the last P2 slice before P4 gallery/
  enforcement).
- Then **M1-P P4** dual-platform gallery + enforcement.
