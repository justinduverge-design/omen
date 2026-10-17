# Native live foundation audit — 2026-10-17

**Purpose:** Ground-truth baseline before rebuilding Omen's native experience from the shell upward.  
**Source checkout:** `codex/omen-native-lock-v2` at `c2eb961d`.  
**Physical app observed:** Omen `0.1.0` (bundle build `11`) on the paired iPhone 15.  
**Boundary:** The physical device was launched and captured read-only. No app install, signing change,
provider mutation, production command, store action, or release action occurred.

## 1. What is proven now

- The installed Build 11 launches on the paired physical iPhone and reaches the signed-in Command
  destination.
- The live Command destination resolves a selected provider/league, matchup, Waiver Watch and Ledger.
- The loading composition uses shaped placeholders rather than a blocking full-screen spinner.
- The four-destination tab bar is present and the selected destination is structurally clear.
- The current source builds for an iPhone simulator.
- The focused data tests and native unit tests for the evaluated-read slice pass.
- The broad current-source interaction run executed 75 simulator UI tests: 74 passed and one failed.

This proves launchability, one live destination, fixture reachability and most existing interaction
assertions. It does not prove every live tab, tactile quality, VoiceOver flow, exact latency, background
recovery, or the current source on a physical device.

## 2. Physical launch finding: false zero-state flash

Immediately after activation, Command can render an unscoped resting composition containing:

- no league context;
- `Omen has not read a league yet` for matchup;
- an unread waiver sentence;
- `No calls on the record yet` for Ledger.

The selected league and its live sections replace that composition shortly afterward. This is not the
same as the intentional shaped loading screen: the intermediate copy makes factual zero-state claims
before league resolution has completed.

Likely ownership boundary:

- `CommandCenterView` starts the dashboard read while the independently-owned league directory/carousel
  is still resolving the active scope.
- `pickedLeagueScope` may therefore be absent for the first dashboard read.
- a later context resolution/reload replaces the unscoped result.

Ground-up requirement: shell context must resolve to `unknown`, `resolving`, `selected`, or `confirmed
none` before a feature screen chooses loading versus no-league copy. `nil` cannot continue to mean both
"not resolved" and "no league exists."

## 3. J1 no-league finding: failing test and incomplete contract

Failing check:

`J1InteractionUITests.testNoLeagueTerminusIsNotADeadEnd`

The test expects both `Connect a league` and `See how Omen decides`. The production screen currently
renders only the connect action.

This is not safely repaired by adding a closure with no destination. `CommandNoLeague-v2` already
records the underlying contradiction: the original action said it opened evidence for the same
decision id, but a user with no league has no decision id. The foundation rebuild must define a real
generic Omen-method explainer destination, or explicitly retire the second action and amend the test and
screen contract together. An inert or fabricated evidence button is not acceptable.

## 4. Simulator interaction baseline

The selected interaction suites ran on the iPhone 16 simulator:

| Suite | Result |
|---|---:|
| Carousel layout | 4 / 4 |
| Shared chrome | 13 / 13 |
| J1 — Getting in | 5 / 6 |
| J2 — The desk | 10 / 10 |
| J4 — Trade | 12 / 12 |
| J5 — League / Scout | 17 / 17 |
| J6 — Ledger | 13 / 13 |
| **Total** | **74 / 75** |

The interaction suite mostly proves fixture controls exist, remain hittable and meet minimum target
dimensions. Its own documentation correctly says fixture taps do not prove production navigation.

## 5. Composition measurements that need foundation review

The D11 probes show that the product currently mixes fit and scroll policies across independently-built
screens. Notable measured overflow on the simulator included:

- connected Account: `61pt` overflow, declared scroll;
- Trade Build: `351pt` overflow, declared scroll;
- Trade Verdict: `309pt` overflow, declared scroll;
- League Table: `276pt` overflow, declared scroll;
- degraded League: `285pt` overflow, declared scroll.

