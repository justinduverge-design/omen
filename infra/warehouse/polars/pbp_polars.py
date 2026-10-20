"""Polars play-by-play reader (Phase 3 of the Rust infrastructure plan). SHADOW ONLY.

Builds the same rows as the Node adapter (src/services/footballWarehouse/playByPlaySource.js) from the
nflverse Parquet asset instead of the CSV, without holding ~370 string columns per play in a JS heap.

Parity rule (Blueprints/specs/infrastructure/rust-prep/phase3-parquet-column-map.md): integer and text
columns exact; floats equal within the CSV's 15 significant digits. `source_row` keeps every column as
text the way the CSV prints it: missing values are "", whole floats print without ".0", -0 prints "0".

Team ids come from Node's own teamIdFor (passed in as a dict) so the alias table never drifts.

Commands:
  build   <parquet> <season> <gsis.csv> <teams.json> <out.parquet>   rows in the nfl_plays column shape
  diff    <polars-rows.parquet> <prod-rows.csv.gz>                    row-for-row parity report (JSON)
  load    <polars-rows.parquet> <season> <source-url>                 COPY into football_shadow.nfl_plays
  diff-db <season>                                                     parity of football_shadow vs football

load and diff-db connect with libpq settings from the environment (PGHOST, PGDATABASE, PGUSER, ...).
They touch football_shadow only for writes; football.nfl_plays is read.
"""

from __future__ import annotations

import json
import math
import resource
import sys
import time

import numpy as np
import polars as pl

PLAY_COLUMNS = [
    "season", "game_id", "play_id", "week", "posteam_id", "defteam_id", "passer_player_id",
    "rusher_player_id", "receiver_player_id", "play_type", "desc_text", "epa", "wpa", "cpoe",
    "air_epa", "yac_epa", "success", "source_row",
]
FLOAT_COLUMNS = ["epa", "wpa", "cpoe", "air_epa", "yac_epa"]
EXACT_COLUMNS = [c for c in PLAY_COLUMNS if c not in FLOAT_COLUMNS + ["source_row"]]
PARTICIPANTS = ["passer_player_id", "rusher_player_id", "receiver_player_id"]
# source_row keys some SQL reads as text (playerWeeklyOpportunityWriter.js): must be exact.
SQL_TEXT_KEYS = ["two_point_attempt", "yardline_100", "air_yards", "season_type", "play_id", "success"]


def csv_text(series: pl.Series) -> pl.Series:
    """One column as the text the nflverse CSV prints."""
    if series.dtype == pl.Float64 or series.dtype == pl.Float32:
        values = series.cast(pl.Float64).to_numpy()
        text = np.char.mod("%.15g", np.nan_to_num(values, nan=0.0))
        text = np.where(text == "-0", "0", text)
        out = pl.Series(series.name, text.astype(str))
        missing = (series.is_null() | series.is_nan()).fill_null(True)
        return pl.select(pl.when(missing).then(pl.lit("")).otherwise(out)).to_series().alias(series.name)
    if series.dtype == pl.Boolean:
        return series.map_elements(lambda v: "TRUE" if v else "FALSE", return_dtype=pl.String).fill_null("").alias(series.name)
    return series.cast(pl.String).fill_null("").alias(series.name)


