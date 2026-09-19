---
metadata_profile: valor-brain/v1
page_id: omencall-evidence-contract-v1
page_type: screen-contract
layer: L2
authority: REVIEW_ONLY
owner: Justin Duverge Catalino
state:
  task: READY
  ratification: PENDING_FOUNDER
sources:
  - design/native-visual-lock-2026-09-13/OmenCall.dc.html
  - design/native-visual-lock-2026-09-13/OmenEvidence.dc.html
  - Blueprints/specs/design/capability-expression-v1.md
  - Blueprints/specs/design/capability-symbols-v1.md
  - Blueprints/specs/design/screen-contracts/OmenCall-v1.md
  - Blueprints/specs/mobile/omen-native-design-house-v1.md
  - Blueprints/specs/design/component-lock-v1.md
  - Brand/brand-system.md
  - Direction/facts-of-record.md
relationships:
  requires:
    - Blueprints/specs/design/capability-expression-v1.md
    - Blueprints/specs/design/screen-contracts/OmenCall-v1.md
  enables:
    - Direction/current_sprint.md
  checks_against:
    - Blueprints/specs/design/component-lock-v1.md
    - Direction/facts-of-record.md
freshness:
  reviewed_on: "2026-09-18"
  triggers:
    - omen-decision-brief contract version changes
    - C3-DataSourceForm lands its carriers
    - the founder ratifies or rejects the D11 waiver
    - OmenCall.dc.html is redrawn against this composition
snapshot:
  repository: justinduverge-design/omen
  commit: 02f6a4b5
  compiled_by: slops-native-screen-design
---

# OmenCall — evidence presentation contract v1

**Status:** REVIEW_ONLY. Not buildable until the founder ratifies.
**Founder direction, 2026-09-18:** accept the scroll on OmenCall, and rework the page so its
evidence *"presents its worth for the user so the user can become a better FF player."*

## Compiled truth

- **The decision this screen delivers:** should I make this week's one move, and do I believe it?
  The second clause is what this revision adds.
- **D11 is waived for OmenCall only** (founder, 2026-09-18), measured at 30.7pt of a 31.3pt line
  occluded once the contractual switcher bar is present. Every other screen declaring a fit still
  binds.
- **The capability contract's four classes are the lesson**, not compliance furniture. Split into
  three labelled groups — moved it / read but didn't decide / couldn't read — they teach a fantasy
  player which questions to ask. `not_requested` renders nowhere.
- **Confidence is a band, never a numeral.** `Brand/brand-system.md` §7's `"74 — Medium-High
  Confidence"` example is stale against fact-of-record #16 and must not be followed.
- **No capability glyphs.** A capability renders as a word; an unmapped name gets no symbol.
- **This composition deviates from `OmenCall.dc.html` by founder direction.** Either the artboard is
  redrawn or this contract is recorded as its amendment — otherwise the next agent diffs against the
  old picture and reverts it.
- **Status:** REVIEW_ONLY. Not buildable until ratified.

## Append-only timeline

- **2026-09-18:** Authored by `slops-native-screen-design` after the founder accepted the scroll on
  OmenCall and asked that the page "present its worth for the user so the user can become a better
  FF player". Four open questions recorded rather than guessed: the spacing-scale conflict between
  `component-lock-v1` and registry §2.5, whether the artboard is redrawn, whether
  `omen-decision-brief.v3` carries `what_could_change_this`, and the formal amendment of U1's D11
  clause. Not ratified.

## Stage 1 — The decision this screen delivers

> **Should I make this week's one move, and do I believe it?**

One sentence, and the second clause is the new half. The screen already delivered the move. What
it did not deliver was grounds to judge it, so the user either took Omen's word or ignored it —
neither of which makes anyone a better player.

**Decision first, evidence second, action third.** The evidence layer added here sits *below* the
call and *above* nothing that the user needs to act. A user who already trusts the call can still
act without scrolling.

## Stage 2 — What changes, and the one idea behind it

Today the teaching content exists but is **behind a tap**, on `OmenEvidence`. A user who never taps
"See the full argument" never learns anything. This contract promotes the transferable parts onto
`OmenCall` and leaves the deepest part where it is.

