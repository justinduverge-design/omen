# Polars play-by-play reader (Phase 3, shadow)

Reads the nflverse **Parquet** asset with Polars and builds the same rows the Node CSV adapter
(`src/services/footballWarehouse/playByPlaySource.js`) gives `playByPlayWriter.js`. Nothing here writes to the
warehouse yet; the production switch is `WAREHOUSE_INGEST_ENGINE=csv|polars` (plan switchboard), still `csv`.

```bash
uv run --no-project --with "polars>=1.30" --with numpy python -I pbp_polars.py build <parquet> <season> <gsis.csv> <teams.json> <out.parquet>
uv run --no-project --with "polars>=1.30" --with numpy python -I pbp_polars.py diff  <out.parquet> <prod-plays.csv.gz>
# with libpq env (PGHOST, PGDATABASE, PGUSER, ...) and --with "psycopg[binary]>=3.2":
... pbp_polars.py load    <out.parquet> <season> <source-url>   # replaces that season in football_shadow.nfl_plays, one transaction
... pbp_polars.py diff-db <season>                             # football_shadow vs football, same parity rule
```

`teams.json` maps each team abbreviation in the file to Node's own `teamIdFor`, so the alias table is never copied.

## Parity proof (2026-10-18, read-only exports of production)

| Season | Plays | Unmatched | Build | Peak RSS | Result |
|---|---|---|---|---|---|
| 1999 | 46,131 | 5 (same as prod) | 4.6 s | 1.7 GB | **parity** |
| 2025 | 48,771 | 0 | 5.2 s | 1.7 GB | **parity** |
| 2026 | 14,031 | 0 | 1.4 s | 0.8 GB | parity except 2 plays that nflverse revised after prod's last ingest. Today's CSV matches the Parquet |

Parity means every play is present in both, every id, team, play type and `success` is exact, and every float is within
the CSV's 15 significant digits, including all 372 `source_row` columns. The columns SQL reads as text match exactly.

For comparison, the Node CSV path needs `--max-old-space-size=3072` for one season.

## Shadow table

`warehouse/migrations/0025_football_shadow.sql` (applied by `0026_apply_football_shadow.sh`, version 13) creates
`football_shadow.nfl_plays`. It has no foreign keys, so it can't block the real tables. The writer role can insert and
delete, and the reader and backup roles can read. Rollback: `drop schema football_shadow cascade`.

Tested 2026-10-18 on local Postgres 17.11 holding production's 2025 plays: the migration applied through its script and
the receipt verified. `load` wrote 48,771 rows in 12.8 s at a 0.5 GB peak, and a re-run replaced them. `diff-db`
reported **parity**.

## Production steps (each needs founder approval)

1. Apply `0026_apply_football_shadow.sh` on KVM1 in a change window (`infra/warehouse/runbook.md`). It writes schema
   version 13. The app (`targetIdentity.js`) and `warehouse/verify/production_readonly.sql` accept 13 from this PR on,
   so **deploy the app first, then apply**. Snapshots dump `--schema=football` only, so the shadow is not backed up;
   it is rebuilt from source.
2. Add Polars, numpy and psycopg to the warehouse worker image (uv lock), and run `build` then `load` after the 07:15 ET
   ingest, then `diff-db`. Shadow week: report parity daily.
3. Flip `WAREHOUSE_INGEST_ENGINE` to `polars` only after a clean week. Then retire the 3 GB heap flag.
