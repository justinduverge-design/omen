# Capability Symbols v1

**Status:** Active. **No new glyphs are required.** An earlier draft of this file claimed ten
capabilities needed symbols and nine needed drawing. That was wrong and is corrected below.
**Date:** 2026-09-18
**Binds:** the 13 capability names in `shared-decision-context-v1.md` to named symbols.
**Consumed by:** `capability-expression-v1.md`, every screen with a facts or evidence surface.

## Why a contract and not a lookup table in one screen

Building `U1` produced a defect worth generalising: the screen fell back to
`evidence.unread-source` whenever a capability name matched no symbol, so an input Omen had read
**and used** rendered wearing the "could not read" mark. **An icon made a false claim.**

A per-screen mapping reproduces that on every screen that has one. This is the mapping, once.

## The vocabulary is closed

Thirteen names, all server-owned, all enumerable from `decisionContext.js` — the `PROFILES` table
plus every `record()` call. Nothing else can reach a receipt:

```
selected_context  roster  projections  waivers  trade_rosters  league_scoring
league_standings  league_matchup  league_playoff_settings  league_activity
league_transactions  scoring_outcome  decision_receipt
```

**This is what makes the problem finite.** It was worth establishing before drawing anything: an
open-ended vocabulary would have made a symbol set a guessing game, and the honest design would
then have been no symbols at all.

## Which names need a symbol: none

The canvas was read before answering this, and it had already answered it.

`OmenEvidence.dc.html` is the artboard that draws a full evidence surface. It uses **no icons**:

```html
<span class="k">Weather</span><span class="v">Gusting 31 mph at kickoff. ... <span class="ds live">Live</span></span>
<span class="k">O-line</span><span class="v pv-none">No provider exposes personnel. Omen did not read this and is not pretending to.</span>
```

A text key, a sentence, a status word. Every capability row in the canvas is built this way.

Across all 32 artboards there are 14 distinct glyphs: 4 tab-bar icons, 4 sign-in provider marks, a
favourite star, an empty-state illustration, and **4 fact chips that appear on `OmenCall` only**.
Those four depict *factors* — `Wind 22`, `2 zones`, `4 days`, `O-line` — in a compact row where
there is no space for sentences. They are not capability symbols and the system emits no such
inputs (see the precedence decision, `Direction/decision_log.md`, 2026-09-18).

**So a capability renders as a word.** That is not a gap waiting on artwork. It is the design.

### The correction, recorded

The first draft of this file listed ten capabilities needing symbols and nine needing new artwork,
and reported that artwork as a founder dependency. No artboard ever asked for it. The requirement
was produced by inference from the U1 defect rather than by reading `OmenEvidence.dc.html`, which
was sitting in the repo the whole time.

It is kept here because the failure mode generalises: **a contract derived from a defect will
invent obligations the design never carried.** Read the artboard that draws the surface before
specifying the surface.

## The two rules that matter

1. **`evidence.unread-source` marks the class, not the capability.** Any input in the *could not
   read* class may wear it, whatever its name. The class a reader must not miss is the one that
   costs them something. In a surface with room for a sentence, the sentence carries it and the
   glyph is unnecessary — `OmenEvidence` proves the pattern.
2. **An unmapped name gets NO symbol.** Never a default, never a placeholder, never the unread
   mark. A missing symbol says nothing; a wrong one says something untrue. With no capability
   symbols mapped at all, this rule now governs every capability — which is exactly what `U1`
   ships and why it is correct rather than incomplete.

## If a facts row is ever needed beyond OmenCall

The four existing chips are retained as assets. Anything new belongs to the **factor** vocabulary,
not the capability vocabulary, and needs a factor contract first — there is none today. Do not
reach for this section to justify drawing a capability glyph.
