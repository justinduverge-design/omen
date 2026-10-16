<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.player_weekly_projections

The provider's current weekly projection per player, kept apart from Sight.

| | |
|---|---|
| Layer | provider: Third-party numbers Omen stores but does not own (projections). Kept separate and labelled. |
| Grain | one row per (source, season, week, player): the current projection |
| Source | Sleeper public projections |
| Refresh | weekly, once migration 0005 is applied |
| Created by | migration 0005 |

## Known gaps

- Migration 0005 is written but not applied to production. Commercial permission from the provider is pending.