| Teaching content | Today | Here | Why |
|---|---|---|---|
| Which inputs **moved** the call | flat row list, undifferentiated | own labelled group | The single most transferable idea Omen has |
| Which inputs were **read but didn't decide** | same flat list | own group, de-emphasised | Teaches that having data ≠ data mattering |
| Which inputs Omen **couldn't read** | same flat list | own group, named | Teaches where the model is blind |
| **Why this confidence and not another** | `OmenEvidence` only | promoted to `OmenCall` | A reusable rule: agreement, not margin |
| **What would change this** | `StartSit` only | promoted to `OmenCall` | Teaches what to monitor before kickoff |
| What else was considered, and why rejected | `OmenEvidence` | **stays** | Deepest, least transferable; keeps the tap worth taking |

**The through-line:** the capability contract's four classes are not compliance furniture — split
into three labelled groups they *are* the lesson. "We had it and it didn't matter" and "we couldn't
see it" are exactly what a fantasy player needs to learn to ask.

## Stage 3 — Blocks, surface levels, spacing

Surface levels per `omen-native-design-house-v1.md`. **Exactly one block is level 4.**

| # | Block | Level | Gap above | Notes |
|---|---|---|---|---|
| 1 | Switcher bar (E005–E012) | 1 | — | `OmenLeagueSwitcherBar`, already built |
| 2 | Header — eyebrow, title, help + account | 1 | 12 | Both controls, per the 2026-09-18 founder call |
| 3 | Scope line | 1 | 4 | |
| 4 | **The call** — type, verdict, reason, band + risk | **4** | 16 | The decision. The only level 4. |
| 5 | What moved this call | 3 | 16 | `used: true` only |
| 6 | Read, but it didn't decide this | 2 | 12 | `live, used: false` |
| 7 | What Omen couldn't read | 2 | 12 | `unavailable` / `pending` |
| 8 | Primary action | **5** | 24 | |
| 9 | Secondary action | 3 | 12 | Outline, not filled |
| 10 | Why this confidence | 3 | 32 | Teaching block |
| 11 | What would change this | 3 | 16 | Teaching block |
| 12 | See the full argument → `OmenEvidence` | 1 | 24 | Text action |
| 13 | Ledger note | 1 | 16 | |

Screen padding 16 horizontal. Inside a group: 12 between rows, 8 between a row's key and its
sentence, 4 between a sentence and its status word.

**Blocks 5–7 render only when they have contents.** An absent group is absent — no empty heading,
no "none". `not_requested` renders nowhere, ever (`capability-expression-v1`, acceptance 2).

**Ordering inside block 5 is the server's.** The screen must not re-rank: re-ranking is a claim
about relative importance that no contract supports.

## Stage 4 — Components and tokens

| Element | Component | Tokens |
|---|---|---|
| Call card | `OmenCard` elevated | `surface-3`, `text-primary` |
| Band | `OmenConfidenceBandLabel` | `accent` |
| Risk | `OmenRiskLabel` | `Data.riskLow` / `riskHigh` — one hue, two weights |
| Group heading | `Text` micro | `text-tertiary` |
| Capability row — moved | `OmenCapabilityEvidenceRow` | key `text-tertiary`, sentence `text-secondary` |
| Capability row — read/not used | same, de-emphasised | sentence `text-tertiary`, **no evidence styling** |
| Capability row — couldn't read | same | `text-tertiary` + `Data.dataUnavailable` |
| Status word | `OmenBadge` | `Data.dataLive` / `dataUnavailable` — existing tokens until `C3` |
| Primary action | `OmenButton` primary | `accent`, `onAccent` |
| Secondary action | `OmenButton` secondary | `accent` outline |
| Teaching blocks | `OmenCard` standard | `surface-2`, `text-secondary` |

**No new tokens are required.** No capability glyphs are drawn — `capability-symbols-v1` settles
that a capability renders as a word, and an unmapped name gets no symbol at all.

**Tap targets:** primary and secondary actions full-width × 44 minimum; "See the full argument" 44
tall across the text width; switcher `+` and chevron 44 × 44 per `V-CanvasConformance`.

## Stage 5 — The words

Voice per `Brand/brand-system.md` §7: plain English, lead with the move, no hype, no hedging.

**Group headings** — these are the teaching, so they are sentences, not labels:

| Block | String |
|---|---|
| 5 | `What moved this call` |
| 6 | `Read, but it didn't decide this` |
| 7 | `What Omen couldn't read` |
| 10 | `Why this confidence` |
| 11 | `What would change this` |
| 12 | `See the full argument` |
| 13 | `Every call lands in the Ledger whether you take it or not.` |

