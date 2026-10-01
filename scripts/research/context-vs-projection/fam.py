import numpy as np, pandas as pd, warnings, sys
warnings.filterwarnings("ignore")
np.random.seed(2026)
D = pd.read_pickle("data/dataset2.pkl").sort_values(["gsis","season","week"]).reset_index(drop=True)
D["resid"] = D.actual - D.proj
# ============ feature construction (fixed in PREREGISTRATION.md) ============
# --- A availability
D["inj_q"] = (D.report_status == "Questionable").astype(int); D["inj_d"] = (D.report_status == "Doubtful").astype(int)
ps = D.practice_status.fillna("")
D["prac_limited"] = ps.str.contains("Limited").astype(int); D["prac_dnp"] = ps.str.contains("Did Not").astype(int)
prev_out = np.zeros(len(D))
for g, ix in D.groupby(["gsis","season"]).groups.items():
    ix = list(ix); w = D.loc[ix, "week"].values
    for a, b in zip(ix[:-1], ix[1:]):
        if D.at[b, "week"] == D.at[a, "week"] + 1 and (D.at[a, "report_status"] in ("Out","Doubtful") or not D.at[a, "played"]): prev_out[b] = 1
D["returning"] = prev_out
# --- B usage leading indicators (strictly earlier weeks, same season; fall back to 0 + missing flag)
for c in ("target_share","wopr","carries","offense_pct"): D[c+"_3"] = np.nan
D["snap_trend"] = np.nan; D["target_trend"] = np.nan
for (gs, s), ix in D.groupby(["gsis","season"]).groups.items():
    ix = list(ix)
    for j, i in enumerate(ix):
        for c in ("target_share","wopr","carries","offense_pct"):
            prev = D.loc[ix[:j], c].dropna().values
            if len(prev) >= 2: D.at[i, c+"_3"] = prev[-3:].mean()
        ps_ = D.loc[ix[:j], "offense_pct"].dropna().values
        if len(ps_) >= 4: D.at[i, "snap_trend"] = ps_[-3:].mean() - ps_.mean()
        pt_ = D.loc[ix[:j], "target_share"].dropna().values
        if len(pt_) >= 4: D.at[i, "target_trend"] = pt_[-3:].mean() - pt_.mean()
# --- C player-specific condition splits (all prior played games, shrunk: n/(n+10) * mean residual in that condition)
D["cw"] = ((D.cold == 1) | (D.windy == 1)).astype(int)
conds = {"s_prime": D.primetime == 1, "s_home": D.home == 1, "s_away": D.home == 0, "s_dome": D.dome == 1, "s_cw": D.cw == 1}
for k in conds: D[k] = 0.0
state = {}
for i, (gs, played, r) in enumerate(zip(D.gsis, D.played, D.resid)):
    if not isinstance(gs, str): continue
    st = state.setdefault(gs, {k: [0, 0.0] for k in conds})
    for k, m in conds.items():
        if m.iat[i]:
            n, sm = st[k]; D.iat[i, D.columns.get_loc(k)] = (sm / n) * (n / (n + 10)) if n else 0.0
    if played and not np.isnan(r):
        for k, m in conds.items():
            if m.iat[i]: st[k][0] += 1; st[k][1] += r
# --- D scheme: fixed columns already built
D["rs_diff"] = D.team_pass_rate_4 - D.opp_pass_rate_faced_4
FAM = {
 "A availability (injury report, practice, returning)": ["inj_q","inj_d","prac_limited","prac_dnp","returning"],
 "B usage trends (targets, WOPR, carries, snaps)": ["target_share_3","wopr_3","carries_3","offense_pct_3","snap_trend","target_trend"],
 "C player splits (primetime/home/away/dome/cold-wind)": ["s_prime","s_home","s_away","s_dome","s_cw"],
 "D team tempo & scheme (pass rate, plays, new coach)": ["team_pass_rate_4","team_plays_4","opp_pass_rate_faced_4","rs_diff","new_coach"],
 "E1 lines (game script)": ["team_total","opp_total","margin"],
 "E2 rest / primetime / home": ["short_week","post_bye","rest_diff","primetime","home"],
 "E3 weather / roof": ["dome","wind_f","temp_f","cold","windy"],
 "E4 opponent vs position": ["dvp","dvp_missing"],
 "E5 recent form vs projection": ["recent_resid","recent_missing"],
}
ALLF = sorted({c for v in FAM.values() for c in v})
S = D[D.played & (D.proj >= 3)].copy()
# ============ evaluation ============
def ridge_fit(X, y, lam=30.0):
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0); mu, sd = X.mean(0), X.std(0); sd = np.where(sd < 1e-6, 1.0, sd)
    Z1 = np.c_[np.ones(len(X)), (X - mu) / sd]; R = lam * np.eye(Z1.shape[1]); R[0, 0] = 0
    b = np.linalg.solve(Z1.T @ Z1 + R, Z1.T @ y)
    return lambda Xn: np.c_[np.ones(len(Xn)), (np.nan_to_num(Xn, nan=0.0, posinf=0.0, neginf=0.0) - mu) / sd] @ b
