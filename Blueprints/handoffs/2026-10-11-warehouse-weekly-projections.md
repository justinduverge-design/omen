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
  `player_weekly_projection_versions` (append-only history, trigger-enforced). Applier with pinned checksum:
  `0006_apply_weekly_projections.sh` (ledger version 3). `warehouse/verify/production_readonly.sql` now accepts version 3.
- Writer/source/stage: `sleeperProjectionSource.js`, `projectionWriter.js`, `projectionStages.js`, wired in
  `currentSeasonCommand.js` behind `FOOTBALL_WAREHOUSE_PROJECTIONS_ENABLED=true`, always report mode, current week + next 2.
- Read path: `projectionRepository.js` (on the read runtime as `projectionRepository`), `storedProjections.js`, hooked into the
  two projection fetchers in `src/adapters/sleeper.js` (after Redis, before live). Falls back to the live fetch when the stored
  week is missing, older than `FOOTBALL_PROJECTIONS_MAX_AGE_HOURS` (36), has fewer than 50 players, the query fails, the mode is
  `supabase`, the store read flag is off, or `FOOTBALL_PROJECTIONS_DISABLED=1`.
- Tests: `test/footballWarehouseProjections.test.js` (21 cases) and the PostgreSQL 17 integration
  `LC_ALL=en_US.UTF-8 bash warehouse/test/run-weekly-projections.sh` (passes). Full `npm test`: 2297 pass; the one failure is
  `test/sourceSyntax.test.js`, which needs `acorn`, absent from the node_modules I borrowed, unrelated to this change.

## Decisions and limits

- Rows are keyed by the Sleeper id, with `player_id` NULL when the crosswalk lacks the id. That keeps the stored week as
  complete as the live response (team defences included), so swapping the live fetch for the stored one drops nobody. The
  writer fills `player_id` on a later run once the crosswalk knows the id, without creating a content version.
- The stat line is stored exactly as delivered (all keys, including `pts_*` and ranking keys). The adapter derives both the
  points map and the stat-line map from it with the same functions the live path uses.
- Read freshness uses `fetched_at`, which advances on every confirming fetch, so an unchanged projection stays fresh.
- A per-request warehouse failure in warehouse mode degrades to the live fetch (today's behavior), it does not return no
  projections. Startup misconfiguration in warehouse mode remains fail-closed as before.
- Shadow mode: stored reads are served only when `FOOTBALL_PROJECTIONS_STORE_READ_ENABLED=true`. There is no side-by-side
  comparison; compare once by hand (queries below) before turning the flag on.
- Not done: the migration and apply script are not in the pinned release-root manifests (`publish_release_root.py`,
  `build-release.sh`, `verify-release.sh`, `footballWarehouseReleaseArtifact.test.js`, compose healthcheck). That pinning is
  founder-controlled release machinery; apply from a repo checkout as below.
- ESPN needs no change: ESPN rosters carry ESPN's own per-player projection. Yahoo uses the stat lines through the Sleeper
  adapter, so it picks up the stored path automatically.

## Production apply (founder, exact commands, NOT run)

Before: `sudo systemctl start omen-warehouse-backup` and confirm it finished. The commands run from a checkout of this PR on KVM1.

1. Apply the schema (private container, single transaction, checksum-pinned, records ledger version 3):

```sh
cd <checkout of this PR>
docker cp warehouse/migrations/0005_weekly_projections.sql omen_football_warehouse:/tmp/0005_weekly_projections.sql
docker cp warehouse/migrations/0006_apply_weekly_projections.sh omen_football_warehouse:/tmp/0006_apply_weekly_projections.sh
docker exec -e WAREHOUSE_WEEKLY_PROJECTIONS_FILE=/tmp/0005_weekly_projections.sql \
  omen_football_warehouse bash /tmp/0006_apply_weekly_projections.sh
docker exec omen_football_warehouse rm -f /tmp/0005_weekly_projections.sql /tmp/0006_apply_weekly_projections.sh
bash infra/warehouse/verify-production-readonly.sh    # needs production_readonly.sql from this PR, which accepts version 3
```

   Expected checksum of 0005: `f0219156d480f6e4607e19e81a1dee2b4810c29df5c37c1b739142aa832b55fb` (the applier refuses anything else).
   The container's `POSTGRES_USER` and `POSTGRES_DB` are already set in its environment.

2. Build and select a release that includes this code (the ingest worker image carries `src`), then turn the stage on in the
   release's `infra/warehouse/docker-compose.yml`, `ingest` service, `environment:`, next to the derived flag:

```yaml
      FOOTBALL_WAREHOUSE_PROJECTIONS_ENABLED: "true"
```

   No new secret and no new credential: the fetch is the public Sleeper endpoint over the `omen_network` egress the nflverse
   download already uses. The ingest login role gets its table access from the migration's grants to `omen_warehouse_writer`.

3. First run and check (07:15 ET timer, or `sudo systemctl start omen-warehouse-ingest`; the JSON summary gains a
   `projections` object):

```sh
docker exec omen_football_warehouse psql -U postgres -d omen_football -c \
 "select season, week, state, source_rows, rows_inserted, rows_changed, rows_unchanged, rows_unmatched, error_code, fetched_at
    from football.projection_fetch_runs order by id desc limit 6;"
docker exec omen_football_warehouse psql -U postgres -d omen_football -c \
 "select week, count(*) players, count(player_id) mapped, max(fetched_at) from football.player_weekly_projections group by week order by week;"
```

4. Turn on the API read only after step 3 shows two or three weeks of rows and a sane mapped ratio. On the API host, with
   `FOOTBALL_DATA_MODE=shadow` already set:

```sh
FOOTBALL_PROJECTIONS_STORE_READ_ENABLED=true
# optional: FOOTBALL_PROJECTIONS_MAX_AGE_HOURS=36 (default)
```

   Kill switch, either side, immediate: `FOOTBALL_PROJECTIONS_DISABLED=1`.

Rollback: unset the two enable flags (and restart the API). Full removal is in `infra/warehouse/projections.md`.

## Open items

- Founder: Sleeper/rotowire commercial permission. If refused, set the kill switch and drop the three tables.
- Decide whether to add 0005/0006 to the pinned release root so the apply no longer needs a checkout.
- After a week of data: compare stored vs live for a handful of players, then consider `usageShadow`-style telemetry if wanted.
