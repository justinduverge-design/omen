<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.player_index_runs

Receipt for provider ids indexed from outside nflverse, so every index row says where it came from.

| | |
|---|---|
| Layer | ledger: How data got here: ingest receipts and schema versions. |
| Grain | one row per player-index load from a non-nflverse source |
| Source | Sleeper public player list |
| Refresh | daily 07:15 ET, after the player ingest |
| Created by | migration 0009 |

## Known gaps

- None known.
