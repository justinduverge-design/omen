import numpy as np, pandas as pd, itertools
np.random.seed(11)
D = pd.read_pickle("data/dataset.pkl")
D = D[D.played & (D.proj >= 3)].copy()
GROUPS = {
  "lines (game script)": ["team_total","opp_total","margin"],
  "rest / primetime":   ["short_week","post_bye","rest_diff","primetime","home"],
  "weather / roof":     ["dome","wind_f","temp_f","cold","windy"],
  "opponent vs position": ["dvp","dvp_missing"],
  "recent vs projection": ["recent_resid","recent_missing"],
}
ALL = [c for g in GROUPS.values() for c in g]
def ridge_fit(X, y, lam=30.0):
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
    mu, sd = X.mean(0), X.std(0)
    sd = np.where(sd < 1e-6, 1.0, sd)
    Z = (X - mu) / sd; Z1 = np.c_[np.ones(len(Z)), Z]
    R = lam * np.eye(Z1.shape[1]); R[0, 0] = 0
    beta = np.linalg.solve(Z1.T @ Z1 + R, Z1.T @ y)
    return lambda Xn: np.c_[np.ones(len(Xn)), (np.nan_to_num(Xn, nan=0.0, posinf=0.0, neginf=0.0) - mu) / sd] @ beta
def run(features, test_years=(2021,2022,2023,2024,2025)):
    out = []
    for pos in ("QB","RB","WR","TE"):
        d = D[D.pos == pos]
        for T in test_years:
            tr, te = d[d.season < T], d[d.season == T]
            if not features:
                adj = np.zeros(len(te))
            else:
                f = ridge_fit(tr[features].values.astype(float), tr.resid.values)
                adj = f(te[features].values.astype(float))
            t = te.copy(); t["adj"] = t.proj + adj; out.append(t)
    return pd.concat(out)
def pair_acc(R, lo=5.0, band=2.0):
    # close calls: same season/week/position, projections within `band`, both >= lo; does the model's ordering match the real ordering?
    hits_p, hits_a, n, wk = 0, 0, 0, []
    for (s, w, p), g in R[R.proj >= lo].groupby(["season","week","pos"]):
        a, pr, ad, ac = g.actual.values, g.proj.values, g.adj.values, None
        i, j = np.triu_indices(len(g), 1)
        m = (np.abs(pr[i]-pr[j]) <= band) & (a[i] != a[j]) & (pr[i] != pr[j])
        i, j = i[m], j[m]
        if len(i) == 0: continue
        hp = ((pr[i] > pr[j]) == (a[i] > a[j])).sum(); ha = ((ad[i] > ad[j]) == (a[i] > a[j])).sum()
        hits_p += hp; hits_a += ha; n += len(i); wk.append((hp, ha, len(i)))
    wk = np.array(wk)
    # cluster bootstrap over player-weeks groups (season-week-pos) for the CI of the difference
    diffs = []
    for _ in range(1000):
        s = wk[np.random.randint(0, len(wk), len(wk))]
        diffs.append((s[:,1].sum() - s[:,0].sum()) / s[:,2].sum())
    return hits_p / n, hits_a / n, n, np.percentile(diffs, [2.5, 97.5])
base = run([])
print("Rows scored (test seasons 2021-2025, trained only on earlier seasons):", len(base))
print("\n=== Error of the projection itself (points) ===")
for pos in ("QB","RB","WR","TE"):
    b = base[base.pos == pos]; print(f"{pos}: MAE {np.abs(b.resid).mean():.2f}  bias {b.resid.mean():+.2f}  n={len(b)}")
print("\n=== Does context reduce error?  MAE of (projection + learned adjustment), lower is better ===")
res = {}
hdr = ["projection only"] + list(GROUPS) + ["ALL context"]
sets = [[]] + [GROUPS[g] for g in GROUPS] + [ALL]
print(f"{'':24}" + "".join(f"{p:>8}" for p in ("QB","RB","WR","TE")) + f"{'pooled':>9}")
for name, feats in zip(hdr, sets):
    R = run(feats); line = f"{name:24}"
    for pos in ("QB","RB","WR","TE"):
        r = R[R.pos == pos]; line += f"{np.abs(r.actual - r.adj).mean():8.3f}"
    line += f"{np.abs(R.actual - R.adj).mean():9.3f}"; print(line); res[name] = R
print("\n=== The start/sit question: close calls (projections within 2 pts, both >= 5 pts) ===")
print("How often does the higher-rated player actually score more?")
for name in ["projection only"] + list(GROUPS) + ["ALL context"]:
    R = res[name]; ap, aa, n, ci = pair_acc(R)
    if name == "projection only": print(f"{name:24} {ap*100:5.1f}%   (pairs: {n})"); continue
    print(f"{name:24} {aa*100:5.1f}%   change vs projection {100*(aa-ap):+.2f} pts   95% CI [{100*ci[0]:+.2f}, {100*ci[1]:+.2f}]")
for pos in ("QB","RB","WR","TE"):
    R = res["ALL context"]; R = R[R.pos == pos]; ap, aa, n, ci = pair_acc(R)
    print(f"  ALL context, {pos}: {aa*100:5.1f}% vs projection {ap*100:5.1f}%  change {100*(aa-ap):+.2f}  95% CI [{100*ci[0]:+.2f}, {100*ci[1]:+.2f}]  pairs {n}")
