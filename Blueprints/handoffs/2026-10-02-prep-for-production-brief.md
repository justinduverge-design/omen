# Prep-for-production session — brief (2026-10-02)

**What this session is:** one day of preparation, so the database redo can go to production cleanly. It is **not** the production session. Founder, 2026-10-02: "We're going to take one day to prep it, make sure everything is where we need it to go so that when we do it, we can really do it well."

**Hard rules (unchanged):**
- No writes to production, no migrations against production, no reading or printing secrets.
- Read-only introspection of production through the Supabase connector only with the founder's yes. Order: founder approval → scratch/staging → verification → production.
- Jules and Muse never touch the database. Claude builds, Codex reviews, the founder merges.
- Read each PR's Codex review on its latest head **before** merging, not only CI (decision log, 2026-10-02).
- Do not touch mobile code: the phone session owns it.

**Read first:**
- `Blueprints/handoffs/2026-10-01-database-redo.md`: verification table and production order.
- `Direction/reviews/2026-10-02-codex-action-plans.md`: plan A is this session's core.
- `Blueprints/rebuild/omen-database-redo-v1.md`, §7 migration plan and §8 slice.
- `sql/2026-10-01-redo/README.md`.
- `Direction/decision_log.md`: the three 2026-10-02 entries.

**State at hand-off:**
- **#514** is open: the Codex fixes for #511 and the compiled review. CI is green; Codex's review was still pending at hand-off. Read the review before merging.
- Two sessions the founder started on 2026-10-02 may have open PRs: the trade-finder cache fix and the League Office comment bug.
- Production has nothing from the redo applied.

## The prep list

Do these in order. Each one ends with something checkable.

### 1. Clear the drop cloths: merge state
- [ ] #514: Codex review read, findings fixed or answered, merged.
- [ ] Trade-cache and League Office PRs: status known; merged if reviewed and green.
- [ ] `main` CI green on the merge commit. Record the SHA.

### 2. Fix the surface: code that must exist before the steps (plan A)

Each item is its own PR with tests, reviewed by Codex.

