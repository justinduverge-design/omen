# Omen football-data production readiness v1

**Status:** Phase 4 local implementation and exact-host read-only evidence

**Authority:** founder-directed `A7B-OwnedFootballDataPipelineImplementation`

**Production effect:** none. No host, secret, service, timer, database, publication, deployment, or scoring state is changed by this contract.

## Immutable starting point

Phase 4 is bound to Phase 2/3 acceptance SHA-256
`5c4cbc0568ce85a94512b7722144a7cddcb83fe74bd088f04d90f7a628a00bea`.
The source set remains the exact rights-reviewed nflverse `stats_player`,
`stats_team`, and `schedules` manifests. `latest` aliases, a new source, a new
dependency, ADP, database storage, and publication are unavailable.

The readiness evaluator emits `omen-football-production-readiness.v1`. A pass
means only that all evidence needed to ask for the founder's final activation
decision exists. It never authorizes a mutation by itself.

## 1. Safe preparation and read-only checks

Required evidence:

- clean isolated worktree and exact base commit;
- KVM1 and Command Center identity, OS, disk, memory, supervision, runtime, and
  candidate-root presence without opening environment or credential files;
- exact Phase 3 hash, failure matrix, correction candidate, and fresh-primary
  recovery receipt;
- current publication and production-scoring flags remain disabled.

Stop on an unexpected hostname, unreachable host, non-running system state,
KVM1 free space below 30 GiB, Command Center free space below 10 GiB, an
unreadable source receipt, or any hash drift.

## 2. KVM1 provisioning

Target role: primary collector, immutable store, normalizer, validator, and
scoring-acceptance runner. Proposed root:
`/var/lib/omen-football-data`.

The reviewed implementation must:

- keep raw bytes and manifests immutable and content-addressed;
- use the Phase 1–3 schemas and exact-manifest interfaces unchanged;
- run through a digest-pinned container because KVM1 has Docker but no host
  Node runtime;
- set a numeric non-root container UID/GID explicitly, use
  `no-new-privileges`, drop capabilities, and mount only the dedicated data
  root writable;
- keep collection, publication, and scoring controls separate;
- add the immutable evidence root to the existing encrypted backup scope only
  through a separately approved backup-config change.

The currently running `omen_cron` container is not an acceptable implicit
security baseline: read-only inspection found its configured user blank and
its processes running as root. Phase 4 must not inherit that behavior.

## 3. Command Center Pi witness and backup

Target role: independent hash/freshness witness, provider-diverse current-data
copy, backup-freshness observer, and notification source. Proposed root:
`/var/lib/omen-football-witness`.

The witness uses the Pi's existing Python 3, curl, and SHA-256 tools; it does not
add Node or a package dependency. It independently fetches the exact admitted
assets, preserves the current two compressed snapshots per dataset, and
compares its observed hashes with a payload-free KVM1 status export. It has no
publication, scoring, restart, deployment, or remediation authority.

KVM1 status access must use a dedicated least-privilege read path. Creating a
key, forced command, account, or authorization entry is secret/access-control
work and therefore requires a separate exact action approval.

## 4. Live monitoring and alerts

All seven alert classes are mandatory:

1. `job_failure`
2. `source_loss`
3. `schema_drift`
4. `stale_data`
5. `disk_low`
6. `witness_mismatch`
7. `witness_outage`

The existing Command Center dispatcher is notification-only and remains so.
Football-data integration must preserve signature deduplication, retry a failed
delivery by persisting state only after delivery, emit one recovery notice, and
exclude raw rows, source bytes, URLs carrying credentials, environment values,
and secret material. A live controlled failure and recovery must be observed
for every alert family before readiness can pass.

## 5. Scheduling and service supervision

All schedules use `America/New_York` explicitly and also record UTC:

| Job | Schedule | Authority |
|---|---|---|
| Daily capture, Sep–Feb | 05:15 daily | collection only |
| Sunday completeness | Monday 05:30 | validation only |
| Post-MNF capture | Tuesday 05:15 | collection only |
| Normalize/derive/validate | Tuesday 05:30 | no publication |
| Independent witness | Tuesday 05:45 | observation only |
| Publication decision | Tuesday 06:00 | remains disabled |
| Bounded retries | Tuesday 06:15, 06:45, 07:30 | unavailable/unchanged source only |
| Correction capture/replay | Thursday 05:15 | candidate only |
| Correction decision | Thursday 06:00 | remains disabled |

Services must use systemd one-shot units with explicit timeout, failure state,
resource and filesystem restrictions, persistent timer catch-up, randomized
delay only where it cannot reorder the Tuesday chain, and no automatic
remediation. Units are installed disabled first, validated, manually exercised,
then activated only after a separate approval.

## 6. Correction and recovery rehearsal

The real-host rehearsal must prove:

- a changed upstream hash creates a new immutable snapshot and correction
  candidate with `supersedes` and changed subjects;
- schema drift quarantines without overwriting the prior accepted artifact;
- backup contains the exact primary evidence hash;
- a fresh KVM1 recovery root starts empty and receives exact backup bytes only
  after a matching Command Center observation;
- recovered acceptance bytes equal
  `5c4cbc0568ce85a94512b7722144a7cddcb83fe74bd088f04d90f7a628a00bea`;
- publication and scoring remain false throughout.

The rehearsal uses isolated roots and no SQL or database writes.

## 7. A4 no-write acceptance

A4 is accepted only when one controlled production-host run:

- sets the existing explicit dry-run mode for that process only;
- reads at least one real pending move row;
- attempts and completes zero archive or scoring writes;
- independently compares Standard, Half PPR, and PPR;
- proves readiness and cron health;
- cites passing correction, backup, and recovery rehearsals;
- leaves persistent `OMEN_CRON_SCORING_ENABLED=false`;
- leaves publication disabled.

The command requires existing production credentials. Running it is therefore
both secret handling and a production read, and needs exact action approval even
though its behavior is no-write.

## 8. Final production-activation gate

The evaluator remains blocked until KVM1 and Command Center provisioning, all
seven live alert proofs, schedules/supervision, backup/correction/recovery, and
A4 no-write acceptance pass.

Activation is split into three independently approved actions:

1. enable collection/validation and observe one shadow week;
2. enable publication only after a separate founder authorization;
3. enable production scoring only after another explicit founder authorization.

Rollback disables publication and scoring first, then collection if required,
without deleting or rewriting any immutable evidence. No readiness receipt,
test result, agent, timer, or service may authorize activation on the founder's
behalf.

## Local evaluator

```bash
node scripts/football-data-readiness.js assess \
  --evidence Direction/reviews/evidence/2026-08-25-a7b-phase4/host-inspection.json
```

The sanitized input schema contains no credential values. The expected initial
result is `blocked` because provisioning, live alert delivery, schedules,
backup/correction/recovery, and A4 have not run.

