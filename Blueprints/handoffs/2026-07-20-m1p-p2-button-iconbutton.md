# M1-P P2 — Button + IconButton — 2026-07-20

## Scope

Completed the first interactive foundation-control slice on
`claude/m1p-p2-designsystem-tokens`: Button and IconButton in Android Compose and iOS SwiftUI.
No feature screen, auth behavior, provider contract, Figma pattern, signing, store, or production
change was included.

## Delivered

- Android `OmenButton` and `OmenIconButton` cover primary/secondary/tertiary/danger/link or
  accent/neutral/danger variants, semantic tones, sm/md/lg sizing, disabled/loading behavior,
  focus, and required TalkBack labels.
- iOS `OmenButton` and `OmenIconButton` provide matching variants, a 44pt minimum target,
  VoiceOver labels/loading state, focus, and reduced-motion-aware native press feedback.
- The iOS controls are included in the Xcode `DesignSystem` group and Sources build phase.
- A debug-only Android gallery and seven emulator tests exercise the Android component states.
- Direct device review caught an initially clipped outward focus ring. It is now an inset overlay
  drawn after Material content, and keyboard Tab evidence confirms it is visible on a filled
  primary button without changing layout measurement.

## Verification

- `:core:designsystem:testDebugUnitTest` — 18/18 passed.
- `:core:designsystem:connectedDebugAndroidTest` — 7/7 passed on `Medium_Phone` Android 17.
- `:app:assembleDebug` and `:app:installDebug` — passed.
- Android gallery launched locally; keyboard Tab captured the focused filled-button state.
- `git diff --check` — clean before commit.

## Limitation and next gate

Windows has no Xcode toolchain. The new iOS Button/IconButton files are now properly referenced
by the project, but this commit still needs the existing unsigned macOS `ios-ci.yml` build signal
after an explicitly authorized push. Do not merge before that green run.

## Next recommended slice

TextField/FormField/Picker, using these controls and the existing token layer. Keep the richer
screen composition work in approved Figma contracts; do not treat the debug gallery as a product
screen.
