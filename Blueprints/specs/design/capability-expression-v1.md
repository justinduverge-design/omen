# Capability Expression v1

**Status:** Proposed — founder review before any screen is built against it.
**Date:** 2026-09-17
**Binds:** `Blueprints/specs/shared-decision-context-v1.md` (the six profiles) to the 30 screen
contracts in `Blueprints/specs/design/screen-contracts/`.
**Carriers come from:** `omen-native-design-system-registry-v1.md` §2.3.

## Why this exists

The 30 screen contracts were compiled **2026-09-14**. `shared-decision-context.v1` landed
**2026-09-17**. **Nineteen of the twenty-one capability-bearing screens are specified by documents
written before the vocabulary existed**, so nothing tells a screen what it must say about what
Omen actually read.

Build from those contracts alone and you get screens that look correct and cannot tell the truth:
the picture says where the text goes, and nothing says whether that text is allowed to claim the
source behind it was used.

This is one document rather than twenty-one paragraphs. A copied rule is a second source of truth
and the copy is the one that goes stale — this repo has paid for that four times on the record.

## The two axes, which are not the same question

`decision_context` gives every input two independent facts, and conflating them is the failure
this contract exists to prevent:

| Axis | Question | Values |
|---|---|---|
| `state` | **Could we read it?** | `live`, `unavailable`, `pending`, `not_requested` |
| `used` | **Did it change the answer?** | `true` / `false` |

`kind` (`Verified`, `Projection`, `Model`, `Inference`, `Limitation`) says what *role* an input
plays. It is independent of availability — a projection is a projection whether or not it was read.

**A source being present is not a source being used.** The spec is explicit: *"A resolved source
is not described as decision-making evidence until an engine marks it used."* A screen that shows
every resolved input as evidence is overclaiming, and it is the easiest mistake to make because
the payload hands you the whole list.

## Capabilities are carried by words, not glyphs

A class is distinguished by prominence, colour role and wording — never by an icon. No capability
name maps to a symbol; see `capability-symbols-v1.md`, which records why the ten-glyph requirement
an earlier draft asserted was never in the canvas. `OmenEvidence.dc.html` is the reference surface.

## The four presentation classes

Every capability-bearing screen renders each input in exactly one of these. There is no fifth.

| Class | Condition | Treatment | Reads as |
|---|---|---|---|
| **Used evidence** | `state: live`, `used: true` | full prominence, named in words, `text-secondary` | "this moved the call" |
| **Read, not used** | `state: live`, `used: false` | de-emphasised, `text-tertiary`, **no evidence styling** | "we have it; it didn't matter here" |
| **Could not read** | `state: unavailable`, or `pending` at render | named, `text-tertiary`, plus a sentence saying what was not read | "we tried and couldn't" |
| **Out of scope** | `state: not_requested` | **not rendered at all** | — |

### `not_requested` is not a limitation, and must never render as one

This is the rule most likely to be got wrong. A profile only requests what it needs — the `omen_mvp`
profile does not request trade rosters unless no lineup or waiver candidate clears the threshold.
Rendering "we didn't read trade rosters" on a week where trade was never relevant manufactures a
gap that does not exist, and it trains people to ignore the honest ones.

**Silence is correct for `not_requested`.** Absence of a claim is not a claim of absence.

### `pending` resolves to "could not read", never to a spinner

Per the 2026-09-17 latency contract, advisory timeouts *"are represented as unavailable capability
evidence rather than a spinner or invented fact."* A capability still `pending` when the screen
renders is shown as unread. It is never a loading state inside a delivered answer, because the
answer has already been given — the reader is owed what stood behind it, not an animation.

## Carriers (registry §2.3)

Colour is never the only carrier (D7). These are the forms:

| State | Carrier |
|---|---|
| Data source · live | solid `surface-3`, `text-primary` |
| Data source · stub / mock / sample | dashed `border` + 45° `rgba(245,240,232,.06)` hatch |
| Data source · unavailable | `text-tertiary`, struck through, hairline outline |
| Provenance · self-reported | **dotted** — never blended with verified |

**Ship-order gate, inherited and not waived here:** `data-stub` and `data-mock` may not leave
either token file in a commit that does not also land the hatch and dashed treatments. A screen
built against this contract before `C3` lands uses the existing tokens; it does not invent a local
carrier and it does not ship the state without one.

## What a screen contract must now declare

One line per screen, pointing here rather than restating:

```
Capability profile: omen_mvp — expresses per capability-expression-v1.
```

And, where the screen's own honesty rule is narrower than the general one, the narrowing — for
example the Ledger's rule that self-reported rows are never blended with verified ones.

## Capture obligation — the part that makes this checkable

A profile is not covered by a screenshot of its success state. **Every profile needs at least one
capture scenario in which a source was not read**, because that is the only condition under which
the screen's honesty is visible at all.

Today every scenario in `ScreenshotScenarios` is a success or a disconnected state. A screen can
satisfy this entire contract and no capture would ever show it.

Required per profile: one nominal scenario, and one degraded scenario with at least one input at
`unavailable` and at least one at `live, used: false`.

## Acceptance

A screen is capability-correct when:

1. Every rendered input maps to exactly one of the four classes.
2. No `not_requested` input is rendered.
3. No `used: false` input carries evidence styling.
4. Every `unavailable` input is **named**, not omitted.
5. A degraded capture exists and shows 2–4 above.

## Deliberately not decided here

- **Ordering** within the used-evidence set. The server sorts; a screen must not re-rank, because
  re-ranking is a claim about relative importance that no contract supports.
- **Truncation.** What a screen does when a profile resolves more inputs than fit is a per-screen
  layout question, but dropping an `unavailable` input to make room is prohibited — it is the one
  class that must survive truncation, since it is the only one that costs the reader something.
