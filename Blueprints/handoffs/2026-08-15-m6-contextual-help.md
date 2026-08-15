# Handoff — 2026-08-15 — M6-ContextualHelp

**Task:** `M6-ContextualHelp` — the unbuilt half of `m4-help-support-v1` §1. The native app showed
people states and numbers without ever explaining what they were.

**Status: complete on both platforms, locally verified, not pushed.** Nothing merged or deployed.
Accessibility verification was completed in a second pass at the founder's direction — TalkBack was
genuinely driven on Android; iOS VoiceOver is impossible on the Simulator and was substituted with
Apple's accessibility audit under a new UI-test target. That pass found and fixed a real AA contrast
defect in this component.

## What shipped

A `What is this?` affordance on all four **shipped** native destinations — Command Center, Omen,
Connect, Account — presenting a short, per-destination explanation and returning to the exact
prior state on dismiss.

| Layer | iOS | Android |
|---|---|---|
| Primitive (registry §3.1 Tooltip/Help) | `DesignSystem/OmenContextualHelp.swift` | `core/designsystem/component/OmenContextualHelp.kt` |
| Content table | `App/Help/OmenContextualHelpContent.swift` | `app/feature/help/ContextualHelpContent.kt` |
| Tests | `OmenIOSTests/OmenContextualHelpTests.swift` (9) | `app/src/androidTest/.../ContextualHelpContentTest.kt` (8) |
| Glyph | SF Symbol `questionmark.circle` | new `res/drawable/ic_help.xml` |

Wiring edits: `OmenCommandCenterScreen` (both), `CommandCenterView.swift` (Omen title row, Connect
and Account sheet toolbars), `OmenDecisionScreen.kt`, `OmenAndroidApp.kt` (Connect + Account sheet
help rows), `ScreenshotScenarios` (both, 4 new scenarios each).

## Three scope findings, resolved as approved

1. **The `Tooltip/Help` primitive did not exist.** The spec says "using the *existing* Tooltip/Help
   primitive"; it is defined in registry §3.1 but was never in the M1-P P2 build list, and
   `grep -i tooltip` across both apps returned zero hits. M6 had to build it first. Read as covered
   by the approved Figma nodes `61:2`/`63:2`/`63:26` (spec §3 lists `Tooltip/Help` as a member of the
   approved Help + Support composition) — **founder-confirmed at the plan gate, not Figma-verified in
   this session**, since Figma MCP was unauthenticated.
2. **Four destinations, not six.** Trade and League still render "landing next" placeholders. A help
   affordance there would explain a feature that does not exist. A test pins the omission and says to
   delete itself when those screens ship.
3. **The spec §6 file boundary scopes the Help + Support build, not this.** §6.4 anticipates a
   separately scoped task; the founder ratified this file list as that scope at the plan gate.

## The two required content corrections

Both are asserted by tests on **both** platforms, so a future copy edit cannot silently reintroduce
them:

