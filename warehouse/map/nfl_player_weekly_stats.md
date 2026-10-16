<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.nfl_player_weekly_stats

Box-score lines and PPR points per player-week. Grading and projections read it.

| | |
|---|---|
| Layer | facts: What happened on the field, from public nflverse data. Never edited by Omen. |
| Grain | one row per (season, week, season type, player) |
| Source | nflverse stats_player |
| Refresh | daily 07:15 ET |

## Known gaps

- A player who did not record a stat has no row: absence means did-not-play, not unknown.
