# Screen Journeys v1

**Status:** Proposed — founder-directed 2026-09-18.
**Date:** 2026-09-18
**Covers:** all 32 artboards in `design/native-visual-lock-2026-09-13/`.
**Supersedes, for capture purposes:** the per-screen scenario model in `ScreenshotScenarios`.

## Why journeys and not screens

Captures today are isolated stills: one key, one screen, one state. A screen can be individually
correct while the path through it is broken — a dead end, a tone that lurches, the same fact
restated three screens running, a state that no longer makes sense given the screen before it.
**None of that is visible in a still**, and all of it is what a person actually experiences.

Founder, 2026-09-18: *"I want the screenshots to be for scenarios."* The unit of review becomes
the path, because that is the unit of the experience.

It is also the cheaper unit. A journey is something that can be **judged**; thirty disconnected
screens cannot be judged until all thirty exist.

## The six journeys

| # | Journey | Artboards | Profile |
|---|---|---|---|
| J1 | **Getting in** — sign in, connect a league | SignIn, EmailCode, ConnectLeague, EspnConnect, ConnectFailed, CommandNoLeague | none |
| J2 | **The desk** — arriving at Command Center, switching teams | CommandCenter, CommandQuiet, CommandQuietStraight, SwitchSheet, SwitchLoading | consumes |
| J3 | **The first call** — receiving an Omen and reading its argument | OmenCall, OmenEvidence, StartSitClear, StartSitIncomplete | `omen_mvp`, `start_sit` |
| J4 | **Settling an argument** — building and judging a trade | TradeBuild, TradeRoster, TradeNeedsContext, TradeVerdict, TradeShare | `trade` |
| J5 | **The scout's nest** — reading the league and the wire | LeagueTable, LeagueWaiver, LeagueDegraded, LeagueNoRosters, WaiverNoMove, WaiverNotDetermined | `league`, `waiver` |
| J6 | **The receipts** — checking your own record | Ledger, LedgerDetail, LedgerDegraded, LedgerDetailDegraded | `ledger` |

**Chrome, captured but not a journey:** `Account`, `ReportPill`. Both are reachable from anywhere,
so a path through them would be invented rather than observed.

Every artboard belongs to exactly one journey or to chrome. No artboard is unclaimed, and none
appears twice.

## Each journey needs two passes

**Nominal** — everything resolved, everything worked.

**Degraded** — at least one input `unavailable` and at least one `live, used: false`, per
`capability-expression-v1.md`. For J1, whose journey has no capability profile, the degraded pass
is the provider failure path instead: `ConnectFailed` is not an edge case, it is the **only
confirmed beta failure on record**.

A nominal-only journey proves the product works when nothing goes wrong, which is the condition it
is least often in and the one that needs the least proof.

## What a journey capture is

An **ordered contact sheet**: the journey's screens in the order a user meets them, captured in one
run, in one theme, on one device, labelled with the journey and the pass.

It is a **storyboard, not a flow test.** It proves composition, sequence and tone. It does not
prove navigation works — that is `slops-verify` and the real-device matrix. Saying otherwise would
be claiming a visual match from a structural diff, which this repo's own skill names as a failure.

## Build order follows journey order

Screens are built **by journey, not by screen**. A journey's shared components are built once at
its head, and the journey lands complete and reviewable rather than as parts nobody can assess.

`J3` is already partly built: `U1` shipped OmenCall on 2026-09-18. `J3` completes it.

## Acceptance per journey

1. Every artboard in the journey is built to its screen contract.
2. Both passes capture, in order, in one run.
3. `slops-canvas-to-code` stage 3 reports the drift for each screen, and the drift is recorded
   rather than assumed absent.
4. The degraded pass visibly shows the capability classes — not merely a payload that contains them.
5. D11 is **measured** on any screen the contract says fits, and the overflow stated in px.

## What this does not decide

- **Navigation between journeys.** A journey is a path a user takes; how they leave it is the
  shell's business and is out of scope here.
- **Real-device capture.** Simulator only. A simulator screenshot is evidence of composition, not
  of behaviour on a phone in someone's hand.
