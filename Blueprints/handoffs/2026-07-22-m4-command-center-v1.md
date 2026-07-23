# M4 Command Center v1 Handoff

**Date:** 2026-07-22
**Branch:** `claude/m4-command-center`
**PR:** _pending push_
**Base:** `main` @ `6831d20`

## Scope

First M4 feature screen. Command Center is the signed-in landing surface on both platforms:
- **Android:** `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/feature/commandcenter/OmenCommandCenterScreen.kt`
- **iOS:** `mobile/ios/OmenIOS/OmenIOS/App/CommandCenter/OmenCommandCenterScreen.swift`

Both are approved **screen assemblies** at the app/feature layer — not design-system components. They consume approved DS primitives + P3 compositions and are exercised through the app's running Command tab, not through the DS gallery.

Also lands in this PR:
- Local Material Symbols vector drawables for all 5 Android nav tabs (option (d) — official Google artwork, no dependency added).
- Refactor of `OmenAndroidApp.kt` to swap raw `Button`/`OutlinedButton`/`OutlinedTextField` + manual `MaterialTheme(darkColorScheme)` for `OmenButton` + `OmenTheme`.
- Extraction of the two remaining raw-Material-3 auth surfaces into their own files, allowlisted under sprint item **M4-Auth**.
- Registry §3.2 pointer identifying `OmenCommandCenterScreen` as an approved screen assembly (feature layer), not a DS component.

Not in scope: live wiring (dashboard-summary polling, POST /api/omen/mvp-move), Trade/Draft/Omen tab content beyond text-placeholder state surfaces, auth-surface redesign (tracked as M4-Auth), tab-bar chrome redesign, real product copy (fixture strings only, per `slops-ux-copy` note below).

## Files changed

**New (Android):**

- `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/feature/commandcenter/OmenCommandCenterScreen.kt` — the screen assembly + `OmenCommandCenterState` / `OmenCommandCenterPlatform` view-state types + `OmenCommandCenterFixtures` (5 named demo fixtures).
- `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/auth/OmenAuthFlow.kt` — extracted from OmenAndroidApp; allowlisted under M4-Auth.
- `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/auth/OmenDeleteAccountScreen.kt` — extracted; allowlisted under M4-Auth.
- `mobile/android/app/src/main/res/drawable/ic_nav_command.xml` — local Material Symbols asset, official `auto_awesome_fill1_24px.xml` from `google/material-design-icons` with baked-in tint removed so Compose applies Omen tokens.
- `mobile/android/app/src/main/res/drawable/ic_nav_omen.xml` — local `bolt_fill1_24px.xml`, tint stripped.
- `mobile/android/app/src/main/res/drawable/ic_nav_trade.xml` — local `swap_horiz_fill1_24px.xml`, tint stripped; **no** `android:autoMirrored` (symmetric exchange).
- `mobile/android/app/src/main/res/drawable/ic_nav_draft.xml` — local `format_list_numbered_fill1_24px.xml`, tint stripped, `android:autoMirrored="true"` preserved (directional).
- `mobile/android/app/src/main/res/drawable/ic_nav_account.xml` — local `account_circle_fill1_24px.xml`, tint stripped.

**New (iOS):**

- `mobile/ios/OmenIOS/OmenIOS/App/CommandCenter/OmenCommandCenterScreen.swift` — screen assembly + state/platform structs + fixtures.
- `mobile/ios/OmenIOS/OmenIOSTests/OmenCommandCenterScreenTests.swift` — 6 contract tests covering the 5 named fixtures + the shell-construction smoke.

**New (docs):**

- `Blueprints/handoffs/2026-07-22-m4-command-center-v1.md` (this file).

**Modified:**

