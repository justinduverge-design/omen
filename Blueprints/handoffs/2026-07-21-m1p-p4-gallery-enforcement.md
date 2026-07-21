# M1-P P4 Dual-Platform Gallery + Primitive Enforcement Handoff

**Date:** 2026-07-21
**Branch:** `claude/m1p-p4-gallery-enforcement`
**PR:** _pending push_
**Base:** `main` @ `f6b91f3`

## Scope

Close M1-P P4 (`m1-native-primitives-enforcement-v1.md` §P4): dual-platform gallery + a
static-audit enforcement layer that prevents feature/app-shell code from cloning raw
platform primitives instead of composing the approved `Omen*` shared primitives.

- **iOS gallery** — a debug-only SwiftUI counterpart to the existing Android
  `DesignSystemGalleryActivity`. Every registry §3.1 primitive rendered in one place.
- **Android enforcement** — a JUnit source-scanner in `:core:designsystem` unit tests
  that fails when `mobile/android/app/src/main/kotlin/**` (or any future `feature/**`)
  imports raw `androidx.compose.material3.Button`/`Card`/`TextField`/`AlertDialog`/`Chip`
  families or uses raw `Color(0xNNNNNNNN)` literals.
- **iOS enforcement** — an XCTest source-scanner in `OmenIOSTests` that fails when
  `mobile/ios/OmenIOS/OmenIOS/App/**` uses raw `Button(` / `TextField(` / `SecureField(` /
  `Alert(` / `TextEditor(` calls or raw `Color(red:|hue:|hex:|0x|"asset")` literals.

Not in scope: retiring the M2 `OmenAndroidApp` scaffold that still uses raw Material 3
primitives (allowlisted, retires with the first M4 feature screen); no new feature screens;
no team-runtime-theming; no `slops-taste` or brand-asset changes.

## Files changed

**New:**

- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/DesignSystemGalleryView.swift` — SwiftUI gallery
  guarded by `#if DEBUG`, mirrors the Android section list.
- `mobile/android/core/designsystem/src/test/kotlin/com/slopssaloon/omen/core/designsystem/enforcement/PrimitiveEnforcementTest.kt`
  — JUnit source scanner.
- `mobile/ios/OmenIOS/OmenIOSTests/PrimitiveEnforcementTests.swift` — XCTest source
  scanner.
- `Blueprints/handoffs/2026-07-21-m1p-p4-gallery-enforcement.md` (this file).

**Modified:**

- `mobile/ios/OmenIOS/OmenIOS.xcodeproj/project.pbxproj` — adds `DesignSystemGalleryView`
  to the `OmenIOS` target Sources and `PrimitiveEnforcementTests` to the `OmenIOSTests`
  target Sources; no scheme or configuration change.
- `Blueprints/specs/mobile/omen-native-design-system-registry-v1.md` — §3.2 note pointing
  to the two enforcement tests as the P4 gate mechanism.
- `Blueprints/done/LEDGER.md`, `Blueprints/playbooks/skill-usage-ledger.md`,
  `Direction/current_sprint.md`, `Direction/agent_inbox.md`, `Direction/decision_log.md`.

## Design decisions

### Allowlist over pre-emptive refactor
`OmenAndroidApp.kt` (the M2 demo shell) imports raw `androidx.compose.material3.Button`,
`OutlinedButton`, `OutlinedTextField`, `Surface`, and `NavigationBar*`, and holds raw
`Color(0xNN...)` literals inside its `darkColorScheme` mapping. That file is explicitly
allowlisted in `PrimitiveEnforcementTest.ALLOWLISTED_FILES` with a written retirement
plan: it retires when the first M4 feature screen ships and the shell is rebuilt from
approved primitives/compositions. Doing the shell refactor inside this PR would balloon
scope well past P4 and touch app navigation authority. iOS starts with an empty allowlist
because the `App/` subtree was already `Omen*`-only.

### Scanner over lint plugin
Neither module has `detekt` or `SwiftLint` wired up today. Adding either would be a bigger
change than the enforcement itself. A source-scanning unit test proves the rule now and is
deletable when real lint plugins land later — the test file docstrings say so explicitly.

