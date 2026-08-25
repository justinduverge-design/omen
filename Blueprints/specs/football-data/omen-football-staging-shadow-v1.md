# Omen football-data staging shadow v1

**Status:** Phase 3 local evidence contract  
**Authority:** `ATA-20260825-02`  
**Production authority:** none

## Purpose

Prove that one exact Phase 2 acceptance artifact can be preserved, witnessed,
alerted, corrected, and recovered before Omen enables any production scoring.
The roles model KVM1 primary storage, a Command Center Pi witness, a backup, and
a fresh KVM1 recovery target, but Phase 3 runs them only as disjoint local roots.

## Required invariants

- Input is one receipt-bound `omen-football-scoring-acceptance.v1` artifact.
- Primary, witness, backup, and recovery roots are explicit, dedicated, disjoint,
  symlink-safe local paths. Production vault paths are refused by the Phase 1
  guard; filesystem root, home, and the working directory are also refused.
- Acceptance evidence is addressed by its exact SHA-256 and is immutable.
- A witness match permits `staged`; a mismatch quarantines; an unavailable
  witness holds. None of these states authorizes publication.
- Source age above 36 hours and free disk below 2 GiB emit high alerts and hold.
- Source loss remains pending with no fallback. Schema drift quarantines.
- A correction must retain exact scope and rulesets, cite the prior artifact as
  `supersedes`, use a different source bundle, and enumerate changed subjects.
- Recovery reads exact backup bytes into a fresh root only after an exact witness
  observation matches the requested artifact hash.
- Every receipt records publication and promotion as false.

## Evidence schemas

- `omen-football-staging-shadow.v1`: validation, role state, health, alerts, and
  optional correction candidate.
- `omen-football-witness-observation.v1`: expected/observed hash and
  match/mismatch/unavailable state.
- `omen-football-primary-recovery.v1`: source/target roles, witness match, and
  recovered artifact hash.
- `omen-football-failure-injection.v1`: labeled synthetic source-loss,
  schema-drift, witness, freshness, capacity, and correction scenarios.

## Deliberate non-claims

This contract does not provision or contact KVM1 or the Command Center Pi. It
does not install a service or timer, deploy code, create a database, schedule a
collector, enable scoring, publish output, or establish live alert delivery.
Those actions require separate exact-host and production approval.