def build(parquet: str, season: int, gsis_map: dict[str, str], team_ids: dict[str, str]):
    raw = pl.read_parquet(parquet)
    headers = raw.columns
    if raw["season"].ne_missing(season).any():
        raise ValueError("a row's season does not match the requested season")
    week = raw["week"]
    if (week.is_null() | (week < 1) | (week > 23)).any():
        raise ValueError("week is invalid")
    game_len = raw["game_id"].str.strip_chars().str.len_chars()
    if (game_len.is_null() | (game_len == 0) | (game_len > 64)).any():
        raise ValueError("game_id is invalid")
    text = pl.DataFrame([csv_text(raw[c]) for c in headers])

    play_id = raw["play_id"]
    if (play_id.is_null() | (play_id != play_id.round(0)) | (play_id < 0)).any():
        raise ValueError("play_id is invalid")
    keys = pl.DataFrame({"g": raw["game_id"], "p": play_id})
    if keys.is_duplicated().any():
        raise ValueError("duplicate play key")

    # Node's nullable(): trimmed "" or "NA" (any case) is missing.
    def blank(c):
        t = pl.col(c).str.strip_chars()
        return pl.when((t == "") | (t.str.to_uppercase() == "NA")).then(None).otherwise(t).alias(c)
    gsis = pl.DataFrame({"gsis": list(gsis_map), "pid": list(gsis_map.values())})
    df = text.with_columns([blank(c).alias(f"_{c}") for c in PARTICIPANTS])
    unmatched = pl.lit(False)
    for c in PARTICIPANTS:
        df = df.join(gsis.rename({"gsis": f"_{c}", "pid": f"{c}__id"}), on=f"_{c}", how="left")
        unmatched = unmatched | (pl.col(f"_{c}").is_not_null() & pl.col(f"{c}__id").is_null())
    df = df.with_columns([raw[c].alias(f"{c}__raw") for c in FLOAT_COLUMNS]).with_columns(unmatched.alias("_unmatched"))
    unmatched_rows = int(df["_unmatched"].sum())
    df = df.filter(~pl.col("_unmatched"))

    def team(c):
        ids = df.select(blank(c))[c]
        unknown = ids.drop_nulls().filter(~ids.drop_nulls().is_in(list(team_ids)))
        if len(unknown):
            raise ValueError(f"{c} is not a known NFL team: {unknown[0]}")
        return ids.replace_strict(team_ids, default=None)

    source_row = df.select(pl.struct(headers).struct.json_encode().alias("source_row"))["source_row"]
    floats = lambda c: df[f"{c}__raw"].cast(pl.Float64).fill_nan(None)
    success = df.select(blank("success"))["success"].str.to_lowercase().replace({"true": "1", "false": "0"})
    if not success.drop_nulls().is_in(["0", "1"]).all():
        raise ValueError("success is invalid")
    out = pl.DataFrame({
        "season": pl.Series([season] * df.height, dtype=pl.Int32),
        "game_id": df["game_id"],
        "play_id": df["play_id"].cast(pl.Float64).cast(pl.Int64),
        "week": df["week"].cast(pl.Int32),
        "posteam_id": team("posteam"),
        "defteam_id": team("defteam"),
        **{c: df[f"{c}__id"] for c in PARTICIPANTS},
        "play_type": df.select(blank("play_type"))["play_type"],
        "desc_text": df.select(blank("desc"))["desc"],
        **{c: floats(c) for c in FLOAT_COLUMNS},
        "success": success.replace_strict({"1": True, "0": False}, default=None, return_dtype=pl.Boolean),
        "source_row": source_row,
    })
    return out, unmatched_rows, headers


def _close(a, b):
    """Equal within the CSV's 15 significant digits (one unit in the 15th digit)."""
    a_missing = a is None or (isinstance(a, float) and math.isnan(a))
    b_missing = b is None or (isinstance(b, float) and math.isnan(b))
    if a_missing or b_missing:
        return a_missing == b_missing
    scale = max(abs(a), abs(b))
    if scale == 0:
        return True
    # 1.5 units: the subtraction itself carries float error of a few percent of one unit.
    return abs(a - b) <= 1.5 * 10 ** (math.floor(math.log10(scale)) - 14)


def read_export(path_or_bytes) -> pl.DataFrame:
    """A `copy ... to stdout with csv header` export of nfl_plays columns."""
    frame = pl.read_csv(path_or_bytes, schema_overrides={"source_row": pl.String, "desc_text": pl.String, "play_type": pl.String,
                                                          "game_id": pl.String, "play_id": pl.Int64})
    if frame["success"].dtype == pl.String:
        frame = frame.with_columns(pl.col("success").replace_strict({"t": True, "f": False}, default=None, return_dtype=pl.Boolean))
    return frame


