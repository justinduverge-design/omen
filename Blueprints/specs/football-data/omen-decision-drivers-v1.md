# Omen decision drivers v1 — why this move, ranked by impact, and what else was considered

**Status:** PROPOSED (2026-10-11). Not built. Needs founder sign-off because it adds optional fields to
`start-sit-detail.v2` and `omen-decision-brief.v3`, and the brief builder (`decisionBriefV2.js`) is a protected file.
**Trigger:** device feedback 2026-10-11: reasons are not shown coherently, and there is no way to tell which stat
mattered most or what the other plausible moves were.

## Today (verified in code)

- `src/services/evidenceWhy.js` picks up to three statements by **category tier** (observed facts first, then the
  projection gap, then limitation, then inference). The order never depends on how much a fact moves *this* decision.
- Omen brief `alternatives` is always `[]` (`src/routes/omen.js`); Start/Sit `alternatives` are other slot swaps
  (`startSitDetail.js`), not other plausible players for the same slot.
- The decision itself is the **projection gap** in this league's scoring (plus availability). Everything else
  (usage, role, matchup, environment, Omen's own stats) corroborates or contradicts it. The honest ranking has to say so.

## Principles

1. **Impact, not category.** Each reason gets a role and a weight computed from real numbers by fixed, published thresholds.
2. **Honest about what decides.** The projection gap (or an availability override) is the decider; other rows are
   support or caveat. Omen never presents a supporting stat as the cause when the cause is the projection.
3. **Never pad.** If only the decider exists, show only it. No invented numbers, no templated filler.
4. **Show the counter-evidence.** The strongest reason *against* the move is shown as "what could change this".
5. **Show who else was considered**, and why each lost, from numbers Omen already has.

## Model

Each evidence row maps to one **role**:

| Role | Meaning | Example |
|---|---|---|
| `decisive` | by itself changes the answer | starter is OUT; slot is a hole |
| `primary` | the projection gap in this league's scoring | "+3.2 projected points" |
| `supporting` | independent evidence that agrees | targets up 3.5 -> 10.0 a game over the last 3; red-zone work; matchup |
| `caveat` | independent evidence that disagrees, or a limitation | steadiness flag, injury designation, snap/route data unavailable |
| `context` | true but does not move the call | environment, team system |

and one **weight** for `supporting` and `caveat` rows only: `strong`, `moderate`, `slight`, from per-category
thresholds on the underlying number (tables live next to the classifier and are unit-tested; any change is a version bump
of this spec). Display order: `decisive`, `primary`, `supporting` (strong first), the single strongest `caveat`, then
nothing else in the headline (the rest stays in the expandable evidence list).

### Also considered

`also_considered`: up to 3 other players who could take the same slot, ordered by projected points, each with:
`player`, `gap_vs_chosen` (points, signed), and `why_not` = the one reason from the same model that ranks highest
against that player (usually the projection gap, or availability). Shown only when at least one real candidate exists;
absent otherwise. Candidates already come out of the optimizer's ranking, so no new data source is needed.

## Contract changes (additive, optional)

- `why_statements[]` gains `role` (enum above) and `weight` (`strong|moderate|slight`, only on supporting/caveat).
- New optional `also_considered[]` on the Start/Sit detail and on `recommendation.explanation` of the Omen brief.
- No existing field changes meaning; `why`, `why_it_matters`, `alternatives` stay as they are. Old clients ignore the new
  fields. Recorded with `contracts.js lock` (no `--accept-breaking`), fixtures re-recorded.

## What the app can build from it (UX lane)

A card with: **Why** (the `decisive`/`primary` line, large), **Backed by** (up to two `supporting`, strong first, each
tagged with its weight), **Watch** (the one `caveat`), and an **Also considered** row (swipeable chips: player, gap,
one-line why-not). Everything else stays behind "See all evidence". Every CTA label should name what it does
("See all evidence", "Compare with Roschon") rather than a generic "Learn more".

## Build plan (after sign-off)

1. Classifier + thresholds as a pure function with tests (no I/O). Replaces the category tiering inside
   `evidenceWhy.js`; the existing three-statement behaviour is the fallback when roles cannot be computed.
2. `also_considered` from the optimizer's candidate ranking (Start/Sit and Omen call).
3. Wire into `startSitDetail.js` (not protected) and the brief builder (protected: founder approval).
4. Contract schemas, fixtures, lock; device check that old and new clients both render.

## Open questions

1. Which CTAs on which screens did not match what the feature does? (Names and screens, so the labels can be fixed.)
2. Approve touching the protected brief builder for the additive fields?
3. Threshold taste: is "targets up 3.5 -> 10.0 a game" a *strong* signal to you, or should strong need more?
