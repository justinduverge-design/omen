# Handoff — database redo (D2), 2026-10-01

**From:** Claude Code (database lane). **To:** Codex for review, then the founder.
**Rule:** Claude built this, so Codex reviews. Jules and Muse do not touch the database. The founder
merges, and approves each production step separately.

## What exists

- **Review (Task A):** `Direction/2026-10-01-league-connections-review.md`. 13 ranked findings, each
  Verified or Inferred. Separate PR #503.
- **Design (Task B):** `Blueprints/rebuild/omen-database-redo-v1.md`. Screens → contracts → tables;
  stored versus read live; kept, changed and retired; migration plan; founder decisions (§11).
- **SQL, review-only:** `sql/2026-10-01-redo/`. Steps 01-08, each with up, down and test files, plus
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

| # | Not yet verified | How it gets verified | Needs |
|---|---|---|---|
| V1 | The steps on **real Supabase**: real Vault encryption, real default privileges and RLS trigger, PostgREST calling the functions the way the server will, `safeupdate` | Run all eight steps, tests and teardown on the paused throwaway project `omen-rls-proof-throwaway` (Postgres 17.6, same as production) through the Supabase connector; pause it again afterwards | Founder approval to restore (unpause) that project |
| V2 | The steps on **production's real data** | Restore the newest Restic backup into an isolated Postgres 17 (the 2026-09-30 method), run every step up, its checks and down, and compare row counts and hashes | Founder runs a prepared script on KVM1, or approves an agent doing it there |
| V3 | Task A's three inferred breaks in today's server: export fails, beta reports fail, follows are not saved | Run today's server locally against the throwaway project and call those three routes | V1, plus the founder placing the throwaway's service key in a local env file (agents never read it) |
| V4 | The server using the new tables (seven code tickets, design §7) | Each ticket ships with red-first tests against the migrated scratch schema, then the iOS device check (`definition-of-done.md`) | Built after V1-V2 pass |
| V5 | Vault-failure and Yahoo-refresh races in today's code | Moot once V4 moves that code onto `connection_*()`. The new functions' behaviour is already tested on scratch and is re-tested by V1 | V4 |

Already verified 2026-10-01:
- the snapshot equals production's catalog;
- every step round-trips schema and data on scratch Postgres 17, and in CI;
- 10 of 10 deliberate faults caught;
- production logging cannot capture secrets passed to the functions (settings read);
- neither phone app writes the database directly (code search).

## Next steps, in order

1. Codex review of this PR and #503.
2. Founder: `beta_reports` yes or no; approvals for V1 and V2.
3. Per step: a restored-clone rehearsal, then a founder-approved production order. Suggested order:
   07, 01, 02, 03, 04, 05, 06, 08.
4. Server code tickets (design §7), starting with the Ledger write path and Tuesday scoring, since
   scoring cannot be re-enabled before `decision_outcomes` exists and is written.
5. D3 crosswalk job, then D4 (explanation-only data).
