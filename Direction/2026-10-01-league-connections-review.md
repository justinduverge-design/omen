# League connections and identity review — 2026-10-01

**Author:** Claude Code session (database lane, sprint item `D2`). **Status:** review, no changes made.
**Reviewer wanted:** Codex (the session that writes a database review must not sign it off). Jules
and Muse do not touch the database.

## What was checked, and how

- **Code:** every `.from(...)` and `.rpc(...)` call in `src/` was read. A script compared every
  literal column list against production's real columns. Dynamic queries (`selectRows(...)`, the
  Tuesday cron's `update(patch)`, `moves.js` column arrays) were read by hand.
- **Production:** read-only catalog queries through the Supabase connector on 2026-10-01, with the
  founder's approval in session. Covered: columns, constraints, indexes, RLS policies, client
  grants, triggers, extensions, the Supabase migration list, and counts only. **No user rows, no
  emails, no secret values and no Vault contents were read.** Vault was counted by id only.
- **Repo:** `migrations/` (node-pg-migrate baseline + WO-06), `sql/*.sql`,
  `Archive/superseded-db-2026-10-01/gate1/schema-identity-access.md`, `.github/workflows/migrations-ci.yml`.
- **Not checked:** live API responses (no request was made to `slopssaloon.com`). Behaviour under
  failure (Vault errors, concurrent Yahoo refresh) is inferred from code, not reproduced.

"Verified" below means seen in production's catalog or counts, or read directly in code on `main`
(`d2315f7e`). "Inferred" means it follows from the code but was not exercised.

## Production at a glance (2026-10-01)

15 tables in `public`, RLS on all of them. 7 app users, 9 sign-in (Auth) users. 10 provider
connections (ESPN 5, Sleeper 3, Yahoo 2), all active, 5 with a selected flag. 9 Ledger rows, of
which **3 carry a league** and 6 do not. 14 Vault secrets, all referenced; no orphans and no
dangling references. `pg_cron` is installed. **There is no `pgmigrations` table**: the
`migrations/` framework has never run against production. Production's real history is the 18
entries in `supabase_migrations`.

## Findings, most serious first

### 1. The Ledger keeps one call per user per week, not one per team — P0 · Verified

`moves` has a unique index on `(user_id, week_num, season)` (`idx_moves_user_week_unique`). Every
write upserts on that key: `src/routes/omen.js:325` (the issued call) and `:536` (feedback).
Consequences:

- A user with an ESPN league and a Sleeper league gets **one** row per week. The second league's
  call **overwrites** the first, including its league and platform.
- Asking again in the same week overwrites what Omen said earlier. The Ledger is meant to be an
  immutable record of what Omen said and when. Today it is a last-write-wins cell.
- Feedback ("I followed it") attaches to whichever league wrote last.

