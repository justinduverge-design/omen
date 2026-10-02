# Handoff — database redo (D2), 2026-10-01

**From:** Claude Code (database lane). **To:** Codex for review, then the founder.
**Rule:** Claude built this, so Codex reviews. Jules and Muse do not touch the database. The founder
merges, and approves each production step separately.

## What exists

- **Review (Task A):** `Direction/2026-10-01-league-connections-review.md`. 13 ranked findings, each
  Verified or Inferred. Separate PR #503.
- **Design (Task B):** `Blueprints/rebuild/omen-database-redo-v1.md`. Screens → contracts → tables;
  stored versus read live; kept, changed and retired; migration plan; founder decisions (§11).
- **SQL, review-only:** `sql/2026-10-01-redo/`. Steps 01-10, each with up, down and test files, plus
  scratch-only shim, production snapshot and seed.
- **Rehearsal:** `scripts/db/rehearse-redo.sh` + `scripts/db/catalog.js`. CI job `redo-rehearsal` runs on
  `postgres:17` and **passed in CI** (run 36946432760).
- **The old `test-migrations` job stays on Postgres 15.** Moving it to `supabase/postgres:17.6.1.111`
  failed: the container never became healthy, because the image's init could not authenticate as
  `supabase_admin` with this job's `POSTGRES_USER=postgres` env (run 36946432760). It was reverted
  rather than tuned blind; Docker was not available to test the image locally. That job exercises the
  superseded node-pg-migrate files, so this is low priority: fix the env, or retire the job with those
  files (design §5).

## What Codex should check hardest

1. **`02_connection_credentials.up.sql`.** Five `SECURITY DEFINER` functions touching Vault:
   - search_path pinning;
   - that no client role can execute them;
   - that `connection_revoke` really is all-or-nothing;
   - whether production's pgaudit settings would log secret arguments (not read).
2. **`05_ledger.up.sql`.**
   - The append-only triggers, and the erasure flag (`omen.ledger_erasure`) as the only delete path.
   - The supersede chain.
   - Whether `decisions_check_insert` requiring a membership is right for every server write path.
3. **The snapshot `00b`.** It was proven equal to the production catalog fixture for columns,
   constraints, indexes, policies and ACLs. Triggers and function bodies in `public` were compared
   by hand: only `rls_auto_enable` and the four vault wrappers exist.
4. **The backfills in 03 and 05.** Run on synthetic data only; production row contents were not read.

## Verification before production (founder, 2026-10-01: "verify everything")

Nothing moves to production until every row below is verified or explicitly accepted by the founder.

| # | What | Result (2026-10-02) |
|---|---|---|
| V1 | All nine steps on **real Supabase**: real encrypted Vault, real roles and default privileges, production's `ensure_rls` trigger | **VERIFIED.** Run through the Supabase connector on the throwaway project `omen-rls-proof-throwaway` (Postgres 17.6), using `scripts/db/supabase-rehearsal-helpers.sql`. All 27 step files loaded byte-identical (md5 per file matched the repo). The snapshot equalled the production catalog. Every step went up → tests → down (schema and data equal before) → up again (identical), and the full teardown equalled the production snapshot. Afterwards the project was returned to its prior state (its 3-row leftover table restored, no secrets, one login) and paused. One sub-test cannot run on real Supabase and says so: the simulated Vault delete failure (no trigger privilege on `vault.secrets`); it runs on scratch. |
| V2 | All nine steps on **production's real data** | **VERIFIED.** The newest backup (snapshot `de711667`, 2026-10-02 00:16 UTC, checksums passed) was restored on KVM1 into an isolated Postgres 17 on an `--internal` Docker network (`scripts/db/kvm1-restored-clone.sh`). The restored copy matched the backup's own row counts on all 15 tables. With production's privileges re-applied, the catalog matched the production fixture. Every step went up → down → up with schema and data fingerprints equal. On real data: 10 connections backfilled into 10 memberships across **5 real leagues**, 3 of 3 league-scoped Ledger rows copied, and **exactly 6** unscoped rows found, so step 08's guard held. The copy, network and restored files were deleted afterwards and verified gone. Only structure, counts and hashes left KVM1. |
| V1b / V2b | Re-run V1 and V2 for the steps changed by both Codex reviews (02, 05, 06, 10) | **VERIFIED 2026-10-02, all ten steps.** **V1b**, on real Supabase (throwaway project, Postgres 17.6.1.166): all 30 step files were loaded byte-identical (md5 per file matched the repo), and the snapshot equalled the production catalog. Every step went up → tests → down → up, and the full teardown equalled the production snapshot. Afterwards the project was returned to its prior state (one login, the 3-row leftover table, nothing else) and paused. **V2b**, on a restored copy of production: the newest backup (snapshot `9d5284c5`, 2026-10-02 18:03 UTC) was restored on KVM1 in isolation, and its row counts matched the backup's own. Every step went up → down → up with schema and data fingerprints equal. Production's data has grown since V2: **7 leagues** (was 5), still 10 connections and 10 memberships, 3 of 3 league-scoped Ledger rows copied, exactly 6 unscoped rows. The copy was deleted and verified gone. **Limits:** the race checks (`scripts/db/concurrency-check.sh`) run only on Postgres 17 locally and in CI. The Supabase connector runs one query at a time, so the races cannot be reproduced there. A sequential account erase on real Supabase, after a reconnect repaired a half-populated row, left 0 orphaned secrets. On the restored copy, `account_erase()` was not called on real users: the copy has no Vault, so it would only refuse. |
| V3 | Today's 3 suspected server breaks (export, beta reports, follows) | **Not run.** It needs today's server pointed at a test project, which needs that project's service key in a local env file placed by the founder (agents never read keys). The three breaks are fixed by the code tickets regardless (design §7), so this is optional. |
| V4 | The server using the new tables | Each code ticket ships red-first tests against the migrated schema, then the iOS device check. |
| V5 | Vault-failure and Yahoo-refresh races in today's code | Moot once V4 moves that code onto `connection_*()`, whose behaviour V1 verified. |

