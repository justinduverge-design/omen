<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.coach_index_runs

Receipt for coach-graph loads, so every coach and assignment says where it came from.

| | |
|---|---|
| Layer | ledger: How data got here: ingest receipts and schema versions. |
| Grain | one row per coach-graph load |
| Source | Wikipedia team-season pages |
| Refresh | daily 07:15 ET (backfill once, then the current season) |
| Created by | migration 0013 |

## Known gaps

- None known.