The Command fixture reported a much larger accessibility content height than its viewport while its
contract still declared fit. Because that value can include merged or offscreen accessibility content,
it must be reproduced with the canonical shell before being treated as a literal visual overflow.

Ground-up requirement: every destination must declare one of `fit`, `content scroll`, or `section
scroll`, and the measurement must be owned by the shared screen shell rather than reimplemented per
journey.

## 6. Loading and performance evidence

The current physical evidence establishes sequence, not a defensible millisecond SLO:

1. activation;
2. intermediate unscoped/empty Command composition;
3. selected league context and live section content.

CoreDevice supports screenshots for this paired phone but reported that Screen Recording is unsupported.
Sequential screenshots are too affected by command and transfer latency to become precise timing data.

Ground-up requirement: add privacy-safe in-app signposts for:

- `input_ack_ms`;
- `shell_ready_ms`;
- `context_ready_ms`;
- `data_ready_ms`;
- screen, action, outcome and cache state only.

No player, team, league, provider identifier, recommendation content, token or credential belongs in a
timing event.

## 7. Visual observations from Build 11

- The dark, brass-led identity is coherent and legible on the physical phone.
- The screen is dense but not visually chaotic; hierarchy is understandable at default text size.
- Matchup, waiver, ledger, reporting and global navigation all compete within one viewport. The report
  pill in particular consumes persistent space despite being a secondary operation.
- Live score, projected score and record metadata rely on proximity and typography; the next shell pass
  should verify that VoiceOver announces their relationships rather than reading disconnected numbers.
- The floating tab bar is visually strong but reduces the usable content viewport and must be treated as
  a shell inset, not repaired independently with per-screen bottom padding.
- The provider colour exception is bounded in the observed Command screen.

## 8. Ground-up order established by this check

1. Introduce an explicit app/league context state machine.
2. Define the canonical screen shell, safe-area and tab-bar inset policy.
3. Centralize dependency construction and feature loading ownership.
4. Add local signpost timing before setting latency targets.
5. Finish the foundation-control interaction matrix and physical haptic walk.
6. Resolve the J1 no-league explainer contract.
7. Re-run accessibility, fit/scroll and production-navigation evidence.
8. Only then propagate the new screen language and evaluated-read presentation through journeys.

## 9. Evidence classification

- **PASS-PHYSICAL:** installed Build 11 launches and live Command resolves on paired iPhone 15.
- **PASS-SIMULATOR:** current source builds; 74 interaction checks pass.
- **FAIL-CONTRACT:** J1 no-league secondary exit is unresolved.
- **FAIL-FOUNDATION:** transient unscoped state can present as a confirmed empty league state.
- **UNPROVEN:** exact cold/warm timings, physical haptic quality, complete live-tab walk, VoiceOver,
  accessibility text sizes on device, background recovery, and current branch installed on device.

## 10. Xcode-native foundation audit

The project is a real Xcode project rather than only a cross-platform source tree:

- shared `OmenIOS` scheme with build, test, profile, analyze and archive actions;
- iOS 17 deployment target, automatic signing, app and test targets;
- committed non-secret base configuration with an optional ignored local override;
- explicit Info.plist, Sign in with Apple entitlement and associated web-credentials domain;
- portrait iPhone policy and dark system chrome;
- Wix Madefor Display/Text font resources;
- build guard that permits an unconfigured Debug compile but rejects an unconfigured Release/archive.

The 2026-10-17 local baseline uses Xcode 27.0 (`27A266a`) and the iOS 27 SDK while compiling in
Swift 5 language mode. The app builds successfully for the iPhone 17 simulator. It is **not** yet
ready to flip to Swift 6 mode blindly: the first compiler pass found actor-isolation and capture
diagnostics in authentication/session code. The warnings in source were repaired in this slice;
the remaining warnings are the intentional missing-local-config guard and Apple's harmless
AppIntents metadata notice for an app with no AppIntents dependency.

Foundation decision: adopt current Xcode warnings as errors incrementally before changing
`SWIFT_VERSION`. A clean Swift 5 build is the starting line; Swift 6 is a separately measured
migration, not a project-setting checkbox.

