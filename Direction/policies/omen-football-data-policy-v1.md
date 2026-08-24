# Omen Football Data Policy v1

**Audience:** Founder and product leadership
**Status:** Adopted by founder — 2026-08-24
**Date:** 2026-08-24
**Purpose:** establish the decisions that must guide Omen football data before technical collection or production scoring is authorized.

## The decision in one sentence

Omen will use football data only when it can do so lawfully, explain the result to a user, and reproduce the result later from preserved evidence.

Fast data that cannot meet those standards is not an acceptable substitute.

## 1. What Omen may store

For a recommendation Omen may retain:

- the recommendation itself and when it was made;
- the league and scoring rules that applied at that time;
- the completed-game facts used to evaluate it;
- the source snapshot, calculation version, and final grade used to reach the outcome.

Omen keeps three separate layers:

```text
Original source record  →  Omen's organized football record  →  Omen's scored result
```

The original source record is preserved unchanged. Omen’s organized record makes players, games, teams, and aliases consistent. The scored result applies a stated scoring formula. A later correction creates a new version; it does not silently rewrite history.

## 2. How Omen obtains football data

Source rights are a starting requirement, not legal cleanup after a system has been built.

Omen may automate only a source whose licence and terms clearly allow the intended commercial use, automated retrieval, storage, and derived results. A public webpage or an undocumented endpoint is not permission.

At present, the approved design direction is a narrow, attributed set of openly licensed nflverse release assets needed for completed-game scoring. Omen will not use ESPN as an independent stats warehouse, use Sleeper commercially without written permission, or treat an unclear source as a temporary emergency fallback.

If the lawful source is unavailable, Omen leaves the relevant week pending and tells operations. It does not invent a result, silently use stale data, or switch to an unapproved source.

## 3. How Omen organizes the relationship

Every graded recommendation must be traceable through this chain:

```text
League rules at recommendation time
        ↓
Recommendation for that league
        ↓
Approved completed-game data version
        ↓
Named Omen scoring formula version
        ↓
Auditable result for the user
```

The league rules are part of the recommendation record, not a later guess. A Standard, Half PPR, or PPR recommendation must be graded under the format that applied when Omen made it. Historical records that predate this capability may use the documented PPR compatibility rule, and must remain identifiable as historical.

## 4. What must be true before a weekly result is used

Before a completed-week result can be used for scoring, Omen must be able to show that:

1. the source was approved for this purpose;
2. the received source record is complete and unchanged from its recorded hash;
3. the player and game identities resolve unambiguously;
4. Standard, Half PPR, and PPR results follow the stated formula;
5. the result passes an independent validation check appropriate to the source set; and
6. the version used is recorded with the grade.

If any one of these checks fails, Omen quarantines the result rather than publishing a grade.

## 5. Roles of the systems

- **Omen primary server:** collects approved data, organizes it, calculates results, and keeps the durable audit record.
- **Independent witness device:** verifies the source record hash, freshness, and publication evidence from a separate machine.
- **Omen application:** reads only approved result versions when it grades a recommendation.

This separation means the app is not grading from a mutable download or an unexplained live API response.

## 6. What this policy does and does not authorize

This policy establishes Omen’s product and data-governance direction. It does **not** by itself authorize:

- a collector or scheduled timer;
- a production deployment, database change, or data migration;
- a provider account, credential, paid subscription, or commercial licence;
- scraping or use of a source with unclear terms;
- production Tuesday scoring enablement; or
- an ADP product or corpus.

Each technical phase still needs its own scoped approval and evidence. The immediate A6 database change follows the separate sequence: review → staging application → verification → later production approval. The scoring flag remains off until all A4 gates are met.

## 7. Founder checkpoints

Before Omen moves from design into operation, the founder should receive one short decision record for each checkpoint:

| Checkpoint | Founder question |
|---|---|
| Source rights | Is this exact source and use case clearly lawful and aligned with Omen’s standards? |
| Data contract | Do we know exactly what Omen stores, how long it keeps it, and how a result is explained? |
| Staging proof | Has the system handled real-like data, corrections, missing data, and failures without producing an untrustworthy grade? |
| Production enablement | Are monitoring, rollback, source-loss behavior, and the human operating owner proven? |

## Related evidence

- Technical source, architecture, operations, and replay evidence: `Direction/reviews/2026-08-24-a7-owned-football-data-pipeline.md`
- Recommendation-time league scoring correction and review-only schema source: `sql/2026-08-24_a6_moves_scoring_format_review.sql`
- Tuesday scoring gates: `Direction/current_sprint.md` (`A4`, `A6`, and `A7`)

## Adoption record

Founder approved this policy on 2026-08-24. Adoption establishes the governance direction only; it does not authorize any action listed in section 6. Any exception must be explicit, dated, scoped, and recorded in `Direction/decision_log.md`.
