# Canvas-to-code drift — native visual lock, first run

**Date:** 2026-09-15
**Skill:** `slops-canvas-to-code`, stage 3 (diff). Stages 1–2 were already done — the 30 screen
contracts in `Blueprints/specs/design/screen-contracts/` were compiled 2026-09-14, so this run
extends them rather than producing competing documents.
**Artboards:** `design/native-visual-lock-2026-09-13/`
**Built code:** working tree on `codex/native-visual-lock` (uncommitted).
**Why now:** `U1`, `U3` and `U4` each carry "Done when: … `slops-canvas-to-code` reports no drift
against the artboards." **This gate had never been run.** No drift report existed in the repo.

## Scope — read this before quoting any finding

| | |
|---|---|
| Visual diff | **iOS only, dark only, 4 scenarios.** Built + installed + captured 2026-09-15 19:27 via `scripts/capture-screen-batch.sh --platform ios --theme dark --build`. Output: `output/screens/2026-09-15-192736/` |
| Android | **Not captured.** No emulator was booted. No Android visual claim is made here. |
| Element enumeration | **Not exhaustive.** This is a screen-level structural diff anchored on each contract's `Literal strings` block, not a per-element walk of all 30 artboards. |
| Not covered at all | `CommandQuiet`, `CommandQuietStraight`, `OmenEvidence`, `Ledger`, `LedgerDetail`, and every sub-state artboard — **no capture scenario exists for them** (see F3). |

## The headline

**`U1`, `U3` and `U4` are `READY`, not built.** The screens in this tree are the previous
generation — the Command Center rebuilt to the founder's sketch (#396/#397, 2026-09-03→07) plus
Codex's incremental v2 wiring. They were never rebuilt to the 2026-09-13 artboards.

So the drift below is **expected, not a regression.** It is a measurement of distance, and its
value is that the distance is now written down instead of assumed. Two approved designs exist for
these screens; the V lane header states the visual-lock canvas supersedes `design/app-rework-canvas/`
for them.

## Cross-screen findings

### F1 — D4 is violated on every screen · MISSING · P1

The League tab still uses the **three-people glyph**. Founder decision **D4** (2026-09-12) replaced
it with a **crest/shield**. Visible in all four captures. This is a locked decision with no
implementation, and it is a two-token change, not a screen rebuild.

### F2 — provider chips have no fill-ring · MISSING (gated) · P2

`ALL / ESPN / SLEEPER / YAHOO` render as bare brand-hex pills. Registry §2.2 requires
`provider-chip-ring` `rgba(245,240,232,.38)` on every provider chip, because Yahoo `#410093`
measures **1.29:1** against `bg`. **Expected** — `C6-FillRing` is `READY`, unbuilt. Recorded so
the gap is not read as done when C6 closes.

### F3 — three artboards cannot be visually verified at all · UNDECIDED · P2

`ScreenshotScenarios` has no key for the quiet week, the Omen evidence disclosure, or the Ledger
destination. `CommandQuiet`, `CommandQuietStraight`, `OmenEvidence` and `Ledger` therefore have no
capture path, so no visual gate can ever pass on them. The quiet week is `V-QuietWeekStraight`'s
whole deliverable and it is unphotographable.

### F4 — `omen.demo` does not mount the Omen destination · P2

The `omen.demo` scenario captured the **Command Center** in its disconnected state — tab bar shows
`Command` selected. Either the key is misleading or the scenario is wrong. A screenshot gate whose
scenario mounts a different screen than its name says will certify the wrong thing.

### F4b — root cause: the carousel scenario throws its key away · P1

Found while chasing F4. `CarouselScenarioHost` constructs `FauxShell(carousel:)` **without passing
`scenarioKey`**, so `FauxShell.commandState` falls through to `default:` and returns
`realDisconnected`. Every carousel capture therefore renders the **disconnected** Command Center —
greeting `"No game plan yet."` — underneath a live six-league carousel.

**The shipped copy is correct and is not the bug.** `greeting(for:gameWeek:)` returns
`"No game plan yet."` only for `needsPlatform`; a connected user gets `"Your game plan is ready."`
or a game-week line. The fixture contradicts itself, and the capture certified a state the product
cannot produce.

**Not fixed here, deliberately.** The scenario needs a *connected, non-demo* Command Center
fixture, and none exists — the set is `demoConnected`, `longNameMatchup`, `realDisconnected`,
`realLoading`. Minting one decides what a connected Command Center shows, which is a product call
and is about to be re-decided anyway by `U1`/`U3`. Passing the key through without a fixture to
resolve to would change nothing.

**Why it matters beyond one screenshot:** a capture harness that silently substitutes a different
state is worse than no harness. Every visual gate run against these scenarios has been certifying
the wrong screen.

### F5 — tokens and typeface are correct · PASS

Sampled from the rendered PNG, not inferred: page ground **`#1F1F1D`** and card surface
**`#2A2A27`** — exactly D6 and registry §2.2. Brass accent is in the tab bar, the ADD buttons, the
favourite mark and the leader rule, with no iOS system blue anywhere (D2, `W1-TABBAR`).
`TypographyDerivationTests` proves every role resolves to a real Wix Madefor optical cut on device.

## Per-screen

### CommandCenter — substantial drift

Anchored on `CommandCenter-v1.md`. Capture: `command-center.carousel`.

