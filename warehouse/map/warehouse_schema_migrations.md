<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.warehouse_schema_migrations

The warehouse's schema version. The app refuses a warehouse whose version it does not accept.

| | |
|---|---|
| Layer | ledger: How data got here: ingest receipts and schema versions. |
| Grain | one row per applied migration |
| Source | the migration apply scripts in warehouse/migrations |
| Refresh | on migration |

## Known gaps

- None known.
