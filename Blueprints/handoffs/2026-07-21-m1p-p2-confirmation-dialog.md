# M1-P P2 ConfirmationDialog Foundation Handoff

**Date:** 2026-07-21
**Branch:** `claude/m1p-p2-confirmation-dialog`
**PR:** _pending_
**Base:** `main` @ `79fea1d`

## Scope

Final M1-P P2 shared native foundation primitive. `OmenConfirmationDialog` (Android
Compose) + `omenConfirmationDialog` view modifier (iOS SwiftUI) present a titled decision
with a required confirm action and a cancel escape hatch. Default and destructive variants
per registry §3.1. This closes P2. **After this merges, P4 gallery/enforcement is next.**

Not a login/OTP flow. Not a multi-option bottom sheet. Not a wrapper around the account-
deletion phrase gate (that remains its own privacy-copy-owned surface in
`DeleteAccountConfirmationView.swift`; this primitive is generic and did not touch it).

## Files changed

- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenConfirmationDialog.kt`
- `mobile/android/core/designsystem/src/androidTest/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenConfirmationDialogTest.kt`
- `mobile/android/core/designsystem/src/debug/kotlin/com/slopssaloon/omen/core/designsystem/gallery/DesignSystemGalleryActivity.kt` (adds toggleable preview section)
- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenConfirmationDialog.swift`
- `mobile/ios/OmenIOS/OmenIOSTests/OmenConfirmationDialogTests.swift`
- `mobile/ios/OmenIOS/OmenIOS.xcodeproj/project.pbxproj` (2 new build files + 2 file refs + group + Sources phase entries)
- `Blueprints/done/LEDGER.md`
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/2026-07-21-m1p-p2-confirmation-dialog.md` (this file)

## Verification

- **RED:** New `OmenConfirmationDialogTest` and `OmenConfirmationDialogTests` reference
  `OmenConfirmationDialog`/`OmenConfirmationVariant`/`omenConfirmationDialog` types before
  they exist, so they fail to resolve without the implementation files.
- **GREEN — Android JVM:** `:core:designsystem:testDebugUnitTest :app:assembleDebug`
  passed (3s incremental; app packages debug APK).
- **GREEN — Android device:** `:core:designsystem:connectedDebugAndroidTest` passed
  **25/25** on `Medium_Phone` API 37 (20 prior + 5 new).
- **iOS:** local toolchain unavailable in this shell (same as ListRow/PlatformBadge). The
  authorized verification path is `ios-ci.yml` GitHub unsigned simulator CI. Will run once
  the PR is pushed.
- `git diff --check` clean.

## Design decisions

- **Wraps the platform primitive.** Android uses `androidx.compose.material3.AlertDialog`;
  iOS uses SwiftUI `.confirmationDialog`, matching registry §3.1 mappings exactly. System
  a11y, Dynamic Type, outside-touch dismissal, back-button handling, and reduce-motion are
  inherited from the OS.
- **Destructive is a redundant signal, never the only signal.** Android destructive routes
  confirm-button `contentColor` through `data.riskHigh` (registry token); iOS destructive
  uses SwiftUI's `.destructive` role. The **button label always carries the meaning** — the
  color/role is additive (registry §4; facts-of-record #7).
- **iOS test surface pinning enum contract, not renderer.** SwiftUI `.confirmationDialog`
  requires system UI presentation; XCTest without a snapshot library can't cheaply assert
  rendered alert content. Tests pin the two contract guarantees that don't need a renderer:
  variants are distinct values, and the modifier compiles/attaches without crashing for both
  variants. Same style as `OmenPlatformBadgeTests`.

## Boundaries honored

No provider connect flow, no provider credentials, no auth or user-data touch, no backend,
no SQL, no secrets, no signing/store/release action, no `.env`/DNS/Nginx, no dependency or
package change, no Figma library publish. Only new Swift files added to `project.pbxproj`;
no existing IDs mutated. **Account-deletion phrase `DELETE MY OMEN DATA`, backend delete
route, and privacy copy were not touched** — the existing `DeleteAccountConfirmationView`
keeps its phrase-gated flow; this primitive is available for future generic confirmation
flows.

## Skills

- Used: `slops-repo-inspector`, `planning-pass`, `slops-git-flow`, `slops-tdd`,
  `slops-quality-baseline`, `slops-code-review`.
- Substituted: `slops-mobile-smoke`/`slops-ui-ux-audit` — web-driver tooling; native
  substitutes are the Gradle connected instrumentation test + unsigned iOS simulator CI,
  same substitution as PlatformBadge/ListRow.
- N/A: `security-privacy-evidence`, `rbac-risk-review`, `slops-legal-spot-check`,
  `slops-ux-copy`, `design-md-author`, `demo-mode-pre-empty-state` — no trust boundary,
  authority change, provider claim, new user-facing copy (labels are caller-supplied), or
  new design contract; this primitive maps to an existing registry row.

## Skill improvement

None new. Same open native-screenshot gap as prior P2 slices; the toggleable gallery
section provides a runtime preview once ADB gallery capture is unblocked.

## Next work after this PR

- **Registry token expansion** (Justin-approved 2026-07-21): add `platform-*-chip`
  legibility overrides + `on-platform-*` foreground tokens to `OmenColor` on both
  platforms; switch `OmenPlatformBadge` to fill-on-platform once the tokens exist.
- Then **M1-P P4** — dual-platform gallery + enforcement to prevent feature-local
  primitive clones.
