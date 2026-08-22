# Handoff — 2026-08-22 — M4 render-evidence package

**Branch:** `evidence/m4-render-capture-package` · **Base:** `f4a6ae1` · **PR:** open, not merged.

Closes three items: **`M4-CC-PlatformsCompact`**, **`M4-CC-WaiverWatch`**, **`M4-Help-Support-Implementation`**. All three are now `CLOSED / COMPLETED` and ledgered in `Direction/sprints_completed.md`. `B-FREEZE` loses two of its five blockers.

## What this package actually was

All three were **implementation-complete and merged**. None was missing code. All three were stuck on the same gap: their `Blocked by:` lines said `AGENT_RESOLVABLE`, and every one of them was asking for **rendered evidence that had never been captured**.

So this was a capture-and-verify pass. The source changes are deliberately small and none of them touch a shipped composition:

| Change | Why |
|---|---|
| `waiver-watch.*` entries in both `ScreenshotScenarios` registries | the six Waiver Watch states had no way to be rendered in isolation; each entry varies only `waiverWatch` on the real `OmenCommandCenterScreen` |
| `onOpenOmen` added to the iOS screenshot host | **a real defect** — see below |
| `HelpSupportAccessibilityUITests.swift` (new) | the documented VoiceOver substitute this item's `Done when:` requires |
| `scripts/capture-screenshot-scenario.sh` (new) | no local capture path existed on the Mac; see "Tooling" |

**No feature code was written. No screen was rewritten.**

## Item 1 — `M4-CC-PlatformsCompact`

