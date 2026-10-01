import json, glob, os, numpy as np, pandas as pd, warnings
from sklearn.ensemble import HistGradientBoostingRegressor
warnings.filterwarnings("ignore"); np.random.seed(6006)
rows = []
for fn in glob.glob("data/espn/*.json"):
    s, w = os.path.basename(fn)[:-5].split("_")
    for r in json.load(open(fn)): r["season"] = int(s); r["week"] = int(w); rows.append(r)
E = pd.DataFrame(rows)
pl = pd.read_csv("data/nfl/players.csv", low_memory=False).dropna(subset=["espn_id","gsis_id"])
pl["espn_id"] = pl.espn_id.astype("int64"); m = pl.drop_duplicates("espn_id").set_index("espn_id").gsis_id.to_dict()
E["gsis"] = E.espn_id.map(m); E = E.dropna(subset=["gsis","proj"]); E = E[E.proj > 0].rename(columns={"proj": "espn_proj"})[["gsis","season","week","espn_proj"]]
E = E.drop_duplicates(["gsis","season","week"])
print("ESPN weekly projections pulled:", len(E), "| seasons", sorted(E.season.unique()))
D = pd.read_pickle("data/dataset5.pkl").merge(E, on=["gsis","season","week"], how="left")
D["resid"] = D.actual - D.proj
both = D[D.played & D.proj.notna() & D.espn_proj.notna() & (D.proj >= 3) & (D.espn_proj >= 3) & D.season.between(2021, 2025)].copy()
print(f"player-weeks with BOTH projections (test seasons, played): {len(both)} of {len(D[D.played & (D.proj>=3) & D.season.between(2021,2025)])} Sleeper-scored rows ({len(both)/len(D[D.played & (D.proj>=3) & D.season.between(2021,2025)])*100:.0f}% overlap)")
print(f"MAE   Sleeper {np.abs(both.actual-both.proj).mean():.3f}   ESPN {np.abs(both.actual-both.espn_proj).mean():.3f}")
print(f"bias  Sleeper {(both.actual-both.proj).mean():+.3f}   ESPN {(both.actual-both.espn_proj).mean():+.3f}   (actual minus projection)")
print(f"corr  Sleeper {np.corrcoef(both.actual, both.proj)[0,1]:.3f}   ESPN {np.corrcoef(both.actual, both.espn_proj)[0,1]:.3f}")
def pairs_hit(R, col, lo=5.0, band=2.0):
    h = n = 0
    for (s, w, p), g in R[R[col] >= lo].groupby(["season","week","pos"]):
        a, pr = g.actual.values, g[col].values; i, j = np.triu_indices(len(g), 1)
        mk = (np.abs(pr[i]-pr[j]) <= band) & (a[i] != a[j]) & (pr[i] != pr[j]); i, j = i[mk], j[mk]
        h += ((pr[i] > pr[j]) == (a[i] > a[j])).sum(); n += len(i)
    return h / n, n
for col, nm in (("proj","Sleeper"),("espn_proj","ESPN")):
    h, n = pairs_hit(both, col); print(f"close-call hit rate, {nm}'s own close calls (same player-weeks): {h*100:.2f}%  (pairs {n})")
# ---------- context on top of ESPN's projection: same machinery, baseline = ESPN ----------
S = D[D.played & D.espn_proj.notna() & (D.espn_proj >= 3)].copy(); S["proj"] = S.espn_proj; S["resid"] = S.actual - S.proj
for p_ in ("QB","RB","WR","TE"): S["pos_" + p_] = (S.pos == p_).astype(int)
POSF = ["pos_QB","pos_RB","pos_WR","pos_TE"]; YEARS = (2021,2022,2023,2024,2025)
LINES = ["team_total","opp_total","margin"]
# EXPLICIT feature list (the same trailing-only groups as fam6.py). The first version of this script took "every column except a
# short exclusion list", which silently included THIS game's usage columns (targets, carries, snap share) and produced a +18.5
# result that was a leak.
for c_ in ("off_o_neutral_pass",):
    pass