def run(feats):
    out = []
    for pos in ("QB","RB","WR","TE"):
        d = S[S.pos == pos]
        for T in (2021,2022,2023,2024,2025):
            tr, te = d[d.season < T], d[d.season == T]
            adj = np.zeros(len(te)) if not feats else ridge_fit(tr[feats].values.astype(float), tr.resid.values)(te[feats].values.astype(float))
            t = te.copy(); t["adj"] = t.proj + adj; out.append(t)
    return pd.concat(out)
def pairs(R, lo=5.0, band=2.0):
    rec = []
    for (s, w, p), g in R[R.proj >= lo].groupby(["season","week","pos"]):
        a, pr, ad = g.actual.values, g.proj.values, g.adj.values
        i, j = np.triu_indices(len(g), 1)
        m = (np.abs(pr[i]-pr[j]) <= band) & (a[i] != a[j]) & (pr[i] != pr[j]); i, j = i[m], j[m]
        if len(i): rec.append((s, w, ((pr[i] > pr[j]) == (a[i] > a[j])).sum(), ((ad[i] > ad[j]) == (a[i] > a[j])).sum(), len(i)))
    return np.array(rec)
def verdict(R):
    W0 = pairs(R)
    # cluster = a whole (season, week): outcomes and game-level factors are correlated across positions in one NFL week
    wk = pd.DataFrame(W0, columns=["s","w","hp","ha","n"]).groupby(["s","w"], as_index=False).sum().values
    W = wk; hp, ha, n = W[:,2].sum(), W[:,3].sum(), W[:,4].sum()
    d = (ha - hp) / n
    boots = []
    for _ in range(2000):
        s = W[np.random.randint(0, len(W), len(W))]; boots.append((s[:,3].sum() - s[:,2].sum()) / s[:,4].sum())
    lo, hi = np.percentile(boots, [0.5, 99.5])
    per = [ ( (W[W[:,0]==y][:,3].sum() - W[W[:,0]==y][:,2].sum()) / W[W[:,0]==y][:,4].sum() ) for y in (2021,2022,2023,2024,2025)]
    return hp / n, ha / n, d, lo, hi, per, n
base = run([])
rows = []
print(f"scored player-weeks: {len(base)}  (test seasons 2021-2025; ridge trained on earlier seasons only)\n")
print(f"{'family':55}{'hit rate':>9}{'change':>9}{'99% CI':>18}{'seasons +':>10}{'MAE':>7}   result")
for name, feats in list(FAM.items()) + [("ALL features together", ALLF)]:
    R = run(feats); hp, ha, d, lo, hi, per, n = verdict(R)
    mae = np.abs(R.actual - R.adj).mean(); pos_seasons = sum(1 for x in per if x > 0)
    ok = (lo > 0) and (pos_seasons >= 4) and (d >= 0.005)
    print(f"{name:55}{ha*100:8.2f}%{d*100:+8.2f}  [{lo*100:+5.2f},{hi*100:+5.2f}]{pos_seasons:>8}/5{mae:7.3f}   {'PASS' if ok else 'no'}")
print(f"{'projection only (baseline)':55}{hp*100:8.2f}%{'':9}{'':18}{'':10}{np.abs(base.actual-base.adj).mean():7.3f}")
D.to_pickle("data/dataset3.pkl")
