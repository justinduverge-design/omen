# Polars play-by-play reader (Phase 3, shadow)

Reads the nflverse **Parquet** asset with Polars and builds the same rows the Node CSV adapter
(`src/services/footballWarehouse/playByPlaySource.js`) gives `playByPlayWriter.js`. Nothing here writes to the
warehouse yet; the production switch is `WAREHOUSE_INGEST_ENGINE=csv|polars` (plan switchboard), still `csv`.

```bash
uv run --no-project --with "polars>=1.30" --with numpy python -I pbp_polars.py build <parquet> <season> <gsis.csv> <teams.json> <out.parquet>
uv run --no-project --with "polars>=1.30" --with numpy python -I pbp_polars.py diff  <out.parquet> <prod-plays.csv.gz>
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

## Next (each needs approval)

1. A `football_shadow` schema in the warehouse (migration, change window), and a `load` command that COPYs these
   rows into `football_shadow.nfl_plays`.
2. Polars and numpy in the warehouse worker image (uv lock), then a shadow run beside the CSV ingest and a SQL diff.
3. Flip `WAREHOUSE_INGEST_ENGINE` only after a clean week of shadow diffs.
