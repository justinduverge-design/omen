# Parquet vs CSV parity (nflverse play-by-play)

Run with uv (no project install):

```bash
uv run --no-project --with "polars>=1.30" python -I parity.py <dir with play_by_play_2025.parquet and .csv.gz>
```

Results and the parity rule: `Blueprints/specs/infrastructure/rust-prep/phase3-parquet-column-map.md`.
