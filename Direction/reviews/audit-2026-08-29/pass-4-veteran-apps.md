# Audit 2026-08-29 — Phase B, Pass 1, Veteran

| | |
|---|---|
| **Phase** | B — the apps, read against a running app |
| **Lens** | The Veteran |
| **Question** | Does it hold? |
| **Criteria owned** | B2, B3, B5, B6, B7, B8 |
| **Commit** | `7acb9dc` |
| **Date** | 2026-08-29 |
| **Method** | iOS: built to iPhone 16 simulator, installed, driven through the scenario harness and by tapping the real tab bar. Android: `medium_phone` AVD cold-booted, debug APK installed and launched. Screenshots taken and read on both. |

**Sequencing note, recorded rather than hidden.** `pre-beta-audit-criteria-v1.md` requires Phase
A and Phase B **on separate days**, and warns that *"an auditor doing both at once will quietly
demote B."* The founder directed Phase B be run the same day. It was not demoted — it produced
the highest-severity finding of the entire audit — but the deviation belongs in the record.

## Verdict

| | Count |
|---|---|
| BETA-BLOCKING | **1** |
| WEEK-1-BLOCKING | 3 |
| AFTER | 0 |
| Ruled out (emulator artifact, not a defect) | 1 |
| Abort classes fired | 0 |
| Criteria passed | 2 partial |
| Criteria not runnable | 3 |

---

## Findings

### F-VET-B01 — The screenshot harness is a hand-maintained copy of the app shell, and it has drifted from the app

- **Claim:** Every screenshot scenario and every accessibility UI test runs against a duplicate
  tab shell that no longer matches production. Trade and League still render the placeholders
  that were removed from the real app on 2026-08-29.
- **Evidence:** Launched the built app with `-OMEN_SCREENSHOT_SCENARIO command-center.disconnected`
  and tapped the real tab bar. **Trade renders "Trade is landing next"; League renders "League is
  landing next".** Source: `ScreenshotScenarios.swift:218` declares `private struct FauxShell`,
  whose own doc comment says it *"mirrors the same 4-tab TabView … and **leaves the other tabs on
  their 'coming next' placeholders**."* The strings are at lines 244 and 254. It is **not**
  `#if DEBUG` gated, so it compiles into Release. Android carries the same pattern —
  `FauxBottomNav` at `ScreenshotScenarios.kt:291`, used by five scenarios.
- **Failure scenario:** Two failures, and the second is worse than the first.
  1. **Audit evidence is invalid.** Any Phase B pass, screenshot review, or UI test that reaches
     Trade or League through the harness is assessing a screen that has not existed since this
     morning. This pass nearly did exactly that.
  2. **The guard that should have caught it cannot see it.** `DraftClaimAbsenceTests` was
     corrected earlier today to assert the League destination is real and carries no Draft
     entry — but it reads only `Auth/CommandCenterView.swift` and
     `CommandCenter/OmenLeagueScreen.swift`. **The surviving placeholder is in a third file the
     test does not open.** A test scoped to the files someone edited cannot find a duplicate
     somewhere else, and a duplicate is precisely what this is.
- **Criterion:** B2 — every screen with a real league; A10 — test-suite honesty.
- **Severity:** **BETA-BLOCKING** — not because a user sees it, but because it invalidates the
  evidence the beta decision will rest on, including this audit's own remaining passes.
- **Reversibility:** afternoon
- **Abort class:** none directly. It is the reason class-3 evidence cannot be trusted until fixed.

### F-VET-B02 — Scrolling content passes under the status bar and Dynamic Island unreadably

- **Claim:** Command Center content scrolls beneath the system status bar with no inset and no
  material behind it, leaving sentences illegible mid-scroll.
- **Evidence:** Screenshot after two upward swipes on `command-center.disconnected`: the Matchup
  card's sentence renders as *"No matchup y⟨11:29⟩eper or ESPN to see your team's week."* — the
  clock and the Dynamic Island sit directly on the words, with no blur or scrim between them.
- **Failure scenario:** Any user scrolling Command Center — the app's home screen — reads a
  sentence with a hole in it. It is worst on the honest-state cards, which are the ones a
  disconnected or degraded user most needs to read.
- **Criterion:** B2, B5.
- **Severity:** WEEK-1-BLOCKING
- **Reversibility:** afternoon
- **Abort class:** none

### F-VET-B03 — The two screens that shipped today have no scenario, so nothing can exercise them

- **Claim:** Of 24 screenshot scenarios, none targets Trade or League.
- **Evidence:** Scenario keys cover `command-center.*`, `omen.*`, `contextual-help.*`,
  `forced-update.*`, `help-support.*`, `league-switcher.*`, `waiver-watch.*`. There is no
  `trade.*` and no `league.*`.
