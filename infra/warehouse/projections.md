# Weekly projections in the warehouse

Third-party weekly player projections (first source: Sleeper's public projections endpoint, whose records are tagged
`company: "rotowire"`) stored in `football.*`. This is not nflverse open data. Founder decision 2026-10-11: accept the
rights risk, STORE the projections, use them only inside the product, never redistribute the raw rows, keep provenance
on every row and keep a kill switch. Commercial permission from the provider is still pending.

## What is stored

| Table | Role |
|---|---|
| `football.projection_fetch_runs` | One receipt per (source, season, week) fetch: `rights_basis = provider_projection_permission_pending`, source URL, `source_ref` (sha256 of the response body), byte and row counts, inserted/changed/unchanged/unmatched counts, or a failed receipt with a code. |
| `football.player_weekly_projections` | Current row per `(source, season, week, source_player_id)`: `player_id` (warehouse player through the crosswalk, NULL until the crosswalk knows the id: team defences, rookies), `company` as delivered, `stat_line` jsonb with the keys exactly as delivered, `content_hash`, `version`, `first_fetched_at`, `last_changed_at`, `fetched_at` (last fetch that confirmed the row), `fetch_run_id`. |
| `football.player_weekly_projection_versions` | Append-only history, one row per distinct content (version 1, 2, ...). Writer role has INSERT and SELECT only, and a trigger rejects UPDATE, DELETE and TRUNCATE for everyone. |

Migration: `warehouse/migrations/0005_weekly_projections.sql` (additive; nothing from 0001/0003 changes), recorded as ledger
version 3 by `0006_apply_weekly_projections.sh`. It is not part of the pinned release-root file list yet (see the handoff).

## Write path (ingest)

`src/services/footballWarehouse/`: `sleeperProjectionSource.js` (fetch, bounded, no secrets) then `projectionWriter.js`
(one transaction per week: advisory lock, receipt, upsert, new versions) driven by `projectionStages.js`.

- Runs after the nflverse facts and derived stages in `currentSeasonCommand.js`, for the current NFL week and the next two
  (weeks 1-18 only, only when the ingested season is the live one).
- Opt in with `FOOTBALL_WAREHOUSE_PROJECTIONS_ENABLED=true` on the ingest unit. Off by default.
- Always report mode: a failed week becomes `{ state: "failed", code }` in the command's JSON summary. It never fails the
  nflverse ingest, never changes the exit code, never turns the daily heartbeat down. Read failures in the journal, or
  `SELECT * FROM football.projection_fetch_runs WHERE state = 'failed' ORDER BY id DESC`.
- A source that returns fewer than 50 usable rows, or fewer than 80% of the previous successful fetch of that week (`source_partial`), is refused with a failed receipt, so an outage that returns an empty
  array cannot look like a successful refresh.
- Idempotent: an identical re-fetch only advances `fetched_at`. A changed stat line bumps `version` and appends a history row.
  A player the source stops delivering keeps its older `fetched_at` and is excluded by the read path; history keeps it.

## Read path (API)

`storedProjections.js` is asked by `src/adapters/sleeper.js` (`fetchSleeperProjections`, `fetchSleeperProjectionStatLines`)
after the Redis cache and before the live fetch, so the Omen call, Start/Sit detail, waivers, optimizer, league screens and
`yahooProjections.js` all use it without changes. ESPN rosters carry ESPN's own projection and do not use this path.
A stored week is used only when every gate holds; otherwise the adapter makes today's live fetch:

1. `FOOTBALL_PROJECTIONS_DISABLED` is not `1` (kill switch).
2. `FOOTBALL_PROJECTIONS_STORE_READ_ENABLED=true` (opt-in, default off).
3. `FOOTBALL_DATA_MODE` is `shadow` or `warehouse` (`supabase` never reads the warehouse). Warehouse mode keeps its existing
   fail-closed startup behavior for a bad credential or target. A per-request query failure degrades to the live fetch, not to
   a missing projection, because the live fetch is what runs today.
4. The latest fetch of that week is no older than `FOOTBALL_PROJECTIONS_MAX_AGE_HOURS` (default 26, range 1-168) and holds at
   least 50 players.

The raw rows are never returned by any route; callers turn stat lines into per-league scores. Nothing is written to the 1 h Redis
cache from this path (a stored value must not outlive its age limit); the reader keeps one shared read per week for 5 minutes and
remembers a failed read for 60 seconds.

Freshness: the stage runs daily, so a stored week is up to about a day old. Live Sleeper is the more current source on game days.
See the handoff for the trade-off.

Backups: the nightly dump now includes these provider projection tables. Restore-proof row counts are a fixed set and do not
cover them.

## Kill switch and removal

- `FOOTBALL_PROJECTIONS_DISABLED=1` on the API stops stored reads (live fetch continues) and on the ingest unit stops the stage.
- Unset `FOOTBALL_WAREHOUSE_PROJECTIONS_ENABLED` to stop storing; unset `FOOTBALL_PROJECTIONS_STORE_READ_ENABLED` to stop reading.
- If permission is refused: set the kill switch, then drop the three tables (`player_weekly_projection_versions`,
  `player_weekly_projections`, `projection_fetch_runs`, in that order), the function `football.reject_projection_version_change()`, and
  delete ledger row version 3, all in one transaction. Exact SQL, plus the post-drop verify, is in the handoff's Rollback section
  (`Blueprints/handoffs/2026-10-11-warehouse-weekly-projections.md`). Nothing else depends on them.
- **Never run an ingest worker image older than this release while ledger version 3 is applied**: older `verifyWarehouseTarget` accepts only
  version 2, so every ingest fails and, because backups run on `OnSuccess`, no backups are taken. Drop the schema back to version 2 first.
- A legitimate shrink of more than 20% (`source_partial`) needs the baseline moved by hand; the handoff has the exact SQL.
- Backups: retention groups by `host,tags`; schema-v3 snapshots form a new group and schema-v2 snapshots will not age out by themselves.
- Re-running the 0003 access policy after version 3 over-grants (writer UPDATE/DELETE and reader SELECT on the history table);
  `production_readonly.sql` flags it.

## Tests

`test/footballWarehouseProjections.test.js` (source, writer, stage isolation, command isolation, read gates, adapter fallback)
and the PostgreSQL 17 integration `warehouse/test/run-weekly-projections.sh` (idempotency, versioning, late crosswalk,
append-only, grants). On macOS prefix the integration with `LC_ALL=en_US.UTF-8`.
