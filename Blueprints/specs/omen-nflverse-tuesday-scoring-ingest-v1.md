# Omen nflverse Tuesday Scoring Ingest v1

**Status:** Approved B3 implementation contract
**Source:** Public nflverse-data GitHub release CSV
**Frequency:** Tuesday scoring worker; one read per distinct stored move season/week

## Source and access

- URL shape: `https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats_<season>.csv`
- Authentication and cost: none; public no-key read.
- License posture: existing `src/services/matchupService.js` records nflverse-data as MIT-licensed. This task adds no paid provider, account, or credential.

## Mapping and freshness

The worker selects CSV rows by each pending move's stored `season` and `week_num`, rather than applying one wall-clock week to all rows. It maps player identity from the CSV's player name and uses `fantasy_points_ppr` for PPR, `fantasy_points` for standard, and their average for Half PPR when both values are present. Non-numeric rows are omitted rather than interpreted as zero.

The source is season-wide and may be corrected after publication. The worker caches each season/week score map for one hour; a subsequent run refreshes after expiry. The existing `moves` query and scoring heuristic remain unchanged.

## Safety and idempotency

- Existing pending-move filters remain the only scoreable input.
- `OMEN_CRON_DRY_RUN=true` performs the same reads and scoring calculation but performs **no** Supabase updates, including no archive of unfollowed moves.
- Normal mode retains existing per-move update behavior. No schema, production flag, deploy, or configuration change is part of B3.
- nflverse fetch failure or a missing score map fails closed; no move is written from partial/unknown player data.

## Validation

- Fixture tests prove CSV mapping, season/week grouping, and PPR/Half PPR/Standard handling.
- A dry-run test proves archive and score update methods are never called.
- The provider read is mocked in tests; no user data or credentials are logged.
