# M1-P P2 — Shared Native Design-System Token Layer — 2026-07-20

## Task ID and scope

M1-P P2 (first slice) — the shared token layer for iOS `DesignSystem` and Android
`core:designsystem`: color, typography, spacing, and the semantic `focus-ring` modifier. Built
against `omen-native-design-system-registry-v1.md` §2, `m1-focus-ring-build-brief-v1.md`, and
`m1-native-typography-build-brief-v1.md`, now that the M1-P Figma screen-contract pass is
approved (`Blueprints/handoffs/2026-07-20-m1p-figma-reference-and-proposals.md`) and P2/P3 are
unblocked per `Direction/current_sprint.md`.

Deliberately scoped smaller than the full P2 item (13 foundation components × 2 platforms):
components can't be built without tokens existing in code first, and the sprint's own rule caps
implementation detail per item before it should be a spec pointer. Button/IconButton/TextField
etc. are the next slice, consuming this token layer.

## Outcome

**Android** — `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/`:

- `token/OmenColor.kt` — `OmenColorScheme` (core semantic) + `OmenDataSemanticColors` (invariant
  family) as `Color` values; `OmenDarkColors`/`OmenLightColors` instances transcribed from
  registry §2.2/§2.3 hexes; `focusRing`/`focusRingHalo` derived from `accent`.
- `token/OmenTypography.kt` — `OmenTypeRole` + the ten locked roles (`OmenTypographyRoles`);
  `OmenFontFamilies` resolves Alegreya Sans/Alegreya/DM Mono to `FontFamily.SansSerif` /
  `.Serif` / `.Monospace` fallbacks until real font files are a separately approved decision
  (typography brief §7) — chosen to preserve the sans/serif/mono role *shape*, not collapse to
  one face. `sp` sizes scale with Android's system font-scale automatically (Compose default).
- `token/OmenSpacing.kt` — the 9-step scale plus the registry's named rhythm aliases;
  `OmenMinTouchTarget = 48.dp`.
- `token/OmenFocusRing.kt` — `Modifier.omenFocusRing(focused, color, haloColor, ...)`: two-layer
  halo+stroke outline via `Modifier.border` (draws inside existing bounds, no size change).
- `theme/OmenTheme.kt` — `OmenTheme` object mirroring the `MaterialTheme` shape
  (`OmenTheme.color` / `.typography` / `.spacing`, `OmenTheme { content() }` wrapper); bridges a
  minimal `MaterialTheme` underneath so Compose foundation components (`OutlinedTextField`,
  `ModalBottomSheet`) don't fight Omen tokens.
- `core:designsystem/build.gradle.kts` — added the Compose plugin + `compose = true` + BOM/ui/
  material3 deps (mirroring `:app`) and JUnit test deps (mirroring `:core:auth`/`:core:session`).

**iOS** — `mobile/ios/OmenIOS/OmenIOS/DesignSystem/`:

- `OmenColor.swift` — trait-aware dynamic `Color` per token via `UIColor(dynamicProvider:)`, so
  call sites read `OmenColor.xxx` with no `@Environment(\.colorScheme)` plumbing; nested `Data`
  enum for the invariant family with the documented risk-low/risk-medium light override.
- `OmenTypography.swift` — `OmenTypeRoleSpec` maps each role to a `UIFontDescriptor.SystemDesign`
  fallback (`.default`/`.serif`/`.monospaced` — same rationale as Android) at the brief's literal
  point size, scaled via `UIFontMetrics(forTextStyle:).scaledFont(for:)` against the closest
  system Dynamic Type category, then bridged to SwiftUI with `Font(_ font: UIFont)`. A
  `View.omenTextStyle(_:)` modifier bundles font + tracking (em→pt, converted at each role's own
  size) + `.textCase(.uppercase)` + `.monospacedDigit()` so a call site can't apply the font
  while forgetting the role's tracking/case rule.
- `OmenSpacing.swift` — same 9-step scale/rhythm aliases as Android; `OmenLayout.minTouchTarget
  = 44`.
- `OmenFocusRing.swift` — `OmenFocusRing` `ViewModifier` + `.omenFocusRing(isFocused:...)`, same
  two-layer halo+stroke treatment via `.overlay` (no size change).
- `OmenIOS.xcodeproj/project.pbxproj` — added the four files as a new `DesignSystem` group under
  `OmenIOS`, wired into the `Sources` build phase, following the project's existing hand-authored
  `PBXBuildFile`/`PBXFileReference` ID pattern (new `A2…` ID block, no collision with the
  existing `A1…` entries).

## Verification

- **Android:** `./gradlew :core:designsystem:testDebugUnitTest` — **18/18 unit tests pass**
  (`OmenColorTest`, `OmenSpacingTest`, `OmenTypographyTest`, `OmenFocusRingTest`), locking every
  token value against the registry hex/size/weight table and the risk-low/risk-medium light
  override. `./gradlew :app:assembleDebug` — **BUILD SUCCESSFUL**, confirming the new module
  compiles and links through the existing `:app` dependency declaration
  (`implementation(project(":core:designsystem"))`, already present pre-M2). `JAVA_HOME` had to
  be set to the Android Studio-bundled JBR (`C:\Program Files\Android\Android Studio\jbr`) — no
  other environment change.
