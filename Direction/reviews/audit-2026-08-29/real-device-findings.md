# Real-device findings — founder, 2026-08-30 evening

**The first session where a person used the app on their own phone with their own leagues.**
It found two defects in under ten minutes that six audit passes did not.

Recorded separately from the audit register because the *method* is the finding: every pass
looked at rendered state, and none of them **typed, tapped, or switched anything**.

---

## F-DEV-01 — The Trade screen traps the keyboard. **FIXED.**

- **Reported:** *"trade… doesn't really work trying to type players names in… It won't close. I
  can't tap out of it."*
- **Cause:** `OmenTradeScreen` had two `OmenTextField`s and **no dismissal path of any kind** —
  no `.scrollDismissesKeyboard`, no keyboard toolbar, no tap-to-dismiss, no `.onSubmit`. Once
  the keyboard opened, the screen was unusable and the tab could not be left cleanly.
- **Why no pass caught it:** Phase B captured screenshots of rendered states. **A keyboard trap
  is invisible in a screenshot** — it only exists once a finger enters a field. `F-VET-B03`
  noted Trade had no scenario; even with one, a scenario would not have typed.
- **Fixed 2026-08-30:** `@FocusState` on both fields, `.scrollDismissesKeyboard(.interactively)`,
  a keyboard-toolbar **Done**, tap-anywhere-to-dismiss, and `.submitLabel(.done)` with
  `.onSubmit` so Return adds the player and closes the keyboard in one gesture.
- **Severity:** was BETA-BLOCKING. One of the four destinations was unusable.

## F-DEV-02 — Switching to ESPN does not take. **OPEN — cause not established.**

- **Reported:** *"I hit switch, wait for it to load, and then I hit ESPN, and it still stays on
  my sleeper."*
- **What the code does:** `LeagueSwitcherViewModel.select()` POSTs the selection, then re-reads
  rather than mutating locally — deliberately, so the switcher cannot invent an active flag.
  `CommandCenterView` then reloads Command Center, Omen, and League. That chain looks correct.
- **Two candidate causes, and they are NOT distinguishable from the code alone:**
  1. **The ESPN connection is not `usable`.** `connectionUsable()` requires `is_active`, a bound
     `league_id`, **and** both `espn_secret_id` and `swid_secret_id`. An ESPN connection without
     a bound league is filtered out of `selectConnections()` entirely — so the overview keeps
     answering from Sleeper and **no error is shown anywhere**, which matches the report exactly.
  2. **The selection POST failed.** `selectionError` renders a "That switch did not take"
     surface in the sheet; if the sheet was dismissed quickly it could be missed.
- **Why candidate 1 is the stronger read:** `PLATFORM_ORDER` is `["espn", "sleeper", "yahoo"]`,
  so with *no* stored selection the route would prefer **ESPN**. Landing on Sleeper means either
  a stored selection pointing at Sleeper, or ESPN being excluded as unusable.
- **This is `connected` ≠ `usable` — facts-of-record #12 — reaching a user.** The audit recorded
  that distinction repeatedly and never checked whether the UI expresses it. **`F-VET-07` is the
  same wound:** `OmenContextStripState.needsRecovery` exists precisely to say "this connection
  needs attention" and has no production producer. A user whose ESPN is connected-but-unusable
  gets silence.
- **Next step, and it needs the founder:** read the ESPN row's `league_id` on his account. If it
  is null or the `yahoo`-style pre-bind sentinel, candidate 1 is confirmed and the fix is a real
  state on the switcher — not a silent no-op.

## Confirmed working, on device, with a real league

League: standings render, matchup renders, playoff line reads **"1st … in a playoff spot"** —
the `settings.playoff_teams` parse shipped hours earlier, working against a live Sleeper league.

---

## The method lesson

Six passes, sixteen findings, two beta blockers closed — and **ten minutes of a person tapping
around found a screen that could not be used at all.**

Phase B was run on a simulator through a screenshot harness, and the founder's own audit criteria
say B must be run *"against a running app on a real device."* It was not, and the gap was
recorded as `F-AUDIT-01`. This is what that gap cost: **screenshots prove what a screen renders;
they cannot prove it can be operated.**

Any future Phase B must include *typing into every text field and dismissing the keyboard* as an
explicit step, alongside the existing B1 walk.
