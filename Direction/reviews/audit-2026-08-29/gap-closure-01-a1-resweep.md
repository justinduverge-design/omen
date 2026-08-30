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
