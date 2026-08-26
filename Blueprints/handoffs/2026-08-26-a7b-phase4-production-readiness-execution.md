# Handoff — A7B Phase 4 production-readiness execution

**Date:** 2026-08-26  
**Branch:** `codex/a7b-phase4-production-readiness`  
**Head:** `d2d327f`
**State:** infrastructure, recovery, and live A4 no-write execution proven; final activation fail-closed

## Completed on the approved hosts

- KVM1 collector/validator runs from a digest-pinned image with numeric `omen-football` UID/GID, dropped capabilities, `no-new-privileges`, read-only root filesystem, and only the dedicated state root writable.
- Command Center witness uses Python's standard library only. Its forced-command status bridge, dataset witness, Phase 3 exact-hash attestation, and seven payload-free alert paths are installed and active.
- All seven live alert/recovery exercises passed. Collection/validation/witness timers are active; publication-decision timers remain disabled.
- Backup snapshot `a37d7779361dabdf689f5a2402d9dcefb047eba570eff42806d8c9ab7f09e860` contains the exact Phase 3 acceptance hash. A verified Restic restore into a new KVM1 root followed by a hardened fresh-root recovery passed with matching Command Center attestation. Backup timer is active.
- Real upstream schedule provenance changed, but its exact accepted replay had zero changed subjects, so correction correctly returned `no_change` and remained non-publishing.
- A subsequent genuine schedules revision (`0b5478…`) was captured and validated both in a new isolated KVM1 correction root and in the live non-publishing collector. Its candidate acceptance (`9ffb4430…`) also had zero changed subjects. The live status export is restored to `pass`; no correction was fabricated.
- With explicit founder authorization, the narrowly scoped production compatibility migration `sql/2026-08-26_a6_scoring_contract_production.sql` was rollback-preflighted and applied. It added only the previously absent cron-read contract fields; no rows, policies, functions, triggers, or production scoring state were changed.
- The hardened disposable A4 runner read one real pending production row with `OMEN_CRON_DRY_RUN=true`, exact Phase 3 artifact binding, zero attempted/completed writes, and passing Standard, Half-PPR, PPR, and independent-reference comparisons. API and cron were healthy; all collection, validation, retry, correction, and backup timers are enabled and active.

## Current hard stops

1. The real upstream revision did not change any accepted subject, so the required nonzero-subject correction rehearsal has not occurred. Do not synthesize one.

The final evaluator is intentionally `blocked` only by correction proof: `correction_rehearsal_unproven` and its dependent `a4_correction_unproven`.

## Nonclaims and resume order

Publication marker is absent, publication-decision timers are disabled, and production scoring remains disabled. Nothing was merged to `main` or deployed as the application cron image. The only production database mutation was the approved compatibility DDL described above; A4 attempted and completed zero writes.

The daily heartbeat `monitor-omen-football-correction-gate` now checks for an authentic changed-subject upstream revision. On one, run the correction candidate against an isolated root, prove a new immutable snapshot with `supersedes` and nonzero changed subjects while publication/scoring remain false, update the A4 evidence from `correction_rehearsal: no_change` to `pass`, then re-run the readiness evaluator before considering publication or production scoring.
