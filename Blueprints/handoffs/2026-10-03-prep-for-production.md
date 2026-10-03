# Handoff — prep for production (database redo), 2026-10-03

**From:** Claude Code (database lane), working the pin in `Direction/agent_inbox.md` and the brief
`Blueprints/handoffs/2026-10-02-prep-for-production-brief.md`.
**To:** the founder (merges and production approvals), then the production-day session.
**Nothing was applied to production.** The only reads of production were read-only and founder-approved:
the migration list, the catalog, and row counts. No row contents and no secrets were read.

## What is ready

| Brief item | Result | Where |
|---|---|---|
| 1. Merge state | #514–#522 merged, Codex findings answered. `main` at `b63404fe` (docs only; last code deploy `e4f8ab16` green). Only #519 open, waiting for step 12 by design | — |
| 2. A2 beta-report filter | PR, red-first tests. Codex P2 (quadratic regex) fixed. Also keys step 09's reports to the sign-in, and `account_erase()` deletes them (found by item 3; Codex P1) | #523 |
| 2. A3 purges scheduled | PR; daily 04:15 ET in the cron container, skips missing functions. dcron passing the env to jobs was proven on KVM1 | #524 |
| 2. A0 connect paths on step 02 | PR. Codex P1 (Yahoo refresh not single-flight before the provider) fixed and answered | #525 |
| 2. A1 deletion on `account_erase()` | PR, stacked on A0. Codex P2 (no app row still owns consent) fixed and answered. Reached `main` through #531 | #526 → #531 |
| 2. A4 step 06 ingest check | PR. Plus Codex P1 from #528 (a purge racing an insert) fixed here too, proven by race 4 | #527 |
| 2. Step 11 scoring-rules compartment | PR, stacked on #527. Codex P1 and two P2s fixed and answered; race 5 | #528 |
| 2. Step 12 saved trades | PR, stacked on #528. The export includes it | #529 |
| 3. Compatibility per step | Table below. One break found and fixed (step 09 beta reports) | below |
| 4. Backup and restore | Newest snapshot `de1d3675` (2026-10-03 00:13) restored to a temp dir; 9 of 9 checksums passed; deleted. Production-day snapshot and rollback steps are in the runbook | runbook |
| 5. Production runbook | One page per step, read-only preflight and verify SQL, and expected catalogs per step | `Blueprints/handoffs/2026-10-03-production-runbook.md`, `sql/2026-10-01-redo/runbook/` |
| 6. Dry run | Restored copy of production on KVM1, all 12 steps in production order with the runbook's own checks: all pass; copy deleted | below |
| 7. Go / no-go | One screen | `Blueprints/handoffs/2026-10-03-production-go-no-go.md` |

## Production as read today (2026-10-03, read-only, founder-approved)

- Newest migration: `20261002231212 drop_league_office`. No change since the snapshot.
- Live catalog equals `production-catalog-2026-10-01.json` (`catalog.js diff`: identical).
- Counts: 7 users, 9 sign-ins, 0 users without a sign-in, 10 connections, 7 leagues, 9 moves (3 scoped,
  6 unscoped), 9 moves with scoring rules (3 of them scoped), 14 Vault secrets, 0 orphaned.

## Compatibility: today's server against each step (brief item 3)

Method: grep `src/` for every table and column a step touches; check the phone and web clients for
direct table access (none in `mobile/` or `frontend/`); then run the export's reads and
`account_erase()` on the migrated restored copy.

