# Handoff — A7B Phase 4 production-readiness execution

**Date:** 2026-08-26  
**Branch:** `codex/a7b-phase4-production-readiness`  
**Head:** `8bb6220` (activation evidence follows)
**State:** complete — controlled correction rehearsal, A4, publication, and production scoring activated

## Completed on the approved hosts

- KVM1 collector/validator runs from a digest-pinned image with numeric `omen-football` UID/GID, dropped capabilities, `no-new-privileges`, read-only root filesystem, and only the dedicated state root writable.
- Command Center witness uses Python's standard library only. Its forced-command status bridge, dataset witness, Phase 3 exact-hash attestation, and seven payload-free alert paths are installed and active.
- All seven live alert/recovery exercises passed. Collection/validation/witness timers are active; the guarded publication-decision timers were enabled only after zero-blocker readiness.
- Backup snapshot `a37d7779361dabdf689f5a2402d9dcefb047eba570eff42806d8c9ab7f09e860` contains the exact Phase 3 acceptance hash. A verified Restic restore into a new KVM1 root followed by a hardened fresh-root recovery passed with matching Command Center attestation. Backup timer is active.
- Real upstream schedule provenance changed, but its exact accepted replay had zero changed subjects, so correction correctly returned `no_change` and remained non-publishing.
- A subsequent genuine schedules revision (`0b5478…`) was captured and validated both in a new isolated KVM1 correction root and in the live non-publishing collector. Its candidate acceptance (`9ffb4430…`) also had zero changed subjects. The live status export is restored to `pass`; no correction was fabricated.
- With explicit founder authorization, the narrowly scoped production compatibility migration `sql/2026-08-26_a6_scoring_contract_production.sql` was rollback-preflighted and applied. It added only the previously absent cron-read contract fields; no rows, policies, functions, triggers, or production scoring state were changed.
- The hardened disposable A4 runner read one real pending production row with `OMEN_CRON_DRY_RUN=true`, exact Phase 3 artifact binding, zero attempted/completed writes, and passing Standard, Half-PPR, PPR, and independent-reference comparisons. API and cron were healthy; all collection, validation, retry, correction, and backup timers are enabled and active.

## Final activation result

The final evaluator returned `ready_for_founder_approval` with zero blockers after the founder-approved controlled fixture. Publication was then activated through the exact Phase 3 witness observation, and production scoring was enabled in the running cron container.

## Nonclaims and resume order

Publication control is present, both publication-decision timers are active, and one immutable publication receipt exists for the exact Phase 3 hash. Production scoring is enabled in the running cron container. Nothing was merged to `main` or deployed as a new application cron image. The only production database mutation was the approved compatibility DDL described above; both A4 runs attempted and completed zero writes.

The temporary correction monitor was deleted after the controlled rehearsal passed. Future upstream corrections remain subject to the existing immutable correction rules.
