import json, re, unicodedata, numpy as np, pandas as pd
D = pd.read_pickle("data/dataset.pkl")
# ---------- crosswalk Sleeper id -> gsis (own match: name + birth date, fallback name + position) ----------
def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\b(jr|sr|ii|iii|iv|v)\b\.?", "", s); s = re.sub(r"[^a-z ]", "", s); return " ".join(s.split())
sl = json.load(open("/private/tmp/claude-501/sleeper_players.json"))
nfl = pd.read_csv("data/nfl/players.csv", low_memory=False)
nfl = nfl[nfl.gsis_id.notna()]
byb = {}; byp = {}
for _, r in nfl.iterrows():
    n = norm(r.display_name); byb.setdefault((n, str(r.birth_date)), []).append(r.gsis_id); byp.setdefault((n, r.position), []).append(r.gsis_id)
xw = {}; amb = 0
for pid, p in sl.items():
    n = norm(p.get("full_name") or f"{p.get('first_name','')} {p.get('last_name','')}")
    c = byb.get((n, p.get("birth_date")), [])
    if len(c) != 1: c = byp.get((n, p.get("position")), []) if len(c) == 0 else c
    if len(c) == 1: xw[pid] = c[0]
    elif len(c) > 1: amb += 1
D["gsis"] = D.id.map(xw)
base = D[D.played & (D.proj >= 3)]
print("crosswalk coverage on scored rows:", f"{base.gsis.notna().mean()*100:.1f}%", "| ambiguous in dump:", amb)
# ---------- sanity: Sleeper actual vs nflverse fantasy_points_ppr must agree ----------
ps = pd.concat([pd.read_csv(f"data/nfl/stats_player_week_{y}.csv", low_memory=False) for y in range(2018, 2026)])
ps = ps[ps.season_type == "REG"].rename(columns={"player_id": "gsis"})
chk = D[D.played & D.gsis.notna()].merge(ps[["gsis","season","week","fantasy_points_ppr"]], on=["gsis","season","week"], how="inner")
print("crosswalk sanity: rows", len(chk), "| corr(Sleeper actual, nflverse PPR) =", round(np.corrcoef(chk.actual, chk.fantasy_points_ppr)[0,1], 4), "| share within 0.6 pts:", round((chk.actual - chk.fantasy_points_ppr).abs().le(0.6).mean(), 3))
# ---------- usage (nflverse player-week) ----------
use = ps[["gsis","season","week","target_share","air_yards_share","wopr","carries","targets"]].copy()
sn = pd.concat([pd.read_csv(f"data/nfl/snap_counts_{y}.csv", low_memory=False) for y in range(2018, 2026)])
sn = sn[sn.game_type == "REG"]
pfr = nfl.set_index("pfr_id").gsis_id.to_dict()
sn["gsis"] = sn.pfr_player_id.map(pfr)
snap = sn.dropna(subset=["gsis"])[["gsis","season","week","offense_pct"]].drop_duplicates(["gsis","season","week"])
U = use.merge(snap, on=["gsis","season","week"], how="outer")
D = D.merge(U, on=["gsis","season","week"], how="left")
# ---------- injuries ----------
inj = pd.concat([pd.read_csv(f"data/nfl/injuries_{y}.csv", low_memory=False) for y in range(2018, 2026)])
inj = inj[inj.game_type == "REG"].sort_values("date_modified").drop_duplicates(["gsis_id","season","week"], keep="last")
inj = inj.rename(columns={"gsis_id": "gsis"})[["gsis","season","week","report_status","practice_status"]]
D = D.merge(inj, on=["gsis","season","week"], how="left")
# ---------- team scheme (nflverse team-week) ----------
tm = pd.concat([pd.read_csv(f"data/nfl/stats_team_week_{y}.csv", low_memory=False) for y in range(2018, 2026)])
tm = tm[tm.season_type == "REG"].copy()
for c in ("team","opponent_team"): tm[c] = tm[c].map(lambda x: {"LAR":"LA","OAK":"LV","SD":"LAC","STL":"LA"}.get(x, x))
tm["plays"] = tm.attempts + tm.carries; tm["pass_rate"] = tm.attempts / tm.plays
def trail(df, key, col, k=4, minn=2):
    out = {}
    for (s, t), g in df.groupby(["season", key]):
        g = g.sort_values("week"); ws = g.week.values; v = g[col].values
        for i, w in enumerate(ws):
            prev = v[max(0, i - k):i]
            out[(s, t, w)] = prev.mean() if len(prev) >= minn else np.nan
    return out
tp = trail(tm, "team", "pass_rate"); tl = trail(tm, "team", "plays")
og = trail(tm.rename(columns={"team":"off","opponent_team":"team"}), "team", "pass_rate")   # pass rate faced by the defense
D["team_pass_rate_4"] = [tp.get((s, t, w), np.nan) for s, t, w in zip(D.season, D.team, D.week)]
D["team_plays_4"] = [tl.get((s, t, w), np.nan) for s, t, w in zip(D.season, D.team, D.week)]
D["opp_pass_rate_faced_4"] = [og.get((s, t, w), np.nan) for s, t, w in zip(D.season, D.opp, D.week)]
# ---------- new head coach ----------
G = pd.read_csv("data/games.csv"); G = G[(G.game_type == "REG") & G.season.between(2017, 2025)]
cm = {}
for _, r in G.iterrows():
    cm[(r.season, {"LAR":"LA","OAK":"LV","SD":"LAC","STL":"LA"}.get(r.home_team, r.home_team))] = r.home_coach
    cm[(r.season, {"LAR":"LA","OAK":"LV","SD":"LAC","STL":"LA"}.get(r.away_team, r.away_team))] = r.away_coach
D["new_coach"] = [int(cm.get((s, t)) is not None and cm.get((s - 1, t)) is not None and cm.get((s, t)) != cm.get((s - 1, t))) for s, t in zip(D.season, D.team)]
D.to_pickle("data/dataset2.pkl")
cov = lambda c: f"{D[D.played & (D.proj>=3)][c].notna().mean()*100:.0f}%"
print("feature coverage (scored rows): usage", cov("target_share"), "| snap%", cov("offense_pct"), "| injury report present", cov("report_status"), "| team pass rate", cov("team_pass_rate_4"), "| new_coach rate", f"{D.new_coach.mean()*100:.1f}%")
print(D.report_status.value_counts(dropna=False).head(6).to_dict(), D.practice_status.value_counts(dropna=False).head(5).to_dict())
