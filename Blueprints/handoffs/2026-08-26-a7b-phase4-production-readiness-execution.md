# Handoff — A7B Phase 4 production-readiness execution

**Date:** 2026-08-26  
**Branch:** `codex/a7b-phase4-production-readiness`  
**Head:** `184609f`  
**State:** infrastructure and recovery proven; final activation fail-closed

## Completed on the approved hosts

- KVM1 collector/validator runs from a digest-pinned image with numeric `omen-football` UID/GID, dropped capabilities, `no-new-privileges`, read-only root filesystem, and only the dedicated state root writable.
- Command Center witness uses Python's standard library only. Its forced-command status bridge, dataset witness, Phase 3 exact-hash attestation, and seven payload-free alert paths are installed and active.
- All seven live alert/recovery exercises passed. Collection/validation/witness timers are active; publication-decision timers remain disabled.
- Backup snapshot `a37d7779361dabdf689f5a2402d9dcefb047eba570eff42806d8c9ab7f09e860` contains the exact Phase 3 acceptance hash. A verified Restic restore into a new KVM1 root followed by a hardened fresh-root recovery passed with matching Command Center attestation. Backup timer is active.
- Real upstream schedule provenance changed, but its exact accepted replay had zero changed subjects, so correction correctly returned `no_change` and remained non-publishing.

## Current hard stops

1. A4 cannot run: one qualifying pending production row exists, but the approved scorer's read fails because production `moves.scoring` is absent. Applying the reviewed A6 schema is a separately gated Justin action; no SQL was applied.
2. The real upstream revision did not change any accepted subject, so the required nonzero-subject correction rehearsal has not occurred. Do not synthesize one.

The final evaluator is intentionally `blocked` only by `correction_rehearsal_unproven` and `a4_no_write_missing`.

## Nonclaims and resume order

Publication marker is absent, publication-decision timers are disabled, and production scoring remains disabled. Nothing was merged to `main`, deployed as the application cron image, or written to the production database.

After Justin separately applies and verifies the A6 schema, resume by running a process-scoped `OMEN_CRON_DRY_RUN=true` A4 command against the one pending row, recording zero writes and all three scoring-format comparisons. A real upstream change that modifies an accepted subject is also required before the correction gate can pass. Re-run the readiness evaluator before considering publication or production scoring.