This contradicts the product rule "one call per team per week" (U1's done-when) and the Ledger's
purpose. It is a design flaw in the table, not a missing column, and the redesign must fix it.

### 2. Tuesday scoring writes two columns production does not have — P0 · Verified

`src/omen_tuesday_cron.js` writes `result` and `scored_at` (`scoredMovePatch`, `:381`;
`archiveNotExecutedMoves`, `:224`). Production `moves` has neither. The 2026-09-29 migration
deliberately left them out. If `OMEN_CRON_SCORING_ENABLED` were turned on today, every scoring
update would fail, and so would the not-executed archive. The only fallback handles a missing
`reconciliation_state`. **The Ledger stays "pending" whether or not the flag is on.** Whoever
re-enables scoring has to decide where the scored result lives first. The new Ledger design below
answers that.

### 3. "Export my data" asks for columns production does not have — P1 (privacy) · Verified schema, inferred at runtime

`GET /api/user/export` (`user-export.v1`, the Account screen) selects:

- `users.updated_at`, which is absent (`src/routes/userPrivacy.js:69`);
- `moves.feature` and `moves.updated_at`, also absent (`:128`);
- the `beta_reports` table, which is absent but tolerated.

A missing column is an error in PostgREST, so the export should fail with a 500 for every user.
The route was not called live to confirm this. Data export is a privacy promise on the Account
screen, so this matters beyond the app.

### 4. Multi-league choices are not saved — P1 · Verified

- The phone's "only the first league will stick" is honest. `league_follows`
  (`Archive/superseded-db-2026-10-01/sql/2026-09-03_multi_league_follows_review.sql`) was **never applied**. `readFollows` gets
  `PGRST205`, `/api/leagues` reports `follow_persistence: "unavailable"`, and
  `POST /api/leagues/follows` accepts the selection and stores nothing.
- Underneath that, `platform_connections` is unique on `(user_id, platform)`. One row per provider
  holds both the **credential** and **one** bound `league_id` / `espn_team_id`, so a user can only
  ever have one active league per provider. `is_selected` (applied 2026-08-30) chooses between
  providers, not between leagues.
- `replaceFollows` deletes and then inserts in two separate calls. If the insert fails, the user's
  set is gone. The table should be written in one transaction (an RPC), not as two REST calls.

### 5. WO-06 identity migration: harmless today, unsafe as written, and cannot be applied as built — P1 · Verified

**Measured blast radius today: zero rows.** All 7 `public.users` ids exist in `auth.users`. There
are 0 split identities (same email, different id), 0 that match only by letter case, and 0
orphans. The three columns WO-06 touches (`users.platform`, `league_id`, `team_name`) are empty in
all 7 rows. Run today, it would delete nothing.

It is still not safe to approve, for five reasons:

1. **The delete is decided when it runs, with no stop condition and no copy.**
   `DELETE FROM public.users WHERE id NOT IN (SELECT id FROM auth.users)` cascades through `moves`,
   `platform_connections`, `profiles` and all seven `league_office_*` tables. A sign-in account
   removed between now and the day it runs would silently take that user's Ledger and connections
   with it.
2. **Deleting a connection row does not delete its Vault secrets.** The cascade drops the
   pointers. The ESPN cookies and Yahoo tokens stay in Vault with nothing pointing at them.
3. **Email matching is case-sensitive** (`pu.email = au.email`). A case difference would count as
   an orphan and be deleted. Today's count is 0, but nothing guards it.
4. **`down()` cannot undo it.** It re-adds two empty columns. Deleted users, their children and
   their data are gone.
5. **It cannot be applied to production by its own framework.** WO-06 is a node-pg-migrate step
   that runs after `1790680789307_baseline.js`. Production has no `pgmigrations` table, so
   `npm run migrate up` would start with the baseline's `create table public.users`, fail on the
   existing table, and never reach WO-06. "Apply WO-06" is not a defined operation today.

**What must change before it is proposed again:**

- a preflight that **aborts** unless the number of rows to delete equals a count the founder
  approved;
- matching on `lower(email)`, with an abort on any ambiguity;
- an archive table in the same transaction holding a full copy of every row it deletes or
  rewrites, including child rows and Vault ids;
- a `down` that restores from that archive;
- an explicit Vault cleanup step, or a refusal to delete any user who still has Vault references;
- a form production can actually run: a reviewed SQL file in the `supabase_migrations` history,
  like every other change that has reached production.

Since the real deletion set is empty, the low-risk replacement is a short, additive step:
`users.id → auth.users(id)` as a `NOT VALID` foreign key, then `VALIDATE`. Keep the empty columns
until code is proven not to read them, and drop them in a later step. That step is in the Task B
plan.

### 6. Revoking credentials can fail silently and leave a cookie in Vault — P1 · Verified on catalog, inferred on failure path

- Disconnect (`src/routes/platforms.js:716-733`) and account deletion
  (`src/routes/userPrivacy.js:82-88`) **log and ignore** a Vault delete failure, then delete the
  row that pointed at the secret. The user asked Omen to forget their ESPN cookie or Yahoo token,
  and it would still be in Vault, with nothing pointing at it.
- `vault.secrets` has a **unique index on `name`** (verified). Omen names secrets per user
  (`espn_s2_<userId>`, `espn_swid_<userId>`, `yahoo_access_<userId>`, `yahoo_refresh_<userId>`). An
  orphaned secret therefore makes every later `vault_create_secret` for that user fail: **that
  user can never reconnect ESPN or Yahoo.**
- Connect creates the two secrets with `Promise.all`. If one succeeds and the other fails, the
  first is orphaned and the same block follows.
- **Today all 14 secrets are referenced** (verified), so this has not happened yet.
- **Fix in the design:** credential writes and deletes go through one transactional database
  function, so the secret and its pointer change together, and a disconnect that cannot delete the
  secret reports failure instead of success.

### 6b. The server's key can read every stored cookie in plain text — P1 (posture) · Verified 2026-10-02

Found while verifying the redo on real Supabase, then confirmed on production with a read-only
privilege check:
- `service_role`, the role the server's key acts as, has SELECT on `vault.decrypted_secrets`, so it can
  read every ESPN cookie and Yahoo token.
- `anon` and `authenticated` have no access to the `vault` schema at all.

This is Supabase's default, not a defect introduced anywhere in Omen. It means the service key is
exactly as sensitive as every user's ESPN cookie combined. The `vault_*` wrapper functions are a
convenience, not a boundary. Protecting the key (where it lives, who can read it, rotation) is the
real control: facts-of-record #13, sprint items `S1` and `S2`.

### 7. ESPN cookie expiry is not recorded anywhere — P1 · Verified (schema), product item already exists

- **Storage is sound.** Cookies are stored only as Vault ids (`espn_secret_id`, `swid_secret_id`),
  decrypted server-side through `service_role`-only wrapper functions. Nothing is logged.
- **Plaintext column:** `platform_connections.espn_swid` still exists. It is empty in all rows and
  no code writes it, so it should be retired.
- **The gap:** there is no column for when a credential was last proven to work, or why it last
  failed. Expiry is discovered by a user's failed request. Three users hit that before 2026-09-27.
  The design adds `credential_state`, `last_verified_at` and `last_failure_code`, so a check can
  find expiring connections and prompt before the first failed call. That serves the existing
  product item and needs no new contract field on day one.

### 8. Yahoo token refresh has no lock and ignores one write error — P2 · Inferred

`src/services/yahooAuth.js:101-121`:

- Two simultaneous requests can both refresh.
- The `token_expires_at` update's error is not checked.
- A response missing `expires_in` produces `NaN` and a throw *after* Vault was updated, so the
  next request refreshes again.

Production has 2 Yahoo rows, and neither still holds the `"yahoo"` placeholder. Low volume makes
this unlikely today. The fix is single-flight refresh (a row lock in the credential function) and
a checked write.

### 9. A signed-in user can edit their own Ledger directly — P2 · Verified grants, inferred exploit

The `authenticated` role has `INSERT` and `UPDATE` on `moves` and `users`, limited by RLS to the
user's own rows. Native apps never write these tables directly; the server uses the service role.
But anyone holding their own session token can call the database's REST API and change their own
calls' `followed`, `outcome` or `headline`. That makes "verified versus self-reported" forgeable,
and the Ledger exists to make that distinction. **Fix:** revoke client writes and keep client
reads. This is a grant change and goes through the same approval order.

### 10. The repo's schema files do not describe production — P0 for any future migration · Verified

This is the root cause behind the past outages, and it is still true today:

| Source | What it says | Production |
|---|---|---|
| `Archive/superseded-db-2026-10-01/migrations/1790680789307_baseline.js` | `moves` without `platform`/`league_id`; no `UNIQUE(user_id, platform)` on connections; no one-selected index; `consent_records → public.users`; `league_office_matchups` / `sync_jobs` unique keys include `user_id`; `down()` empty | has `platform`/`league_id`; has the unique and partial index; `consent_records → auth.users` with `UNIQUE(user_id, consent_type)`; unique keys are league-scoped, no `user_id` |
| `Archive/superseded-db-2026-10-01/sql/omen_rls_security.sql` ("idempotent, safe to re-run") | drops `local_snapshots`, then **enables RLS on `oauth_credentials` and `system_context`, which it has just dropped** | re-running it would stop with an error partway through |
| `.github/workflows/migrations-ci.yml` | Postgres 15 | Postgres 17.6 |
| node-pg-migrate (`npm run migrate`) | the framework for D2 | never applied; no `pgmigrations` table |

Two migration systems exist and neither matches production. Production is the only true copy.
**Consequence for Task B:** the first migration has to *start from a dump of production's schema*,
not from the repo baseline, and CI must prove that the migrated schema equals production plus the
reviewed change.

### 11. Code that silently works around missing columns — P2 · Verified

`upsertMoveTolerantly` (`src/routes/omen.js:330`), `selectTolerantly` (`src/routes/moves.js`),
the cron's `reconciliation_state` retry, `readConnectionsWithSelection` and `readFollows` all
retry without a missing column or table. Each was a reasonable stopgap. Together they let drift
run for months without anything going red. The new design adds a startup schema check (expected
columns versus `information_schema`) that marks `/api/ready` degraded and names the missing
object, so drift becomes loud.

### 12. Other tables the code expects and production does not have — P1 · Verified

| Table | Effect today |
|---|---|
| `beta_reports` | Every in-app report returns 503 "Your report was not saved" (`src/routes/betaReports.js:22`). The W1-B report pill cannot collect anything. |
| `football_intelligence_signals` | The serving repository throws a serving failure on every read (`src/services/footballIntelligence/servingRepository.js`). |
| `league_follows` | See finding 4. |

### 13. Smaller loose ends — P3

- **Stale comments.** `src/services/activeSelection.js` still says `is_selected` is review-only;
  it was applied 2026-08-30. The 2026-09-29 decision-log entry says the moves league-scope
  migration is unapplied; it was applied 2026-09-30. The decision log is corrected in the same
  change as this review.
- **Ledger rows without a league.** 6 of the 9 rows have no `platform`/`league_id`, so they are
  permanently hidden from the league-scoped Ledger unless a reviewed backfill attributes them.
  This is only safe per user where the user had exactly one league at the time.
- **Two Omen accounts for one person.** One person signing in with Apple (relay email) and then
  with Google gets two separate Omen users with nothing linking them. This is a product decision
  (account linking), not a defect.
- **No relationship links.** `oauth_state` has no foreign key and no default expiry. It holds 0
  rows. `pg_cron` is available, which answers the Gate 1 blueprint's open question 7.
- **Sleeper is clean.** Public username and `platform_user_id` only; no secrets. Nothing to fix.

## Direct answers to the brief

- **Is WO-06 safe?** Not as written (finding 5), even though today it would delete nothing.
  Replace it with the additive foreign-key step plus a later column drop. Do not apply the merged
  file.
- **Is the 2026-09-29 decision-log line stale?** Yes. Corrected in place with a dated note.
- **Other places the code assumes columns production lacks:** `moves.result`, `moves.scored_at`
  (cron, Ledger detail), `moves.feature`, `moves.updated_at`, `users.updated_at` (export), and the
  tables `league_follows`, `beta_reports` and `football_intelligence_signals`. The script found no
  others among literal column lists.
- **Multi-league persistence:** not stored. The table was never applied, and the connection table
  can only bind one league per provider.
- **Credentials:** Vault ids only (good). Deletion can fail silently and lock a user out of
  reconnecting (fix in the design). No expiry tracking.

## Not verified

- Live HTTP behaviour of export, beta reports and the follows endpoint (inferred from schema and
  code).
- Vault failure paths and concurrent Yahoo refresh (inferred).
- Whether the native apps ever write to `moves` or `users` directly (the 2026-09-27 audit says no;
  not re-checked here).
- The phone-side "Unable to build this recommendation" bug. Another session owns it.
