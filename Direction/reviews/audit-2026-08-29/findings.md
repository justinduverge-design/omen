# Audit 2026-08-29 — consolidated findings register

Every finding from every pass, one row each. **This is the list; the pass files carry the
evidence.** Ordered by severity, then by pass.

| ID | Finding | Lens | Criterion | Severity | Reversibility | Abort class |
|---|---|---|---|---|---|---|
| ~~**F-VET-01**~~ | ~~Missing confidence score renders as "Confidence 0"~~ **FIXED 2026-08-30, `ced460f`** — optional through the payload on both platforms; 6 regression tests | Veteran | A7 | ~~BETA-BLOCKING~~ | afternoon | 1 — **cleared** |
| **F-HOT-01** | iOS fails the whole League decode if a section is absent; Android degrades | Hotshot | A6 · A9 | WEEK-1 | afternoon → **one-way at distribution** | none |
| **F-HOT-02** | Four `trade-compare.v2` fields required on iOS, defaulted on Android | Hotshot | A6 · A9 | WEEK-1 | afternoon → **one-way at distribution** | none |
| **F-VET-02** | Five of eight Waiver Watch states unreachable | Veteran | A1 | WEEK-1 | afternoon (hide) | none |
| **F-VET-03** | League activity cannot populate; Alternate state ships as Primary | Veteran | A1 | WEEK-1 | contract | none |
| **F-VET-04** | Fixtures written since 2026-08-28 not from captured traffic | Veteran | A4 | WEEK-1 | afternoon | none |
| **F-SCR-01** | Native standings discard `points_for` / `points_against` the web renders | Scrappy | A3 | WEEK-1 | afternoon | none |
| **F-SCR-02** | Data plan sequences the activity work as free; it is not | Scrappy | A11 | AFTER | afternoon | none |
| **F-SCR-03** | Feedback has a transmitter and no receiver | Scrappy | A11 · 0.2 | AFTER | afternoon | 3 at invitation gate |
| **F-HOT-03** | The activity seam is untested in the direction it will be used | Hotshot | A6 | AFTER | afternoon | none |
| ~~**F-VET-B01**~~ | ~~Screenshot harness is a drifted duplicate~~ **FIXED 2026-08-30, `97e8768`** — both harnesses mount the real screens; tab metadata single-sourced; 3 guards, proven by reintroducing the defect | Veteran (B) | B2 · A10 | ~~BETA-BLOCKING~~ | afternoon | none |
| **F-VET-B02** | Content scrolls under the status bar and Dynamic Island unreadably | Veteran (B) | B2 · B5 | WEEK-1 | afternoon | none |
| ~~**F-VET-B03**~~ | ~~No scenario for Trade or League~~ **FIXED 2026-08-30, `97e8768`** — four scenarios added with an `initialTab` | Veteran (B) | B2 · B5 | ~~WEEK-1~~ | afternoon | none |
| **F-VET-B04** | Android light theme leaves the status bar clock and icons invisible | Veteran (B) | B5 | WEEK-1 | afternoon | none |
| **F-HOT-B01** | First screen: different layout and inverted primary action per platform | Hotshot (B) | A9 | WEEK-1 | afternoon | none |
| ~~**F-HOT-B02**~~ | ~~Parity unassessable while the harness is drifted~~ **RESOLVED 2026-08-30, `97e8768`** — same fix; parity comparison is trustworthy again | Hotshot (B) | A9 · A10 | ~~WEEK-1~~ | afternoon | none |
| **F-SCR-B01** | Demo is the cheapest onboarding asset and is positioned inconsistently | Scrappy (B) | B1 | AFTER | afternoon | none |
| **F-VET-05** | Help + Support can never report offline, noAccount, or providerRecovery — 3 of 5 states, both platforms | Veteran | A1 | WEEK-1 | afternoon | none |
| **F-AUDIT-02** | A1 was reported swept while missing 12 of 18 state machines; Phase B opened 4 of 10 screens | Stage 0 gap | A1 · 0.6 | **WEEK-1** | afternoon | none |
| **F-AUDIT-01** | The audit never checked whether the artifact under audit is the artifact in the field | Stage 0 gap | 0.1 · A11 | **WEEK-1** | afternoon | none |
| **F-TOOL-01** | The audit method is not a skill, so it is not repeatable | tooling | A11 | WEEK-1 | afternoon | none |
| **F-TOOL-02** | Session named no skills and appended no ledger row | tooling | A11 | AFTER | afternoon | none |

## Correction — 2026-08-30, raised by the founder

**The founder reported the two new pages are not visible on his real phone. He is right, and a
claim made earlier in that session was wrong.**

The pages were described as *"built, shipped, and deployed."* Only the first is true of the
apps. What deployed on 2026-08-29 was the **backend** — `deploy.yml` to KVM1, which is what
carries `GET /api/league/overview`. The **native screens merged to `main` and were never built
into any distributable artifact.**

| Artifact | Date | Contains the screens? |
|---|---|---|
| Screens merged to `main` (`e603a08`) | **2026-08-29** | — |
| iOS TestFlight — v0.1.0 **Build 1**, the only build this app has ever had | **2026-08-18** | **No.** Eleven days earlier. |
| Android `app-release.aab`, Play version code 1 | **2026-08-18** | **No.** |
| Every CI run since the merge | 2026-08-29/30 | "Deploy to Hostinger KVM1" — **backend only** |

`ios-ci.yml` triggers only on `release/**` and manual dispatch, and has not run since
2026-08-03. There is no release branch and no tag. **No mobile build has been produced since the
screens were written**, so the device cannot be showing them and nothing is wrong with the
device.

