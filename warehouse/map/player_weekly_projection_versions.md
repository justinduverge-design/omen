<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.player_weekly_projection_versions

Append-only history of every projection change, so a call can be judged on the number it actually saw.

| | |
|---|---|
| Layer | provider: Third-party numbers Omen stores but does not own (projections). Kept separate and labelled. |
| Grain | one row per change to a projection |
| Source | Sleeper public projections |
| Refresh | weekly, once migration 0005 is applied |
| Created by | migration 0005 |

## Known gaps

- Migration 0005 is written but not applied to production.