## 11. League-switcher presentation root cause and repair

The reported first-tap failure had a structural cause. `CommandCenterView` owned one
`showSwitcherSheet` Boolean and passed it into the Omen, Trade and League `OmenTeamPicker` views.
Command itself had no picker. A Switch tap from Command therefore activated the same presentation
binding on three off-tab views and depended on SwiftUI choosing a presentation anchor. A later UI
update could make one presenter win, which matches the observed "tap something else and it appears"
behavior.

The repaired ownership is:

1. the signed-in shell is the only presenter for context-strip and screen-shell switch actions;
2. every one of those actions routes to the shell's native `.sheet`;
3. a picker may still own a local sheet for its own pinned control in an isolated feature host;
4. the existing rich sheet content remains Omen-owned inside Apple's presentation container.

A `Picker` with menu style is intentionally not substituted here. Apple's menu picker is right for
a compact mutually-exclusive list, but the approved Omen contract also requires provider filters,
favourite ordering and mutation, partial-provider notices, active-state explanation and adaptive
content height. Those jobs require a focused sheet. The native win is using one system presenter,
system detents, drag dismissal and accessibility behavior—not deleting necessary product behavior.

## 12. Foundation backlog after this slice

| Order | Foundation seam | Current state | Exit evidence |
|---:|---|---|---|
| 1 | App/league context state | Explicit resolving, selected, confirmed-none, failed and demo states now drive Command | physical cold-launch walk and timing receipt remain |
| 2 | Presentation routing | Switcher centralized; connect, account, report and share remain separate flags | one typed route per presentation scope; cancellation/back tests |
| 3 | Performance signposts | contract exists; no measured local signposts | cold/warm paired-iPhone Instruments receipts |
| 4 | Shell geometry | per-screen fit/scroll policies still mixed | canonical inset/scroll owner with compact and large-device probes |
| 5 | Swift concurrency | current warnings repaired; Swift 5 mode remains | strict-concurrency audit and staged Swift 6 plan |
| 6 | Accessibility/device feel | primitive press states and haptic client exist | VoiceOver, Reduce Motion, Dynamic Type and physical haptic walk |
| 7 | J1 no-league exit | contract contradiction remains | real explainer destination or approved removal |

The initial read-only audit changed no signing identity, entitlement, local configuration, installed
app, provider account, deployment or store state. Section 13 records the later founder-authorized
development install; no provider, production, deployment or store state changed.

## 13. Paired-iPhone development install and tactile slice

After the founder explicitly approved using the paired phone as a normal development target, the
branch was built with the existing ignored local public configuration, signed with the established
development identity, installed over the existing Omen bundle and launched on the paired iPhone 15.
The existing Keychain-backed session remained valid and the live Command destination resolved real
league content. Private captures stayed under `/tmp/omen-native-device-private-2026-10-17` and were
not added to the repository.

The first tactile propagation closes the switcher's primitive-level gaps:

- the league identity is a real accessible button instead of `onTapGesture`;
- chips, provider filters, league rows and favourite stars share the canonical pressed treatment;
- filters, chips and stars use selection feedback;
- opening the league sheet uses light impact;
- committing a different active league uses medium impact;
- selecting the already-active filter or league does not replay a haptic or issue a redundant action;
- Reduce Motion keeps immediate non-motion emphasis while removing scale.

Evidence after the change: signed device build/install/launch PASS; live Command composition PASS;
39 focused native unit tests PASS; 10/10 J2 interaction tests PASS. Physical tactile quality still
requires the founder's hand because screenshots and automation cannot feel the Taptic Engine.

## 14. Context truth repair and screen-data binding

The first foundation seam is now represented explicitly by `LeagueCarouselViewModel.ContextResolution`:
`resolving`, `selected`, `confirmedNone`, `failed` and `demo`. Command holds its shaped loading
composition while the directory resolves, gives directory failure its own retry surface, and renders
the no-league terminus only after a successful empty directory. Its initial personalized dashboard
read now waits for directory resolution, so cold launch does not intentionally issue an unscoped read
that immediately needs replacement.

