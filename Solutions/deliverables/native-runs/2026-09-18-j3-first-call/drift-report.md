# J3 — canvas-to-code drift report

**Date:** 2026-09-18 · **Branch:** `claude/j3-first-call` · **Base:** `de6e8ee9`
**Screens:** OmenCall (U1, inherited), OmenEvidence, StartSitClear, StartSitIncomplete
**Rule applied throughout:** artboard owns the look, contract owns the truth
(`Direction/decision_log.md`, 2026-09-18). Where an artboard draws something the system
cannot produce, the shape is binding and the literal strings are not.

Drift is **recorded, not assumed absent** — journey acceptance clause 3.

## Resolved this session

### D-1 · Header slot (E017) — RESOLVED by founder, 2026-09-18
The artboard draws one 30x30 `AvatarButton` ("Open Account") at x=344. M6-ContextualHelp had
shipped a help button into the same slot, and U1 kept it, leaving the account unreachable from
the Omen destination.

**Founder decision: both controls, in Command Center's order.** Help, then account.
**Drift:** ~38pt more header width than the artboard draws, on all three J3 screens.
**Scope:** the same `.av` slot appears on **25 of the 30 artboards**. This resolves the
pattern, not one screen — J1/J2/J4/J5/J6 inherit it without re-asking.

### D-2 · Capability key column — 58pt drawn, 84pt built
The artboard sizes the key column for "Weather" / "Rest" / "Projection". The real vocabulary is
longer. At 58pt an earlier build rendered `MATCHU P DVP`; at 84pt this run still rendered
`PROJECTION / S`, because `fixedSize` made SwiftUI wrap before it would ever scale.
**Fixed:** `lineLimit(2)` + `minimumScaleFactor(0.7)` at 84pt. Names stay whole.
**Root cause worth keeping:** the column was drawn against a shorter vocabulary than the API has.

### D-3 · `StartSitClear` — "Your lineup" is a shape cue, not a literal
The artboard implies a full nine-player lineup. `start-sit-detail.v2` returns **one recommendation
pair**. The composition is preserved; the heading is "The call". No "9 of 9" claim is made.

## Standing drift — deliberate, not defects

### D-4 · Status-word colour: green `dataLive`, not the artboard's neutral `surface-3`
`_shared.css` sets `.ds.live{background:var(--s3);color:var(--t1)}` — neutral. The build uses the
existing `dataLive` (`0x34C759`) token. **This is contract-directed, not drift by accident:**
`capability-expression-v1.md` states a screen built before `C3` lands *"uses the existing tokens;
it does not invent a local carrier and it does not ship the state without one."* `C3` has not
landed. Closes when `C3-DataSourceForm` lands the hatch/dashed/dotted carriers.

### D-5 · Switcher row (`.sw`) absent
The artboard draws a league/team switcher above the header on every J3 screen. Not built here;
U1 shipped without it too, so this is a canvas-wide gap belonging to the shared destination layer
(`U2`/`U3`), not to J3. **Recorded, not silently dropped.**

### D-6 · `1 of 3` and `Locked Tue 3:00` absent from the scope line
Inherited from U1 and still correct: no call index and no lock time exist in
`omen-decision-brief.v3`. A client-computed lock time is a claim about the provider's schedule
Omen cannot stand behind — wrong in exactly the weeks it matters.

### D-7 · Two capability vocabularies, both real
`OmenCall`/`OmenEvidence` render `decisionCapabilities.js` names (`weather`, `matchup_dvp`).
`StartSit` renders `startSitDetail.js` names (`player_projections`, `start_sit_inference`), which
`inputForCapability` maps to the receipt vocabulary. Both are server-owned. A reader moving from
screen 2 to screen 3 sees two naming styles for related inputs. **Not a defect in either screen;
flagged as a journey-level observation that only a journey capture could surface.**

## Capture-harness finding — the reason to check every frame

The prior run's `journey-j3.nominal.01-omen-call.png` captured as a **completely black frame**,
while the same screen in the degraded pass rendered correctly. It did not reproduce on rebuild, so
it is a launch-timing flake in the capture harness, not a build defect.

**It would have shipped as the opening frame of the journey.** Any contact sheet needs a
blank-frame check before it is handed over; frame byte-size is a cheap proxy (the blank was a
visible outlier against its siblings).

## Not verified, and not claimed

- **Android.** Not built or captured this session. J3 is iOS-only so far.
- **D11 fit.** Not measured. No J3 contract clause requires above-the-fold fit on these screens;
  all three scroll by design.
- **Navigation.** A journey capture proves composition, sequence and tone. It is not a flow test.
