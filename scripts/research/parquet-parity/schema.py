import sys, polars as pl
d = sys.argv[1]
for f in ["play_by_play_2025.parquet", "games.parquet"]:
    s = pl.read_parquet_schema(f"{d}/{f}")
    print(f, len(s), "cols")
    for c in ["season","week","play_id","game_id","epa","success","two_point_attempt","yardline_100","air_yards","season_type","gameday","gametime","away_score","old_game_id"]:
        if c in s: print("  ", c, s[c])
csv = pl.read_csv(f"{d}/play_by_play_2025.csv.gz", infer_schema_length=0, n_rows=3)
pq = pl.read_parquet_schema(f"{d}/play_by_play_2025.parquet")
print("same column order:", list(csv.columns) == list(pq.keys()), len(csv.columns), len(pq))
