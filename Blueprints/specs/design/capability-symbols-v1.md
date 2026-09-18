# Capability Symbols v1

**Status:** Proposed — the nine new glyphs need the founder's eye before they ship.
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

## Which names need a symbol

Only names that can surface in a facts row — an input a user is told about. Three do not:

| Name | Why no symbol |
|---|---|
| `selected_context` | It is the league you are already looking at. A chip saying "we knew which league you meant" is noise. |
| `decision_receipt` | Ledger-internal provenance, never a factor behind a call. |
| `scoring_outcome` | Belongs to the Ledger's outcome column, not to a call's evidence. |

Ten need one.

| Capability | Symbol | Depicts | State |
|---|---|---|---|
| `roster` | `capability.roster` | a lineup card | **new** |
| `projections` | `capability.projections` | a rising point line | **new** |
| `waivers` | `capability.waivers` | a claim ticket | **new** |
| `trade_rosters` | `capability.trade-rosters` | two-way arrows | **new** |
| `league_standings` | `capability.standings` | a ranked column | **new** |
| `league_matchup` | `capability.matchup` | two facing blocks | **new** |
| `league_playoff_settings` | `capability.playoffs` | a bracket fork | **new** |
| `league_activity` | `capability.activity` | a movement feed | **new** |
| `league_transactions` | `capability.transactions` | an exchange arrow | **new** |
| `league_scoring` | `capability.scoring` | a rule sheet | **new** |

The four symbols already drawn — `evidence.wind`, `evidence.travel-zones`, `evidence.rest-clock`,
`evidence.unread-source` — came from the OmenCall artboard. Only `unread-source` survives into this
contract; the other three depict **factors**, not capabilities, and the system emits no such inputs
(see the precedence decision, `Direction/decision_log.md`, 2026-09-18). They are retained as assets
because the artboard still shows them, and they may return if factor-level evidence is ever built.

## The two rules that matter

1. **`evidence.unread-source` marks the class, not the capability.** Any input in the
   *could not read* class wears it, whatever its name, replacing its own symbol. The class a
   reader must not miss is the one that costs them something.
2. **An unmapped name gets NO symbol.** Never a default, never a placeholder, never the unread
   mark. A missing symbol says nothing; a wrong one says something untrue. This is not a fallback
   to tidy up later — it is the rule.

## Provisional

The ten glyphs are described, not drawn. Nine would be new artwork and drawing them is not a thing
to do by inference — `slops-image-prompt` and the founder's eye own that. **Until they exist, every
capability except the unread class renders with no symbol**, which is correct under rule 2 and is
what `U1` ships today.

A screen is not blocked on this. A screen that renders capability labels without symbols is honest
and incomplete; a screen that renders them with invented symbols is neither.
