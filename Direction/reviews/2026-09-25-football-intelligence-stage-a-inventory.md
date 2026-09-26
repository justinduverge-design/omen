# Football intelligence Stage A inventory

**Date:** 2026-09-25

**Purpose:** Evidence record for the architecture gate. This is an inventory and plan,
not an implementation claim.

**Review update 2026-09-26:** Architecture boundaries are complete enough for founder
review, but Gate A is **HOLD**. Source admission found unresolved upstream rights and
current-week freshness. Exact receipts are in
`Blueprints/specs/football-data/omen-football-intelligence-architecture-v1.md`.

## Current facts

- The existing `src/services/footballData` pipeline is A7B scoring-data infrastructure.
  It captures exact nflverse `stats_player`, `stats_team`, and `schedules` releases,
  validates them, and produces scoring acceptance/correction/recovery evidence.
- `src/services/footballDataFacts.js` is an A7B-to-A6 scoring canonicalization adapter;
  it is not a general football-intelligence fact model.
- The research catalog identifies `pbp_participation`, `ftn_charting`, schedules,
  snap/depth/roster data, and player crosswalks as inputs to a future intelligence
  system. No source publishes a canonical “scheme” label.
- `pbp_participation` from 2023 onward is post-season data, not an in-season feed; no
  2026 asset exists in the reviewed release. It cannot support a current-week slice.
- Current `players.csv` contains GSIS/PFR/PFF/OTC/ESPN/smart IDs, not Yahoo or Sleeper
  IDs. The earlier research statement that one row solved all three fantasy-provider
  crosswalks is disproven by the current header.
- FTN charting/participation carry CC BY-SA 4.0 plus named attribution. The schedules
  upstream repository exposes no license, and nflverse's paid-product licensing question
  remains unanswered. Customer use is blocked pending a rights receipt/legal review.
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

## Architecture decisions ready for founder review

1. Immutable, content-addressed source/derived artifacts are replay authority;
   Supabase/Postgres is only the compact identity, metadata, publication, and serving
   projection tier.
2. Corrections create superseding versions and never rewrite prior bytes or effective
   intervals. Source, canonical, derivation, and publication versions are independent.
3. Omen internal IDs are canonical. Every external-ID link is an effective-dated,
   sourced assertion; conflicts fail closed. Coach names are aliases, not identities.
4. The first customer slice is a bounded coach-transfer System Signal. It describes
   association/similarity only and carries evidence, coverage, freshness, limitations,
   and `what_could_change_this`.
5. `available` is forbidden until minimum samples, coverage denominators, freshness
   SLA, source rights, and publication state are accepted and satisfied.

## Proposed implementation sequence after approval and source admission

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

## Unresolved decisions / blockers

1. Rights: obtain a defensible commercial-use/attribution receipt for schedules and
   decide how CC BY-SA applies to features, evidence, and customer outputs from FTN.
2. Freshness: choose an in-season tactical denominator. `pbp_participation` cannot fill
   that role from 2023 onward; FTN charting coverage must be measured before use.
3. Identity: name authoritative Yahoo/Sleeper player-ID sources and a stable coach-ID
   source; current nflverse players/schedules do not supply them.
4. Evidence thresholds: approve minimum games, plays, charted-play coverage ratio,
   comparison-window rules, freshness SLA, and dispute behavior. No number is inferred.
5. Founder decisions: accept or revise the Supabase/artifact boundary, first
   coach-transfer slice, and meanings of Scheme DNA, Coaching Tree, and System Signal.

## Gate result

Stage A is **reviewed but not approved**. Stage B remains prohibited. The next smallest
safe step is a source-admission/legal-freshness decision pass, then founder review of the
five architecture decisions above. It is not SQL, a route, a package, a schedule, or a
production-host change.