- `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/OmenAndroidApp.kt` — full refactor. Wraps in `OmenTheme`, delegates auth to `OmenAuthFlow` / `OmenDeleteAccountScreen`, delegates signed-in Command tab to `OmenCommandCenterScreen`, hosts a new `OmenBottomNav` using `Icon(painter = painterResource(...))` for each of the 5 tabs. All raw `Button`/`OutlinedButton`/`OutlinedTextField` usage removed; all raw `Color(0xFF…)` literals removed. Not allowlisted anymore.
- `mobile/android/core/designsystem/src/test/kotlin/.../enforcement/PrimitiveEnforcementTest.kt` — `OmenAndroidApp.kt` removed from `ALLOWLISTED_FILES`; `OmenAuthFlow.kt` and `OmenDeleteAccountScreen.kt` added with M4-Auth retirement notes and non-expansion covenant inline.
- `mobile/ios/OmenIOS/OmenIOS/App/Auth/CommandCenterView.swift` — Command tab now renders `OmenCommandCenterScreen` (fixture chosen based on demo/user mode); other tabs unchanged.
- `mobile/ios/OmenIOS/OmenIOS.xcodeproj/project.pbxproj` — new `App/CommandCenter/` group, `OmenCommandCenterScreen.swift` registered with unique IDs (`A10000000000000000000004` build / `A10000000000000000000014` file / `A10000000000000000000034` group); `OmenCommandCenterScreenTests.swift` registered (`B6000000000000000000000D` / `B6000000000000000000001D`).
- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/DesignSystemGalleryView.swift` — new section renders 3 Command Center fixtures (connected / disconnected / reauth) as a feature-screen preview.
- `mobile/android/core/designsystem/src/debug/kotlin/.../gallery/DesignSystemGalleryActivity.kt` — new section labels the app-tab as the correct evidence surface for the Command Center screen (the DS gallery is primitive-evidence; the running app is screen-evidence).
- `Blueprints/specs/mobile/omen-native-design-system-registry-v1.md` — new §3.2 pointer identifying `OmenCommandCenterScreen` as an approved screen assembly (feature layer), not a DS component.
- `Direction/current_sprint.md`, `Direction/agent_inbox.md`, `Direction/decision_log.md`, `Blueprints/done/LEDGER.md`, `Blueprints/playbooks/skill-usage-ledger.md`.

## Android nav-icon acquisition (option (d)) — recorded per addendum §7

| Tab | Official Google source (from `google/material-design-icons`) | Omen resource filename | FILL selection | Notes |
|---|---|---|---|---|
| Command | `auto_awesome_fill1_24px.xml` | `res/drawable/ic_nav_command.xml` | FILL=1 (filled variant) | Semantic parity with iOS `sparkles`. Symmetric — no `android:autoMirrored`. |
| Omen | `bolt_fill1_24px.xml` | `res/drawable/ic_nav_omen.xml` | FILL=1 | Semantic parity with iOS `bolt.fill`. Symmetric. |
| Trade | `swap_horiz_fill1_24px.xml` | `res/drawable/ic_nav_trade.xml` | FILL=1 | Semantic parity with iOS `arrow.left.arrow.right`. **Symmetric exchange — deliberately NOT auto-mirrored** even though the glyph looks directional; mirroring would keep meaning intact by swapping arrowheads back, so the correct choice is to leave `android:autoMirrored` off. |
| Draft | `format_list_numbered_fill1_24px.xml` | `res/drawable/ic_nav_draft.xml` | FILL=1 | Semantic parity with iOS `list.number`. **Directional** — `android:autoMirrored="true"` preserved from the official file (numbers precede list items; mirror swaps their side for RTL). |
| Account | `account_circle_fill1_24px.xml` | `res/drawable/ic_nav_account.xml` | FILL=1 | Semantic parity with iOS `person.crop.circle`. Symmetric. |

**Style selection:** Material Symbols Outlined typeface with FILL=1 (weight 400, grade 0, optical size 24). Pairs with iOS's SF Symbols `.fill` variants; single consistent style across all 5.

**Wrapper adaptations from the original Google files:** baked-in `android:tint` attribute removed so `Icon(painter = painterResource(...), tint = OmenTheme.color.<...>)` supplies the color from Omen semantic tokens (selected: `accent`; unselected: `textSecondary`). Path data, viewport, and `android:autoMirrored` settings are unchanged from the official artwork.

**Placement:** `mobile/android/app/src/main/res/drawable/` (app module — product-navigation assets, not DS assets).

**Rendering:** `Icon(painter = painterResource(id = R.drawable.ic_nav_...), contentDescription = "<localizable label>")` inside Material 3 `NavigationBarItem`. Each tab has a distinct `contentDescription` for TalkBack ("Command Center", "Omen of the Week", "Trade Analyzer", "Draft Assistant", "Account settings").

**Cite:** native resource-alignment addendum §4 — Material Symbols / Google Font Icons for Android-native system iconography that maps to approved control/affordance specs. Source distribution: `github.com/google/material-design-icons`.

## `OmenAndroidApp.kt` retirement from primitive-enforcement allowlist

Retired 2026-07-22 with this PR. The refactor removed every banned surface:
- `Button` / `OutlinedButton` / `OutlinedTextField` → replaced by `OmenButton` (variants Primary / Secondary / Danger) or delegated to the extracted auth files.
- Raw `Color(0xFF…)` literals inside `MaterialTheme(darkColorScheme(...))` → deleted. Now wraps in `OmenTheme { … }` which internally provides `MaterialTheme`.
- Nav rail: raw `NavigationBar`/`NavigationBarItem` (unbanned) with new `Icon(painter = painterResource(...))` per tab, tinted via `NavigationBarItemDefaults.colors(selectedIconColor = OmenTheme.color.accent, ...)`.

Primitive-enforcement scanner is green with `OmenAndroidApp.kt` no longer allowlisted.

## M4-Auth retirement item

Two files remain allowlisted under a **single** tracked retirement item written into `Direction/current_sprint.md` and `PrimitiveEnforcementTest.ALLOWLISTED_FILES`:

- `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/auth/OmenAuthFlow.kt`
- `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/auth/OmenDeleteAccountScreen.kt`

**Exit condition (single event, no partial exit):** both files replaced by compositions built from approved Omen primitives (`OmenTextField`, `OmenFormField`, `OmenButton`, `OmenConfirmationDialog`, `OmenCard`, `OmenStateSurface`), both entries removed from `ALLOWLISTED_FILES` in the same PR, scanner still green.

**Non-expansion covenant:** M4-Auth is the *only* future exemption path for these two files. No third auth file may join the allowlist without opening a separately-tracked retirement item.

## Verification

- **Android compile / test / assemble:** `:core:designsystem:testDebugUnitTest` (primitive-enforcement scanner green with the new allowlist shape), `:core:designsystem:assembleDebug`, `:app:assembleDebug` — all BUILD SUCCESSFUL.
- **`:app:` androidTest:** currently unwired (no runner deps declared in `mobile/android/app/build.gradle.kts`). An initial `OmenCommandCenterScreenTest.kt` was authored, then removed because adding androidTest deps is a gated `build.gradle.kts` change and this PR must not modify dependencies. Test evidence recorded as a follow-up in the skill ledger.
- **Android instrumentation on device / Studio-managed AVD:** **not run in this session** — no Studio-managed ADB path exposed to this shell. **Not claimed passed.** Required-evidence pointer: launch the app on any Play-services API 34+ AVD or real device, sign in (or Try Demo), and verify (a) all 5 nav tabs render their Material Symbols icons at 24dp with selected/unselected Omen-token tints; (b) the Command tab renders the connected fixture; (c) tapping other tabs shows the "coming next" state surface.
- **iOS:** local Xcode toolchain unavailable in this shell. **Treated as pending verification on `main`** — the unsigned simulator CI (`ios-ci.yml`) exercises `OmenCommandCenterScreenTests` and the full app build on push.
- `git diff --check` clean.

## Accessibility checks (both platforms)

- Every navigation icon carries an explicit `contentDescription` (Android) / `Label(...)` string (iOS) so TalkBack / VoiceOver announces the tab name.
- All meaningful color signals in the screen body inherit the "color is never alone" invariant from Batch 1–3 primitives: badge tones always carry text labels; confidence gradient always prints the numeric score; risk levels always print level names.
- Touch targets: Android nav tabs use Material 3's default 48dp minimum; iOS TabView items use system-native 44pt targets.
- Dynamic Type / font scale: all screen typography flows from `OmenTheme.typography` / `OmenTypography`, which use `sp` (Android) and system-scale-aware fonts (iOS).
- Reduce Motion: no animations added in v1.

## Parity notes

- Same field set, same enum values, same fixture data drives both platforms — fixtures declared symmetrically as `OmenCommandCenterFixtures.demo{Connected,Disconnected,Reauth,Loading,OffSeason}` in both languages.
- Nav chrome is deliberately platform-native (Compose `NavigationBar` on Android, SwiftUI `TabView` on iOS) per registry §6.1/§6.2 "prefer system components."
- Icon parity: SF Symbols on iOS ↔ Material Symbols on Android, both filled style, matched semantically per the table above. No mixed icon libraries.
- Content descriptions vs SwiftUI Labels: Android uses `contentDescription` on `Icon`; iOS uses `Label("<name>", systemImage: "<symbol>")` which supplies the label as accessibility text automatically. Same intent, native-native expression.

## Copy verification (`slops-ux-copy` lightweight pass)

Every visible string in this PR was audited against `Brand/brand-system.md` voice anchors (sharp, recommendation-first, instinct-testing) before commit. Notes:

- Screen headings ("Command Center" eyebrow, dynamic greeting) — plain, present-tense, no marketing puff.
- Section labels ("Your platforms", "This week's Omen") — declarative, no over-cued urgency.
- Fixture greetings ("This week's move is ready.", "Sunday Slate needs a reconnect.", "Season's between reps.") — declarative + action-oriented, no false urgency.
- CTAs ("Manage league", "Connect Yahoo", "Reconnect Yahoo") — verb-first, provider-specific, action-safe.
- State-surface copy inherited from Batch 3 DecisionBrief shell — already brand-voice-checked in that PR.
- Nothing in this PR presents a mock recommendation as live; Mock DecisionBrief variant on `demoConnected` renders the "Demo · Sample data — not live advice." banner.

Real product copy (once live wiring lands) will get a full `slops-ux-copy` pass at that time; this PR's fixture strings are scaffold with brand-voice sanity-checked.

## Boundaries honored

No provider connect flows, provider credentials, auth wiring changes (session/store/reducer untouched), backend, SQL, secrets, `.env`, DNS, Nginx, signing/store/release, dependency or package change (no `material-icons-extended`, no androidTest deps added), Figma library publish, team-runtime-theming, `frontend/` web, or real network calls. No push, PR, merge, or deploy.

## Skills

- **Used:** `slops-repo-inspector`, `planning-pass`, `slops-tdd` (iOS contract tests + planned-then-removed Android render test — see follow-up), `slops-quality-baseline` (compile/assemble/enforcement gates + explicit negative check via `OmenAndroidApp.kt` allowlist removal), `slops-code-review`, `slops-git-flow`, `slops-context-markdown`, `slops-ux-copy` (lightweight pass as verification step per revised gate).
- **Substituted:** `slops-mobile-smoke` / `slops-ui-ux-audit` — same native substitution as prior M1-P PRs (Gradle + iOS CI); no web driver applies.
- **N/A:** `security-privacy-evidence`, `rbac-risk-review`, `slops-legal-spot-check` (no trust boundary, provider claim, credential handling, or public-facing legal copy — auth code paths untouched), `design-md-author` (no new design contract), `demo-mode-pre-empty-state` (already codified in fixtures; visible Mock labels present), `slops-taste` (fits existing DS grammar).

## Judgment calls Justin can override

- **Auth surfaces extracted, not redesigned.** Justin's revised gate approved this explicitly; recorded here for completeness. M4-Auth is the exit path.
- **DS gallery on Android just points at the running app for Command Center evidence** rather than rendering the screen inline. The DS gallery is the primitive-evidence surface; the running app is the screen-evidence surface. iOS gallery renders the screen inline (with `.frame(maxHeight:)` caps) since SwiftUI `#Preview` handles nested screens well. Different approaches per platform to keep the gallery honest. Change requests welcome.
- **`:app:` androidTest not wired in this PR** so the Compose render test was removed rather than left uncompilable. Reintroducing it needs a small `build.gradle.kts` dep addition, which is gated.
- **Nav rail icon tints from `accent` (selected) / `textSecondary` (unselected).** These are Omen semantic tokens and read cleanly on the dark surface; if you want a different unselected tone (e.g. `textTertiary` for lower emphasis), one-line change.

## Follow-ups worth their own items

1. **M4-Auth** — retire the two auth-file allowlist entries via Omen-primitive-native auth pass (sprint item filed in `Direction/current_sprint.md`).
2. **`:app:` androidTest scaffolding** — small `build.gradle.kts` change to enable Compose UI tests in the app module so feature-screen render tests can land alongside features. Currently the only compose UI testing lives in `:core:designsystem`'s androidTest.
3. **Live wiring** — Command Center currently renders `OmenCommandCenterFixtures.demoConnected` unconditionally on the Command tab. Wiring dashboard-summary polling → `OmenCommandCenterState` is separate work, blocked by M0-BE bundle progress.
4. **Trade / Draft / Omen tab content** — currently text state-surfaces. Each is a follow-up M4 screen assembly using approved primitives + P3 compositions.

## Next work after this PR

- **Merge M4 Command Center v1.** With this landed, `OmenAndroidApp.kt` is fully compliant and the first real product screen is on both platforms.
- **M4-Auth pass** to retire the last two allowlist entries.
- **M0-BE-0** (backend-lean) or the next feature screen (product-lean) depending on your pull.
