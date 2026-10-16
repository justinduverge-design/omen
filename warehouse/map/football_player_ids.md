<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.football_player_ids

Maps provider ids to the warehouse player. Grading and usage resolve through it.

| | |
|---|---|
| Layer | identity: Who and what: teams and players, and every provider id that points at them. |
| Grain | one row per (provider, provider id) |
| Source | nflverse players (GSIS only today) |
| Refresh | daily 07:15 ET |

## Known gaps

- Holds GSIS ids only. Sleeper, ESPN and Yahoo ids live in the Supabase crosswalk (player_provider_ids), so readers map through Supabase first.
