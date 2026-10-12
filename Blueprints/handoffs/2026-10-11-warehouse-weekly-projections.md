# Warehouse weekly projections (2026-10-11)

Founder decision 2026-10-11: accept the rights risk on Sleeper's rotowire-tagged projections (commercial permission
pending), STORE them, use them only inside the product, never redistribute raw projections, keep source and provenance
on every row, keep a kill switch. Nothing here was deployed or applied to production.

Design and operations notes: `infra/warehouse/projections.md`. Stacked on PR #645 (Yahoo projections), which has not merged:
`src/adapters/sleeper.js` and `yahooProjections.js` are the consumers, so the PR base is `yahoo-projections-sleeper-scored`.
If #645 merges first, retarget this PR to `main`.

## What exists now

- Did the warehouse already have projection tables? No. Schema 0001 has facts, the crosswalk and metric runs only, and
  `warehouse_ingest_events` pins `rights_basis` to `nflverse_open_data`, so projections get their own receipt table.
- Migration `warehouse/migrations/0005_weekly_projections.sql` (additive): `projection_fetch_runs` (receipt),
  `player_weekly_projections` (current, PK `source, season, week, source_player_id`, `player_id` nullable crosswalk link),
  `player_weekly_projection_versions` (append-only history, trigger-enforced). The API reader role can read only the current
  table; receipts and history are readable by operators (postgres) and the backup role. Applier with pinned checksum:
  `0006_apply_weekly_projections.sh` (ledger version 3, 5 s lock timeout and 60 s statement timeout, NOT idempotent: a second
  run fails cleanly with "relation already exists" and rolls back).
- Ledger version 3 is tolerated everywhere the ledger is read: `targetIdentity.js` (ingest preflight) now accepts versions 2
  and 3 (a ledger that is not contiguous from 1, or any other version, still stops the ingest before a fact is written);
  `monitor/status.js`, `monitor/status-export` and the compose healthcheck count only the v1 and v2 rows, so they are
  unaffected; `provision-login-roles.sh` looks for v2 only; backup and restore-proof use `max(version)` (manifest
  `schema_version` becomes 3, tag `schema-v3`) and compare it to itself. `production_readonly.sql` accepts version 3 and, once
  it exists, checks the three tables, both append-only triggers, the `rights_basis` check, the writer (no update or delete on
  history), the reader (current table only) and the backup grants. Rehearsed on a local PostgreSQL 17: passes before and after
  applying, fails if a broad grant gives the writer UPDATE on the history table.
- Writer/source/stage: `sleeperProjectionSource.js`, `projectionWriter.js`, `projectionStages.js`, wired in
  `currentSeasonCommand.js` behind `FOOTBALL_WAREHOUSE_PROJECTIONS_ENABLED=true`, always report mode, current week + next 2.
  A response under 50 rows, or under 80% of the previous successful fetch of that week, is refused (`source_too_small`,
  `source_partial`) with a failed receipt and no write.
- Read path: `projectionRepository.js` (on the read runtime as `projectionRepository`), `storedProjections.js`, hooked into the
  two projection fetchers in `src/adapters/sleeper.js` (after Redis, before live). One shared warehouse read per week per
  process, kept 5 minutes; a failed or empty read is remembered 60 seconds. Falls back to the live fetch when the stored week is
  missing, older than `FOOTBALL_PROJECTIONS_MAX_AGE_HOURS` (default 26), has fewer than 50 players, the query fails, the mode is
  `supabase`, the store read flag is off, or `FOOTBALL_PROJECTIONS_DISABLED=1`. Stored values are NOT written into the 1 h Redis
  projection cache, so a stored value never outlives its own age limit.
- Tests: `test/footballWarehouseProjections.test.js`, `test/footballWarehouseProjectionsLedger.test.js` (ingest command with the
  real target check against a ledger at version 2 and 3, read-path load shape), `test/footballWarehouseTargetIdentity.test.js`,
  and the PostgreSQL 17 integration `LC_ALL=en_US.UTF-8 bash warehouse/test/run-weekly-projections.sh`.

## Decisions and limits

- Rows are keyed by the Sleeper id, with `player_id` NULL when the crosswalk lacks the id, so the stored week is as complete as
  the live response (team defences included). The writer fills `player_id` later without creating a content version.
- The stat line is stored exactly as delivered; the adapter derives the points map and stat-line map from it with the same
  functions the live path uses.
- Read freshness uses `fetched_at`, which advances on every confirming fetch.
- **Freshness trade-off.** The stage runs once a day (07:15 ET), so a stored week is up to about a day old (26 h limit). Projections
  change on game days (inactives, injuries); the live Sleeper fetch is at most an hour old. Turning the read on makes projections
  stable and under our control, but on game days it is staler than today. There is no game-day refresh in this PR. Live Sleeper stays
  the more current source on game days; if that matters for the beta, either keep the read flag off on game days or add a refresh.