**Found by V1, verified on production:** the server's role (`service_role`) can read every stored cookie and token directly (`vault.decrypted_secrets`). This is Supabase's default, not something the redo adds; clients (`anon`, `authenticated`) cannot reach Vault at all. The protection for every user's ESPN cookie is therefore that only the server holds the service key. That makes the key's handling (fact #13, sprint items `S1`/`S2`) as important as the cookies themselves. The step 02 comment that claimed otherwise was corrected.

Already verified 2026-10-01:
- the snapshot equals production's catalog;
- every step round-trips schema and data on scratch Postgres 17, and in CI;
- 10 of 10 deliberate faults caught;
- production logging cannot capture secrets passed to the functions (settings read);
- neither phone app writes the database directly (code search).

## Codex review (2026-10-02) and what changed

Codex reviewed #503, #505 and #506 after the founder merged them. All findings were addressed in the
follow-up PR:

| Finding | Severity | Resolution | Proof |
|---|---|---|---|
| Two first-time connects at once orphan a secret pair (no row to lock) | P1 | Advisory lock per (user, provider) in every credential function | `scripts/db/concurrency-check.sh`: the version on `main` orphaned 2 secrets; the fix orphans 0 |
| Schema allows several current calls per week; facts-of-record says one | P1 | Founder decided: **one per team per week**. Fact #16 amended; a partial unique index allows one first call per team-week, so a chain has exactly one current call | Step 05 test; a deliberate removal of the index is caught |
| Account deletion is several RPCs that commit separately | P1 | Step 10 `account_erase()`: one transaction, refuses partial erasure | Step 10 test, including a simulated Vault failure that leaves the account intact; the audit hash matches the route's |
| D2 ticket still says node-pg-migrate under `migrations/` | P1 | T-S1 and the D2 sprint entry rewritten for the redo workflow | Text |
| Shadow-log uniqueness blocks the same player in two leagues | P2 | `league_id` copied from the snapshot and part of the unique key | Step 06 test |
| Shadow row's identity and number taken on the writer's word | P2 | Copied from the cited snapshot; a disagreeing value is refused | Step 06 tests; removing the check is caught |
| Archived tests still run under `node --test` | P2 | `npm test` scoped to `test/` (`node --test "test/**/*.js" "test/**/*.mjs"`); filenames kept so old citations still resolve | 150 test files run, the same set as before minus the 2 archived ones |
| D2 left IN_PROGRESS while blocked (on #503) | P2 | Already fixed before the review landed (claim released) | Sprint entry |

**Second Codex review (#511, 2026-10-02).** #511 was merged before its review was read; both findings were fixed in the next PR.

| Finding | Severity | Resolution | Proof |
|---|---|---|---|
| `account_erase()` does not serialize with a connect or reconnect in flight | P1 | Takes the same per-(user, provider) advisory locks as step 02, for all three providers, **before** the user-row lock (the other order could deadlock with a first-time connect) | `concurrency-check.sh` race 2: with the version on `main`, the erase fails mid-race ("0 of 1 secrets found"); with the fix, the erase succeeds and leaves 0 secrets. Race 3: a connect during an erase fails cleanly and leaves 0 secrets |
| The concurrency check swallowed the second connect's failure (`\|\| true`) | P2 | Each session's exit status is asserted, along with the number of secrets created (2) and which cookie won | Race 1 fails if either connect fails; the pre-#505 step 02 still fails it (2 orphans) |

## Next steps, in order

1. Codex review of the follow-up PR (read it **before** merging).
2. Founder: decided 2026-10-01 (beta reports yes; V1 and V2 approved and done).
3. Per step: a restored-clone rehearsal, then a founder-approved production order. Suggested order:
   07, 01, 02, 03, 04, 06; then the account-deletion server change; then 05 and 10 back to back; then 08, 09.
   - **Step 05 waits for the server change** (Codex, #508; confirmed 2026-10-02 against `main`). Once 05
     is applied, the Ledger refuses a plain delete of anyone with a call. Today's `/api/user/delete`
     erases secrets, connections and consent first, then fails on `users`, leaving a half-erased
     account. The route must call `account_erase()` when it exists, keeping today's path when it does
     not. Ship that, then apply 05 and 10 together. Step 10 needs 05, so it cannot go first.
   - **Step 09 waits for a fix to the beta-report credential filter** (`src/routes/betaReports.js`).
     It misses `ESPN S2 = <cookie>`.
   - Full compilation of Codex's comments: `Direction/reviews/2026-10-02-codex-review-compilation.md`.
4. Server code tickets (design §7), starting with the Ledger write path and Tuesday scoring, since
   scoring cannot be re-enabled before `decision_outcomes` exists and is written.
5. D3 crosswalk job, then D4 (explanation-only data).
