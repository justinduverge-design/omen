# Football-data staging-shadow runbook

## Purpose and boundary

Use this procedure to stage and recover one exact Phase 2 acceptance artifact
against local role directories. It never contacts or mutates KVM1, the Command
Center Pi, a database, or production. Do not substitute production paths.

## Prerequisites

- Run from the Omen repository root with the repository's Node.js runtime.
- Have exact readable `acceptance.json` and `receipt.json` paths from Phase 2.
- Confirm the receipt-bound artifact first:

```bash
node scripts/validate-football-acceptance.js --acceptance <exact-acceptance-path> --receipt <exact-receipt-path>
```

Expected: status passes with zero offensive, kicker, and DST mismatches. Stop on
any read, hash, schema, scope, quality, scoring, or publication error.

## Stage one artifact

Create a dedicated temporary drill directory, then use four sibling roles:

```bash
mktemp -d /private/tmp/omen-football-phase3.XXXXXX
node scripts/football-data-staging.js stage --acceptance <exact-acceptance-path> --receipt <exact-receipt-path> --primary-root <drill-root>/kvm1-primary --witness-root <drill-root>/pi-witness --backup-root <drill-root>/backup
```

Expected: `status: staged`, one acceptance SHA-256, explicit primary/backup
evidence paths, a witness observation path, a staging receipt path, and
`publication_authorized: false`.

Failure handling:

- `witness_hash_mismatch`: quarantine; do not recover or promote.
- `witness_unavailable`, `source_stale`, or `disk_low`: hold and investigate.
- `ROLE_ROOT_OVERLAP`, `UNSAFE_ROLE_ROOT`, or `UNSAFE_ROLE_PATH`: choose new,
  dedicated sibling directories; never weaken the path guard.
- Hash/schema/quality errors: quarantine the input and return to Phase 2.

## Exercise failure behavior

```bash
node scripts/football-data-staging.js drill --acceptance <exact-acceptance-path>
```

Expected: schema `omen-football-failure-injection.v1`, mode
`synthetic_failure_injection`, status `pass`, seven named scenarios, and both
publication and promotion false. These are synthetic controls, not provider or
remote-host incidents.

## Recover a fresh primary

Use the exact hash and witness path printed by `stage`:

```bash
node scripts/football-data-staging.js recover --hash <acceptance-sha256> --backup-root <drill-root>/backup --recovery-root <drill-root>/recovered-kvm1 --witness-observation <exact-witness-observation-path>
```

Expected: `status: recovered`, `witness_status: match`, exact recovery paths,
and publication/promoted false. A mismatch must fail with `WITNESS_MISMATCH`.

## Verification

```bash
shasum -a 256 <exact-acceptance-path> <drill-root>/kvm1-primary/evidence/<acceptance-sha256>/acceptance.json <drill-root>/backup/evidence/<acceptance-sha256>/acceptance.json <drill-root>/recovered-kvm1/evidence/<acceptance-sha256>/acceptance.json
node --test test/footballDataStagingShadow.test.js
```

Expected: all four hashes identical and the focused suite green.

## Rollback and cleanup

Nothing is promoted, so rollback is stopping the procedure and retaining the
drill directory for diagnosis. After evidence has been recorded and no longer
needs local inspection, the operator may move that exact temporary drill root to
Trash. Never recursively delete an unresolved or broad path.

## Escalation

Escalate any unexplained derived change, witness mismatch, immutable conflict,
schema drift, repeated source loss, or recovery hash mismatch. Separately obtain
founder approval before remote-host provisioning, live alert delivery, timers,
deployment, production storage, publication, or scoring enablement.

## History

- 2026-08-25: v1 added with Phase 3 local staging, failure, and recovery proof.
