import numpy as np, pandas as pd, warnings
warnings.filterwarnings("ignore")
NORM = {"LAR":"LA","OAK":"LV","SD":"LAC","STL":"LA","JAC":"JAX","WSH":"WAS"}
nt = lambda t: NORM.get(t, t) if isinstance(t, str) else t
cols = ["game_id","play_id","season","week","season_type","posteam","defteam","pass","rush","sack","qb_hit","qb_scramble","epa","air_yards","yards_after_catch",
        "yards_gained","complete_pass","down","wp","game_seconds_remaining","shotgun","no_huddle","receiver_player_id","passer_player_id","rusher_player_id","play_type"]
pb = pd.concat([pd.read_parquet(f"data/pbp/pbp_{y}.parquet", columns=cols) for y in range(2018, 2026)])
pb = pb[(pb.season_type == "REG") & pb.posteam.notna() & pb.defteam.notna() & ((pb["pass"] == 1) | (pb.rush == 1))].copy()
for c in ("posteam","defteam"): pb[c] = pb[c].map(nt)
part = pd.concat([pd.read_parquet(f"data/pbp/part_{y}.parquet", columns=["nflverse_game_id","play_id","defense_man_zone_type","defense_coverage_type","route","was_pressure","number_of_pass_rushers"]) for y in range(2018, 2026)])
part = part.rename(columns={"nflverse_game_id": "game_id"}).drop_duplicates(["game_id","play_id"])
pb = pb.merge(part, on=["game_id","play_id"], how="left")
VALID_COV = {"COVER_0","COVER_1","COVER_2","COVER_3","COVER_4","COVER_6","2_MAN","PREVENT","COVER_9","COMBO"}
pb["cov"] = pb.defense_coverage_type.where(pb.defense_coverage_type.isin(VALID_COV))
pb["man"] = pb.defense_man_zone_type.map({"MAN_COVERAGE": 1, "ZONE_COVERAGE": 0})
isp = pb["pass"] == 1
lab_share = pb[isp]["cov"].notna().mean() * 100
print("plays", len(pb), "| pass plays", int(isp.sum()), "| coverage label on", f"{lab_share:.0f}% of pass plays")
# ---------------- team-game aggregates ----------------
pb["neutral"] = pb.down.isin([1, 2]) & pb.wp.between(0.2, 0.8) & (pb.game_seconds_remaining > 120)
pb["deep"] = (pb.air_yards >= 15).astype(float).where(pb.air_yards.notna())
def off_agg(g):
    p = g[g["pass"] == 1]; r = g[g.rush == 1]; att = p[p.air_yards.notna()]; dropbacks = max(len(p), 1)
    n = g[g.neutral]
    return pd.Series({"o_plays": len(g), "o_neutral_pass": n["pass"].mean() if len(n) else np.nan, "o_adot": att.air_yards.mean(), "o_deep": att.deep.mean(),
        "o_shotgun": g.shotgun.mean(), "o_nohuddle": g.no_huddle.mean(), "o_sack": p.sack.sum() / dropbacks, "o_yac": p[p.complete_pass == 1].yards_after_catch.mean(),
        "o_pass_epa": p.epa.mean(), "o_rush_epa": r.epa.mean()})
def def_agg(g):
    p = g[g["pass"] == 1]; r = g[g.rush == 1]; att = p[p.air_yards.notna()]; dropbacks = max(len(p), 1)
    lab = p[p["cov"].notna()]; mz = p[p.man.notna()]
    d = {"d_pass_epa": p.epa.mean(), "d_rush_epa": r.epa.mean(), "d_sack": p.sack.sum() / dropbacks, "d_qbhit": p.qb_hit.sum() / dropbacks,
         "d_adot": att.air_yards.mean(), "d_deep": att.deep.mean(), "d_deep_epa": att[att.air_yards >= 15].epa.mean(), "d_short_epa": att[att.air_yards <= 5].epa.mean(),
         "d_yac": p[p.complete_pass == 1].yards_after_catch.mean(), "d_stuff": (r.yards_gained <= 0).mean() if len(r) else np.nan,
         "d_explosive_run": (r.yards_gained >= 10).mean() if len(r) else np.nan, "d_man": mz.man.mean() if len(mz) else np.nan,
         "d_blitz": (p.number_of_pass_rushers >= 5).where(p.number_of_pass_rushers.notna()).mean(), "d_pressure": p.was_pressure.map({1: 1.0, 0: 0.0, True: 1.0, False: 0.0}).mean()}
    for c in ("COVER_0","COVER_1","COVER_2","COVER_3","COVER_4","COVER_6"): d["d_" + c.lower()] = (lab["cov"] == c).mean() if len(lab) else np.nan
    return pd.Series(d)
T_off = pb.groupby(["season","week","posteam"]).apply(off_agg).reset_index().rename(columns={"posteam": "team"})
T_def = pb.groupby(["season","week","defteam"]).apply(def_agg).reset_index().rename(columns={"defteam": "team"})
def trailing(T, cols, k=6, minn=3):
    T = T.sort_values(["team","season","week"]); out = []
    for (team, s), g in T.groupby(["team","season"]):
        g = g.reset_index(drop=True); r = g[["season","week","team"]].copy()
        for c in cols:
            v = g[c].values; r[c] = [np.nanmean(v[max(0, i - k):i]) if np.sum(~np.isnan(v[max(0, i - k):i])) >= minn else np.nan for i in range(len(g))]
        out.append(r)
    return pd.concat(out)
