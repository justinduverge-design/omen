import numpy as np, pandas as pd, warnings
from sklearn.ensemble import HistGradientBoostingRegressor
warnings.filterwarnings("ignore"); np.random.seed(909)
D = pd.read_pickle("data/dataset4.pkl"); D["resid"] = D.actual - D.proj
S = D[D.played & (D.proj >= 3)].copy()
for p_ in ("QB","RB","WR","TE"): S["pos_" + p_] = (S.pos == p_).astype(int)
POSF = ["pos_QB","pos_RB","pos_WR","pos_TE"]; YEARS = (2021,2022,2023,2024,2025)
OFF = [c for c in S.columns if c.startswith("off_o_")]; DEF = [c for c in S.columns if c.startswith("def_d_")]
PLY = ["p_adot","p_deep","p_yac","p_man_edge","q_sack","q_scramble","q_adot","r_stuff","r_explosive","man_matchup"]
c = lambda col: S[col] - S[col].mean()                     # unsupervised centring (no outcome information)
S["x_depth"] = c("off_o_adot") * c("def_d_adot")
S["x_deep"] = c("p_deep") * c("def_d_deep_epa")
S["x_rush_pressure"] = c("q_sack") * c("def_d_sack")
S["x_run"] = c("off_o_rush_epa") * c("def_d_rush_epa")
S["x_passmix"] = c("off_o_neutral_pass") * c("def_d_pass_epa")
S["x_cov"] = S["man_matchup"]
PRODUCTS = ["x_depth","x_deep","x_rush_pressure","x_run","x_passmix","x_cov"]
def ridge_fit(X, y, lam=30.0):
    X = np.nan_to_num(X, nan=0.0); mu, sd = X.mean(0), X.std(0); sd = np.where(sd < 1e-9, 1.0, sd)
    Z1 = np.c_[np.ones(len(X)), (X - mu) / sd]; R = lam * np.eye(Z1.shape[1]); R[0, 0] = 0; b = np.linalg.solve(Z1.T @ Z1 + R, Z1.T @ y)
    return lambda Xn: np.c_[np.ones(len(Xn)), (np.nan_to_num(Xn, nan=0.0) - mu) / sd] @ b
gbm = lambda: HistGradientBoostingRegressor(max_depth=3, learning_rate=0.05, max_iter=200, min_samples_leaf=100, l2_regularization=5.0, random_state=1)
def pairs(R, lo=5.0, band=2.0):
    rec = []
    for (s, w, p), g in R[R.proj >= lo].groupby(["season","week","pos"]):
        a, pr, ad = g.actual.values, g.proj.values, g.adj.values; i, j = np.triu_indices(len(g), 1)
        m = (np.abs(pr[i]-pr[j]) <= band) & (a[i] != a[j]) & (pr[i] != pr[j]); i, j = i[m], j[m]
        if len(i): rec.append((s, w, ((pr[i] > pr[j]) == (a[i] > a[j])).sum(), ((ad[i] > ad[j]) == (a[i] > a[j])).sum(), len(i)))
    return np.array(rec)
def verdict(R, years=YEARS):
    W = pd.DataFrame(pairs(R), columns=["s","w","hp","ha","n"]).groupby(["s","w"], as_index=False).sum(); A = W.values
    hp, ha, n = A[:,2].sum(), A[:,3].sum(), A[:,4].sum(); d = (ha - hp) / n
    boots = [(lambda s: (s[:,3].sum() - s[:,2].sum()) / s[:,4].sum())(A[np.random.randint(0, len(A), len(A))]) for _ in range(2000)]
    lo, hi = np.percentile(boots, [0.5, 99.5])
    per = [(W[W.s == y].ha.sum() - W[W.s == y].hp.sum()) / W[W.s == y].n.sum() for y in years]
    return hp / n, ha / n, d, lo, hi, per, n
def run_gbm(feats):
    out = []
    for T in YEARS:
        tr, te = S[S.season < T], S[S.season == T].copy()
        m = gbm().fit(tr[feats].values.astype(float), tr.resid.values); te["adj"] = te.proj + m.predict(te[feats].values.astype(float)); out.append(te)
    return pd.concat(out)
def run_ridge(feats, years=YEARS):
    out = []
    for pos in ("QB","RB","WR","TE"):
        d = S[S.pos == pos]
        for T in years:
            tr, te = d[d.season < T], d[d.season == T].copy()
            te["adj"] = te.proj + ridge_fit(tr[feats].values.astype(float), tr.resid.values)(te[feats].values.astype(float)); out.append(te)
    return pd.concat(out)
def show(name, R, years=YEARS):
    hp, ha, d, lo, hi, per, n = verdict(R, years); k = sum(1 for x in per if x > 0)
    ok = lo > 0 and k >= len(years) - 1 and d >= 0.005
    print(f"{name:60}{ha*100:7.2f}%{d*100:+7.2f} [{lo*100:+5.2f},{hi*100:+5.2f}]{k:>4}/{len(years)}  {'PASS' if ok else 'no'}  seasons {[round(x*100,2) for x in per]}")
    return d
base = S[S.season.isin(YEARS)].copy(); base["adj"] = base.proj
print(f"baseline close-call hit rate {verdict(base)[0]*100:.2f}%  (scored player-weeks {len(base)})")
print(f"{'model':60}{'hit':>8}{'change':>8} {'99% CI':>14}{'yrs+':>7}")
M5F = OFF + DEF + PLY + ["proj"] + POSF
show("M5 trees: offense x defense x player profiles + projection", run_gbm(M5F))
show("M6 ridge: the six scheme-matchup products only (per position)", run_ridge(PRODUCTS))
print("\nExploratory (not pre-registered): M6 products, each position separately")
R6 = run_ridge(PRODUCTS)
for pos in ("QB","RB","WR","TE"): show(f"  M6 products, {pos}", R6[R6.pos == pos])
print("\nExploratory: trees on defense scheme + coverage only (does the opponent's scheme alone help?)")
show("  trees: defense profile + projection + position", run_gbm(DEF + ["proj"] + POSF))
print("\nCoverage non-missing:", f"{S.man_matchup.notna().mean()*100:.0f}% man-vs-zone matchup, {S.def_d_man.notna().mean()*100:.0f}% opponent coverage mix")
S.to_pickle("data/dataset4s.pkl")
