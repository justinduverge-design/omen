import json, glob, os, numpy as np, pandas as pd
np.random.seed(7)
# ---------- load ----------
rows = []
for kind in ("proj", "stats"):
    for fn in glob.glob(f"data/{kind}_*.json"):
        _, s, w = os.path.basename(fn)[:-5].split("_")
        for r in json.load(open(fn)):
            r.update(kind=kind, season=int(s), week=int(w)); rows.append(r)
df = pd.DataFrame(rows)
P = df[df.kind == "proj"][["season","week","id","team","opp","pos","name","ppr"]].rename(columns={"ppr":"proj"})
A = df[df.kind == "stats"][["season","week","id","team","ppr","gp"]].rename(columns={"ppr":"actual","team":"team_a"})
P = P[P.proj.notna() & (P.proj > 0) & P.pos.isin(["QB","RB","WR","TE"])]
D = P.merge(A[["season","week","id","actual","gp","team_a"]], on=["season","week","id"], how="left")
D["played"] = D.actual.notna() & (D.gp.fillna(0) > 0)
# ---------- team code normalisation ----------
NORM = {"LAR":"LA","OAK":"LV","SD":"LAC","STL":"LA","JAC":"JAX","WSH":"WAS"}
nt = lambda t: NORM.get(t, t)
for c in ("team","opp","team_a"): D[c] = D[c].map(lambda x: nt(x) if isinstance(x, str) else x)
# ---------- schedule context ----------
G = pd.read_csv("data/games.csv"); G = G[(G.game_type == "REG") & G.season.between(2018, 2025)]
for c in ("home_team","away_team"): G[c] = G[c].map(nt)
def side(g, home):
    t = "home" if home else "away"; o = "away" if home else "home"
    x = pd.DataFrame({"season": g.season, "week": g.week, "team": g[f"{t}_team"], "opp_g": g[f"{o}_team"], "home": int(home),
        "rest": g[f"{t}_rest"], "opp_rest": g[f"{o}_rest"], "spread": g.spread_line if home else -g.spread_line, "total": g.total_line,
        "roof": g.roof, "temp": g.temp, "wind": g.wind, "weekday": g.weekday, "gametime": g.gametime})
    return x
S = pd.concat([side(G, True), side(G, False)])
S["team_total"] = S.total / 2 + S.spread / 2          # spread>0 = this team favoured
S["opp_total"] = S.total - S.team_total
D = D.merge(S, on=["season","week","team"], how="left")
D["dome"] = D.roof.isin(["dome","closed"]).astype(int)
D["wind_f"] = np.where(D.dome == 1, 0, D.wind.fillna(0)); D["temp_f"] = np.where(D.dome == 1, 70, D.temp.fillna(65))
D["cold"] = (D.temp_f < 35).astype(int); D["windy"] = (D.wind_f >= 15).astype(int)
D["short_week"] = (D.rest <= 5).astype(int); D["post_bye"] = (D.rest >= 10).astype(int); D["rest_diff"] = (D.rest - D.opp_rest).fillna(0)
hh = D.gametime.fillna("13:00").str[:2].astype(int)
D["primetime"] = (D.weekday.isin(["Thursday","Monday"]) | ((D.weekday == "Sunday") & (hh >= 20))).astype(int)
D["margin"] = D.team_total - D.opp_total
D = D[D.team_total.notna()]
# ---------- opponent-vs-position (trailing, same season, strictly earlier weeks) ----------
act = A.merge(P[["season","week","id","pos","team","opp"]].drop_duplicates(["season","week","id"]), on=["season","week","id"], how="inner")
act = act[act.actual.notna() & (act.gp.fillna(0) > 0)]
allowed = act.groupby(["season","week","opp","pos"]).actual.sum().rename("allowed").reset_index()
def dvp(row_df):
    out = np.zeros(len(row_df)); miss = np.ones(len(row_df)); i = 0
    idx = {}
    for (s, o, p), g in allowed.groupby(["season","opp","pos"]): idx[(s, o, p)] = g.set_index("week").allowed
    lg = allowed.groupby(["season","week","pos"]).allowed.mean()
    for s, w, o, p in zip(row_df.season, row_df.week, row_df.opp, row_df.pos):
        ser = idx.get((s, o, p))
        if ser is not None:
            prev = ser[(ser.index < w) & (ser.index >= w - 4)]
            if len(prev) >= 2:
                base = np.mean([lg.get((s, ww, p), np.nan) for ww in prev.index])
                out[i] = prev.mean() - base; miss[i] = 0
        i += 1
    return out, miss
D["dvp"], D["dvp_missing"] = dvp(D)
# ---------- player recent residual vs projection (strictly earlier weeks, same season) ----------
D = D.sort_values(["id","season","week"]).reset_index(drop=True)
D["resid"] = D.actual - D.proj
rr = np.zeros(len(D)); rm = np.ones(len(D))
for (pid, s), g in D.groupby(["id","season"]):
    r = g.resid.where(g.played)
    for j, ix in enumerate(g.index):
        prev = r.iloc[max(0, j - 4):j].dropna()
        if len(prev) >= 2: rr[ix] = prev.mean(); rm[ix] = 0
D["recent_resid"], D["recent_missing"] = rr, rm
D.to_pickle("data/dataset.pkl")
print("rows", len(D), "| played", int(D.played.sum()), "| seasons", sorted(D.season.unique()))
print(D.groupby("pos").agg(n=("proj","size"), proj=("proj","mean"), actual=("actual","mean")).round(2))
