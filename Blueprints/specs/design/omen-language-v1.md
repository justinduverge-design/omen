# Omen product language v1

**Status:** Founder-directed authority, 2026-10-16.  
**Scope:** Customer-facing names for Omen's data, interpretation, recommendation and receipts.  
**Boundary:** `Sight`, metric names, formula versions and provider identifiers remain stable internal
contract vocabulary. This document changes presentation, not stored schemas or API keys.

## The model

An omen is a sign interpreted against accumulated observation. Omen therefore does not present one
model as an oracle and does not decorate statistics with mystical names. Provider forecasts, Omen's
warehouse read, league state and observed football facts are **Signs**. Omen interprets the relevant
signs into a **Read**, gives **Counsel**, and records the issued **Verdict** in the Ledger.

Historical omen traditions often paired a recorded observation with an interpreted consequence.
That structure is useful here because it forces the product to keep the evidence separate from the
decision. The product borrows the general literary ideas of signs, portents, counsel and verdicts;
it does not use the name of a living sacred practice, priesthood or culturally specific ritual as
decorative interface copy.

## Canonical vocabulary

| Product term | Meaning | Never means |
|---|---|---|
| **Sign** | One source-backed observation or forecast | a verdict, proof, or generic card |
| **Omen Read** | Omen's current statistical read of a player or situation | the internal `sight` field name |
| **Provider Read** | The connected platform's forecast or league fact | a privileged default truth |
| **Leading Read** | The source that earned authority for this cohort through current evaluation | the first number returned |
| **Crosswind** | A meaningful disagreement among otherwise usable reads | an error or missing data |
| **Portent** | A material change that could alter the decision: role, availability, matchup or environment | every small metric movement |
| **Counsel** | The short explanation connecting signs to action | an unsupported prediction |
| **Verdict** | The bounded decision Omen issues: decide, lean, hold, or refuse | certainty or a guarantee |
| **Watch** | A live condition worth monitoring before lock | an alarm or push-notification promise |
| **Fog** | Named missing, stale or underpowered evidence that limits the read | a decorative loading state |
| **Ledger** | Immutable receipt of the verdict, signs and versions used when issued | a current-data rewrite of history |

## Copy grammar

- Prefer `Omen's read: 14.2` to `Sight: 14.2`.
- Prefer `Omen's read leads here` to `Omen beat ESPN`.
- Always follow leadership with its scope: `WR · PPR · 2022-2025 holdout` or the compact equivalent.
- When results cannot name a leader: `The reads disagree. Neither has earned the lead here.`
- A Crosswind names both values, both sources, their vintages and the football facts that explain
  the difference. It never resolves disagreement by louder styling.
- `Fog` must name what is missing and what the user can still safely do.
- Internal names such as `sight`, `challenger`, `model`, `v2`, correlation and MAE may appear in a
  technical disclosure sheet, never as the primary customer label.

## Visual restraint

This is vocabulary, not a fantasy skin. Do not add ravens, runes, tarot cards, bones, smoke, glowing
crystals, pseudo-Latin, sacred symbols or culture-specific ritual imagery. The Omen identity comes
from disciplined hierarchy, shadow/light, brass, typography, motion and the quality of the counsel.
