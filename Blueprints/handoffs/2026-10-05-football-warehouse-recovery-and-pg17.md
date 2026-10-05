# Football warehouse recovery contracts and PostgreSQL 17 proof — 2026-10-05

## State

Repository implementation only. No command has been run on `omen-prod`, KVM2, a Raspberry Pi, Supabase, or another live system. The existing warehouse PR remains open and unmerged.

## Completed in this checkpoint

- Added a fail-closed backup-manifest verifier that binds the dump checksum and byte size to the required football-table row counts and ingest-receipt state.
- Distinguished local checksum verification from an independently restored backup. A `restored_verified` receipt requires an isolated restore, matching schema version, matching row counts and receipt counts, and successful representative queries.
- Added machine-readable watchdog evaluation for database, worker, backup freshness, ingest freshness, restore-proof freshness, dangling receipts, checksum evidence, and disk policy. Restore freshness is bound to the validated backup run and dump hash.
- Removed the guessed disk threshold. Health requires a fresh filesystem-capacity measurement plus a policy bound to the validated manifest's exact dump size; restore headroom must cover that dump. KVM2 retention still waits for measured Restic size.
- Wrote separate incident paths for a dead `omen-prod` host, full disk, stopped PostgreSQL container, corruption/source mismatch, stuck ingest, and unavailable KVM2 repository.
- Added a disposable PostgreSQL 17 integration proof for team-week, weekly-roster, and play-by-play writers: initial write, idempotent rerun, exact-source correction, bounded failure receipt, preservation of prior good facts, and zero dangling `started` receipts.
- Added team-week staging integrity: season/week/type/participants/scores must match the bound game before old season facts can be replaced.

## Founder direction retained

- Supabase remains Tuesday's serving source while the real warehouse runs on `omen-prod` in shadow.
- Promotion is proof-driven: Supabase to shadow to warehouse-primary, with Supabase rollback, followed later by a separately rehearsed Step-14 retirement.
- Current season is commissioned first; historical backfill follows in chronological order from 1999 through 2026.
- Omen QB Efficiency (OQBE) is the user-facing name.
- Retention is sized from measured KVM2 capacity and measured compressed backup size.
- Recovery objectives and actions are scenario-specific.

## Verification

- `node --test test/footballWarehouseCurrentSeasonFamilies.test.js test/footballWarehouseRecoveryContracts.test.js`
- `warehouse/test/run-remaining-fact-writers.sh`
- JavaScript syntax checks, shell syntax checks, and `git diff --check`
- Full `npm test`: 2022 passed, 0 failed.

## Still unproven / next authority boundary

- No real warehouse container, data, shadow reads, backup, restore, monitor, disk measurement, or KVM2 retention measurement exists yet.
- Before any live action, present the exact read-only and mutating command scope for founder authorization. Do not infer authorization from this handoff.
- Commission `omen-prod`, load the current season, and run Supabase-versus-warehouse shadow proofs in parallel with backup/restore and monitoring proofs.
- Only after those proofs pass may the read source be promoted. Step 14 remains a separate rehearsal/approval/removal operation.