| Step | Touches existing | Today's server | Breaks? |
|---|---|---|---|
| 07 | revokes client insert/update on `moves`, `users`, `consent_records`; drops their client write policies | the server writes as `service_role`; no client writes the database directly | no |
| 01 | FK `users.id → auth.users`; adds `users.updated_at` | the only `users` insert is `ensureAppUser`, keyed on the signed-in user's id; deletion removes `users` before the sign-in | no. **Fixes** the export's `users.updated_at` read |
| 02 | adds 4 columns with defaults to `platform_connections` | legacy upserts omit them and get the defaults; `select("*")` readers ignore them | no. With A0, connect and refresh move onto the functions |
| 03 | new tables; memberships FK to `platform_connections` with cascade | disconnect deletes the connection and memberships cascade | no. New connections get no membership until plan A5 |
| 04 | new empty tables | not used | no |
| 06 | new tables | not used | no |
| 11 | new table; reads `moves` once | not used; `moves` untouched | no |
| 12 | new table | not used until #519 moves onto it; the export reads it (#529), empty when absent | no |
| 05 | new tables; the Ledger guard refuses deleting a user who has calls | `/api/user/delete` deletes `users` table by table | **yes, until A1**. Fixed by A1 + step 10, applied back to back |
| 10 | new function | A1 calls it when present | no |
| 08 | deletes the 6 unscoped `moves` | `/api/moves` returns 6 fewer rows for those users | by decision (founder, 2026-10-01); restorable 30 days |
| 09 | new table | the report route never creates an app row; 2 of 9 sign-ins have none | **yes, fixed in #523**: reports are keyed to the sign-in (`auth.users`), so no app row is needed. Creating one in the route was tried first; Codex showed it could recreate an account during deletion |

Not caused by the redo, still open: the export selects `moves.feature` and `moves.updated_at`, which
don't exist (design §7, server ticket "Export").

## Dry run (brief item 6)

The newest backup was restored on KVM1 into the isolated clone (row counts equal the backup's own on all
8 tables). Then `scripts/db/production-order-run.sh` ran steps 07, 01, 02, 03, 04, 06, 11, 12, 05, 10, 08
and 09. For each step:

- the snapshot before;
- the up, timed;
- `runbook/NN.verify.sql` printed `VERIFIED`;
- the snapshot after;
- the catalog change was **identical** to scratch's.

**All 12 passed.** Vault orphans were 0 throughout. Real data gave 7 leagues, 10 memberships, 3 rule sets
(2 ingests), 3 Ledger calls and 6 retired rows.

Each up took 0.6–0.7 s end to end, against a 0.58–0.65 s round trip for an empty query. Each step
holds its locks for well under a second at production's size.

On the migrated copy, inside a rolled-back transaction:
- `account_erase()` erased a real account in one call: 3 consent records and one audit row.
- For an ESPN user whose secrets are not in the copy's Vault, it refused and changed nothing.
- The export's reads of `users` (with `updated_at`), `saved_trades` and `beta_reports` all ran.

The copy, network and files were deleted and confirmed gone.

## V1 for steps 06, 11 and 12, and the connector (real Supabase, 2026-10-03)

The throwaway project `omen-rls-proof-throwaway` was woken (founder-approved), and its prior state
recorded: 1 sign-in, 0 secrets, the 3-row leftover table, and 1 migration history row.

- **Rehearsal.** Production's `rls_auto_enable` function and `ensure_rls` event trigger were recreated
  from production's own definitions (schema text read-only). The snapshot `00b` + `00d` equalled the
  production catalog. Synthetic seed: 7 users, 10 connections, 14 Vault secrets, 9 moves.
  - The 15 step files for 03, 04, 06, 11 and 12 were loaded with their transaction lines stripped. Every
    md5 matched the repo (list in `scripts/db/strip-transaction-lines.sh` output; e.g. 06 up `d1050664…`,
    11 up `bf6953bd…`, 12 up `b3944c88…`).
  - `rehearsal.rehearse()`: **every step PASS** (up → tests → down equals before → up again identical),
    and the full teardown equals the production snapshot.
- **The connector's transaction behaviour**, the production-day mechanism:
  - A migration with no transaction lines that fails partway leaves nothing behind and writes no
    history row.
  - A migration with its own `begin; … commit;` that fails after the `commit;` **keeps the part before
    it and writes no history row**.
  - The runbook therefore sends every step with those lines stripped
    (`scripts/db/strip-transaction-lines.sh`).