def diff(polars_rows, prod_rows) -> dict:
    mine = polars_rows if isinstance(polars_rows, pl.DataFrame) else pl.read_parquet(polars_rows)
    prod = prod_rows if isinstance(prod_rows, pl.DataFrame) else read_export(prod_rows)
    joined = prod.join(mine, on=["game_id", "play_id"], how="full", suffix="_polars", coalesce=True)
    report = {"prod_rows": prod.height, "polars_rows": mine.height, "only_prod": 0, "only_polars": 0,
              "exact_mismatch": {}, "float_mismatch": {}, "source_row_key_mismatch": {}, "source_row_float_drift": 0}
    report["only_prod"] = int(joined["season_polars"].is_null().sum())
    report["only_polars"] = int(joined["season"].is_null().sum())
    both = joined.filter(pl.col("season").is_not_null() & pl.col("season_polars").is_not_null())
    for c in [c for c in EXACT_COLUMNS if c not in ("game_id", "play_id")]:
        a, b = both[c], both[f"{c}_polars"]
        n = int(a.ne_missing(b).sum())
        if n:
            report["exact_mismatch"][c] = n
    for c in FLOAT_COLUMNS:
        n = sum(0 if _close(x, y) else 1 for x, y in zip(both[c].to_list(), both[f"{c}_polars"].to_list()))
        if n:
            report["float_mismatch"][c] = n
    for p_json, m_json in zip(both["source_row"].to_list(), both["source_row_polars"].to_list()):
        p, m = json.loads(p_json), json.loads(m_json)
        if p.keys() != m.keys():
            report["source_row_key_mismatch"]["__keys__"] = report["source_row_key_mismatch"].get("__keys__", 0) + 1
            continue
        for k, pv in p.items():
            mv = m[k]
            if pv == mv:
                continue
            if k in SQL_TEXT_KEYS:
                report["source_row_key_mismatch"][k] = report["source_row_key_mismatch"].get(k, 0) + 1
                continue
            try:
                if pv != "" and mv != "" and _close(float(mv), float(pv)):
                    report["source_row_float_drift"] += 1
                    continue
            except ValueError:
                pass
            report["source_row_key_mismatch"][k] = report["source_row_key_mismatch"].get(k, 0) + 1
    report["parity"] = not (report["only_prod"] or report["only_polars"] or report["exact_mismatch"]
                            or report["float_mismatch"] or report["source_row_key_mismatch"])
    return report


EXPORT_SQL = ("copy (select season,game_id,play_id,week,posteam_id,defteam_id,passer_player_id,rusher_player_id,"
              "receiver_player_id,play_type,desc_text,epa,wpa,cpoe,air_epa,yac_epa,success,source_row::text as source_row "
              "from {table} where season = {season}) to stdout with csv header")


def _connect():
    import psycopg  # only the load/diff-db commands need a database driver
    return psycopg.connect()


def load(rows_path: str, season: int, source_url: str) -> dict:
    rows = pl.read_parquet(rows_path)
    if rows.height == 0 or rows["season"].ne_missing(season).any():
        raise ValueError("rows are empty or belong to another season")
    columns = PLAY_COLUMNS + ["engine", "source_url"]
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("set local lock_timeout = '5s'")
        cur.execute("delete from football_shadow.nfl_plays where season = %s", (season,))
        with cur.copy(f"copy football_shadow.nfl_plays ({','.join(columns)}) from stdin") as copy:
            for row in rows.iter_rows():
                copy.write_row([*row, "polars", source_url])
        cur.execute("select count(*) from football_shadow.nfl_plays where season = %s", (season,))
        written = cur.fetchone()[0]
        if written != rows.height:
            raise RuntimeError(f"shadow count {written} != {rows.height}")  # the context manager rolls back
    return {"season": season, "written": written}


def diff_db(season: int) -> dict:
    def export(table):
        buf = bytearray()
        with _connect() as conn, conn.cursor() as cur:
            with cur.copy(EXPORT_SQL.format(table=table, season=int(season))) as copy:
                for chunk in copy:
                    buf += chunk
        return read_export(bytes(buf))
    return diff(export("football_shadow.nfl_plays"), export("football.nfl_plays"))


def main(argv):
    command = argv[1] if len(argv) > 1 else ""
    started = time.time()
    if command == "build":
        parquet, season, gsis_csv, teams_json, out_path = argv[2], int(argv[3]), argv[4], argv[5], argv[6]
        gsis = pl.read_csv(gsis_csv, infer_schema_length=0)
        rows, unmatched, headers = build(parquet, season, dict(zip(gsis["gsis_id"], gsis["player_id"])),
                                         json.load(open(teams_json)))
        rows.write_parquet(out_path)
        result = {"rows": rows.height, "unmatched_rows": unmatched, "source_columns": len(headers)}
    elif command == "diff":
        result = diff(argv[2], argv[3])
    elif command == "load":
        result = load(argv[2], int(argv[3]), argv[4])
    elif command == "diff-db":
        result = diff_db(int(argv[2]))
    else:
        print(__doc__)
        return 2
    rss_mb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / (1024 * 1024 if sys.platform == "darwin" else 1024)
    result.update({"seconds": round(time.time() - started, 1), "peak_rss_mb": round(rss_mb)})
    print(json.dumps(result, indent=2))
    return 0 if result.get("parity", True) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