- [ ] **A0. Connect paths on the step 02 functions (Codex, #514).**
  - Today's ESPN connect (`src/routes/platforms.js:652-675`) and Yahoo token storage (`src/services/yahooAuth.js:48-80`) create Vault secrets and upsert `platform_connections` in separate calls, outside the advisory locks.
  - `account_erase()` cannot serialize with them. An erase between "secrets created" and "connection saved" leaves orphaned secrets.
  - Move both onto `connection_store_espn()`/`connection_store_yahoo()`. Move disconnect onto `connection_revoke()` and the Yahoo refresh onto `connection_rotate_yahoo()`. Each keeps today's path when the function doesn't exist.
  - Must be **deployed before A1**.
- [ ] **A1. Account deletion on `account_erase()`.**
  - `src/routes/userPrivacy.js` calls `rpc('account_erase')` when the function exists. When it doesn't (missing function: PostgREST `PGRST202`/`42883`), it keeps today's path.
  - Test both paths. This must be **deployed** before step 05.
- [ ] **A2. Beta-report credential filter.** `src/routes/betaReports.js:6` misses `ESPN S2 = …`, `espn-s2`, `s2=` and cookie-shaped values. Tests with real-looking samples.
- [ ] **A3. Purges scheduled.** `beta_reports_purge_expired()` and `retired_rows_purge_due()` run daily from the cron container (`Dockerfile.cron`) through the server key. They log their counts, and a missing function is skipped quietly, so the job can ship before steps 08/09.
- [ ] **A4. Step 06 ingest-event check.**
  - A trigger on `projection_snapshots`: the cited `data_events` row must be an `ingest` for the same provider.
  - Update `06_*.up/down/test`. Add a deliberate mutation that the test catches.
- [ ] **New: scoring-rules compartment (founder decision, 2026-10-02 night).** Design and write a redo step 11.
  - `league_scoring_rules`: provider, league, season, the rule body as stored today, the contract version and hash, and its `data_events` ingest id.
  - `scoring_rules_purge(provider, reason, approved_by)`, recorded the same way as `projections_purge`.
  - `decisions` keeps only version and hash, no foreign key, so a purge breaks nothing.
  - Backfill from `moves.scoring_contract` where present.
  - The table records **why** the rules are used: grading against the league's own scoring, and advising in its real format.
  - Up/down/test, then rehearse.

- [ ] **New: saved trades table (T4, PR #519 left open; founder, 2026-10-02).** Design and write a redo step 12.
  - Today `src/services/tradeSavedQueueStore.js` keeps each user's saved trades as **one Redis blob** (`omen:trade_saved_queue:{userId}`, no TTL). Codex on #519 found two problems the table fixes:
    - **Lost saves.** Every change reads the whole list and writes it back, so two quick saves can drop one. A table with one row per saved trade and an atomic insert makes each save safe. **The unique key cannot be (user, candidate) alone** (Codex, #521): `buildCandidateRecord` in `src/services/tradeFind.js` builds the id from the opponent team and two player ids only, so the same swap gets the same id in two leagues or two weeks. Key on at least (user, provider, league, season, week, candidate), or have the server issue a globally unique id at find time.
    - **Not erased.** `account_erase()` and data export do not know about it. The table has a foreign key to `users` with cascade (or a line in `account_erase()`), and export includes it.
  - Columns from the T4 record: candidate id, reasoning (verbatim from first save), state `saved`/`sent`, outcome `accepted`/`rejected`/`countered`/null (self-report only), saved/sent/outcome timestamps, and the trade itself (see the open decision below). RLS: owner only; server writes.
  - Up/down/test, then rehearse. Backfill: none (no app calls the endpoint yet; nothing in Redis to move).
  - **Decided (founder, 2026-10-02): the server remembers every trade it shows, not only the best.** The save button still sends only `candidate_id` and `reasoning`, so the table needs a second piece:
    - Each `/api/trade/find` response's candidates (at most `MAX_CANDIDATES_RETURNED` = 10) are kept server side, per user, with players, both teams, provider, league, season and week. Short-lived (match the find cache, 15 min, or longer if the founder prefers); never shown to anyone but that user.
    - **Candidate ids become globally unique** (Codex, #522). Today's id (`find_{opponent}_{give}_{receive}`) repeats across leagues and weeks, so a lookup by id alone could save the wrong league's trade. `/api/trade/find` issues a batch token per response and folds it into each candidate's id. The app already treats the id as opaque and sends it back unchanged, so this is still no iPhone change; the `trade-find.v1` contract keeps `id` a string.
    - On save, the server looks the id up in the caller's own kept batches and writes the full trade into the saved-trades row. No iPhone change.
    - Batch expired or id not found: the save returns `{status: "error"}` with a code the app can turn into "refresh the search". Never a save with missing trade data.
    - Staleness then compares the saved players and both rosters, not only position need.
    - Not "best only": the review screen saves whichever card is swiped (`TradeFindReviewViewModel.save()`), so keeping only the top candidate would fail most saves.
  - Also on #519, not database: `GET /api/trade/saved` reads the roster once per item; group by league/week.

### 3. Tape the edges: compatibility check per step

For each of steps 01–12, write down what today's server does against the changed schema:
- Grep `src/` for every table and column the step touches.
- Note any client or route that would break, and how.

Known so far:
- Step 05 breaks deletion until A1 ships.
- Step 07 removes client writes, which no app uses (verified 2026-10-01; re-check iOS for any `supabase.from(` write).
- Step 12 replaces the Redis store `#519` uses: #519 has to move onto the table, and the export and erasure changes ship with it or before.
- Step 01's foreign key needs every `users` insert to come after an auth user exists (re-check signup paths).

Output: a table in the handoff. A step with an unexplained break does not go.

### 4. Check the ladder: backup and restore
- [ ] Confirm last night's KVM1 Restic snapshot exists and passes its checksums.
- [ ] Write the step for **production day**: take a fresh snapshot right before the first step, then a restore test into the isolated KVM1 clone (`scripts/db/kvm1-restored-clone.sh`).
- [ ] Rollback per step: name the `.down.sql` file and the condition that triggers it. For step 08, note that rollback works only for 30 days.

### 5. Write the job sheet: the production runbook

One page per step: `Blueprints/handoffs/<date>-production-runbook.md`. Each page has:
- **What it changes,** in plain English for the founder's approval.
- **Preflight:** read-only queries to run minutes before (row counts and the step's own guards). Expected values, re-measured on prep day. On 2026-10-02 they were 7 users, 10 connections, 7 leagues, 9 moves, 6 without a league.
- **Apply mechanism:** decide it and use one only. Supabase MCP `apply_migration`, which records the change in `supabase_migrations`, or psql over a founder-run tunnel. The agent never holds the database password. Record the migration names.
- **Verify:** post-checks, using the step's `.test` assertions that are safe read-only on production, plus a catalog diff with `catalog.js compare-production` adapted for the new expected state.
- **Watch:** what to check for an hour afterwards: GlitchTip, 5xx on the routes that touch the step's tables, the iPhone's main screens.
- **Rollback trigger and file.**
- **Founder approval line:** the founder approves each step separately.

The order (from the handoff, updated 2026-10-02):
1. 07, 01, 02, 03, 04;
2. 06 (after A4);
3. 11 (rules compartment), and 12 (saved trades) once its design is approved;
4. A0 then A1 deployed;
5. 05 and 10 together;
6. 08 and 09 (after A2 and A3).

### 6. Dry run: the whole job on a copy

Restore the newest backup on KVM1 and apply **every step in the production order, as the runbook says**. Not the rehearsal order: up only, with each step's preflight and verify, like the real day.
- Then run today's server test suite against that database where possible, or at least the deletion and export routes.
- Record timings: how long each step holds locks on the real data size.
- Delete the copy and confirm it is gone.

Also re-run V1 (real Supabase) for steps 06, 11 and 12. The throwaway project needs waking; pause it afterwards.

### 7. Go / no-go sheet

A one-screen checklist the founder reads on production day:
- everything above is checked;
- the backup is fresh;
- no open Codex P1 on any redo file;
- CI green on `main`;
- the founder is available for the hour after.

### Close-out
- Set D2 to show prep complete, with the remaining blocker "founder-approved production orders".
- Update the handoff verification table, decision log, ledgers and gates as usual.
- Write a dated handoff.

## Out of scope for this session
- Applying anything to production.
- Server tickets beyond A1–A3: Ledger write path, Tuesday scoring, follows RPCs. They follow the redo.
- Plans B–I in the action-plans file, except where they block a step. ESPN/Yahoo trade-finder fixing (D1, decided "fix it") is queued separately.