### Two enforcement banned lists
Android bans Material 3 primitives by identifier + raw `Color(0x...)` hex literals. iOS
bans raw SwiftUI primitives at the call site + `Color(red:|hue:|hex:|0x|"asset")`. Both
lists cover the actually-buildable ways to sneak a raw primitive into feature code; both
are documented in the test file so a future contributor can extend without spelunking.

### Debug-only iOS gallery
The gallery view is wrapped in `#if DEBUG` so it contributes nothing to release binaries.
Same intent as the Android `debug` source-set gallery activity. No release-build routing
introduced.

## Verification

- **Android negative check:** temporarily removed `OmenAndroidApp.kt` from
  `ALLOWLISTED_FILES` → `PrimitiveEnforcementTest` failed as expected (violations reported
  on the M2 shell). Restored allowlist → test passes.
- **Android green:**
  `JAVA_HOME='/c/Program Files/Android/Android Studio/jbr' ./gradlew :core:designsystem:testDebugUnitTest`
  → `BUILD SUCCESSFUL`, all module tests pass including `PrimitiveEnforcementTest`.
- **iOS:** local toolchain unavailable in this shell; unsigned simulator CI (`ios-ci.yml`)
  will run on push. `PrimitiveEnforcementTests.testAppSourcesUseOmenPrimitives...` is
  expected to pass on first CI run because iOS `App/` was already primitive-clean before
  this PR.
- `git diff --check` clean.

## Boundaries honored

No provider connect flow, no provider credentials, no auth/user-data touch, no backend,
no SQL, no secrets, no signing/store/release, no `.env`/DNS/Nginx, no dependency or
package change, no Figma library publish, no revival of team-runtime-theming, no
`OmenAndroidApp.kt` scaffold refactor (allowlisted).

## Skills

- Used: `slops-repo-inspector`, `planning-pass`, `slops-git-flow`, `slops-tdd` (RED via
  negative-allowlist experiment, GREEN via restored allowlist), `slops-quality-baseline`,
  `slops-code-review`.
- Substituted: `slops-mobile-smoke` / `slops-ui-ux-audit` — web-driver tooling; native
  substitutes are the Gradle unit test + unsigned iOS simulator CI, same substitution as
  every prior M1-P PR.
- N/A: `security-privacy-evidence`, `rbac-risk-review`, `slops-legal-spot-check`,
  `slops-ux-copy`, `design-md-author`, `demo-mode-pre-empty-state` — no trust boundary,
  authority change, provider claim, new user-facing copy, or new design contract.

## Skill improvement

The negative-check-then-restore pattern for enforcement tests (temporarily disable the
allowlist, confirm the test fails, restore) is worth codifying — a `slops-code-review`
recipe for scanner-style tests. Recorded in the decision log; not blocking.

## Judgment calls Justin can override

- **Allowlisting `OmenAndroidApp.kt` vs refactoring it now.** Kept it allowlisted because
  the M2 scaffold is scheduled to be replaced by an M4 shell built from primitives; doing
  the swap inside P4 would blow scope. If you'd rather I do the swap now, say so and I'll
  cut a follow-up branch.
- **iOS allowlist starts empty.** If any App/ file that today looks clean actually has a
  raw primitive I missed, the iOS CI test will fail on push and I'll either fix the
  primitive or add it to the allowlist with a written reason.
- **Scanner tests instead of `detekt`/`SwiftLint`.** Cheap and correct today; migrate to
  real linters when a broader lint pass lands.

## Next work after this PR

M1-P P2/P4 are now closed. Recommended next pull order:

1. **F2** — resolve `ready` vs `pending_live_engine` status truth (blocks M0-BE).
2. **M0-BE-0** — backend shared API/state contract + acceptance matrix before the four
   M0-BE PRs.
3. **M4 feature screens** — first Command Center screen assembled entirely from approved
   shared primitives. This is the moment `OmenAndroidApp.kt`'s allowlist entry retires.
4. **M3A-QA** — real-device interactive QA (founder/human).
