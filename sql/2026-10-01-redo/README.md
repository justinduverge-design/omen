# Database redo, 2026-10-01 — review-only SQL

Design: `Blueprints/rebuild/omen-database-redo-v1.md`. Findings it fixes:
`Direction/2026-10-01-league-connections-review.md`.

**Nothing here is applied.** Each numbered step goes to production only as its own founder-approved
order: approval → rehearsal on a restored production clone → verification → production
(facts-of-record #8). Apply only the `.up.sql` file of the approved step. Database work is done by
Claude or Codex sessions only. Jules and Muse never touch the database.

| File | Runs where |
|---|---|
| `00a_scratch_supabase_shim.sql`, `00b_production_schema_snapshot.sql`, `00c_scratch_seed.sql` | **scratch only**: Supabase stand-ins, production's schema as read 2026-10-01, synthetic data |
| `production-catalog-2026-10-01.json` | fixture: production's catalog, read-only, 2026-10-01 |
| Steps 01-15 | identity, credentials, leagues, players, Ledger, projections + data record, close client writes, delete the 6 unscoped Ledger rows, beta reports, one-transaction account erasure, league scoring rules compartment, saved trades, football-intelligence signals (13), nflverse weekly player stats (14; job spec `Blueprints/specs/football-data/omen-nflverse-weekly-stats-ingest-v1.md`), the full nflverse record (15: full stat lines, play-by-play opportunity, team weeks, games with lines, weekly rosters) |
| `NN_<step>.up.sql` | the step (one transaction, preflight aborts on unexpected state) |
| `NN_<step>.down.sql` | its exact rollback (schema and data) |
| `NN_<step>.test.sql` | scratch assertions; rolls back |

Rehearse on a scratch Postgres 17 (never production; the script refuses Supabase hosts):

```bash
PGHOST=127.0.0.1 PGPORT=54317 PGUSER=postgres scripts/db/rehearse-redo.sh
```

CI runs the same thing as the `redo-rehearsal` job in `.github/workflows/migrations-ci.yml`.

**If production gains a migration** after `20261002231212` (`drop_league_office`, 2026-10-02), regenerate `00b` and the catalog fixture
from a fresh read-only catalog read before rehearsing any step. A stale snapshot rehearses against a
database that no longer exists, and that is how the earlier outages happened.
