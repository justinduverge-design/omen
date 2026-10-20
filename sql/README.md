# sql/

| Folder | What it holds |
|---|---|
| `applied/` | Records of SQL that **was applied to production**, each with its own header saying when and how. History, not instructions: never re-run. Production's own record is its `supabase_migrations` history. |
| `pending/` | Reviewed SQL **awaiting a founder decision**. Not applied. (Today: the football-intelligence table, paused with the scheme feature.) |
| `2026-10-01-redo/` | The database redo: production's schema as it really is, and the reviewed steps (01-18; 15 retired) with their rollback and tests. Live in production. See its README. |

Supabase holds users, connections, leagues, the Ledger and saved trades. Football statistics live in the KVM1
football warehouse (`warehouse/`), not here.

Retired files live in `Archive/superseded-db-2026-10-01/` (see its `MANIFEST.md`). Applying anything
follows facts-of-record #8: founder approval → restored-clone rehearsal → verification → production.
Database work is done by Claude or Codex sessions only.