Owed: an Android compact-row render for connected **and** disconnected states, assembly/scanner/connected-test results, and a handoff for `6466a4c` (PR #304 shipped none).

Delivered in `References/evidence/2026-08-14-cc-platforms-compact/` (with a `README.md`):

- `android-medium-phone-command-center-demo-connected.png` — **both row states in one frame**: Sleeper `· Connected · 4m ago ›`, Yahoo and ESPN `· Disconnected`.
- `android-medium-phone-command-center-disconnected.png` — real signed-in user, all three disconnected.

Device is `medium_phone` API 36 at 1080×2400 @420dpi = **411×914dp**. Pixel 6a is the same pixel grid at 430dpi ≈ 404×895dp — within ~2% in dp. Recorded as measured, **not claimed to be a Pixel 6a**.

**Above the fold was measured, not eyeballed.** Column scan at x=60: platforms strip 794→1174 px (380px ≈ 145dp, three 48dp rows), Omen matchup hero 1307→2000, bottom nav starts 2127. The hero ends **127px clear of the nav**, fully visible without scrolling — the clause the item turned on.

**The token was sampled from the rendered pixel**, because a token value was the assertion:

| Element | Rendered | Token |
|---|---|---|
| Strip border (3px, y794–796) | `#E5E5E3` | `border` light ✅ |
| Strip interior | `#FFFFFF` | `surface1` light ✅ |
| Page background | `#FAFAF9` | `bg` light ✅ |

Gates: `:app:assembleDebug` BUILD SUCCESSFUL · `PrimitiveEnforcementTest` **1/1** · `:core:designsystem:testDebugUnitTest` **22/22** · `:app:testDebugUnitTest` **45/45** · `:app:connectedDebugAndroidTest` **53/53**.

**Not covered, stated rather than implied:** the disconnected row's inline `[Connect]` button does not appear. That is correct — screenshot mode passes no connect handler and `OmenPlatformCompactRow` draws the button only when one exists (the honest-state rule against advertising a dead end). Connect/Manage are covered by the connected tests, not by these renders.

## Item 2 — `M4-CC-WaiverWatch`

Owed: the six registered states **rendered on iOS**. The 2026-08-12 XCTest run proved the tests pass, not that anyone looked at the states.

Delivered in `References/evidence/2026-08-22-m4-waiver-watch-ios/` — one capture per state on iPhone 17 Pro Max / iOS 26.5, each reviewed against the approved copy the Android connected test asserts: `pending`, `processed`, `availability-unknown`, `no-credible-move`, `not-connected`, `off-season`.

**Two limitations, stated rather than buried:**

1. **These scenarios are deliberately NOT added to the `native-visual-evidence.yml` matrix.** Waiver Watch renders below the fold on every current iPhone, including the largest; that workflow captures with no interaction. A matrix row would upload a screenshot of the *top* of the Command Center labelled as Waiver Watch evidence — worse than no row. Making them CI-capturable needs a scroll anchor on `OmenCommandCenterScreen`, a change to a shipped screen and out of this item's scope. **Worth a follow-up item.**
2. **`calm` has no committed render on either platform.** `urgent` is covered by the existing `command-center.demo-connected` captures. The item's `Done when:` names six states and those six are done; `calm` is named here so nobody has to rediscover it.

## Item 3 — `M4-Help-Support-Implementation`

Its `Blocked by:` line named only the Android half, but its `Done when:` requires both platforms — and PR #229's own closeout said so plainly (*"there are no Android screenshots, TalkBack/font-scale checks, compact/large-phone checks, or iOS Dynamic Type/VoiceOver claims"*). Both halves were delivered.

In `References/evidence/2026-08-22-m4-help-support-native/`:

- **Android** — five states at default scale; font scale **1.3 and 2.0**; **compact 360×640dp** via `wm size`/`wm density` (reset afterwards).
- **Android TalkBack** — focus capture, plus `android-talkback-accessible-name-inventory.txt`: **0 actionable elements without an accessible name**, and a whole-tree scan for `espn_s2`/`swid`/`cookie`/`token`/`bearer`/`password`/`secret`/`session=` returning **no hits**.
- **iOS** — five states on iPhone SE (375×667pt compact), three on iPhone 17 Pro Max, plus Dynamic Type at `accessibility-extra-extra-extra-large`.
- **iOS VoiceOver substitute** — new `HelpSupportAccessibilityUITests`, **7/7 pass**.

**Three honesty boundaries kept explicit:**

- **A real-device VoiceOver pass is still open.** The Simulator cannot run VoiceOver (`com.apple.VoiceOverTouch` is a background-only launchd job there). The audit is a substitute and is not claimed as equivalent.
- **The TalkBack evidence is a static tree check**, not a human listening pass. It proves a name exists and is well-formed — not that the announcement is useful or well-ordered.
- **Help Center rows are non-interactive by design** (`OmenHelpSupportScreen.kt:107-109`, `OmenListRow` with no `onClick`), which is why they are absent from the actionable inventory. Verified in source, not assumed. Reading only the clickable node also makes the interactive rows *look* unlabeled — their names live on the merged subtree.

## Two real defects found by looking at pixels

**1. Android bottom nav breaks at font scale 2.0.** "Command" wraps to "Comma / nd" and spills below its row; "League" clips at the screen edge. **App-wide and production code** — `OmenAndroidApp.kt:505` and the screenshot-mode twin are structurally identical `NavigationBarItem`s with no `maxLines`/`softWrap`/`overflow`, verified by reading both call sites. Help + Support's own content is clean at 2.0. Recorded in `Direction/known_issues.md`; **it still needs a GitHub issue number** — not opened here because that is an outward-facing action and this session ran unattended.

**2. The iOS screenshot host omitted `onOpenOmen`.** `OmenCommandCenterScreen` hides the Waiver Watch "Review Omen's waiver analysis" link when that handler is nil — correct product behavior — so **every iOS capture of the `urgent` and `processed` states was silently missing an element of the approved composition**, while the Android host had passed it all along. Fixed in the host; the `processed` capture was retaken and now shows the link. This is the exact failure the item existed to catch, and it was only visible because someone looked at the picture.

## `main` is red on iOS, and nothing in the repo said so

The full `xcodebuild test` fails two `ContextualHelpAccessibilityUITests` audits on **"Contrast nearly passed"**.

**Proven pre-existing rather than argued from the diff.** `f4a6ae1` was checked out into a throwaway worktree and run there: **256 passed / 2 failed**, the *same two* failures. This branch finishes at **263 / 2** — the seven new Help + Support accessibility tests, and not one new failure. That converts "unrelated to my change" — the most convenient possible belief at closing time — into a fact. This is the known `text-secondary`-on-`surface-2` defect ([#340](https://github.com/justinduverge-design/omen/issues/340)) reaching a test that was green when M6 shipped.

**A third failure was environmental, and that was proven too.** `ForcedUpdateAccessibilityUITests` failed with "Audit failed to complete in time" while an Android emulator and Gradle ran concurrently; re-run alone on an idle machine it passes. Contention, not a defect.

**The agent inbox's "All gates run and pass on `main`" line is stale for iOS.** Worth a founder decision: fix #340, or pin these two under `XCTExpectFailure` the way the Command Center audit already is.

## The near-miss worth keeping

Three capture attempts showed a bright lime-green rectangle around the platforms strip. Sampled from the PNG it was `#64C139` — nothing like the `#E5E5E3` border token, and it reads exactly like a design-token defect.

It was **TalkBack's accessibility-focus indicator**, left enabled on the AVD by an earlier session. Two things made it stick:

- `adb shell settings put secure enabled_accessibility_services ""` **fails with "Bad arguments"** and silently leaves TalkBack enabled. Use `settings delete secure …`.
- `accessibility_enabled 0` alone does not stop a running TalkBack from drawing, and **reverts to `1` on reboot** while a service is still listed.

**Sampling the pixel proved the colour; only re-running proved the cause.** Both steps were needed, and stopping after either one gives a wrong answer — a false defect report, or contaminated evidence committed as clean.

## Tooling

`scripts/capture-screenshot-scenario.sh` is new, and `scripts/README.md` was checked first as the index requires. Nothing equivalent existed: the capture path lives only inside `.github/workflows/native-visual-evidence.yml`, which is `workflow_dispatch`-only and uploads to Actions rather than producing a committable file. `scripts/preview-android.sh` is the nearest neighbour and does not fit — it hardcodes `emulator.exe`/`adb.exe` and an `AppData` SDK path, so **it does not run on the Mac that has been the native verification host since 2026-08-11**, and it knows nothing about scenario keys. That portability gap is now noted in the scripts index.

The script **refuses to capture unless the Omen window holds focus.** That guard earned itself immediately: it caught a cold-boot SystemUI ANR dialog that would otherwise have been committed as five Help + Support screenshots.

## Verification

| Gate | Result |
|---|---|
| Backend `npm test` | **593/593**, 0 fail |
| Android `:app:assembleDebug` | BUILD SUCCESSFUL |
| Android primitive-enforcement scanner | **1/1** |
| `:core:designsystem:testDebugUnitTest` | **22/22** |
| `:app:testDebugUnitTest` | **45/45** |
| `:app:connectedDebugAndroidTest` | **53/53**, 0 fail |
| iOS `HelpSupportAccessibilityUITests` | **7/7** |
| iOS full suite (branch) | **263 passed / 2 failed / 2 expected** |
| iOS full suite (base `f4a6ae1`, throwaway worktree) | **256 passed / 2 failed / 2 expected** — the *same two* |
| Net effect of this branch on iOS | **+7 passing, 0 new failures** |
| `xcodebuild -version` | **Xcode 26.6 (17F113)** |

**On the backend baseline.** The task brief gave 618/618 as of 2026-08-22. The measured figure at `f4a6ae1` on a clean tree is **593/593, deterministic across two runs, 0 failures**. 618 does not reconcile with the repo's own trail either — the last recorded count is **587/587** (`O8`, 2026-08-21), and no commit since has touched `test/` or `src/`. Nothing regressed; the brief's number simply does not match anything in the repo. Recorded rather than quietly adopted.

**Two Android infrastructure notes**, both mine and both recoverable:

- `:app:connectedDebugAndroidTest` first failed with *"Instrumentation run failed due to failed to attach"* and **0 tests run**. Cause was the emulator, which I had mutated mid-session by deleting its accessibility keys while TalkBack was live. A clean cold boot gave 53/53. Not a code failure.
- The emulator later wedged entirely (`Can't find service: package`) under contention with a concurrent Xcode run. Cold boot recovered it. **Do not run the iOS suite and Android instrumentation at the same time on this machine** — it also caused the audit timeout above.

The AVD config was temporarily modified (`hw.keyboard=no`, an unsuccessful hypothesis about the green rectangle) and has been **restored to its original contents**; the backup file was removed. The emulator's TalkBack state was left as found (enabled).

## PR CI: zero checks run on this PR, by configuration — and that is a gap

`gh pr checks 357` reports **"no checks reported"**. That is correct-by-configuration, not a
skipped gate, and it was confirmed by reading the trigger block of every workflow rather than
assumed:

| Workflow | Trigger | Fires here? |
|---|---|---|
| `pr-quality.yml` | PR, paths `src/**`, `test/**`, `evals/**`, package files, `frontend/src/**`, `client/package*` | no |
| `ui-quality.yml` | PR, paths `frontend/src/**` | no |
| `ai-evals.yml` | PR, paths `src/prompts/**`, `evals/**`, package files | no |
| `dependency-health.yml` | PR, paths package files | no |
| `ios-ci.yml` | push/PR on **`release/**`** only | no — this targets `main` |
| `native-visual-evidence.yml` | `workflow_dispatch` only | no |
| `deploy.yml` | push to `main` | no |

This PR touches `mobile/**`, `scripts/**`, `Direction/**`, `Blueprints/**`, `References/**`, and
`.gitignore`. None is in any filter.

**Name the gap plainly: a PR that changes native Swift and Kotlin source — including a new test
target file and a `project.pbxproj` edit — currently gets no CI at all.** That is the same shape
as the hole `pr-quality.yml` was created to close for `src/**`, which the agent inbox describes as
having let two production-breaking dependency PRs reach "green". The difference is that a native
PR does not reach green; it reaches *nothing*, which reads the same in the UI.

That is a deliberate cost decision for macOS runners and this pass does not reverse it. But the
**Android** side has no such cost argument — `native-visual-evidence.yml` already runs Android
emulators on `ubuntu-latest` precisely because it is ~10× cheaper than macOS, and
`:app:assembleDebug` plus the primitive-enforcement scanner would be a cheap PR gate on
`mobile/android/**`. Worth an item.

**What stands in for it here:** every gate in the Verification table above was run locally on this
branch and the counts recorded, per the DoD's "Local substitutes" rule.

## Repo relocation, noticed mid-session

The working directory moved from `~/Documents/GitHub/omen` to `~/Documents/GitHub/Slops-OS/slops-saloon/omen` at ~08:46 while this session was running — the canonical L2 path from `Direction/context.md`. Same HEAD `f4a6ae1`, clean tree, same remote. Not caused by this session; recorded because a tool call failed with "working directory was deleted" and the next agent should not read that as damage.

## Skills

- **Native mobile read gate — applied.** All seven sources read before planning. The gate is what kept this a capture pass: `omen-native-design-house-v1.md` §10 states plainly that an agent cannot claim visual correctness from code alone, which is the whole premise of all three items.
- **`slops-repo-inspector`** — applied (orientation, branch, dirty state, and the relocation above).
- **`slops-quality-baseline`** — applied; all counts recorded, including the baseline discrepancy rather than adopting the brief's number.
- **`slops-git-flow`** — applied; branch off `main`, one PR, not merged.
- **`slops-ui-ux-audit` / `slops-mobile-smoke`** — **substituted.** Both are web-route audits in this repo; the native equivalents are the rendered captures plus `performAccessibilityAudit()`, which is what was run.
- **`slops-tdd`** — **N/A for feature behavior** (none changed). The one new test is accessibility evidence, not a behavior change, and it was written after the behavior it documents.
- **`security-privacy-evidence`** — applied in the narrow sense that matters here: every capture ran in screenshot mode (no session, auth, network, or provider state), and the TalkBack tree was scanned for credential shapes with the result recorded.
- **`slops-ship` / `slops-canary`** — **UNAVAILABLE** in a standalone Omen checkout (L0 not present). Recorded as unavailable, not skipped by choice. Nothing was deployed regardless.

## Skill improvement

**The screenshot registry needs a "does this scenario actually show the thing it is named for?" check, and the CI matrix is where the absence bites.**

Two of this pass's findings share one root. The iOS host omitted `onOpenOmen`, so scenarios named for Waiver Watch states rendered those states **minus an element of the approved composition** — and nothing complained, because a scenario's contract is only its key. Separately, the `waiver-watch.*` scenarios cannot go in the CI matrix at all, because the section they are named for is below the fold and the workflow cannot scroll. In both cases the registry entry looked correct and the captured pixels were not what the name promised.

Concretely: the registry's own doc-comment says adding a scenario means "one entry here plus one matrix row". **That instruction is wrong for any scenario whose subject is not visible at launch**, and following it produces confidently mislabelled evidence. The comment should say a scenario must be capturable *without interaction* to earn a matrix row, and that anything else is local-capture-only until the screen gives it an anchor.

The broader version, which this repo has now recorded three times (`O7`'s background token, `F9`'s unrendered labels, and today): **a green suite plus a registered scenario still does not mean anybody has seen the pixels.** The only thing that closes that gap is a person looking at the image and comparing it to the contract — which is exactly what these three items were held open for, and why holding them open was right.