- **One real step through the real mechanism.**
  - `apply_migration redo_12_saved_trades` with the stripped body: `12.verify.sql` passed and the history
    row was recorded. The client privileges were `anon` none and `authenticated` SELECT only, so
    Supabase's default privileges did not leak.
  - `redo_12_saved_trades_down` restored the catalog and data exactly (`assert_same base`).
- **Afterwards:** every object, seed row, secret and history row added was removed, and the leftover
  table was moved back. The state equals the recorded prior state, and the project was paused.

### Step 12 changed after V1 (Codex on #529), so it was re-verified (2026-10-03, later)

- **What changed:** a trade side must now name a player (`player_key` or `player_id`), and the trade must
  name the opponent. The new step 12 up has md5 `a6ad7a63…`, the test `24ff9eed…`, the down `b584afd8…`.
- **Restored copy (V2c, re-run):** a fresh restore on KVM1 passes all 12 steps in production order with the
  re-recorded expected catalogs. The copy was deleted and confirmed gone.
- **Real Supabase (V1c, step 12 re-run):** the throwaway project was woken again and given production's
  `users` table, privileges and `ensure_rls` trigger.
  - `apply_migration redo_12_saved_trades` succeeded. The SQL statements were sent as in the stripped
    file; comment lines were omitted from the payload.
  - The full step 12 test passed inside a rolled-back transaction, including the seven malformed trades
    refused and the owner-only read under `authenticated`.
  - `12.verify.sql` passed, and no client role can execute `saved_trades_side_ok`.
  - `redo_12_saved_trades_down` removed everything.
  - The project was returned to its prior state and paused.

## Verification on scratch

- `scripts/db/rehearse-redo.sh` (now steps 01–12): every step up → tests → down → up, and the full
  teardown equals the production snapshot.
- Production order: each step's test passes right after its up.
- `scripts/db/concurrency-check.sh`: races 1–5 pass. Races 4 and 5 fail against the step 06 and step 11
  versions before the purge lock.
- Deliberate faults, each caught:
  - step 06 without its ingest check;
  - step 11 without its insert check, or without its backfill;
  - step 12 without its update guard, its cascade, its owner-only policy, or its `sent_at` check;
  - a step 12 index missing, caught by the runbook's catalog delta.
- `npm test`: all pass on every PR branch.

## Still open

- **V1 for steps 09 and 10 at their current files is not re-run.** Both changed after V1 (#523: reports keyed to the sign-in). Scratch, production order, races and a third restored-copy dry run all pass. Re-run V1 for 09 and 10 before their production orders (go/no-go item).
- **After the founder's merges (2026-10-03):**
  - **#526 merged into the A0 branch, not `main`:** it was stacked, and A0 had already merged. A1 reaches
    `main` through **#531**, which carries #526's commits unchanged.
  - **Three Codex comments landed after their PRs merged**, and each is now fixed in a follow-up:
    - **#532:** the step 10 test keeps its pre-erase baseline (#523, P2).
    - **#533:** the Yahoo refresh claims across processes through Redis (#525, P1).
    - **#530:** the dry-run driver verifies the server it reached before applying anything (P1).
  - **#519 (the Redis saved-trade queue) merged to `main`.** The step 12 server ticket now starts from
    it: move its store onto `saved_trades`, and add the batch token and save lookup.
- **Merge state (2026-10-03, merges delegated to Claude by the founder, each after a clean Codex review of
  its latest commit):**
  - **Merged to `main`:** #523, #524, #525, #531 (A1), #527, #528, #532 and #533.
  - **Remaining:** #529 (step 12), #534 (beta-report tombstone; changes steps 09 and 10) and this runbook
    PR, which goes last.
- **Founder:** the production orders, one sitting at a time.
- **Server tickets after the redo** (design §7): Ledger write path, Tuesday scoring, follows (plan A5),
  scoring-rule writes, #519 onto `saved_trades` with the batch token, the export's `moves` columns, and
  the startup schema check.
- **V3 is still not run** (today's server pointed at a test project needs that project's service key in
  an env file the founder places).