**`definition-of-done.md` already carries the rule this broke:** *"Work merged to `main` is
merged, not released, and must never be described as live or deployed without
`done/release-done.md` gate 4 evidence."* Backend deployment and mobile release were conflated
in the same sentence.

### F-AUDIT-01 — the preflight never asked whether it was auditing the shipped artifact

- **Claim:** Stage 0 established that we could see, hear, and read current documents, and what
  capacity we had. It never asked **which build the founder actually runs**, so an eleven-day gap
  between `main` and the only existing TestFlight build went unnoticed through six audit passes.
- **Evidence:** `stage-0-preflight.md` checks 0.1–0.6 contain no build-provenance check. Phase B
  ran entirely on a simulator and an emulator, both installed from a fresh local build of `main`.
- **Failure scenario:** Exactly what happened. Every Phase B finding is true of `main` and **none
  of them is known to be true of the build in the founder's hand** — including the two beta
  blockers now marked fixed. A tester on Build 1 has none of today's fixes and none of today's
  screens.
- **Criterion:** Stage 0.1 instruments — *you cannot audit what you cannot observe*, extended to
  *you cannot audit a build nobody is running*.
- **Severity:** WEEK-1-BLOCKING — `R6` invitations point testers at Build 1
- **Reversibility:** afternoon (add the check) · the rebuild itself is founder-gated
- **Abort class:** none, but it makes class 2 and 3 evidence build-specific rather than absolute

**Proposed Stage 0 check 0.7, for the next audit:** *name the build under audit and the build in
the field, and confirm they are the same artifact — or state the delta before any finding is
recorded.*

**Both beta blockers are closed.** `F-VET-01` (`ced460f`, W1) and `F-VET-B01` (`97e8768`, W2).
W2 also closed `F-VET-B03` and resolved `F-HOT-B02`, which were the same defect from other
angles. **Four of sixteen findings cleared; no abort class remains fired.**

Remaining: `F-VET-02` `F-VET-03` `F-VET-04` `F-VET-B02` `F-VET-B04` `F-HOT-01` `F-HOT-02`
`F-HOT-B01` `F-SCR-01` `F-SCR-02` `F-SCR-03` `F-TOOL-01` `F-TOOL-02`. W3 (Try Demo suppression)
is planned and not started.

## Phase B — what changed the picture

Phase B produced the **highest-severity finding in the audit** (`F-VET-B01`) and it was
unreachable from Phase A. The harness drift is invisible to a code read scoped to the files
someone edited, and visible in about ninety seconds to anyone who taps the Trade tab.

**It also invalidates evidence retroactively.** Until the harness matches the app, every
screenshot, accessibility audit, and UI-test result about the tab shell describes a screen that
no longer exists — including results this audit would otherwise have relied on.

**Two candidate findings were ruled out rather than reported**, and both would have been
defensible on the screenshot alone:

1. An Android *"System UI isn't responding"* dialog on launch — would have fired **abort class
   5** as a hang on the first-run path. `logcat -b events` attributed it to
   `com.android.systemui`'s keyguard service; Omen's crash buffer was empty and its pid alive.
2. A pure-lime `#1EFF1C` border around the Android platforms card, matching no Omen token —
   would have read as a design-system violation. `settings get secure accessibility_enabled`
   returns `1` with TalkBack named: it is the **system's** focus rectangle.

A third near-miss: Android's **first ever** cold launch measured **10,373 ms**, which a
single-measurement pass would have filed beta-blocking. Runs 2–4 converged to
**5,745 / 2,562 / 2,267 ms** — the first figure was emulator warm-up. **Each of the three cost
one command to disprove.**

## Where the lenses disagreed

Per `audit-grading-system-v1.md`, the disagreements are the output. Three arose.

**1 — F-VET-01, whether it can be deferred.** The Veteran called it beta-blocking. The Scrappy
lens, whose job is to find the cheaper path, **found no deferral to offer**: it fires a ratified
abort class and the fix is an afternoon. Resolution: no contest — correctness never trades, and
there was no cost argument on the other side.

**2 — F-VET-02, what to do about it.** Veteran: a section that cannot report a working league is
a lie by omission, fix or hide it. Scrappy: hide it, one commit, versus a per-provider
integration that is the largest slip risk in the queue. Reversibility is an afternoon →
**Scrappy decides**.

**3 — F-HOT-01/02, whether they are worth doing now.** Ordinarily the Scrappy lens wins a
ship-it-versus-harden-it dispute. He does not here, and the reason is the reversibility rule
rather than seniority: both are `afternoon` today and **`one-way` the moment a build reaches a
tester**, because an installed app cannot be taught to tolerate a field it was compiled to
require. **Hotshot decides**, and the written reason is that this is the last cheap moment.

## What all three agreed on — checked, per the "look harder" rule

All three lenses independently reach the same verdict on **provider proof** (`M11A`): it is the
top item. The grading system says unanimity means the lenses may have collapsed into one
reviewer, so it was checked. They arrive by different routes — Veteran via F-VET-04 (fixtures
prove nothing about a real provider), Scrappy via cost (hours, highest value per hour in the
queue), Hotshot via F-SCR-02 and the ⚠️ rows (each unmeasured assumption is baked into a shipped
contract). Different reasoning, same conclusion. Not a collapse.

## What the re-run changed

The first Veteran draft was written from knowledge of code just authored. Re-running every pass
as a sweep **dropped nothing and added four findings** — F-SCR-01, F-HOT-01, F-HOT-02, F-HOT-03
— three of them in criteria the first draft never swept at all, because the Hotshot pass had not
been run. The two most consequential (F-HOT-01/02) are invisible to anyone reading either
platform alone; they only appear when the two are diffed against the same contract.
