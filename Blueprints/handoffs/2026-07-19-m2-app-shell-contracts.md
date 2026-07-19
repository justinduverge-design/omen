# M2-F Native App-Shell Contracts — 2026-07-19

## Outcome

Created the first approved app-shell contract boards for both native platforms.

- [04 — iOS Screens: M2 App Shell Contract](https://www.figma.com/design/mWjrAKPi4JSIP5lAmGAtB3?node-id=17-12)
- [05 — Android Screens: M2 App Shell Contract](https://www.figma.com/design/mWjrAKPi4JSIP5lAmGAtB3?node-id=17-13)

These are contract boards, not production app screens or reusable runtime components.

## Contract coverage

- Top-level destinations: Command Center, Omen, Trade, Draft, and consolidated League / Account.
- Entry: Welcome → Try Demo or Get started. Demo remains useful without sign-in or a league.
- iOS expression: tab bar plus NavigationStack, sheet/full-screen cover for focused tasks, native swipe-back behavior.
- Android expression: bottom navigation plus Compose Navigation, Material 3 sheets/dialogs, Android back/state restoration.
- Required honest states: Welcome, Demo, Auth, Onboarding, Loading, Empty, Error, Disconnected, Stale, Mock, Recovery, and Off-season.
- Accessibility: platform screen-reader semantics, text scaling/reflow, 44pt iOS and 48dp Android targets, reduced-motion treatment, and the non-color focus-ring contract.
- Safety: no direct ESPN cookie entry, no provider-ready claim without real-device evidence, and no competing definition of the F2 connected → Omen-ready state.

## Foundation changes

- Added `Omen Spacing` Figma variable collection with the approved 4/8/12/16/24/32/48/64/96 scale, scoped to layout gaps.
- Reused the approved Omen primitive/semantic color variables and typography styles; no external Material or Apple library component was imported.

## Validation

- No Code Connect mapping or existing native screen existed to reuse; Figma library search returned no compatible Omen asset.
- Visual screenshots verified each final app-shell board. The iOS board is node `17:12`; Android is node `17:13`.
- Focused Android navigation screenshot confirmed the destination/entry section is not clipped or overlapping.

## Boundaries preserved

- No native project scaffold, app code, dependency, package change, API/auth/provider implementation, store-account action, Figma library publish, secret access, deploy, or production action.
- No invented screen, component, provider, or token behavior beyond the approved M0 contracts.

## Skill receipt

```text
Task: M2-F native app-shell screen contracts
Change type: controlled Figma contract boards
Skills invoked: slops-repo-inspector, planning-pass, slops-context-markdown, slops-design-system-pack, figma-use, figma-generate-library, figma-generate-design, slops-git-flow
Conditional skills considered but not applicable: figma-create-new-file (official file exists); figma-swiftui (no SwiftUI implementation); workflow-tree-spec/security-privacy-evidence/rbac-risk-review/pre-build-research (no flow, trust-boundary, authority, provider, or unsettled external behavior changed); code/test/device/release skills (no native project or runtime code).
Evidence: Figma nodes `17:12` and `17:13`, focused screenshot review, this handoff.
Procedure gap found: no correction needed. The contract boards are deliberately token-bound documentation, not premature component or screen implementation.
```

## Build-environment limitation

The current Windows workspace has no Swift/Xcode, Java/Gradle, Android SDK, or ADB. Justin also confirmed he will not buy a Mac. M2 project scaffolding remains deferred until a non-purchase iOS validation path and Android build-toolchain plan are explicitly selected.

## Status and next safe action

- Branch: `codex/m2-app-shell-contracts`
- Commit / PR / push / merge / deploy: none.
- Next task: M2-E native build-environment decision; it selects a non-purchase iOS validation path and an Android toolchain approach before any app-project scaffold is created.
