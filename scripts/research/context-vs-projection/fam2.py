import numpy as np, pandas as pd, warnings
warnings.filterwarnings("ignore"); np.random.seed(77)
D = pd.read_pickle("data/dataset3.pkl").sort_values(["gsis","season","week"]).reset_index(drop=True)
D["resid"] = D.actual - D.proj
# ---------------- F: is a player's variance predictable? ----------------
tstd = np.full(len(D), np.nan); tmean = np.full(len(D), np.nan)
for (g, s), ix in D.groupby(["gsis","season"]).groups.items():
    ix = list(ix)
    for j, i in enumerate(ix):
        prev = D.loc[ix[:j], "actual"][D.loc[ix[:j], "played"]].values[-6:]
        if len(prev) >= 4: tstd[i] = prev.std(ddof=1); tmean[i] = prev.mean()
D["tstd"], D["tmean"] = tstd, tmean
F = D[D.played & (D.proj >= 5) & D.tstd.notna() & D.season.between(2021, 2025)].copy()
F["absdev"] = (F.actual - F.tmean).abs()
sp = lambda a, b: pd.Series(a).rank().corr(pd.Series(b).rank())
print("=== F  variance: does a player's recent score spread predict how far next week lands from his own average? ===")
for pos in ("QB","RB","WR","TE"):
    f = F[F.pos == pos]; terc = pd.qcut(f.tmean, 3, labels=False, duplicates="drop")
    within = np.mean([sp(f[terc == t].tstd.values, f[terc == t].absdev.values) for t in range(3)])
    print(f"{pos}: Spearman(recent std, next |deviation|) overall {sp(f.tstd.values, f.absdev.values):.3f} | within same scoring level {within:.3f} | n={len(f)}")
per = [sp(F[F.season == y].tstd.values, F[F.season == y].absdev.values) for y in range(2021, 2026)]
print("by season:", [round(x, 3) for x in per])
# ---------------- G: waiver / rest-of-season ----------------
D["key"] = list(zip(D.gsis, D.season, D.week))
look = D.set_index(["gsis","season","week"])
act = look.actual.where(look.played); prj = look.proj; tt = look.team_total; dv = look.dvp
def fut(gs, s, w, ser, k=3):
    return [ser.get((gs, s, w + j), np.nan) for j in range(1, k + 1)]
actd, prjd, ttd, dvd = act.to_dict(), prj.to_dict(), tt.to_dict(), dv.to_dict()
rows = []
for r in D[(D.proj >= 3) & D.gsis.notna() & D.season.between(2018, 2025)].itertuples():
    gs, s, w = r.gsis, r.season, r.week
    nxt = [actd.get((gs, s, w + j), np.nan) for j in range(1, 4)]; nxtp = [prjd.get((gs, s, w + j), np.nan) for j in range(1, 4)]
    pa = [actd.get((gs, s, w - j), np.nan) for j in range(1, 5)]
    ok_n = np.sum(~np.isnan(nxt)); ok_p = np.sum(~np.isnan(pa))
    if ok_n < 2 or ok_p < 2: continue
    rows.append(dict(season=s, week=w, pos=r.pos, y=np.nanmean(nxt), trail4=np.nanmean(pa), proj_w=r.proj,
        proj_next3=np.nanmean(nxtp) if np.sum(~np.isnan(nxtp)) >= 2 else np.nan,
        ts3=r.target_share_3, car3=r.carries_3, snap3=r.offense_pct_3, snaptr=r.snap_trend, tgttr=r.target_trend,
        tt_next=ttd.get((gs, s, w + 1), np.nan), dvp_next=dvd.get((gs, s, w + 1), np.nan)))
G = pd.DataFrame(rows)
FE = ["trail4","proj_w","ts3","car3","snap3","snaptr","tgttr","tt_next","dvp_next"]
def ridge_fit(X, y, lam=30.0):
    X = np.nan_to_num(X, nan=0.0); mu, sd = X.mean(0), X.std(0); sd = np.where(sd < 1e-6, 1.0, sd)
    Z1 = np.c_[np.ones(len(X)), (X - mu) / sd]; R = lam * np.eye(Z1.shape[1]); R[0, 0] = 0
    b = np.linalg.solve(Z1.T @ Z1 + R, Z1.T @ y); return lambda Xn: np.c_[np.ones(len(Xn)), (np.nan_to_num(Xn, nan=0.0) - mu) / sd] @ b
out = []
for pos in ("QB","RB","WR","TE"):
    d = G[G.pos == pos]
    for T in range(2021, 2026):
        tr, te = d[d.season < T], d[d.season == T].copy()
        te["M"] = ridge_fit(tr[FE].values.astype(float), tr.y.values)(te[FE].values.astype(float)); out.append(te)
G2 = pd.concat(out)
print("\n=== G  waiver / rest-of-season: predict the average over the NEXT 3 weeks (test seasons 2021-2025) ===")
print(f"rows {len(G2)}")
mae = lambda col: (G2.y - G2[col]).abs()
for name, col in [("trailing 4-week average (what recency-chasers use)", "trail4"), ("this week's projection", "proj_w"), ("Omen-style model (usage + schedule + form)", "M")]:
    print(f"  {name:52} MAE {mae(col).mean():.3f}")
hp = G2[G2.proj_next3.notna()]
print(f"  {'the next 3 weeks of PROJECTIONS (uses future snapshots; upper bar)':52} MAE {(hp.y-hp.proj_next3).abs().mean():.3f}   (n={len(hp)})")
def paired(a, b):
    d = (G2.y - G2[a]).abs() - (G2.y - G2[b]).abs()
    g = d.groupby([G2.season, G2.week]).agg(["sum","count"]).values
    boots = []
    for _ in range(2000):
        s = g[np.random.randint(0, len(g), len(g))]; boots.append(s[:,0].sum() / s[:,1].sum())
    return d.mean(), np.percentile(boots, [0.5, 99.5])
for a, b, label in [("M","trail4","model vs trailing average"), ("M","proj_w","model vs this week's projection")]:
    m, ci = paired(a, b); print(f"  {label:40} mean error change {m:+.3f} pts   99% CI [{ci[0]:+.3f}, {ci[1]:+.3f}]  ({'model better' if ci[1] < 0 else 'no reliable difference' if ci[0] <= 0 <= ci[1] else 'model WORSE'})")
# ranking quality: weekly Spearman between prediction and outcome, averaged
def rk(col): return np.mean([sp(g[col].values, g.y.values) for _, g in G2.groupby(["season","week","pos"]) if len(g) >= 15])
print(f"  weekly rank correlation with the real next-3-week average: trailing {rk('trail4'):.3f} | projection {rk('proj_w'):.3f} | model {rk('M'):.3f}")