- A per-request warehouse failure degrades to the live fetch, not to no projections. Startup misconfiguration in warehouse mode
  remains fail-closed as before.
- Shadow mode: there is no side-by-side comparison; compare once by hand (queries below) before turning the read flag on.
- Backups: the nightly dump now contains the provider projection tables (rights pending). Backup and restore-proof row counts
  are a fixed required set (`manifest.js`) and were not extended, so restore-proof does not count the new tables; the full-schema
  dump still contains them. Removal (below) must also account for existing backup snapshots.
- The migration and apply script are not in the pinned release-root manifests (`publish_release_root.py`, `build-release.sh`,
  `verify-release.sh`, `footballWarehouseReleaseArtifact.test.js`, compose healthcheck); apply from a repo checkout as below.
- ESPN needs no change (its rosters carry ESPN's own projection). Yahoo uses the stat lines through the Sleeper adapter.

## Production apply (founder, exact commands, NOT run)

The order matters: ledger version 3 must already be tolerated by the running ingest worker before the schema exists, otherwise the
next 07:15 ET ingest stops at its target check.

1. **Deploy first.** Build and select a release that includes this code (the ingest worker image carries `src`). Do NOT yet add the
   projections flag. This release accepts ledger versions 2 and 3, so it runs unchanged against today's schema. Confirm with a
   manual run: `sudo systemctl start omen-warehouse-ingest`, then `journalctl -u omen-warehouse-ingest -n 40` shows a succeeded run.
2. **Back up.** `sudo systemctl start omen-warehouse-backup` and confirm it finished.
3. **Apply the schema, outside the 07:15 ET ingest window** (the apply has a 5 s lock timeout, but do not race the ingest). From a
   checkout of this PR on KVM1:

```sh
docker cp warehouse/migrations/0005_weekly_projections.sql omen_football_warehouse:/tmp/0005_weekly_projections.sql
docker cp warehouse/migrations/0006_apply_weekly_projections.sh omen_football_warehouse:/tmp/0006_apply_weekly_projections.sh
docker exec -e WAREHOUSE_WEEKLY_PROJECTIONS_FILE=/tmp/0005_weekly_projections.sql \
  omen_football_warehouse bash /tmp/0006_apply_weekly_projections.sh
docker exec omen_football_warehouse rm -f /tmp/0005_weekly_projections.sql /tmp/0006_apply_weekly_projections.sh
bash infra/warehouse/verify-production-readonly.sh
```

   Expected checksum of 0005: `e689d5878bbe51f3bbe6aa0188b725e33bde7f9da8497bd8b002a2307505917d` (the applier refuses anything else).
   It is not idempotent: running it twice fails on the second run with "relation already exists" and changes nothing.
4. **Post-apply check that the worker still passes its target check against ledger version 3**, before enabling the stage:

```sh
sudo systemctl start omen-warehouse-ingest          # or the release's `ingest --season YYYY` / `source-validate` command
journalctl -u omen-warehouse-ingest -n 40           # must show state "succeeded", not warehouse_target_mismatch
```

5. **Enable the stage.** In the release's `infra/warehouse/docker-compose.yml`, `ingest` service, `environment:`, next to the derived flag:

```yaml
      FOOTBALL_WAREHOUSE_PROJECTIONS_ENABLED: "true"
```

   No new secret: the fetch is the public Sleeper endpoint over the `omen_network` egress the nflverse download already uses.
   Run the ingest once and check:

```sh
docker exec omen_football_warehouse psql -U postgres -d omen_football -c \
 "select season, week, state, source_rows, rows_inserted, rows_changed, rows_unchanged, rows_unmatched, error_code, fetched_at
    from football.projection_fetch_runs order by id desc limit 6;"
docker exec omen_football_warehouse psql -U postgres -d omen_football -c \
 "select week, count(*) players, count(player_id) mapped, max(fetched_at) from football.player_weekly_projections group by week order by week;"
```

6. **Turn the API read on only after step 5 shows two or three weeks of rows and a sane mapped ratio.** On the API host, with
   `FOOTBALL_DATA_MODE=shadow` already set: `FOOTBALL_PROJECTIONS_STORE_READ_ENABLED=true`. Read the freshness trade-off above first:
   on game days the stored projections can be up to a day old while the live Sleeper fetch is not. Kill switch, either side,
   immediate: `FOOTBALL_PROJECTIONS_DISABLED=1`.

Rollback: unset the two enable flags (and restart the API). Full removal is in `infra/warehouse/projections.md`.

## Open items

- Founder: Sleeper/rotowire commercial permission. If refused, set the kill switch, drop the three tables, and decide what to do
  about existing backup snapshots that contain them.
- Decide whether to add 0005/0006 to the pinned release root so the apply no longer needs a checkout.
- Decide on a game-day refresh (second ingest run on Sunday morning) if stored reads are to be used on game days.
- After a week of data: compare stored vs live for a handful of players.
