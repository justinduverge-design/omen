# Handoff — database redo (D2), 2026-10-01

**From:** Claude Code (database lane). **To:** Codex for review, then the founder.
**Rule:** Claude built this, so Codex reviews. Jules and Muse do not touch the database. The founder
merges, and approves each production step separately.

## What exists

- **Review (Task A):** `Direction/2026-10-01-league-connections-review.md`. 13 ranked findings, each
  Verified or Inferred. Separate PR #503.
- **Design (Task B):** `Blueprints/rebuild/omen-database-redo-v1.md`. Screens → contracts → tables;
  stored versus read live; kept, changed and retired; migration plan; founder decisions (§11).
- **SQL, review-only:** `sql/2026-10-01-redo/`. Steps 01-07, each with up, down and test files, plus
  scratch-only shim, production snapshot and seed.
- **Rehearsal:** `scripts/db/rehearse-redo.sh` + `scripts/db/catalog.js`. CI job `redo-rehearsal`.
  The old migration job now runs on `supabase/postgres:17.6.1.111` (production's version).

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

## Not verified

- real Vault encryption (shim);
- real production data;
- a restored-clone rehearsal;
- the server using these tables (no code moved yet; design §7 lists the seven code tickets);
- the old `test-migrations` job on the Supabase 17 image (first run is this PR's CI).

## Next steps, in order

1. Codex review of this PR and #503.
2. Founder decisions, design §11.
3. Per step: a restored-clone rehearsal, then a founder-approved production order. Suggested order:
   07, 01, 02, 03, 04, 05, 06.
4. Server code tickets (design §7), starting with the Ledger write path and Tuesday scoring, since
   scoring cannot be re-enabled before `decision_outcomes` exists and is written.
5. D3 crosswalk job, then D4 (explanation-only data).
