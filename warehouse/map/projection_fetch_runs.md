<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.projection_fetch_runs

Receipt for each third-party projection fetch.

| | |
|---|---|
| Layer | provider: Third-party numbers Omen stores but does not own (projections). Kept separate and labelled. |
| Grain | one row per projection fetch (source, season, week) |
| Source | Sleeper public projections (upstream: Rotowire) |
| Refresh | weekly, once migration 0005 is applied |
| Created by | migration 0005 |

## Known gaps

- Migration 0005 is written but not applied to production.