- **iOS: compile gap closed via CI, 2026-07-20 (same day).** This session has no macOS/Xcode
  toolchain, so the four Swift files and the hand-edited `project.pbxproj` could not be compiled
  locally. `claude/m1p-p2-designsystem-tokens` was pushed to `origin`, triggering
  `.github/workflows/ios-ci.yml` run
  [`29784250139`](https://github.com/justinduverge-design/omen/actions/runs/29784250139) —
  **`Build OmenIOS (simulator, unsigned)` passed in 33s**, all steps green, no errors on the new
  files or the `pbxproj` edit. Only annotation is an unrelated Node.js-20-deprecation notice on
  `actions/checkout@v4`. Branch is pushed, **not merged** — no PR opened.
- No device/accessibility evidence (VoiceOver/TalkBack, Dynamic Type/font-scale screenshots,
  focused-state screenshots) was captured — both build briefs' §6 "Acceptance evidence" lists are
  explicitly scoped to *"the later implementation PR"* that puts these tokens on real interactive
  controls (Button, TextField). This PR proves the token/API scaffolding compiles (Android) and
  is written correctly (iOS); the next slice (foundation components) is where that evidence gets
  gathered.

## Judgment calls worth flagging

- **`focus-ring` token interpretation.** Registry §2.2 names it "focus indicator (accent @
  40%)". Read literally, a single 40%-alpha stroke risks failing the brief's own AA-visible
  requirement (§2, §6.3). Implemented as a two-layer treatment instead: a crisp full-opacity
  `accent` stroke (`focusRing`) for guaranteed visibility, plus a soft `accent`-at-40%-alpha halo
  underneath (`focusRingHalo`) satisfying the literal token description. Both platforms use the
  identical two-layer shape. Flagged here rather than silently deciding; revisit if Justin wants
  the single-layer literal reading instead.
- **iOS point sizes vs. Apple's built-in Dynamic Type categories.** Chose `UIFontMetrics`-scaled
  literal sizes (e.g. h1 = 32pt) over snapping to the nearest built-in style (`.title1` = 28pt)
  so the ten roles stay numerically faithful to the brief's locked table while still scaling with
  accessibility text size — mirrors the Android `sp`-literal approach. Costs a few more lines of
  `UIFont`/`UIFontMetrics` bridging versus the simpler `Font.system(_:design:weight:)` API;
  judged worth it for literal-table fidelity.

## Skill receipt

```text
Task: M1-P P2 — shared native design-system token layer (color/typography/spacing/focus-ring)
Change type: L2 native foundation implementation (Android verified, iOS written-not-compiled)
Skills invoked: slops-repo-inspector, planning-pass, slops-git-flow, slops-quality-baseline (Android)
Conditional skills considered but not applicable: slops-tdd (no reproducible-defect/behavior-change
  workflow — this is new token scaffolding, verified by the 18 lock-in tests written directly
  rather than a RED/GREEN defect cycle); slops-ux-copy (no user-facing words); security-privacy-
  evidence (no trust-boundary/auth/data change); slops-legal-spot-check (no provider/legal claim);
  slops-mobile-smoke / slops-ui-ux-audit (no running screen yet — tokens only, no rendered UI to
  audit; deferred to the component slice); Figma tools (registry markdown + build briefs already
  carry every exact value needed; no new visual pattern proposed).
Evidence: this handoff; `git diff --check`; Android 18/18 unit tests + `:app:assembleDebug`
  BUILD SUCCESSFUL (commands above); iOS code + pbxproj diff (uncompiled, gap disclosed above).
Procedure gap found: none in the skills used. Real gap is environmental, not procedural — this
  Windows session has no macOS/Xcode toolchain, so iOS native code can be written correctly but
  not proven to compile until pushed to `ios-ci.yml` or run in a macOS session. Recommend the
  next iOS-touching task push early (even a docs-only commit) to get a CI build signal sooner
  rather than batching several uncompiled Swift changes together.
```

## Files changed

- `mobile/android/core/designsystem/build.gradle.kts`
- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/token/{OmenColor,OmenSpacing,OmenTypography,OmenFocusRing}.kt`
- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/theme/OmenTheme.kt`
- `mobile/android/core/designsystem/src/test/kotlin/com/slopssaloon/omen/core/designsystem/token/{OmenColorTest,OmenSpacingTest,OmenTypographyTest,OmenFocusRingTest}.kt`
- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/{OmenColor,OmenSpacing,OmenTypography,OmenFocusRing}.swift`
- `mobile/ios/OmenIOS/OmenIOS.xcodeproj/project.pbxproj`
- `Blueprints/handoffs/2026-07-20-m1p-p2-designsystem-tokens.md` (this file)
- `Direction/current_sprint.md`, `Direction/decision_log.md`, `Blueprints/playbooks/skill-usage-ledger.md` (status/decision/ledger entries)

## Do-not-touch boundaries honored

No app-shell, auth, or session file touched. No secret, package-file version bump beyond the new
module's own Compose deps (already present at the repo's pinned versions in `libs.versions.toml`
and `:app`'s `build.gradle.kts` — no new version introduced). No Figma edit — the registry
markdown and approved build briefs already carried every value needed. No SQL, deploy, signing,
store, or production action. Not pushed, merged, or deployed.

## Next recommended step

Both platforms now have a green build. Next M1-P P2 slice: Button + IconButton (first
interactive controls, per the focus-ring brief's §4 required-coverage list) in both
`DesignSystem`/`core:designsystem`, consuming this token layer — that's also where the first
real focused-state screenshots/VoiceOver/TalkBack evidence from both briefs' §6 becomes
possible. Branch remains unmerged pending your review.
