# Superseded database files — retired 2026-10-01

**Not active authority.** Retired with founder approval on 2026-10-01: "I want a lot of old shit out of
here. It just ends up confusing people. I think that's how we got here with the broken everything."

What replaces them:
- **Production's schema:** `sql/2026-10-01-redo/00b_production_schema_snapshot.sql`, proven equal to
  `sql/2026-10-01-redo/production-catalog-2026-10-01.json` (a read-only catalog read of production).
- **The design:** `Blueprints/rebuild/omen-database-redo-v1.md`.
- **Changes:** reviewed steps in `sql/2026-10-01-redo/`; applied history in `sql/applied/` and in
  production's own `supabase_migrations`.

| File | Why it was retired |
|---|---|
| `migrations/1790680789307_baseline.js` | node-pg-migrate baseline that did not match production; production never ran node-pg-migrate (no `pgmigrations` table) |
| `migrations/1790735188136_identity-unification.js` | WO-06. Deletes unmatched users with no stop condition or copy, irreversible `down`, and not runnable on production. Replaced by redo step 01, which deletes nothing |
| `test/migrationIdentity.test.js` | tested WO-06 |
| `test/phase1SchemaReviewSql.test.js` | tested the 2026-06-12 review file below |
| `sql/omen_rls_security.sql` | claimed to be the idempotent source of truth; did not match production and would stop with an error if re-run (it enables RLS on tables it has just dropped) |
| `sql/2026-09-03_multi_league_follows_review.sql` | never applied; replaced by `leagues` + `league_memberships` (redo step 03) |
| `sql/2026-08-24_a6_full_league_scoring_contract_review.sql` | review draft; the applied version is `sql/applied/2026-08-26_a6_scoring_contract_production.sql` |
| `sql/2026-06-12_phase1_adp_scoring_schema_review.sql` | never applied; stored per-league scoring rules, which the open A6 rights question rules out |
| `sql/2026-09-14_beta_reports_review.sql` | replaced by redo step 09 (server-only, recorded 30-day purge, undo and tests) after the founder said yes on 2026-10-01 |
| `sql/wo01_rls_policy_repair.SUPERSEDED.md` | already marked superseded |
| `gate1/schema-blueprint.md`, `gate1/schema-identity-access.md`, `gate1/schema-decisions-ledger.md`, `gate1/schema-football-core.md` | the Gate 1 schema set. The redo keeps its good decisions (shared `leagues`, `league_memberships`, canonical players, append-only Ledger) and replaces the rest: read-time confidence bands, stored scoring rules, roster snapshots, `trade_shares`, the WO-06 data migration. Account linking (`user_identities`) is reconsidered under `D6-AccountLinking` |

Also removed: the `test-migrations` CI job, the `migrate` npm script and the `node-pg-migrate`
dependency, which existed only to run the files above.