- **Failure scenario:** The two newest, least-exercised screens in the product cannot be reached
  by the harness, by an accessibility audit, or by any UI test — so their layout, Dynamic Type
  behaviour, contrast, and honest states are unassessed and will stay unassessed until someone
  has a real connected account. **The screens with the least evidence are the ones the harness
  cannot see.**
- **Criterion:** B2, B5.
- **Severity:** WEEK-1-BLOCKING
- **Reversibility:** afternoon
- **Abort class:** none

### F-VET-B04 — Android renders a light theme with a light status bar, making the clock and system icons invisible

- **Claim:** On the Android welcome screen the status bar content stays light while the app
  paints a near-white background, so the clock and the wifi/battery icons are effectively
  invisible.
- **Evidence:** `medium_phone` AVD, debug APK, first screen after launch. Background is the
  light-theme surface (`#FAFAF9`); the "11:32" clock top-left and the wifi/signal/battery glyphs
  top-right render in white against it. Captured at `/tmp/phaseb/android-cc.png`.
- **Failure scenario:** Every Android user in light mode loses their status bar on the **first
  screen of the app** — the one moment a new tester is deciding whether this looks finished.
- **Criterion:** B5 — accessibility and contrast.
- **Severity:** WEEK-1-BLOCKING
- **Reversibility:** afternoon — a status-bar appearance flag, not a design change
- **Abort class:** none

---

## Ruled out — recorded so it is not re-found and mis-reported

**"System UI isn't responding" on Android launch is NOT an Omen defect.** The dialog appeared
immediately after the cold boot and is easy to mistake for an app hang — which would fire abort
class 5. It was checked rather than assumed: `adb logcat -b events` attributes the ANR to
**`com.android.systemui`** (`executing service .keyguard.KeyguardService, waited 20050ms`), the
crash buffer holds nothing for `com.slopssaloon.omen`, and `pidof` showed Omen alive throughout.
**Emulator artifact under cold-boot load.** Recording it because the next person to boot this AVD
will see the same dialog, and "the app hangs on launch" is exactly the kind of plausible,
unmeasured claim this audit's evidence rule exists to prevent.

---

## Criteria passed

**B6 — copy and claims. PARTIAL PASS on what was reachable.** Demo mode labels itself honestly
and repeatedly: *"Demo · this week's move is ready"*, the context strip reads **"Demo Slate (mock
league)"**, and both teams are named "Demo Titans" / "Demo Rivals". A user cannot mistake the
demo for their own league — facts-of-record #7 holds on screen, not just in code. No "coming
soon", no month, no date, no price, and no Draft entry observed on any reachable screen.

**B3 — honest states on a device. PARTIAL PASS.** In the disconnected scenario every section
reaches an explicit resting state and says what it needs: *"Personalized waiver moves need a
league"*, *"The Ledger needs a league"*, *"League Pulse needs a league"*, and a Matchup card
naming which providers to connect. **Nothing spun**, and at full scroll the content clears the
floating tab bar — an earlier suspicion that it could not was checked and is wrong.

---

## Criteria not runnable in this pass

**B7 — provider truth.** Requires a real connected account. Deferred by founder decision of
2026-08-29 and due before invitations.

**B8 — errors reach somewhere.** A deliberate native crash belongs on hardware with the release
signing path, not a simulator.

**B5 — accessibility, in full.** Dynamic Type and VoiceOver sweeps were not run in this pass.
Note that they cannot be trusted through the harness until **F-VET-B01** is fixed, and cannot
cover Trade or League at all until **F-VET-B03** is.

**Android — partially run.** The AVD was booted mid-pass and the app launched to its welcome
screen, which produced F-VET-B04 and ruled out the ANR. **The signed-in shell was not reached**,
so Android's Trade and League tabs were not opened; the `FauxBottomNav` half of F-VET-B01 remains
**derived from source, not observed**.

**Theme coverage is one-sided on both platforms.** iOS was audited in **dark** mode and Android
in **light** mode, because that is how each device was configured. Neither platform was seen in
the other theme. F-VET-B04 is a light-mode defect found only because Android happened to be
light — the equivalent dark-mode sweep on Android, and the light-mode sweep on iOS, are
**unassessed**, not passed.

---

## Handoff

- **F-VET-B01 gates the rest of Phase B.** Until the harness matches the app, every further
  screenshot, accessibility audit, and UI-test result about the tab shell is evidence about a
  fiction. The Scrappy and Hotshot Phase B passes should account for that rather than accumulate
  findings on top of it.
- **F-VET-B03 compounds it:** fixing the harness still leaves Trade and League unreachable
  without a scenario.
- Both are `afternoon` fixes and neither needs a founder.
