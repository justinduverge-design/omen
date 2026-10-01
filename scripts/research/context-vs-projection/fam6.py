import numpy as np, pandas as pd, warnings
from sklearn.ensemble import HistGradientBoostingRegressor
warnings.filterwarnings("ignore"); np.random.seed(1234)
D = pd.read_pickle("data/dataset5.pkl"); D["resid"] = D.actual - D.proj
S = D[D.played & (D.proj >= 3)].copy()
for p_ in ("QB","RB","WR","TE"): S["pos_" + p_] = (S.pos == p_).astype(int)
POSF = ["pos_QB","pos_RB","pos_WR","pos_TE"]; YEARS = (2021,2022,2023,2024,2025)
cen = lambda col: S[col] - S[col].mean()
S["x_depth"] = cen("off_o_adot") * cen("def_d_adot"); S["x_deep"] = cen("p_deep") * cen("def_d_deep_epa"); S["x_rush_pressure"] = cen("q_sack") * cen("def_d_sack")
S["x_run"] = cen("off_o_rush_epa") * cen("def_d_rush_epa"); S["x_passmix"] = cen("off_o_neutral_pass") * cen("def_d_pass_epa")
G = {
 "A availability": ["inj_q","inj_d","prac_limited","prac_dnp","returning"],
 "B usage trends": ["target_share_3","wopr_3","carries_3","offense_pct_3","snap_trend","target_trend"],
 "C player splits": ["s_prime","s_home","s_away","s_dome","s_cw"],
 "D tempo (pass rate)": ["team_pass_rate_4","team_plays_4","opp_pass_rate_faced_4","rs_diff","new_coach"],
 "E1 lines": ["team_total","opp_total","margin"], "E2 rest/primetime": ["short_week","post_bye","rest_diff","primetime","home"],
 "E3 weather/roof": ["dome","wind_f","temp_f","cold","windy"], "E4 opponent vs position": ["dvp","dvp_missing"], "E5 recent form": ["recent_resid","recent_missing"],
 "S1 offense scheme (pbp)": [c for c in S.columns if c.startswith("off_o_")], "S2 defense scheme + coverage (pbp)": [c for c in S.columns if c.startswith("def_d_")],
 "S3 player profile (pbp)": ["p_adot","p_deep","p_yac","p_man_edge","q_sack","q_scramble","q_adot","r_stuff","r_explosive","man_matchup"],
 "S4 scheme x matchup products": ["x_depth","x_deep","x_rush_pressure","x_run","x_passmix"],
 "P1 PFR QB pressure/bad throws": [c for c in S.columns if c.startswith("t_q_")], "P2 PFR receiver drops/broken tackles": [c for c in S.columns if c.startswith("t_r_")],
 "P3 PFR rusher contact": [c for c in S.columns if c.startswith("t_c_")], "P4 PFR defense pressure/coverage": [c for c in S.columns if c.startswith("dp_")],
 "N1 NGS QB": [c for c in S.columns if c.startswith("t_n_") and c[4:7] in ("ttt","agg","iay","cpa") and "share" not in c],
 "N2 NGS receiver separation/cushion": [c for c in S.columns if c.startswith("t_n_") and c[4:8] in ("cush","sep","yaca","iay_","catc")],
 "N3 NGS rusher": [c for c in S.columns if c.startswith("t_n_") and c[4:8] in ("eff","ryoe","box8","ttl")],
 "F1 FTN offense (2022+)": [c for c in S.columns if c.startswith("t_f_")], "F2 FTN defense (2022+)": [c for c in S.columns if c.startswith("fd_") or c.startswith("t_fd_")],
 "R referee crew": ["ref_pens","ref_dpi"], "T player attributes (draft, age, athleticism)": ["draft_pick","age","experience","weight","height","forty","vertical","broad_jump","cone"],
}
G = {k: [c for c in v if c in S.columns] for k, v in G.items()}; G = {k: v for k, v in G.items() if v}
ALL = sorted({c for v in G.values() for c in v})
print(f"features: {len(ALL)} across {len(G)} groups | scored player-weeks {len(S[S.season.isin(YEARS)])} (test 2021-2025)")
gbm = lambda it: HistGradientBoostingRegressor(max_depth=3, learning_rate=0.05, max_iter=it, min_samples_leaf=100, l2_regularization=5.0, random_state=1)
def ridge_fit(X, y, lam=30.0):
    X = np.nan_to_num(X, nan=0.0); mu, sd = X.mean(0), X.std(0); sd = np.where(sd < 1e-9, 1.0, sd)
    Z1 = np.c_[np.ones(len(X)), (X - mu) / sd]; R = lam * np.eye(Z1.shape[1]); R[0, 0] = 0; b = np.linalg.solve(Z1.T @ Z1 + R, Z1.T @ y)
    return lambda Xn: np.c_[np.ones(len(Xn)), (np.nan_to_num(Xn, nan=0.0) - mu) / sd] @ b