OC = [c for c in T_off.columns if c.startswith("o_")]; DC = [c for c in T_def.columns if c.startswith("d_")]
TO = trailing(T_off, OC); TD = trailing(T_def, DC)
# ---------------- player profiles (trailing, across seasons, strictly earlier games) ----------------
p = pb[pb["pass"] == 1]
rc = p[p.receiver_player_id.notna()].copy()
rc["deepflag"] = (rc.air_yards >= 15).astype(float)
rg = rc.groupby(["receiver_player_id","season","week"]).apply(lambda g: pd.Series({"t": len(g), "adot_sum": g.air_yards.sum(), "deep_n": g.deepflag.sum(), "yac_sum": g.yards_after_catch.sum(),
    "comp": g.complete_pass.sum(), "epa_man": g[g.man == 1].epa.sum(), "n_man": (g.man == 1).sum(), "epa_zone": g[g.man == 0].epa.sum(), "n_zone": (g.man == 0).sum()})).reset_index()
rg = rg.rename(columns={"receiver_player_id": "gsis"}).sort_values(["gsis","season","week"])
def roll_profile(rg):
    rows = []
    for gs, g in rg.groupby("gsis"):
        g = g.reset_index(drop=True)
        for i in range(len(g)):
            h = g.iloc[max(0, i - 9):i + 1]
            if h.t.sum() >= 15:
                nm, nz = h.n_man.sum(), h.n_zone.sum()
                em = h.epa_man.sum() / nm if nm >= 3 else np.nan; ez = h.epa_zone.sum() / nz if nz >= 3 else np.nan
                edge = (em - ez) * (min(nm, nz) / (min(nm, nz) + 20)) if not (np.isnan(em) or np.isnan(ez)) else np.nan
                rows.append((gs, g.season[i], g.week[i], h.adot_sum.sum() / h.t.sum(), h.deep_n.sum() / h.t.sum(), h.yac_sum.sum() / max(h.comp.sum(), 1), edge))
    return pd.DataFrame(rows, columns=["gsis","season","week","p_adot","p_deep","p_yac","p_man_edge"])
RP = roll_profile(rg)
q = p[p.passer_player_id.notna()].groupby(["passer_player_id","season","week"]).apply(lambda g: pd.Series({"db": len(g), "sk": g.sack.sum(), "sc": g.qb_scramble.sum(), "ay": g.air_yards.mean()})).reset_index().rename(columns={"passer_player_id": "gsis"}).sort_values(["gsis","season","week"])
rows = []
for gs, g in q.groupby("gsis"):
    g = g.reset_index(drop=True)
    for i in range(len(g)):
        h = g.iloc[max(0, i - 7):i + 1]
        if h.db.sum() >= 60: rows.append((gs, g.season[i], g.week[i], h.sk.sum() / h.db.sum(), h.sc.sum() / h.db.sum(), np.average(h.ay.fillna(0), weights=h.db)))
QP = pd.DataFrame(rows, columns=["gsis","season","week","q_sack","q_scramble","q_adot"])
rr = pb[(pb.rush == 1) & pb.rusher_player_id.notna()].groupby(["rusher_player_id","season","week"]).apply(lambda g: pd.Series({"n": len(g), "stuff": (g.yards_gained <= 0).sum(), "expl": (g.yards_gained >= 10).sum()})).reset_index().rename(columns={"rusher_player_id": "gsis"}).sort_values(["gsis","season","week"])
rows = []
for gs, g in rr.groupby("gsis"):
    g = g.reset_index(drop=True)
    for i in range(len(g)):
        h = g.iloc[max(0, i - 7):i + 1]
        if h.n.sum() >= 40: rows.append((gs, g.season[i], g.week[i], h.stuff.sum() / h.n.sum(), h.expl.sum() / h.n.sum()))
RB = pd.DataFrame(rows, columns=["gsis","season","week","r_stuff","r_explosive"])
# ---------------- merge onto the player-week dataset ----------------
D = pd.read_pickle("data/dataset3.pkl")
D = D.merge(TO.rename(columns={c: "off_" + c for c in OC}), on=["season","week","team"], how="left")
D = D.merge(TD.rename(columns={c: "def_" + c for c in DC}).rename(columns={"team": "opp"}), on=["season","week","opp"], how="left")
def asof_attach(D, T):
    """Attach to each D row the feature values from the player's most recent source row STRICTLY EARLIER in time.
    (A plain merge on (gsis, season, week) attaches a value only where the player has a source row for the CURRENT week,
    which leaks 'he had targets in this game' through missingness.)"""
    T = T.copy(); T["tk"] = (T.season.astype("int64") * 100 + T.week.astype("int64")); T = T.drop(columns=["season","week"]).sort_values("tk")
    D = D.copy(); D["tk"] = (D.season.astype("int64") * 100 + D.week.astype("int64"))
    has = D.gsis.notna(); a = D[has].sort_values("tk")
    m = pd.merge_asof(a, T, on="tk", by="gsis", allow_exact_matches=False, direction="backward")
    return pd.concat([m, D[~has]], ignore_index=True).drop(columns=["tk"])
for T in (RP, QP, RB): D = asof_attach(D, T)
D["man_matchup"] = (D.def_d_man - 0.28) * D.p_man_edge
D.to_pickle("data/dataset4.pkl")
S = D[D.played & (D.proj >= 3)]
print("scored rows", len(S))
for c in ["off_o_adot","def_d_deep_epa","def_d_man","def_d_cover_3","def_d_blitz","def_d_pressure","p_adot","p_man_edge","q_sack","r_stuff","man_matchup"]:
    print(f"  {c:18} non-missing {S[c].notna().mean()*100:5.1f}%   mean {S[c].mean():.3f}")
