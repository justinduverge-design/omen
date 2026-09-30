# Omen Rebuild — Cutover Runbook (working draft)

Built 2026-09-30. Steals from proven industry practice (expand/contract pattern,
production cutover checklists); adapted for the Omen rebuild. Sections marked
[CLIENT] are the parts that become the Valor Ventures client template.

## Principles

1. **Expand/contract is the proven pattern for live databases.** Never ship a
   single migration that both changes shape AND requires new code at the same
   time. Additive changes first (new tables/columns nullable or defaulted),
   app code migrated, old shape dropped in a later step. [CLIENT]
2. **Omen exception (documented):** Omen is pre-launch beta with a tiny user
   base, so a rehearsed big-bang cutover in a quiet window is acceptable.
   For any client with live traffic, use expand/contract — no exceptions. [CLIENT]
3. **Migrations are code.** Reviewed, tested up AND down on scratch, re-applied
   to prove idempotency (up → suite → down → up). CI enforces this. [CLIENT]
4. **No prod touch without a green rehearsal and a tested rollback.** Not a
   guideline — a go/no-go gate.

## Phase 3 — Migration package rehearsal (before any cutover talk)

- [ ] All work-order migrations assembled in dependency order in one package.
- [ ] Full package run UP on a scratch database seeded with production-like data.
- [ ] Full test suite green against the migrated scratch database.
- [ ] Full package run DOWN; schema verified back at baseline.
- [ ] Full package run UP again (idempotency proof).
- [ ] Repeat until three consecutive runs are green and uneventful.
- [ ] Rollback drill: practice the full rollback procedure on scratch, timed.

## Pre-cutover checklist (T-24h) — ALL must be green, any red = no-go

- [ ] Fresh production backup completed AND verified restorable (isolated
      restore, checksums match — same bar as the WO-15 backup proof).
- [ ] Backup decryption/access confirmed by the person doing the cutover.
      A backup you cannot read is not a backup.
- [ ] Rollback procedure tested on scratch (see above), steps written down,
      accessible offline.
- [ ] Migration package rehearsal: 3 consecutive green runs on record.
- [ ] Go/no-go decision made explicitly. Silence is not a go.

## Cutover sequence

### T-30 min — Preparation
1. Verify backup exists and is fresh.
2. Open monitoring (dashboard showing Unhealthy is already a known issue —
   note baseline before starting).
3. Confirm rollback steps are at hand.
4. Announce "cutover starting" (for Omen: Justin; for clients: stakeholders).

**GO/NO-GO #1** — all prep checks passed? No = abort, reschedule.

### T-0 — Execute
1. Apply migration package to production (`psql -v ON_ERROR_STOP=1` —
   stop on first error, never continue past one).
2. Verify schema: table count, key constraints, RLS policies present.
3. Run smoke tests: the app's critical paths (login, league view, move
   creation, decision display).

**GO/NO-GO #2** — smoke tests green? No = rollback immediately, investigate.

### T+30 min — Watch
1. Monitor logs for 5xx / constraint violations for 30 minutes.
2. Spot-check data: row counts on migrated tables vs. pre-cutover snapshot.
3. Confirm the app behaves normally end to end.

### Rollback — two tiers
- **Fast rollback (config):** if the app misbehaves but data is intact —
  revert the app to the previous version; schema stays, investigated later.
- **Controlled rollback (data):** if data is wrong — restore the verified
  pre-cutover backup. Accept the data loss window explicitly; do not improvise.

## Post-cutover

- [ ] 24h monitoring watch; any anomaly investigated, not explained away.
- [ ] Consolidation: remove dead code paths, close the rebuild work orders.
- [ ] Write the retro: what the rehearsal caught, what it didn't, what changes
      in the runbook. This is how the client template gets better. [CLIENT]

## Sources stolen from

- Expand/contract pattern: industry-standard zero-downtime migration practice
  (multiple production runbooks; CI-enforced in several).
- Cutover checklist shape (T-24h / T-30m / T-0 / T+30m, go/no-go gates,
  two-tier rollback, "backup you cannot read is not a backup"): standard
  production cutover runbooks.
- Up-down-up validation sequence: migration skill runbooks.
