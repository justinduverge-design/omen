# Handoff — Registry Amendment 01 applied, contract lane minted, artboards conformed

**Date:** 2026-09-13
**Branch:** `design/native-visual-lock-2026-09-13` — **not merged, not pushed by this session**
**Commits:** `952eb75`, `a5ebb30`, `2b84208` (on top of the founder's `1dc021b`, `39db2c5`)
**Scope held:** documentation and spec only. **No token file, no screen code, no `OmenColor.*`, no
`OmenTypography.*`** in either phase, as instructed.

---

## What arrived and what was blocking

The six documents from the 2026-09-12/13 Cowork session did not exist in any working tree, branch,
stash, dangling commit, or anywhere on disk when this session started. The branch
`design/native-visual-lock-2026-09-13` existed with **zero commits on it** — named, never written
to. The founder pushed both commits mid-session and everything unblocked at once.

**Recorded because it is the reusable part:** the design system itself was never lost. The palette,
the invariants, the type seam and the spacing scale were all present in the registry and in both
token files, machine-checked by `check-token-parity.js` and `OmenColorContrastTest`. What was
missing was the *reasoning layer* — D1–D8, the amendment text, the contract sequence. A session that
had concluded "the direction is gone" would have been wrong about the system and right only about
the prose.

---

## 1. Registry Amendment 01 — applied (`952eb75`)

`Blueprints/specs/mobile/omen-native-design-system-registry-v1.md` §§2.1–2.5.

### As drafted

| Decision | Section |
|---|---|
| D1 dark-only — Light column **withdrawn, not deleted**; values are the starting point for future packs | §2.2 |
| D3 Wix Madefor Display + Text replaces Alegreya Sans | §2.4 |
| D6 smoky grey `#1F1F1D` — already shipped, no change | §2.2 |
| D7 data-semantic row split; meaning invariant, colour not | §2.1, §2.3 |
| D8 provider colours the sole colour exception | §2.1, §2.3 |

### Four founder calls of 2026-09-13 that changed the amendment

**1. Risk colour restored** — *"I want the risk colours but they gotta be tasteful."* The amendment
as drafted deleted `risk-low/medium/high` outright. Risk is now the one data-semantic family that
keeps a hue: **one hue, two weights, plus absence.**

| Tier | Treatment | Measured |
|---|---|---|
| high | `#7E1717` fill, `text-primary` ink, `fill-ring`, `▲`, names the risk | ink 9.15:1, ring 3.89:1 vs `bg` |
| medium | `#4A1818` muted fill, `text-primary` ink, `fill-ring`, no glyph | ink 12.90:1 |
| low | no container, no colour, `text-tertiary` label | — |

Two measurements did the deciding. **Crimson cannot mark a `surface-3` fill** — `#7E1717` is
**1.02:1** there, literally the same value, and every candidate lifted to clear the 3:1 non-text
floor had stopped being crimson (`#DA6250` reaches 2.94:1 and already reads coral). So the block has
to *be* the colour, which is the registry's own standing rule from the 2026-09-11 smoky-grey note,
reached independently a second time. **And there is deliberately no amber:** a muted amber for the
medium tier lands at **4.92:1** on `surface-1` against brass at **5.20:1** — near-identical at chip
size, and the visual lock fixes brass as *action and outcome, never danger*. That separation is the
only thing making a single accent legible.

**2. Platinum ratified** as a named exception beside provider identity, **both platforms**, scoped to
favourite and selection marks only. It was already shipping on iOS and carried in
`check-token-parity.js` `KNOWN_SINGLE_PLATFORM`. The entry comes out when the Android value lands;
until then it is **ratified in spec and pending in code**, which is the opposite of the usual drift
direction and is written down so nobody mistakes it for one.

**3. Wix Madefor confirmed**, amending the one-family decision of 2026-09-07. Alegreya Sans is
replaced, **not kept as a fallback** — a fallback family is a third family by another name.

**4. Spacing scale replaced** — out of the amendment's scope, added because applying it made every
approved screen a §2.5 violation:

```
2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 96
```

### One generalisation made on the agent's own judgement

The amendment introduced a `provider-chip-ring`. The same physics applies to both risk fills, so it
became a **`fill-ring` token with a universal rule**: *any fill measuring under 3:1 against its
ground carries it.* One rule, no exceptions, covering provider chips and risk blocks alike. Flagged
here because it is broader than the amendment asked for.

### Also cleaned up

The 2026-08-31 DM Mono amendment is retired as superseded. **Between 2026-08-31 and today this file
carried three live type decisions at once** — the §2.4 three-family table, the two-family amendment
below it, and the one-family decision of 2026-09-07 that reached the code and never reached the
document. Every gate stayed green throughout, because each statement was internally consistent.

---

## 2. Contract lane minted (`a5ebb30`)

Lane **V** in `Direction/current_sprint.md`, in the order `omen-native-contract-work-v1.md` §1 gives.

| Item | Status | Note |
|---|---|---|
| `C1-ConfidenceBands` | READY | blocking, breaking — wants the longest runway |
| `C2-RegistryAmendment` | **VERIFIED** | evidence `952eb75` |
| `C3-DataSourceForm` | READY | safety-gated; **this is the item that releases the ship gate** |
| `C4-LedgerIndex` | READY | verify `GET /api/moves` first — may close as a docs fix |
| `C5-WaiverCopyContract` | READY | server-authored |
| `C6-FillRing` | READY | tiny, visible |
| `C7-TypeScaleReconciliation` | READY | **blocked on founder** |
| `U1`–`U4` | READY | each blocked on its C row |
| `V-QuietWeekStraight` | READY | gates `U3` |
| `V-CanvasConformance` | READY | partially blocked on `C7` |

**The ship-order gate is a standing block on the whole lane, not a footnote.** Deleting `data-stub`
or `data-mock` before their carriers land is a P0 against `AGENT.md` and blocks close-out for
whoever lands it.

### Two items are not from the source document

**`C7-TypeScaleReconciliation`.** Amendment 01's role table and the approved canvas are two fixed
type scales for one app. The canvas needs four roles §2.4 does not name — 27, 22, 24, 21 — and runs
reasoning copy at 12.3 and labels at 9.5 against `chip` at 11. The amendment's table was applied **as
written** and the conflict recorded rather than improvised away, because resolving it costs the D11
no-scroll constraint on at least one screen. That is a founder trade.

**`V-QuietWeekStraight`.** The voice fence says Omen goes straight after a loss, an injury or a
breakage; only the neutral variant is drawn. The harder half is the **trigger, not the words** — and
if the straight variant fires on a provider outage then the fence is an honest-states rule and not
only a copy rule, which makes it a server-side predicate.

---

## 3. Artboards conformed (`2b84208`)

All eight files in `design/native-visual-lock-2026-09-13/`.

| Fixed | Was | Now |
|---|---|---|
| Provider marks had no silhouette | raw hex + `.24` inset — Yahoo **1.13:1**, ESPN **~1.26:1** | `--ring` at `.38`, the `fill-ring` token |
| Unstarred favourite invisible | `#4A4A4E`, **1.63:1** | `#8A8272` (`border`), 3.78:1 |
| Self-reported shared not-read's carrier | both dashed | self-reported **dotted**, dashed stays with provisional data |
| Type below any floor | 8 / 8.5px caps | 10px |
| Focus unspecified | absent | `.focus, :focus-visible` in every file |

**The provider-dot finding is the one worth carrying.** Provider chips at ~1.13:1 were diagnosed,
measured and fixed on the web surface, and the fix is written into registry §2.2. The new artboards
drew bare fills at the same ratio anyway. **A fix recorded in prose does not propagate to the next
artifact anyone draws** — which is the argument for the ring being a token with a test rather than a
note.

**D11 was verified, not assumed.** Command Center, Omen and the quiet week were each rendered in the
browser pane after the type-floor change and measured at **0px overflow** in the 844px frame.

**Not fixed, on purpose.** Touch targets on the switcher `+`, chevron and star are under 44pt, but
padding a hit area without moving the glyph is a build-brief concern — growing the geometry in an
artboard would make the artboard wrong. Spacing is not yet snapped to the new scale because it moves
vertical rhythm on three screens that must not scroll and wants its own render-checked pass. Both
are scoped in `V-CanvasConformance`.

---

## 4. League is a scout's nest

`Direction/facts-of-record.md` #16 amended **in place**. Order changes from *Matchup → Standings →
Waiver → Activity* to **Your week (strip) → The Table → Trade targets → Waiver → Activity**.

The founder's framing: *"like your scout nest, keeping your eye on the league and other players."*
The locked order made League a readout of the user's own week, which Command Center already owns, so
the destination opened by repeating its neighbour. Inverting the subject to *watching other
managers* gives **terrain → opportunity → movement**. Terrain stays above opportunity because the
table is what makes a trade target legible; Activity stays last because it is partial on ESPN and
Yahoo, and a degraded section high on a screen teaches people the screen is unreliable.

---

## 5. Gates — run from the correct layout

```
node scripts/check-sprint-staleness.js                          findings, all pre-existing
node ../../Blueprints/tools/truth-gate/truth-gate.mjs --quiet   PASS — P0 0, P1 0, P2 1, 989 files
node ../../Blueprints/tools/valor-brain/validate.mjs            4/4 valid
node scripts/check-kickoff-drift.js                             PASS — 13 entries
```

**Truth-gate was run from the L0 root with Omen nested at `slops-saloon/omen`**, which is the layout
that produces a true result. From a standalone clone it returns ~117 false P0s, every one a path
that "exists nowhere" purely because of the layout.

Sprint staleness reports `A4`, `B2-D3-S2` and one BURIED known-issue. **All three predate this
session** and are already annotated as deliberate holds in `Direction/agent_inbox.md`. Nothing this
session wrote appears in its findings.

**No test suite was run — no source file changed.** That is a true statement about scope, not a
skipped step.

---

## 6. For the next session

**Start with `C7`.** It is the only founder-blocked item and it gates `U2` and `U3`, which is most of
the remaining native work. Everything else in the C row can proceed in parallel.

**`C4` may be cheaper than it looks.** `GET /api/moves` is deployed and returns `moves-history.v1`.
Check whether that already satisfies the Ledger index before specifying `moves-index.v1` — the
cheapest outcome is that the item closes as a documentation fix.

**`C5` is closer to settled than the item implies.** `src/services/waiverAnalysis.js` already
authors reasons under an evidence discipline, and its own comment states the doctrine: *"Naming the
absence beats inventing a sentence."* The published canvas writes the reason client-side and
produces claims the server would refuse — *"Achane is out three weeks"* is a rest-of-season
durability claim, *"the schedule softens after the bye"* a strength-of-schedule read with no source.
The canvas copy is a **regression against a contract that already exists**. The open half is voice,
not location: the contract must say the server emits a *sentence*, not only a fact, or correct prose
nobody reads replaces invented prose people do.

**Do not touch the ship-order gate** without landing `C3` in the same commit.


---

# Addendum — the scope-C canvas pass

**Same day, after the founder answered the five open decisions.** Commits `4852fd7`, `eb0116a`,
`a598d0e`, `8172ed3`, `90229a7`, `b22bd97`.

## The five decisions

| | Decision | Outcome |
|---|---|---|
| 1 | C7 — **the canvas wins**, registry grows to fit it | §2.4 replaced with a ramp |
| 2 | Scope — **C, every screen** | 8 artboards → **30** |
| 3 | Honest states — **fold them in** | one folder, states beside their parent screen |
| 4 | Depth — **maximum** | annotation vocabulary added; overlays still to draw |
| 5 | Quiet week — **draw it, split the predicate** | copy landed, predicate routed to `C5` |

## 7. C7 — the audit changed the shape of the fix

The canvas README fixed **nine** sizes and told readers to treat anything off that list as a defect.
The CSS in those same eight files ran **twenty-two**. The canvas had been breaking its own rule
thirteen times over, so this could not close by adding four rows to §2.4 — it needed a ramp:

```
10 · 11 · 12 · 13 · 14 · 15 · 16 · 18 · 20 · 22 · 24 · 27 · 32 · 48
```

Fifteen roles, fourteen steps, floor at **10**. Every canvas value moved by at most 1px, and only
two visibly: `21 → 22` on the screen title and `9 → 10` on the smallest labels — the second being
the accessibility floor rather than a rounding. The floor is 10 and not Amendment 01's `chip` 11
because holding 11 moved five distinct sizes and cost vertical room on three screens D11 requires
not to scroll.

## 8. One stylesheet, and why the obvious answer was wrong

Thirty copies of 24KB of CSS drift — the 2026-08-31 registry is this repo's own proof.

A shared `<link rel="stylesheet">` was tried **first and reverted**. It breaks the moment an artboard
is opened from a `data:` URL, mailed, or unzipped, which is exactly the *open one file and it
renders* property the `.dc.html` convention exists to protect. That was verified broken in the
preview pane rather than assumed.

The resolution keeps both properties: artboards stay **self-contained**, `_shared.css` is the
**single source**, and a script writes one into the other.

```bash
node scripts/sync-canvas-css.mjs design/native-visual-lock-2026-09-13
node scripts/sync-canvas-css.mjs design/native-visual-lock-2026-09-13 --check
```

Editing CSS inside an artboard is the mistake `--check` exists to catch. Artboards went ~25KB → ~3KB.

## 9. Thirty screens — and the two gaps that justified scope C

**The honest states had nowhere to live.** `C3`'s hatch and dashed treatments are what release the
ship-order gate, and **you cannot lock a component that appears on no artboard.** The eight locked
screens were all populated best-case. The carriers now exist on real screens: live is a solid fill,
stub/sample is dashed plus a 45° hatch, unavailable is struck through, not-read is a dashed
underline and self-reported a dotted one.

**ESPN was undrawn** — the only confirmed beta failure on record, where iPhone had no path at all.
`EspnConnect` states plainly that ESPN has no read-only sign-in, names both cookies without ever
showing a value, and lists what Omen never does. `ConnectFailed` gives the 401 with an ordered
recovery and says the other two leagues are unaffected.

**Several screens exist to say no**, which is the part worth keeping:

- `StartSitIncomplete` refuses a call across six of nine slots — *"would look like advice and be a guess."*
- `WaiverNotDetermined` gives the player read and withholds the bid, because a bid invented without
  the budget is worse than no bid.
- `LeagueNoRosters` says the limit is **permanent for that provider, not an outage**, so nobody
  builds a retry for it.
- `TradeNeedsContext` calls itself a coin flip rather than dressing one as advice.

Deliberately not carried forward: `CommandSwipe2` (the carousel, retired by the one-switcher
decision) and `Main` (superseded by `CommandCenter`).

## 10. `slops-ux-copy` — two real defects, and a stale skill

**The sign-in hero read "Know the move."** `brand-system.md` lists *"Know your move before you make
it"* under **Do not use**, because it implies the user already has the right answer and Omen tests
instinct rather than flattering it. One word apart carries the same echo. Replaced with the approved
alternate, **"See the move before the league does."**

**Both quiet variants stated a call and carried no confidence band.** The voice rule is that
confidence and risk stay visible wherever a recommendation exists, and `WaiverNoMove` already
honoured it for the same kind of do-nothing call — the two quiet screens were the inconsistency.

**Reported, not fixed:** the `slops-ux-copy` skill file itself cites *"Less guessing. Better moves."*
as an approved anchor. `brand-system.md` retired that line with the Corvus name. The skill is a
Layer 0 file and is not this repo's to edit.

## 11. Identity providers — an asset request that was a review risk

The founder asked for real brand colours on Google and Discord and an icon for email. Checking the
spec first turned it into a governance item: `m4-auth-providers-v1-brief.md` records **five** enabled
Supabase providers — email, Google, Apple, Discord, passkeys — with Discord already merged. The row
was short a provider as well as wrong about two marks.

**The bigger find:** "Continue with Apple" was a **brass fill** with the mark on `currentColor`.
Apple permits that button in black, white, or outlined white and nothing else. **A gold Apple button
is an App Store rejection surface**, and it would have shipped.

The rule, now in registry §2.3 as a second colour exception and a narrower one: **the mark carries
brand colour, the button stays neutral.** That keeps brass-only chrome intact and is independently
what each vendor requires — the neutral row is Apple's black variant and also Google's own
dark-theme button. No `fill-ring`: measured against `bg`, Discord is **3.58**, Google blue **4.63**,
green **5.40**, red **4.21**, yellow **9.67**, so unlike the fantasy chips these marks hold their own
silhouette.

## 12. What was verified rather than asserted

- Every class used in every artboard **is defined** in `_shared.css`.
- All **30** artboards agree with the shared source (`--check`).
- All **thirteen** declared-fits artboards measure **0px overflow** in the 844px frame, re-measured
  after the type-floor change, after the ramp snap, and after the copy edits.
- The four auth rows are **47px** each, clearing the 44pt touch floor.

## 13. What remains, stated plainly

- **Annotation overlays are not drawn.** The vocabulary is in `_shared.css`; the founder asked for
  maximum depth and this is the part of that ask still outstanding.
- **Overflow is unverified on the seventeen scrolling artboards.** They are declared scrolling, so
  overflow is expected — but nothing has confirmed they are not overflowing *horizontally*.
- **44pt touch targets** on the switcher `+`, chevron and favourite star remain a build-brief
  concern; growing the geometry in an artboard would make the artboard wrong.
- **Dynamic Type at 200%** is undefined, and scoreboard numerals break first.
- **`slops-taste` and `slops-canvas-to-code` have not been run.** Taste is now unblocked because the
  palette and ramp are settled; canvas-to-code should run last, as the exit gate that compiles each
  artboard into a build contract.
