# Gap closure 01 — A1 re-swept across every state machine

| | |
|---|---|
| **Closes** | The A1 coverage gap the founder surfaced 2026-08-30 |
| **Commit** | `bcc3b7b` |
| **Date** | 2026-08-30 |
| **Method** | Every `enum *State` in the iOS app target, nested or not, parsed for real cases; each case traced to its production producers. Android checked by hand for the same states. |

## Why this was needed

Phase A's A1 sweep matched on `enum Omen\w*State`. That pattern **structurally could not see**
the five view-model state machines, all named `ViewState`: `LeagueViewModel`, `TradeViewModel`,
`CommandCenterViewModel`, `OmenDecisionViewModel`, `LeagueSwitcherViewModel`. Six enums were
swept; twelve were not, and A1 was reported as covered.

The founder asked whether every page got the same treatment. It had not.

## Result — 18 state enums parsed

### F-VET-05 (NEW) — Help + Support can never report three of its five states

- **Claim:** `noAccount`, `offline`, and `providerRecovery` have **no production producer on
  either platform.** The view renders them, they carry approved copy, and they have screenshot
  scenarios. Nothing sets them.
- **Evidence:** iOS — the only production call site is `AccountView.swift:28`,
  `OmenHelpSupportView()` with no `state` argument, so it takes the `.available` default
  (`OmenHelpSupportView.swift:42`). The one computed override is
  `feedbackUnavailable ? .submissionUnavailable : state` (line 48). Android is identical:
  `OmenAndroidApp.kt:542` calls `OmenHelpSupportScreen(showTitle = false)`, and
  `OmenHelpSupportScreen.kt:74` computes only `SubmissionUnavailable`. A grep for any production
  construction of the other three returns nothing on either platform.
- **Failure scenario:** **Help + Support cannot tell a user they are offline** — and being
  offline is one of the most likely reasons a person opens Help at all. It also cannot show
  `providerRecovery`, which is precisely the content an ESPN or Yahoo user with a broken
  connection needs. The page always claims everything is available.
- **Criterion:** A1 — honest state at the screen level.
- **Severity:** WEEK-1-BLOCKING
- **Reversibility:** afternoon
- **Abort class:** none — the copy is not false, it is simply never shown.

### F-VET-02 — CONFIRMED as originally reported, against a sweep that first suggested otherwise

The re-sweep initially showed `urgent`, `calm`, and `pending` as having production producers,
contradicting the Phase A finding of five unreachable Waiver Watch states. **Checked rather than
accepted:** the `.urgent` hit is `OmenCommandCenterScreen.swift:467`, inside
`OmenCommandCenterFixtures` — which lives *in the same file as the screen*, so a path-based
fixture filter cannot see it. The `.pending` and `.calm` hits were
`OmenConnectionStatusBadge.pending`, **a different enum sharing a case name.**

The original finding stands: **five of eight Waiver Watch states have no production producer.**

### VerdictState — FALSE POSITIVE, not reported

The sweep flagged `favorsYou`, `youGiveUpTooMuch`, and `closeNeedsContext` as unreachable. They
are not: `TradeCompare.VerdictState` is `RawRepresentable` and is constructed through
`VerdictState(rawValue:)` in its decoder, never by case name. **A case-name search cannot see a
raw-value construction.** Excluded rather than filed.

## Method limits, recorded so the next sweep inherits them

Three ways this technique lies, all found by checking its own output:

1. **Fixtures colocated with screens defeat path-based filtering.** `OmenCommandCenterFixtures`
   is inside `OmenCommandCenterScreen.swift`, so its constructions count as production.
2. **Case names are not unique across enums.** `.pending` exists on both `OmenWaiverWatchState`
   and `OmenConnectionStatusBadge`.
3. **`RawRepresentable` enums are invisible to it**, because nothing constructs them by name.

**Every one of these produced a wrong answer in this run, and every one was caught by opening
the file.** The sweep is a way to generate candidates, not findings — which is the same rule
this audit applies to everything else.

## Still open in A1

Android has no equivalent automated sweep; its states were checked by hand for the two enums
above only. **Android A1 coverage remains partial**, and that is a real gap, not a formality.

---

# Gap closure 02 — the six screens Phase B never opened

Captured on the iPhone 16 simulator from the current build: `help-support.available`,
`help-support.offline`, `omen.disconnected`, `league-switcher.failed`. Opening the Help screen
produced the most serious finding of the entire audit.

## F-VET-06 — There is no way for a native beta tester to send feedback. Abort class 3 FIRES.

- **Claim:** Both feedback affordances on Help + Support are dead ends. Neither submits
  anything. Native never calls `POST /api/omen/feedback` on either platform.
- **Evidence:** `OmenHelpSupportView.swift:84-93` — "Share feedback" and "Report a problem" each
  carry `action: { feedbackUnavailable = true }`, whose only effect is to flip the screen to
  `.submissionUnavailable`. "Share feedback" already subtitles itself *"Feedback sending is not
  available yet."* Android is identical at `OmenHelpSupportScreen.kt:118-126`. A repo-wide grep
  for `omen/feedback` across both native targets returns **nothing** — no repository method, no
  submit function, no call site. The route is deployed and the **web** client is wired to it;
  **native is not.**
- **Failure scenario:** A beta tester on a real device hits a broken provider connection, opens
  Help, taps "Report a problem", and is told reporting is unavailable. **We learn nothing.** The
  founder's Stage 0.2 commitment — *"the founder reads feedback, daily while the beta is
  open"* — has nothing to read, because nothing can be written.
- **Criterion:** Stage 0.2 — can we hear? A1 — honest state at screen level.
- **Severity:** **BETA-BLOCKING**
- **Reversibility:** afternoon (wire the existing route) · the decision is the founder's
- **Abort class:** **3 — *any instrument dead: we cannot see crashes, or cannot hear testers.*
  FIRED.**

### Correction to Stage 0.2, which this audit passed

Stage 0.2 was recorded **PASS on the answer, ACTION open** — reader named, read surface missing.
That was wrong in a way worth naming precisely.

The check asked *"does a beta tester have a working path to tell us something is broken?"* The
evidence recorded for it was `POST /api/omen/feedback` returning **401 unauthenticated**, read as
*"deployed and gated."* **That verified the endpoint. It never verified that the app can reach
it.** The same shape as `F-VET-B01`: a component was confirmed healthy and the path through it
was assumed.

`F-SCR-03` then found the **read** half missing and framed the loop as *"the radio transmits and
the only receiver is the sender's own handset."* **That was too generous. The radio does not
transmit either.**

**The generalisable rule, and it is now the third time this audit has produced it:** proving a
component works is not proving the path through it works. `O8` and issue #354 were the same
error at the error-tracking layer, `F-VET-B01` at the harness layer, this at the feedback layer.

## Also captured, no findings

`help-support.available`, `omen.disconnected`, and `league-switcher.failed` render their states
correctly. The offline Help state renders well — *"You are offline. Help remains available. Try
again when your connection returns."* — which is precisely what makes **F-VET-05** worth fixing:
the state is designed, written, and unreachable.

## Screens still never opened

`Connect`, `Account`, `Forced Update`, and the signed-in `Omen` tab with a real decision. Phase B
coverage is now 8 of 10 rather than 4 of 10, and the remainder is recorded rather than implied.