**Actions:**

| Control | String |
|---|---|
| Primary, provider known | `Make this move in {Provider}` |
| Primary, provider unknown | *not rendered* — a button that says "make this move" somewhere unspecified is worse than no button |
| Secondary | `Not this week` |

**Block 10 body** is server-supplied where the receipt carries confidence drivers. Where it does
not, the fallback states the *rule* rather than inventing a driver:

> `Confident means the inputs agree. Three independent reads point the same way and none contradicts — that is what separates Confident from Leaning, not the size of the gap.`

The band name is substituted; the sentence is written per band and never interpolated into a
number. **Confidence is a band, never a percentage** — fact-of-record #16. `Brand/brand-system.md`
§7 still shows `"74 — Medium-High Confidence"`; **that example is stale and must not be followed.**

**Block 11 body** comes from `what_could_change_this`. When the array is empty the block is absent
— an invented falsifier is a claim about the week that Omen cannot stand behind.

**States:**

| State | Copy |
|---|---|
| No call this week | `Your lineup is solid. No move clears the bar this week.` |
| Off-season | `Calls return when the regular season opens.` |
| Provider disconnected | `Reconnect {Provider} to get this week's call.` + reconnect action |
| Partial read | Blocks 5–7 render whatever exists; if nothing was used, the call is not shown at all |
| Loading | `Reading your league…` |
| Error | `Omen couldn't reach {Provider}.` + `Try again` |

**Mock / demo labelling:** any fixture-backed render carries the existing `Sample` badge on every
affected row. Demo and live are never mixed silently (fact-of-record #7). This is P0 and is not
waivable by layout.

## Stage 6 — Acceptance checklist

Each line is checkable against a build.

1. Exactly one block renders at surface level 4, and it is the call.
2. Every spacing gap is one of `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` — see the open conflict below.
3. Every colour resolves to a named token; zero raw values in the screen.
4. `used: true` inputs appear **only** under "What moved this call".
5. `live, used: false` inputs appear only under "Read, but it didn't decide this" and carry **no**
   evidence styling.
6. `unavailable` inputs are **named** under "What Omen couldn't read", never omitted, and survive
   truncation ahead of any other class.
7. No `not_requested` input renders anywhere.
8. No capability glyph is drawn.
9. Groups 5–7 are absent, not empty, when they have no contents.
10. Block 10 renders a band name and never a numeral or a meter.
11. Block 11 is absent when `what_could_change_this` is empty.
12. The primary action is absent when the provider is unknown.
13. Every interactive element is ≥ 44 × 44 points.
14. Row order within a group matches server order exactly.
15. A degraded capture shows 4, 5, 6 and 7 simultaneously.
16. Both platforms render the same block order and the same strings.

## Platform deltas

None intended. iOS composes with `safeAreaInset` for the switcher bar and Compose with a pinned
header row; the block order, tokens and strings are identical. Any divergence is a defect.

## Open questions — listed, not guessed

1. **The spacing scale conflicts, and this contract is exposed to it.**
   `component-lock-v1.md:241` locks `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`. Registry §2.5 and
   `_shared.css` use `2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 96`, and the
   shipped `OmenSpacing` follows the registry. Every value above was chosen to exist in **both**,
   so this contract is buildable either way — but the conflict is real and `V-CanvasConformance`
   assumes the finer scale. **Not resolved here.**
2. **Does the artboard get redrawn?** This composition deviates from `OmenCall.dc.html`, which the
   precedence rule makes authoritative for look. The founder directed the change, so the artboard is
   now behind the decision. Either it is redrawn or this contract is recorded as its amendment —
   otherwise the next agent diffs against the old picture and "fixes" this away.
3. **Does `omen-decision-brief.v3` carry `what_could_change_this`?** It is confirmed on
   `start-sit-detail.v2`. If the Omen brief does not carry it, block 11 needs a backend item and is
   deferred rather than faked.
4. **Is `U1`'s D11 clause formally amended?** The founder accepted the scroll verbally. The clause
   in `Direction/current_sprint.md` still reads "fits with nothing below the fold". Until it is
   edited, `U1` cannot close against its own written acceptance.

## What this contract does not do

- It does not implement. A build agent builds it after ratification.
- It does not change `OmenEvidence`, which keeps "What else was considered".
- It does not touch the retired `OmenTeamPicker` carousel — that is `U3`'s.
