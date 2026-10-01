import numpy as np, pandas as pd, warnings
from sklearn.ensemble import HistGradientBoostingRegressor
warnings.filterwarnings("ignore"); np.random.seed(404)
D = pd.read_pickle("data/dataset3.pkl")
D["resid"] = D.actual - D.proj
FAM = {
 "A": ["inj_q","inj_d","prac_limited","prac_dnp","returning"],
 "B": ["target_share_3","wopr_3","carries_3","offense_pct_3","snap_trend","target_trend"],
 "C": ["s_prime","s_home","s_away","s_dome","s_cw"],
 "D": ["team_pass_rate_4","team_plays_4","opp_pass_rate_faced_4","rs_diff","new_coach"],
 "E1": ["team_total","opp_total","margin"], "E2": ["short_week","post_bye","rest_diff","primetime","home"],
 "E3": ["dome","wind_f","temp_f","cold","windy"], "E4": ["dvp","dvp_missing"], "E5": ["recent_resid","recent_missing"],
}
ALLF = sorted({c for v in FAM.values() for c in v})
S = D[D.played & (D.proj >= 3)].copy()
S["pos_QB"], S["pos_RB"], S["pos_WR"], S["pos_TE"] = [(S.pos == p).astype(int) for p in ("QB","RB","WR","TE")]
POSF = ["pos_QB","pos_RB","pos_WR","pos_TE"]
YEARS = (2021, 2022, 2023, 2024, 2025)
def ridge_fit(X, y, lam=30.0):
    X = np.nan_to_num(X, nan=0.0); mu, sd = X.mean(0), X.std(0); sd = np.where(sd < 1e-6, 1.0, sd)
    Z1 = np.c_[np.ones(len(X)), (X - mu) / sd]; R = lam * np.eye(Z1.shape[1]); R[0, 0] = 0
    b = np.linalg.solve(Z1.T @ Z1 + R, Z1.T @ y)
    return lambda Xn: np.c_[np.ones(len(Xn)), (np.nan_to_num(Xn, nan=0.0) - mu) / sd] @ b
def gbm():
    return HistGradientBoostingRegressor(max_depth=3, learning_rate=0.05, max_iter=200, min_samples_leaf=100, l2_regularization=5.0, random_state=1)
def pairs(R, lo=5.0, band=2.0):
    rec = []
    for (s, w, p), g in R[R.proj >= lo].groupby(["season","week","pos"]):
        a, pr, ad = g.actual.values, g.proj.values, g.adj.values
        i, j = np.triu_indices(len(g), 1)
        m = (np.abs(pr[i]-pr[j]) <= band) & (a[i] != a[j]) & (pr[i] != pr[j]); i, j = i[m], j[m]
        if len(i): rec.append((s, w, ((pr[i] > pr[j]) == (a[i] > a[j])).sum(), ((ad[i] > ad[j]) == (a[i] > a[j])).sum(), len(i)))
    return np.array(rec)
def verdict(R):
    W = pd.DataFrame(pairs(R), columns=["s","w","hp","ha","n"]).groupby(["s","w"], as_index=False).sum()
    A = W.values; hp, ha, n = A[:,2].sum(), A[:,3].sum(), A[:,4].sum(); d = (ha - hp) / n
    boots = [(lambda s: (s[:,3].sum() - s[:,2].sum()) / s[:,4].sum())(A[np.random.randint(0, len(A), len(A))]) for _ in range(2000)]
    lo, hi = np.percentile(boots, [0.5, 99.5])
    per = [(W[W.s == y].ha.sum() - W[W.s == y].hp.sum()) / W[W.s == y].n.sum() for y in YEARS]
    return hp / n, ha / n, d, lo, hi, per, n
def predict(model, feats_extra=False, per_pos=False, fam_fixed=None):
    out = []
    for T in YEARS:
        tr, te = S[S.season < T], S[S.season == T].copy()
        feats = ALLF + (["proj"] if feats_extra else []) + ([] if per_pos else POSF)
        if per_pos:
            te["adj"] = te.proj.copy()
            for pos in ("QB","RB","WR","TE"):
                m = gbm().fit(tr[tr.pos == pos][feats].values.astype(float), tr[tr.pos == pos].resid.values)
                te.loc[te.pos == pos, "adj"] = te[te.pos == pos].proj + m.predict(te[te.pos == pos][feats].values.astype(float))
        else:
            m = gbm().fit(tr[feats].values.astype(float), tr.resid.values)
            te["adj"] = te.proj + m.predict(te[feats].values.astype(float))
        out.append(te)
    return pd.concat(out)
def nested_forward():
    out, chosen_log = [], {}
    for T in YEARS:
        tr_all, te = S[S.season < T], S[S.season == T].copy()
        inner_tr, val = tr_all[tr_all.season < T - 1], tr_all[tr_all.season == T - 1]
        def val_mae(fams):
            feats = [c for f in fams for c in FAM[f]]; err = []
            for pos in ("QB","RB","WR","TE"):
                a, b = inner_tr[inner_tr.pos == pos], val[val.pos == pos]
                pred = np.zeros(len(b)) if not feats else ridge_fit(a[feats].values.astype(float), a.resid.values)(b[feats].values.astype(float))
                err.append(np.abs(b.resid.values - pred))
            return np.concatenate(err).mean()
        chosen, best = [], val_mae([])
        while True:
            cands = [(val_mae(chosen + [f]), f) for f in FAM if f not in chosen]
            if not cands: break
            m, f = min(cands)
            if m < best - 1e-4: chosen.append(f); best = m
            else: break
        chosen_log[T] = list(chosen)
        feats = [c for f in chosen for c in FAM[f]]
        te["adj"] = te.proj.copy()
        if feats:
            for pos in ("QB","RB","WR","TE"):
                a = tr_all[tr_all.pos == pos]; b = te[te.pos == pos]
                te.loc[te.pos == pos, "adj"] = b.proj + ridge_fit(a[feats].values.astype(float), a.resid.values)(b[feats].values.astype(float))
        out.append(te)
    return pd.concat(out), chosen_log
base = S[S.season.isin(YEARS)].copy(); base["adj"] = base.proj
hp0 = verdict(base)[0]
print(f"baseline close-call hit rate {hp0*100:.2f}%   (scored player-weeks {len(base)})\n")
print(f"{'model':62}{'hit rate':>9}{'change':>9}{'99% CI':>16}{'seasons+':>9}{'MAE':>7}  result")
def show(name, R):
    hp, ha, d, lo, hi, per, n = verdict(R); k = sum(1 for x in per if x > 0)
    ok = lo > 0 and k >= 4 and d >= 0.005
    print(f"{name:62}{ha*100:8.2f}%{d*100:+8.2f} [{lo*100:+5.2f},{hi*100:+5.2f}]{k:>7}/5{np.abs(R.actual-R.adj).mean():7.3f}  {'PASS' if ok else 'no'}   per-season {[round(x*100,2) for x in per]}")
show("M1 trees, all context features, pooled", predict(None))
show("M2 trees, all context + the projection itself, pooled", predict(None, feats_extra=True))
show("M3 trees, all context + projection, one model per position", predict(None, feats_extra=True, per_pos=True))
R4, log = nested_forward()
show("M4 nested forward selection of families (ridge)", R4)
print("\nM4 chosen families by test season (selected without seeing that season):")
for T, f in log.items(): print(" ", T, f if f else "none (adding anything did not help on validation)")
