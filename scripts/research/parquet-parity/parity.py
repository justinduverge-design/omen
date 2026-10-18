import sys, math, polars as pl
from decimal import Decimal, ROUND_HALF_UP
d = sys.argv[1]
csv = pl.read_csv(f"{d}/play_by_play_2025.csv.gz", infer_schema_length=0)
pq = pl.read_parquet(f"{d}/play_by_play_2025.parquet")

def r_text(v):
    """Print a value the way nflverse's R CSV writer does."""
    if v is None: return None
    if isinstance(v, bool): return "TRUE" if v else "FALSE"
    if isinstance(v, float):
        if math.isnan(v): return None
        if v == 0: return "0"
        # R rounds the shortest decimal form of the double half-up to 15 significant digits.
        dv = Decimal(repr(v))
        q = dv.quantize(Decimal(1).scaleb(dv.adjusted() - 14), rounding=ROUND_HALF_UP)
        s = format(q.normalize(), "f") if -5 <= q.adjusted() < 15 else "%.15g" % float(q)
        if "." in s: s = s.rstrip("0").rstrip(".")
        if "e" in s:  # R prints e.g. 1e-04, 1.5e+10
            m, e = s.split("e"); e = int(e)
            s = f"{m}e{'-' if e < 0 else '+'}{abs(e):02d}"
        return s
    return str(v)

bad = {}
examples = {}
for c in pq.columns:
    a = csv[c].to_list(); b = pq[c].to_list()
    for x, y in zip(a, b):
        x = None if x in (None, "", "NA") else x
        if r_text(y) != x:
            bad[c] = bad.get(c, 0) + 1
            examples.setdefault(c, (x, y, r_text(y)))
total = csv.height * len(pq.columns)
print(f"cells {total}, mismatched {sum(bad.values())} in {len(bad)} columns")
for c, n in sorted(bad.items(), key=lambda kv: -kv[1])[:12]:
    print(f"  {c}: {n}  csv={examples[c][0]!r} parquet={examples[c][1]!r} r_text={examples[c][2]!r}")

# Value parity: floats equal within the CSV's 15 significant digits; everything else exact text.
SQL_TEXT_COLUMNS = ["two_point_attempt", "yardline_100", "air_yards", "season_type", "play_id", "success"]
value_bad = {}
for c, t in pq.schema.items():
    a = csv[c].to_list(); b = pq[c].to_list()
    for x, y in zip(a, b):
        x = None if x in (None, "", "NA") else x
        if t == pl.Float64 and c not in SQL_TEXT_COLUMNS:
            yv = None if y is None or math.isnan(y) else y
            if (x is None) != (yv is None) or (x is not None and abs(float(x) - yv) > 5e-15 * max(1.0, abs(yv))):
                value_bad[c] = value_bad.get(c, 0) + 1
        elif r_text(y) != x:
            value_bad[c] = value_bad.get(c, 0) + 1
print("value-parity mismatches:", sum(value_bad.values()), dict(list(value_bad.items())[:10]))
shown = 0
for c in ["epa", "total_home_comp_yac_epa", "total_home_pass_wpa"]:
    for x, y in zip(csv[c].to_list(), pq[c].to_list()):
        x2 = None if x in (None, "", "NA") else x
        yv = None if y is None or math.isnan(y) else y
        if (x2 is None) != (yv is None) or (x2 is not None and abs(float(x2) - yv) > 5e-15 * max(1.0, abs(yv))):
            print("  ", c, repr(x), repr(y)); shown += 1; break
print("sql-text columns exact:", all(c not in value_bad for c in SQL_TEXT_COLUMNS))