The first paired-phone install exposed one more ownership race: SwiftUI mounted several tab children,
two directory reads began, the first succeeded, and the cancelled second read left the shared model in
`.loading`. The directory model now coalesces concurrent surface requests into one lifecycle-independent
task. A regression test fires three simultaneous surface loads and requires exactly one repository read.

Evidence after the repair: 27/27 `LeagueCarouselTests` pass; signed device build/install/launch passes;
the live console records exactly one `GET /api/leagues` (`200`, 381ms in the recorded run); and the
paired iPhone resolves from shaped context placeholders to the selected live league without displaying
the former factual zero-state. This promotes the original context-truth finding to **PASS-PHYSICAL**.
It does not establish a cold/warm latency SLO; that still requires in-app signposts and repeated samples.

The next screen/canvas propagation is governed by
`Blueprints/specs/mobile/omen-native-information-fulfillment-v1.md`. It binds Verdict, Leading Read,
Counsel, Crosswind, Portents, Fog and Receipt to current response fields, defines absence and freshness
behavior, and requires eight concrete J3 canvas/native states. It also prevents either native client
from electing forecast authority locally or exposing the internal `sight` name to customers.

## 15. Clean-slate retirement inventory

The source audit found two generations of native composition living beside each other. Removal is
ordered by reachability and dependency rather than filename age:

| Surface | Current reachability | Classification | Retirement gate |
|---|---|---|---|
| `OmenCommandDeskScreen` | production Command and current J2 evidence | production authority | keep; all Command states and captures converge here |
| `OmenCommandCenterScreen` view | no longer mounted by production after this slice; still mounted by older screenshot fixtures | migration fixture | move shared models and receipt/detail views out of its file, replace remaining fixture captures, then delete the view |
| Ledger entry, receipt loader and detail-sheet support formerly co-located in `OmenCommandCenterScreen.swift` | used by the current Command desk and J6 | extracted live support | complete: `OmenLedgerSupport.swift` now owns the live types without the retired screen |
| `OmenStartSitScreen` | no remaining references; deleted in this slice | retired standalone composition | complete: both J3 scenarios now render the current Omen screen with nominal or incomplete inline detail |
| `OmenDecisionScreen` with inline start/sit detail | production Omen destination | production authority | keep and make the first fulfillment target for the new argument-density contract |

This slice removes the production fallback to `OmenCommandCenterScreen`. Demo now produces a clearly
labeled sample `OmenDeskState`, so App Review, screenshots and real accounts use one Command typography
and layout authority. The fallback for an unknown future state is a fail-closed error surface, not the
retired composition. Regression tests assert both the Demo desk shape and the absence of the retired
screen mount from `CommandCenterView`.

The standalone Start/Sit composition is now deleted. Its two named J3 scenarios retain their stable
keys but mount `OmenDecisionScreen` with nominal or incomplete `start-sit-detail.v2` data. This exercises
the same in-place enrichment production mounts and prevents the former post-load typography/layout swap.

The first dependency split after that deletion moves `OmenLedgerEntry`, `LedgerReceiptView` and
`CommandCenterDetailSheet` into `OmenLedgerSupport.swift`. Those types remain live in the current desk
and J6; extracting them makes the remaining old Command state, fixtures, gallery and waiver scenarios
a bounded legacy island that can be migrated and deleted without copying or sacrificing Ledger behavior.

The follow-on split moves `OmenLedgerPreviewState` into the same live support file. Production Command
and J6 now read `CommandCenterViewModel.ledgerState` directly; they no longer route Ledger rows through
`OmenCommandCenterState`. Demo rows are constructed as labeled Ledger entries rather than borrowed from
`OmenCommandCenterFixtures`. The aggregate remains temporarily for legacy screenshots and mapping tests,
but it is no longer on the current screen's data path.