- **No Draft Assistant.** Web `PAGE_HELP` still advertises it on `/football` and in the default
  topic. Cut from 1.0 (facts-of-record #9).
- **ESPN connects on the web, not in the app — and help says so rather than dropping it.** Web
  `PAGE_HELP` describes pasting ESPN cookies, which a store build must never ask for. The wrong part
  is the *mechanism*, not the encouragement: ESPN is `.useWeb`, so the league is linked once on the
  Omen website and then appears in the app. Every ESPN sentence must name the website, **and a
  second assertion pins that ESPN is still offered at all** — the "must say website" rule would
  otherwise be satisfiable by deleting ESPN, which would strand every ESPN user. The Yahoo and ESPN
  sentences are pinned character-for-character against `ConnectProvider.availability`, so provider
  copy and the connect screen cannot drift apart.

Two further bans were added beyond the item's ask, because the same web source carries them:
help copy may not mention cookies at all, and the only permitted "password" sentence is the promise
that Omen never asks for one (onboarding contract §5 — a store build must not ask for either).

## Evidence

| Gate | Result |
|---|---|
| iOS unit suite | **183/183, 0 failures.** `xcodebuild test`, Xcode **26.6** (build 17F113). Baseline was 174; +9 new. |
| iOS destination | `platform=iOS Simulator,name=iPhone 17 Pro` — **substitution deviation:** the DoD "Local substitutes" row names iPhone 16 / Xcode 16.2; neither is installed on this Mac. |
| Android instrumented | **50/50, 0 failures**, `:app:connectedDebugAndroidTest` on `medium_phone` AVD (API 36). Baseline 42; +8 new. Re-run clean after the nav-bar fix. |
| Android unit + assemble | `:core:designsystem:test` and `:app:assembleDebug` **BUILD SUCCESSFUL**. |
| Visual — Android | All four scenarios captured on-device. Verified light **and** dark, at font scale **1.0 and 1.8**. |
| Visual — iOS | `contextual-help.connect` captured on the iPhone 17 Pro simulator; copy is character-identical to Android. |
| iOS UI/accessibility | **5/5**, new `OmenIOSUITests` target. Total iOS **188** (183 unit + 5 UI). |
| TalkBack | **Actually driven** on the API 36 AVD — see below. |

**One real defect found and fixed by looking at the screenshots, not the tests.** At font scale 1.8
the Android sheet's last line ran underneath the gesture navigation bar. Added
`navigationBarsPadding()` to the scrolling column and re-verified. The tests were green before and
after — only the render showed it.

## Accessibility — the screen-reader pass

### Android: TalkBack was genuinely run

TalkBack was installed from the `google_apis_playstore` image, enabled, and confirmed **bound** with
touch exploration on (`dumpsys accessibility` → `Bound services:{Service[label=TalkBack...]}`), then
driven against the running app. What it established:

- The affordance exposes `content-desc="What is this? Command Center"` — that is what TalkBack
  announces, and it is distinguishable from the `Account and profile` control beside it.
- Its node measures **126px at density 420 = 48dp**, meeting the Android touch-target rule by
  measurement rather than by assertion.
- **TalkBack's own double-tap opened the sheet**, and the accessibility tree then exposed the title,
  summary, and all four tips in reading order.
- **System Back dismissed the sheet and returned to Command Center without leaving the app** — spec
  §4's exact requirement, verified rather than assumed.

TalkBack does not log its utterances to logcat at any public tag, so the evidence is the accessibility
node tree it consumes plus confirmation that the service was bound and speaking (it held audio focus
as `USAGE_ASSISTANCE_ACCESSIBILITY / CONTENT_TYPE_SPEECH`). No synthesized-speech transcript exists.

### iOS: VoiceOver cannot run on the Simulator — substituted, and the substitution is named

`com.apple.VoiceOverTouch` is registered with launchd as a `LimitLoadToSessionType = Background` job
and never acquires a PID in the Simulator, so **no simulator run can drive a real screen reader.**
Setting `VoiceOverTouchEnabled` and respringing does not change this.

The substitute is Apple's own `XCUIApplication.performAccessibilityAudit()`, which walks the same
accessibility tree VoiceOver would and checks element descriptions, contrast, hit regions, clipped
text, and traits. That required a **new `OmenIOSUITests` target** (the project had only a unit-test
target); it is registered in the shared scheme, so `xcodebuild test -scheme OmenIOS` now runs UI tests
too and takes ~65s longer.

**An audit is not a human VoiceOver pass.** It proves an announcement exists and is well-formed; it
cannot judge whether it is *useful*. A real-device VoiceOver pass remains open.

### What the audit caught — one of them mine

1. **`Contrast nearly passed` on the contextual-help surfaces — my defect, fixed.** I had used
   `text-secondary` for the summary and tip bodies. On `surface-2` in light mode that measures
   **4.43:1, under the 4.5:1 AA floor.** Registry §3.1's Tooltip/Help row specifies `surface-2` +
   **`text-primary`** — I had not followed it. Corrected on **both** platforms; the audit now passes.
   The underlying token pair is still available to every other component, so it is logged as a
   design-system risk.
2. **`Contrast failed` on the Command Center screen — pre-existing, not mine**, and a stronger verdict
   than the above. Pinned under `XCTExpectFailure` so it stays visible and fails loudly when fixed.
3. **`Dynamic Type font sizes are unsupported`, app-wide — a mechanism finding, not a functional one.**
   `OmenTypography` vends `Font(UIFontMetrics.scaledFont(for:))`, which the audit cannot recognize as
   scalable. I checked the behavior directly rather than trusting either verdict: the same surface at
   `UICTContentSizeCategoryM` vs `UICTContentSizeCategoryAccessibilityXXXL` scales and reflows with no
   clipping. So `.dynamicType` is excluded from the audit with that reasoning recorded at the
   exclusion site, and every other category stays enforced.

Two of my own UI tests were also wrong and were fixed: one asserted on "Waiver Watch", which is *also*
a Command Center section heading, so it would have passed whether or not the sheet ever opened.

### A correction I had to make to my own finding

Reading the live TalkBack tree, I flagged the Command Center matchup hero —
`"No matchup yet — connect Sleeper or ESPN to see your team's week."` — as a false capability claim.
**That was wrong, and the founder corrected it.** ESPN *is* connectable and Omen wants people to
connect it; only the in-app credential handoff is missing, and the in-app path already handles that
honestly (choosing ESPN in Connect reaches `.useWeb`, which routes to the website rather than
dead-ending). The hero's advice is actionable as written.

The error came from carrying the sprint item's own phrasing — "on native, ESPN cannot be connected at
all" — straight into a judgement instead of checking it against `ConnectProvider.availability`, which
says `.useWeb`, not "unavailable". `known_issues.md` now carries the correction with an explicit
**do not "fix" this by removing ESPN from the copy**, because the natural over-correction is to strip
the mention and quietly strand those users.

## Skills

**Invoked:** `design:accessibility-review`, `design:ux-copy`.
**Considered, N/A:** `figma:figma-design-to-code` — Figma MCP unauthenticated in this session, so the
node reading in finding 1 is a documentary claim, not verified evidence; `engineering:testing-strategy`
— the test seam is fixed by spec §6; `code-review` — the founder may still want to run it on the diff.

## What is NOT done — read before claiming M6 complete

- **A real-device VoiceOver pass is still open.** The Simulator cannot run VoiceOver at all, so iOS
  screen-reader evidence is Apple's automated audit, not a human listening to announcements. TalkBack
  *was* genuinely driven, so the two platforms are not equally evidenced.
- **No synthesized-speech transcript exists for TalkBack** — it does not log utterances at a public
  tag. The evidence is the accessibility tree plus proof the service was bound and speaking.
- **`XCTExpectFailure` hides two real pre-existing findings from the red/green signal.** That is
  deliberate and documented, but it means "iOS green" now silently tolerates a Command Center contrast
  failure. Do not read the green as the whole screen being accessible.
- **The visual-evidence workflow matrix has no rows for the 8 new scenarios.** Adding them means
  editing `.github/workflows/native-visual-evidence.yml`, which was outside the approved file list.
  The scenarios exist and were captured manually; CI will not capture them until those rows land.
- **The Android content test lives in `androidTest` and needs an emulator.** `:app` still has no JVM
  unit-test source set, and adding one is a `build.gradle.kts` dependency edit — founder-gated. The
  iOS twin runs with no device. Move them when a source set exists.
- **Reduced-motion and reduce-transparency were not tested.** Both surfaces use native
  sheet presentation with no custom animation, so there should be nothing to suppress — unverified.
- **The new `OmenIOSUITests` target is a structural project change.** It adds a third target and a
  second `TestableReference` to the shared scheme, so the standard test command is now slower. Worth
  a look during review.
- Nothing pushed, branched, merged, or deployed. No API, telemetry, provider, credential, SQL, or
  dependency surface was touched.

## Standing caution earned

**Green tests and a correct render are different gates.** Every content rule I wrote a test for
passed on the first Android run; the layout defect at large text was invisible to all of them and
took four seconds of looking at a screenshot. For any surface with text, capture it at a large font
scale before calling it done.