def pairs(R, lo=5.0, band=2.0):
    rec = []
    for (s, w, p), g in R[R.proj >= lo].groupby(["season","week","pos"]):
        a, pr, ad = g.actual.values, g.proj.values, g.adj.values; i, j = np.triu_indices(len(g), 1)
        m = (np.abs(pr[i]-pr[j]) <= band) & (a[i] != a[j]) & (pr[i] != pr[j]); i, j = i[m], j[m]
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
    print(f"{name:58}{ha*100:7.2f}%{d*100:+7.2f} [{lo*100:+5.2f},{hi*100:+5.2f}]{k:>4}/5  {'PASS' if ok else 'no'}  seasons {[round(float(x)*100,2) for x in per]}")
# ---------------- K1: trees on everything, rounds chosen on the last training season ----------------
FE = ALL + ["proj"] + POSF; out = []; imp_total = {}; chosen = {}
for T in YEARS:
    tr, te = S[S.season < T], S[S.season == T].copy()
    fit, val = tr[tr.season < T - 1], tr[tr.season == T - 1]
    m = gbm(400).fit(fit[FE].values.astype(float), fit.resid.values)
    errs = [np.abs(val.resid.values - p).mean() for p in m.staged_predict(val[FE].values.astype(float))]
    it = int(np.argmin(errs)) + 1; chosen[T] = it
    # permutation importance by GROUP on the validation season, model trained before it
    base_pred = m.predict(val[FE].values.astype(float)); base_err = np.abs(val.resid.values - base_pred).mean()
    rng = np.random.RandomState(T)
    for g, cols in G.items():
        Xv = val[FE].copy()
        for c in cols: Xv[c] = rng.permutation(Xv[c].values)
        imp_total[g] = imp_total.get(g, 0) + (np.abs(val.resid.values - m.predict(Xv.values.astype(float))).mean() - base_err)
    final = gbm(it).fit(tr[FE].values.astype(float), tr.resid.values)
    te["adj"] = te.proj + final.predict(te[FE].values.astype(float)); out.append(te)
base = S[S.season.isin(YEARS)].copy(); base["adj"] = base.proj
print(f"baseline close-call hit rate {verdict(base)[0]*100:.2f}%\n")
print(f"{'model':58}{'hit':>8}{'change':>7} {'99% CI':>14}{'yrs+':>7}")
show("K1 trees on EVERYTHING (rounds chosen on last training season)", pd.concat(out))
print("   rounds chosen per season:", chosen)
# ---------------- K2: nested forward selection of groups (ridge, per position) ----------------
out2, log = [], {}
for T in YEARS:
    tr_all, te = S[S.season < T], S[S.season == T].copy(); inner, val = tr_all[tr_all.season < T - 1], tr_all[tr_all.season == T - 1]
    def vmae(groups):
        feats = [c for g in groups for c in G[g]]; err = []
        for pos in ("QB","RB","WR","TE"):
            a, b = inner[inner.pos == pos], val[val.pos == pos]
            pred = np.zeros(len(b)) if not feats else ridge_fit(a[feats].values.astype(float), a.resid.values)(b[feats].values.astype(float))
            err.append(np.abs(b.resid.values - pred))
        return np.concatenate(err).mean()
    chosen_g, best = [], vmae([])
    while True:
        cands = [(vmae(chosen_g + [g]), g) for g in G if g not in chosen_g]
        m_, g_ = min(cands)
        if m_ < best - 1e-4: chosen_g.append(g_); best = m_
        else: break
    log[T] = chosen_g; feats = [c for g in chosen_g for c in G[g]]; te["adj"] = te.proj.copy()
    if feats:
        for pos in ("QB","RB","WR","TE"):
            a = tr_all[tr_all.pos == pos]; b = te[te.pos == pos]
            te.loc[te.pos == pos, "adj"] = b.proj + ridge_fit(a[feats].values.astype(float), a.resid.values)(b[feats].values.astype(float))
    out2.append(te)
show("K2 nested forward selection of feature groups (ridge)", pd.concat(out2))
print("\nK2 chosen groups per test season (chosen without seeing that season):")
for T, gs in log.items(): print(" ", T, gs if gs else "none")
print("\nK1 permutation importance by group (rise in validation error when the group is shuffled, summed over 5 seasons; bigger = relied on more):")
for g, v in sorted(imp_total.items(), key=lambda x: -x[1])[:10]: print(f"  {g:48} {v:+.4f}")