| Contract element | Verdict |
|---|---|
| Context strip — `TTO`, `Titans of Slopsilonia`, `ESPN · SLOPS SALOON`, `▾`, `+` | **MISSING.** No league/team context strip. Provider filter chips and a `1 of 6` carousel occupy that band instead. |
| `WEEK 7 · SUNDAY`, `LINEUPS LOCK`, `1:00 PM` | **MISSING.** No lineup-lock countdown anywhere. |
| Small Council read — `Four of your starters left; two of theirs.` | **MISSING.** The defining element of the destination. `WHAT TO WATCH / Projected within 5.4 points.` is a thinner stand-in. |
| Scoreboard `119.6 – 114.2`, `PROJECTED · 5.4 AHEAD` | **MISPLACED.** The numbers are present and correct but rendered as a two-row PROJ/SCORE table. Copy differs. |
| `WAIVER WATCH` | **PRESENT.** |
| `ALL/ESPN/SLEEPER/YAHOO` filters, `WAIVER/LEDGER/PULSE` segmented, `1 of 6` carousel | **UNDECIDED — in the build, not in the artboard.** Founder call: these came from the #397 sketch. |
| Hero copy `No game plan yet.` | **DEFECT, independent of the artboard.** It renders over a **connected** screen with a live matchup, both scores, and waiver analysis available. The headline contradicts the screen under it. |

### TradeBuild — near-total drift

Anchored on `TradeBuild-v1.md`. Capture: `trade.empty`.

The built screen is a two-field text form: `YOU SEND` / `YOU RECEIVE` / `COMPARE`. The artboard
specifies a roster-based deal builder. **MISSING:** context strip, `+` / `THREE TEAMS` / `Add team`,
position filters `ALL QB RB WR TE`, roster player cards (`DSI` `Davante's` `NEEDS RB`, `CHB`
`Chubb Rock` `NEEDS WR`, `GMR` `Gibbs` `NO HOLE`), and the fit tag `FILLS MY RB HOLE`.

The experience contract's honesty rules **do** hold in the build: advice stays separate from action,
and the format note now states the two-team limit without asserting an unread capability as fact.

### LeagueTable — not diffed

`league.loaded` captured successfully but was not diffed element-by-element in this pass. The
contract expects the **scout's-nest order** (Your week → The Table → Trade targets → Waiver →
Activity) per the 2026-09-13 amendment to fact-of-record #16. Confirming that ordering is the next
run's first job.

### OmenCall / OmenEvidence / Ledger — not diffable

See F3 and F4. No capture path exists.

## What this run did not do

- No Android capture, so no Android claim.
- No per-element enumeration of all 30 artboards.
- No accessibility verdict — that is `slops-native-ui-audit`, a different gate.
- No code was changed by this run. Screen fixes belong to `U1`/`U3`/`U4`.

## Recommended next

1. **F1 (crest glyph)** and **F4 (`omen.demo` scenario)** are small, independent, and worth doing
   before the next build — the second one because it decides what every future capture certifies.
2. Mint capture scenarios for the quiet week, Omen evidence and Ledger, or those artboards can
   never pass a visual gate.
3. Re-run this diff after `U1` lands, per screen, rather than once at the end.

---

# Addendum — 2026-09-18: U1 built, and what the rebuild changed

**Scope:** iOS only, dark only, `omen.degraded`. Android not rebuilt. `U3`/`U4` untouched.

## Findings from the first run that are now closed

| Finding | State |
|---|---|
| F4 — `omen.demo` mounts the Command Center | **fixed.** Both omen scenarios now open the Omen tab. The Omen screen had never been photographed before. |
| F4b — `CarouselScenarioHost` drops its key | **fixed.** Carousel captures render a connected state whose greeting is *derived* from the shipped function, so the fixture cannot drift from real copy. |
| F3 — profiles had no degraded capture | **partly closed.** `omen.degraded` exists for `omen_mvp`. The other five profiles still have none. |

## Still open

- **F1 — D4's crest.** The League tab still uses the people glyph. `CanvasShield` already exists in the asset catalog, so this is small.
- **F2 — provider chips have no fill-ring.** `C6`, unbuilt.
- Fifteen artboards still have no capture path; `omen.degraded` moved the count to sixteen photographable.

## New, from building against the contract rather than reading it

1. **An icon can lie.** The first build fell back to `evidence.unread-source` when a capability name matched no symbol, so an input Omen had read *and used* wore the "could not read" mark. Symbols are optional now. **Generalisable: a default glyph is a default claim.**
2. **The evidence key column was drawn against a shorter vocabulary than the API has.** 58pt fits "Weather" and "Rest"; it breaks "Matchup Dvp" mid-syllable. Widened to 84. The artboard was drawn before the capability vocabulary existed — the same three-day gap that left 19 of 21 contracts unaware of capabilities.
3. **Two artboard strings have no contract behind them** and are now absent by decision rather than by oversight: `1 of 3` (no call index in v3) and `Locked Tue 3:00` (no lock time; a client-computed one is a schedule claim Omen cannot stand behind).
4. **One artboard/shipped conflict, unresolved on purpose.** The header slot holds the shipped contextual-help button where the artboard draws an account avatar. Deleting a shipped affordance to match a picture is not a fix. Founder call.

## What the rebuild actually changed on screen

Before: `h1` title, a prose subtitle, the generic decision brief, a green `LOW RISK` pill, a green `+4.1` delta, green `LIVE` badges, and confidence rendered as a grey chip.

After: week eyebrow in brass, screen title, scope line, the call card with the call at 24pt, the confidence band as a 14×2 brass rule plus the word, risk as a plain tertiary label with **no container**, the facts row as the capability expression, the evidence block, provider handoff and decline, and the Ledger footer.

**There is no green anywhere on the Omen screen now.** That was expected to wait for `U2`'s colour half — in practice, building risk and confidence to their registry treatments removed the last of it on this screen, because the green only ever lived in the containers those treatments replaced.

D11 holds: every element sits above the tab bar at 390×844 with clear space below the footer.