cen = lambda col: S[col] - S[col].mean()
S["x_depth"] = cen("off_o_adot") * cen("def_d_adot"); S["x_deep"] = cen("p_deep") * cen("def_d_deep_epa"); S["x_rush_pressure"] = cen("q_sack") * cen("def_d_sack")
S["x_run"] = cen("off_o_rush_epa") * cen("def_d_rush_epa"); S["x_passmix"] = cen("off_o_neutral_pass") * cen("def_d_pass_epa")
G = {
 "A": ["inj_q","inj_d","prac_limited","prac_dnp","returning"],
 "B": ["target_share_3","wopr_3","carries_3","offense_pct_3","snap_trend","target_trend"],
 "C": ["s_prime","s_home","s_away","s_dome","s_cw"],
 "D": ["team_pass_rate_4","team_plays_4","opp_pass_rate_faced_4","rs_diff","new_coach"],
 "E": ["team_total","opp_total","margin","short_week","post_bye","rest_diff","primetime","home","dome","wind_f","temp_f","cold","windy","dvp","dvp_missing","recent_resid","recent_missing"],
 "S": [c for c in S.columns if c.startswith("off_o_") or c.startswith("def_d_")] + ["p_adot","p_deep","p_yac","p_man_edge","q_sack","q_scramble","q_adot","r_stuff","r_explosive","man_matchup","x_depth","x_deep","x_rush_pressure","x_run","x_passmix"],
 "P": [c for c in S.columns if c.startswith("t_") or c.startswith("dp_") or c.startswith("fd_")],
 "R": ["ref_pens","ref_dpi"], "T": ["draft_pick","age","experience","weight","height","forty","vertical","broad_jump","cone"],
}
ALLF = sorted({c for v in G.values() for c in v if c in S.columns})
CURRENT_WEEK = {"target_share","air_yards_share","wopr","carries","targets","offense_pct","actual","gp","fantasy_points_ppr"}
assert not (set(ALLF) & CURRENT_WEEK), set(ALLF) & CURRENT_WEEK   # a feature built from THIS game must never be present
print("features for K1:", len(ALLF))
def pairs(R, lo=5.0, band=2.0):
    rec = []
    for (s, w, p), g in R[R.proj >= lo].groupby(["season","week","pos"]):
        a, pr, ad = g.actual.values, g.proj.values, g.adj.values; i, j = np.triu_indices(len(g), 1)
        mk = (np.abs(pr[i]-pr[j]) <= band) & (a[i] != a[j]) & (pr[i] != pr[j]); i, j = i[mk], j[mk]
        if len(i): rec.append((s, w, ((pr[i] > pr[j]) == (a[i] > a[j])).sum(), ((ad[i] > ad[j]) == (a[i] > a[j])).sum(), len(i)))
    return np.array(rec)
def verdict(R):
    W = pd.DataFrame(pairs(R), columns=["s","w","hp","ha","n"]).groupby(["s","w"], as_index=False).sum(); A = W.values
    hp, ha, n = A[:,2].sum(), A[:,3].sum(), A[:,4].sum(); d = (ha - hp) / n
    boots = [(lambda s: (s[:,3].sum() - s[:,2].sum()) / s[:,4].sum())(A[np.random.randint(0, len(A), len(A))]) for _ in range(2000)]
    lo, hi = np.percentile(boots, [0.5, 99.5]); per = [(W[W.s == y].ha.sum() - W[W.s == y].hp.sum()) / W[W.s == y].n.sum() for y in YEARS]
    return hp / n, ha / n, d, lo, hi, per, n
def show(name, R):
    hp, ha, d, lo, hi, per, n = verdict(R); k = sum(1 for x in per if x > 0); ok = lo > 0 and k >= 4 and d >= 0.005
    print(f"{name:52}{ha*100:7.2f}% vs {hp*100:5.2f}%  change {d*100:+6.2f}  99% CI [{lo*100:+5.2f},{hi*100:+5.2f}]  seasons+ {k}/5  {'PASS' if ok else 'no'}")
def ridge_fit(X, y, lam=30.0):
    X = np.nan_to_num(X, nan=0.0); mu, sd = X.mean(0), X.std(0); sd = np.where(sd < 1e-9, 1.0, sd)
    Z1 = np.c_[np.ones(len(X)), (X - mu) / sd]; R = lam * np.eye(Z1.shape[1]); R[0, 0] = 0; b = np.linalg.solve(Z1.T @ Z1 + R, Z1.T @ y)
    return lambda Xn: np.c_[np.ones(len(Xn)), (np.nan_to_num(Xn, nan=0.0) - mu) / sd] @ b
gbm = lambda it: HistGradientBoostingRegressor(max_depth=3, learning_rate=0.05, max_iter=it, min_samples_leaf=100, l2_regularization=5.0, random_state=1)
base = S[S.season.isin(YEARS)].copy(); base["adj"] = base.proj
print("\nBaseline = ESPN's projection (player-weeks scored:", len(base), ")")
out = []; FE = ALLF + ["proj"] + POSF
for T in YEARS:
    tr, te = S[S.season < T], S[S.season == T].copy(); fit, val = tr[tr.season < T - 1], tr[tr.season == T - 1]
    m_ = gbm(400).fit(fit[FE].values.astype(float), fit.resid.values)
    errs = [np.abs(val.resid.values - p).mean() for p in m_.staged_predict(val[FE].values.astype(float))]; it = int(np.argmin(errs)) + 1
    te["adj"] = te.proj + gbm(it).fit(tr[FE].values.astype(float), tr.resid.values).predict(te[FE].values.astype(float)); out.append(te)
show("K1 trees on everything, ESPN baseline", pd.concat(out))
out = []
for pos in ("QB","RB","WR","TE"):
    d = S[S.pos == pos]
    for T in YEARS:
        tr, te = d[d.season < T], d[d.season == T].copy()
        te["adj"] = te.proj + ridge_fit(tr[LINES].values.astype(float), tr.resid.values)(te[LINES].values.astype(float)); out.append(te)
R = pd.concat(out); show("lines only (implied team totals), per position, ESPN", R)
for pos in ("QB","RB","WR","TE"): show(f"   lines only, {pos}", R[R.pos == pos])
