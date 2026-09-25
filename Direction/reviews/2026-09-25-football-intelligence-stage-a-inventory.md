# Football intelligence Stage A inventory

**Date:** 2026-09-25

**Purpose:** Evidence record for the architecture gate. This is an inventory and plan,
not an implementation claim.

## Current facts

- The existing `src/services/footballData` pipeline is A7B scoring-data infrastructure.
  It captures exact nflverse `stats_player`, `stats_team`, and `schedules` releases,
  validates them, and produces scoring acceptance/correction/recovery evidence.
- `src/services/footballDataFacts.js` is an A7B-to-A6 scoring canonicalization adapter;
  it is not a general football-intelligence fact model.
- The research catalog identifies `pbp_participation`, `ftn_charting`, schedules,
  snap/depth/roster data, and player crosswalks as inputs to a future intelligence
  system. No source publishes a canonical “scheme” label.
- The repository has Supabase-backed application tables, but no football-intelligence
  SQL schema, route, read model, or RLS contract.
- The server mounts existing customer routes but no football-intelligence router.
- The production-readiness evaluator is fail-closed and keeps collection, publication,
  and scoring activation as separate approved actions. That evaluator must not be
  mistaken for a completed intelligence ingestion lifecycle.

## Architecture gap statement

The missing work is not merely “wire a route.” The product path is incomplete between
source observations and customer explanation:

```text
admitted source -> canonical fact/dimension -> derived output -> published read model
                -> API state contract -> decision-surface explanation
```

The Stage A architecture document closes the design boundary without claiming that any
of those new components have been implemented.

## Proposed implementation sequence after approval

1. Artifact registry and source receipts.
2. Identity/dimension and minimum canonical fact persistence.
3. Feature windows with time-safe joins.
4. Scheme DNA and Coaching Tree derivations.
5. System Signal and evidence bundles.
6. Versioned serving read model.
7. Read-only authenticated API with honest states.
8. One customer decision-surface vertical slice.
9. Operational freshness/correction/rollback gates.

The first slice should remain narrow: a coach-transfer System Signal over a bounded
historical window, with Scheme DNA and Coaching Tree as evidence rather than a broad NFL
scheme classifier.

## Explicit exclusions from this Stage A commit

- No SQL migrations.
- No API route or server wiring.
- No npm dependency.
- No production host, secret, timer, backup, or Supabase mutation.
- No changes to A7B scoring behavior.
- No assertion that a scheme label is an observed source fact.

## Review questions

1. Is Supabase/Postgres the approved serving store while immutable source/derived bytes
   remain artifact-backed?
2. Is the first customer signal the coach-transfer comparison described above?
3. Which minimum source slice is admitted for Stage B: schedules plus
   `pbp_participation`, with `ftn_charting` as coverage-limited enrichment?
4. What minimum sample/coverage threshold is required before a signal is available?
5. Are the proposed public names and their semantics approved?

