# Production runbook — database redo, steps 01–12

**Prepared:** 2026-10-03 (prep session). **Nothing in this file has been applied to production.**
**Who does what:** Claude runs each step through the Supabase connector. The founder approves each step
separately, on the line at the bottom of its page. Codex has reviewed every file named here (PRs listed
in the handoff).
**Rules that do not change:** facts-of-record #8 (approval → rehearsal → verification → production);
no agent reads or prints a secret; the agent never holds the database password.

## Before production day

Do these the day before, or the morning of. Each ends with something checkable.

1. **Server changes merged and deployed, in this order:** A2 (#523), A3 (#524), A0 (#525), A1 (**#531**;
   #526 merged into the A0 branch, not `main`, so #531 carries it). Also #532 and #533.
   - Every one keeps today's behaviour while its function or table does not exist, so they are safe to
     deploy before any step.
   - Deploying them first makes each step's watch meaningful: the moment step 02 is applied, connect
     and disconnect move onto its functions.
   - Check: the deploy workflow is green, and the cron log shows two "skipped" purge lines after 04:15 ET.
2. **SQL merged:** #527 (step 06), #528 (step 11), #529 (step 12), and the runbook PR. No open Codex P1
   on any of them, on its latest head.
3. **Production has not drifted.**
   - `list_migrations`: the newest entry is still `20261002231212 drop_league_office`.
   - Run `sql/2026-10-01-redo/runbook/catalog.sql` through the connector, save it, and run
     `node scripts/db/catalog.js compare-fixture <saved>`. It must report that production matches the
     fixture. It compares the five families the fixture records (columns, constraints, indexes, policies,
     ACLs); the other four in the read are used by the per-step delta check.
   - If either check fails, stop. Regenerate `00b` and the fixture, and re-rehearse (`sql/2026-10-01-redo/README.md`).
4. **Fresh backup, restore-tested, dry-run.**
   - On KVM1: `sudo bash kvm1-restored-clone.sh up`. The newest snapshot restores, its checksums pass,
     and its row counts equal the backup's own.
   - From a machine with node: run `TARGET=clone CLONE=1 PSQL="ssh kvm1 sudo docker exec -i omen-redo-clone psql -X -q -v ON_ERROR_STOP=1 -U postgres -d omen" scripts/db/production-order-run.sh`.
     The script first checks, on the server it reached, that it is the marked clone and not a Supabase
     server. If it isn't, it refuses before applying anything.
     All twelve steps must pass.
   - Then `sudo bash kvm1-restored-clone.sh down`, and confirm the container, network and files are gone.
5. **Right before the first step:** take a fresh Restic snapshot on KVM1 (the nightly job, run by hand)
   and note its id here: `________`. This is the floor for any rollback a `.down.sql` cannot do.
6. **The founder is available** for the hour after each step.

## How every step is run

Steps run in this order: **07, 01, 02, 03, 04, 06, 11, 12, 05, 10, 08, 09**. Steps 05 and 10 go back to
back in one sitting, because between them deletion uses today's path, which step 05 blocks.

For step `NN`:

1. **Approval.** The founder signs the step's approval line.
2. **Preflight (read-only, minutes before).**
   - Run `runbook/snapshot.sql`. Compare it with the expected values below; any difference is explained
     before going on.
   - Run `runbook/catalog.sql` and save it as `before.json`.
   - The step's own `.up.sql` also aborts on unexpected state, so a wrong preflight cannot corrupt
     anything. It only stops the step.
3. **Apply.** Use `apply_migration`, named `redo_NN_<slug>` (below), with the body of `NN_<slug>.up.sql`.
   This records the change in `supabase_migrations`. See "Apply mechanism" for how the file's own
   `begin;`/`commit;` lines are handled.
4. **Verify (read-only).**
   - `runbook/NN.verify.sql` must print `VERIFIED NN`.
   - Run `runbook/snapshot.sql` again.
   - Run `runbook/catalog.sql` again and save it as `after.json`.
   - Run `node scripts/db/catalog.js delta-check sql/2026-10-01-redo/runbook/expected/<previous>.catalog.json sql/2026-10-01-redo/runbook/expected/NN.catalog.json before.json after.json`.
     It must report `catalog delta: as expected`. That means the step changed exactly what it changed on
     scratch and on the restored copy, nothing more and nothing less.
5. **Watch for an hour.** Watch GlitchTip, 5xx on the routes named on the step's page, and the iPhone's
   main screens. The phone check covers Command Center, Omen, League, Trade and Ledger.
6. **Rollback trigger.**
   - Any verify failure: roll back at once.
   - Any new error on the step's routes during the watch: roll back, unless it is clearly unrelated.
   - To roll back, apply `NN_<slug>.down.sql` as migration `redo_NN_<slug>_down`, then rerun
     `snapshot.sql` and `catalog.sql`. The catalog must equal `before.json`.

### Apply mechanism

Decided (founder, 2026-10-03): the Supabase connector's `apply_migration`. Only that path is used; no
psql tunnel is opened.

The step files carry their own `begin;` … `commit;`. Tested on the throwaway project on 2026-10-03:

- A migration **without** transaction lines that fails partway leaves nothing behind and no history
  row. `apply_migration` runs it as one transaction.
- A migration **with** its own `begin; … commit;` that fails **after** the `commit;` keeps everything
  before the `commit;`, and writes **no** history row. That is a half-applied step that nothing
  records.

**Rule:** send every step file with its `begin;`, `commit;` and `rollback;` lines removed, the same
transform the real-Supabase rehearsal uses (`scripts/db/supabase-rehearsal-helpers.sql`). The step then
runs as exactly one transaction, the migration's own, and a failure anywhere leaves nothing.

`scripts/db/strip-transaction-lines.sh NN` prints the body to send, and its md5 on stderr. Its output is
what was rehearsed on real Supabase.

Proven on the throwaway project on 2026-10-03:
- step 12 applied through `apply_migration` with the stripped body;
- its post-checks passed;
- the history row was recorded;
- its rollback, through the same mechanism, restored the database exactly.

### Expected values (measured on production 2026-10-03; re-measure the day before)

| Before step 07 | Value |
|---|---|
| app users / sign-ins / app users without a sign-in | 7 / 9 / 0 |
| connections / with a league / distinct leagues | 10 / 10 / 7 |
| moves / league-scoped / unscoped / scoped with rules | 9 / 3 / 6 / 3 |
| consent records / deletion audit rows / waitlist | 3 / 6 / 10 |
| Vault secrets / orphaned secrets | 14 / 0 |

After each step, the restored copy showed this (production should match unless it changed since):

| After | New counts |
|---|---|
| 03 | 7 leagues, 10 memberships |
| 04 | players, crosswalk and unresolved tables, all 0 |
| 06 | `data_events` 0, snapshots 0, shadow log 0 |
| 11 | 3 rule sets, 2 ingest events |
| 12 | `saved_trades` 0 |
| 05 | 3 Ledger calls (the 3 scoped moves); moves still 9 |
| 10 | no rows change |
| 08 | moves 3, `retired_rows` 6, one `retire` event |
| 09 | `beta_reports` 0 |

Vault orphans stay 0 after every step.

### Timings (restored copy of production, 2026-10-03)

Each step's apply took about 0.6–0.7 s end to end, of which about 0.6 s was the ssh and `docker exec`
round trip (measured with an empty query). Every step therefore holds its locks for well under a
second at production's size. Step 01's `VALIDATE` was the longest, at 1.66 s end to end.

---

## Step 07 — close client writes

- **What it changes:** the phone apps and web client can no longer write `moves`, `users` or
  `consent_records` directly. Only the server can. Neither app writes directly today (code search,
  2026-10-03: no `supabase.from(...)` writes in `mobile/` or `frontend/`).
- **Migration name:** `redo_07_close_client_writes`.
- **Verify:** `07.verify.sql`. The owner read policy on `users` stays.
- **Watch:** none expected. Check the iPhone's main screens once.
- **Rollback:** `07_close_client_writes.down.sql` re-grants. Lossless, always.
- **Approval:** ☐ Founder approves step 07 — date/time: ________

## Step 01 — tie every app user to its sign-in

- **What it changes:**
  - Every `users` row must belong to a sign-in account. It is checked now (0 exceptions) and enforced
    from now on.
  - Adds `users.updated_at`, which the data export already asks for.
  - Deletes nothing.
  - A sign-in deleted from the Supabase dashboard while Omen still holds that person's rows is refused,
    so Vault secrets can't be stranded.
- **Migration name:** `redo_01_identity_link`.
- **Verify:** `01.verify.sql`.
- **Watch:** a new sign-in goes through (`ensureAppUser` creates the app row from the sign-in, so it
  always has one). `GET /api/user/export` stops failing on `users.updated_at`. It still fails on the
  separate `moves.feature` bug, which is a server ticket.
- **Rollback:** `01_identity_link.down.sql` drops the foreign key and column. Lossless, always.
- **Approval:** ☐ Founder approves step 01 — date/time: ________

## Step 02 — credentials change in one transaction; health recorded

- **What it changes:**
  - Four health columns on `platform_connections`. Every existing row starts as `unknown`.
  - Five server-only functions that change a cookie or token and its pointer together.
  - With A0 deployed, ESPN connect, disconnect, the Yahoo token store and the Yahoo refresh switch onto
    them immediately.
- **Migration name:** `redo_02_connection_credentials`.
- **Verify:** `02.verify.sql`. No client role can execute the functions; the server can.
- **Watch, the important one:**
  - The server log line "Step 02 function not present; using the legacy credential path" must stop
    appearing after the apply.
  - On the founder's iPhone, reconnect ESPN, then check League.
  - Vault orphans are still 0 in `snapshot.sql`.
  - Watch 5xx on `/api/platforms/*` and the Yahoo routes.
  - These functions have never been called through the REST layer before production. If the reconnect
    fails, roll back. A0 falls back to today's path by itself once the functions are gone.
- **Rollback:** `02_connection_credentials.down.sql`. Credentials are untouched; only the health history
  is lost.
- **Approval:** ☐ Founder approves step 02 — date/time: ________

## Step 03 — leagues and memberships

- **What it changes:** adds the shared `leagues` table (one row per real league and season) and each
  person's memberships. It fills them from today's connections: 7 leagues, 10 memberships.
  `platform_connections` is untouched.
- **Migration name:** `redo_03_leagues_memberships`. **Date window:** the backfill names season 2026 and
  refuses to run outside 2026-08-01 – 2027-03-01.
- **Verify:** `03.verify.sql`.
- **Watch:** nothing reads these tables yet.
  - Connections made **after** this step get no membership until the follows server ticket (plan A5)
    writes one.
  - Note the count of connections made between this step and that ticket.
- **Rollback:** `03_leagues_memberships.down.sql`. Lossless until the server writes follows.
- **Approval:** ☐ Founder approves step 03 — date/time: ________

## Step 04 — players and the crosswalk (empty)

- **What it changes:** three empty tables for canonical players and provider ids (the D3 job fills
  them).
- **Migration name:** `redo_04_players_crosswalk`.
- **Verify:** `04.verify.sql`.
- **Watch:** none.
- **Rollback:** `04_players_crosswalk.down.sql`. Lossless, always.
- **Approval:** ☐ Founder approves step 04 — date/time: ________

## Step 06 — projections, the shadow log and the data record

- **What it changes:**
  - Adds the record of every data batch and purge (`data_events`).
  - Adds the projection snapshots and the shadow log, all empty.
  - A snapshot must cite its own provider's projections ingest (plan A4).
  - A purge waits for inserts in flight (Codex, #528).
- **Migration name:** `redo_06_projections_shadow`.
- **Verify:** `06.verify.sql`.
- **Watch:** none. Nothing writes these tables yet.
- **Rollback:** `06_projections_shadow.down.sql`. Lossless until the first logged week. Roll back steps
  11 and 08 first if they are applied (they write `data_events`).
- **Approval:** ☐ Founder approves step 06 — date/time: ________

## Step 11 — league scoring rules, in their own compartment

- **What it changes:**
  - Each league's scoring rules get their own table, kept for two recorded uses: grading calls against
    the league's own scoring, and advice in its real format.
  - It fills them from the 3 league-scoped moves: 3 rule sets across 2 providers, with one recorded
    ingest per provider.
  - `scoring_rules_purge()` removes a provider's rules in one recorded call.
  - `moves` is untouched.
- **Migration name:** `redo_11_league_scoring_rules`.
- **Verify:** `11.verify.sql`.
- **Watch:** none. Nothing reads these tables yet.
- **Rollback:** `11_league_scoring_rules.down.sql`. Lossless until the server writes its own rule sets.
  A `retire` record is kept.
- **Approval:** ☐ Founder approves step 11 — date/time: ________

## Step 12 — saved trades

- **What it changes:**
  - An empty `saved_trades` table: one row per saved trade, with the trade itself.
  - The owner can read their own rows; only the server writes.
  - Rows cascade with the account.
  - The export already includes it (#529).
- **Migration name:** `redo_12_saved_trades`.
- **Verify:** `12.verify.sql`.
- **Watch:** `GET /api/user/export` returns `saved_trades: []`. Nothing writes the table until #519 is
  reworked onto it.
- **Rollback:** `12_saved_trades.down.sql`. Lossless until the first saved trade.
- **Approval:** ☐ Founder approves step 12 — date/time: ________

## Steps 05 and 10 — the Ledger, then one-transaction account erasure (back to back, approved separately)

- **What it changes:**
  - **05** adds the Ledger (`decisions` and its children). It copies the 3 league-scoped moves into it;
    `moves` itself is untouched.
  - From 05 on, a plain delete of anyone with a call is refused.
  - **10** adds `account_erase()`. With A1 deployed, `/api/user/delete` uses it the moment it exists.
- **Migration names:** `redo_05_ledger`, then `redo_10_account_erasure` immediately after 05 verifies.
- **Verify:** `05.verify.sql`, then `10.verify.sql`.
- **Watch:**
  - Delete a test account made for the purpose, on the device. Expect `deleted: true`, the sign-in
    gone, one audit row, and Vault orphans 0.
  - The Ledger screen still reads `moves`.
  - Watch 5xx on `/api/user/delete` and `/api/moves`.
- **Rollback:**
  - `10_account_erasure.down.sql` drops the function (lossless). It refuses while step 09 is applied, so
    roll back 09 first (#534). A1 then falls back, which step 05 blocks for anyone with a call, so roll
    back 05 too.
  - `05_ledger.down.sql` is lossless until the server writes its first call.
- **Approval, step 05:** ☐ Founder approves step 05 — date/time: ________
- **Approval, step 10** (only after `05.verify.sql` printed `VERIFIED 05`, and before deletion is used):
  ☐ Founder approves step 10 — date/time: ________. Get both approvals before starting 05, so that 10
  follows within minutes. Between 05 and 10, deletion uses today's path, which 05 blocks for anyone
  with a call.

## Step 08 — retire the 6 unscoped moves

- **What it changes:**
  - Deletes the 6 legacy `moves` rows with no league. The step aborts unless there are exactly 6
    (founder decision, 2026-10-01).
  - Exact copies are held for 30 days, then purged by the daily job (A3).
  - The retirement is recorded.
- **Precondition:** A3 is deployed and its first run is seen in the cron log.
- **Migration name:** `redo_08_retire_unscoped_moves`.
- **Verify:** `08.verify.sql`: 0 unscoped moves, 6 held copies, a `retire` event.
- **Watch:** the affected users' Ledger shows the scoped calls only. Watch 5xx on `/api/moves`.
- **Rollback:** `08_retire_unscoped_moves.down.sql` puts the rows back exactly. **This works only for
  30 days**, after which the copies are purged by design.
- **Approval:** ☐ Founder approves step 08 — date/time: ________

## Step 09 — beta reports

- **What it changes:**
  - Adds the `beta_reports` table behind the in-app Report button, with its 30-day purge.
  - With A2 deployed, the route refuses pasted cookies.
  - Reports are keyed to the sign-in, so a person with no app row can report. `account_erase()` deletes
    them, and deleting the sign-in removes any report filed during an erase.
- **Precondition:** A2 and A3 are deployed.
- **Migration name:** `redo_09_beta_reports`.
- **Verify:** `09.verify.sql`.
- **Watch:** send one report from the iPhone. Expect 201, where today it returns 503, and one row.
- **Rollback:** `09_beta_reports.down.sql`. Lossless until the first saved report.
- **Approval:** ☐ Founder approves step 09 — date/time: ________
