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

### D-5 · Switcher bar (`.sw`) — BUILT this session, and it broke D11

`OmenLeagueSwitcherBar` now implements E005–E012 and renders on all three J3 screens.

**Correcting the record.** This was first reported as "never built". That was wrong twice over,
and the real picture matters because it is a three-way drift, not a gap:

| Composition | Source | Status |
|---|---|---|
| `OmenTeamPicker` — carousel + pinned `Switch` | `design/app-rework-canvas/Main.dc.html`, contract `omen-league-switcher-contract-v1.md` (approved 2026-09-05) | **Retired** by the one-switcher decision |
| `OmenContextStrip` — `surface-1` card | registry §3.2, Figma `25:2` | Command Center's, until `U3` |
| `.sw` bar, E005–E012 | `native-visual-lock-2026-09-13` | **Current authority** — built here |

`design/native-visual-lock-2026-09-13/README.md` is explicit: `CommandSwipe2` is *"Retired by the
one-switcher decision"* and `Main` is *"superseded by `CommandCenter.dc.html`"*. So the bar is the
one switcher, and the shipped carousel is built against a retired artboard.

**Not done, deliberately:** `withTeamPicker` still wraps the production Omen, Trade and League
destinations with the retired carousel. Swapping it changes live behaviour on three destinations
and belongs to `U3`'s rebuild, not to J3. **Consequence to be honest about:** the J3 captures show
the bar; production still shows the carousel. The captures are true to the artboard, which is what
a canvas-to-code journey capture is for, and are *not* a photograph of today's production shell.

### D-8 · D11 REGRESSION on OmenCall — measured, unresolved, founder's call

`U1-OmenScreen`'s "Done when" requires OmenCall to fit **with nothing below the fold (D11)**.
Adding the contractual switcher bar breaks that clause.

**Measured** on iPhone 16, decoded from the capture rather than estimated:

- floating tab bar top edge: **769.0pt**
- final line ("Every call lands in the Ledger whether you take it or not."): **768.3–799.7pt**
- **30.7pt of a 31.3pt line sits under the tab bar — 98% occluded**

The bar costs 46.5pt (8 + 28 + 10 + 0.5 hairline) against the artboard's specified 49pt, and
OmenCall had less than that in headroom.

**Done:** 64pt bottom clearance so the line is reachable by scrolling rather than hidden under a
floating bar with no affordance. Occluded-with-no-affordance is strictly worse than below-the-fold.

**Not done:** this does **not** restore D11. The resting frame is unchanged. Four ways out, and
the choice is a composition decision, not an implementation one:

1. tighten the call card's internal spacing to reclaim ~31pt;
2. drop the ledger line from this screen (it is a standing product statement, not per-call truth);
3. accept that OmenCall scrolls, and amend U1's D11 clause;
4. shorten the two CTAs to one.

**Do not close `U1` on the current build without deciding this** — its own acceptance clause fails.

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


## D-9 · OmenCall evidence rework — BUILT, founder-directed, deviates from the artboard

`omencall-evidence-contract-v1.md` (CANONICAL, ratified 2026-09-18). The flat capability list is
replaced by three labelled groups, and "Why this confidence" is promoted from `OmenEvidence`.

**Defect fixed in passing, and it was a contract violation.** The shipped card rendered
`payload.signals.prefix(3)` — a truncating flat list. `capability-expression-v1` prohibits exactly
that: *"dropping an `unavailable` input to make room is prohibited — it is the one class that must
survive truncation."* With four or more inputs the old code could silently drop the only one that
costs the reader something.

**Facts row (E029–E041) removed from the call card.** `capability-symbols-v1` says the four chips
exist because they sit *"in a compact row where there is no space for sentences."* With D11 waived
there is space, and the groups below carry the same inputs as sentences — keeping both restated
`ROSTER` and `WEATHER` twice, six pixels apart. The helper is retained in source for any future
compact surface.

**Block 11 "What would change this" is DEFERRED, on evidence.** `what_could_change_this` exists
only in `src/services/startSitDetail.js`; the Omen decision brief does not carry it. Faking a
falsifier is a claim about the week Omen cannot stand behind. **Needs a backend item.**

**Deviation from the artboard, stated plainly.** `OmenCall.dc.html` draws neither the three groups
nor the confidence block, and draws a facts row this build omits. The founder directed the change,
so the artboard is now behind the decision. **Either it is redrawn or the next canvas diff will
report all of this as drift and "fix" it back.**

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
