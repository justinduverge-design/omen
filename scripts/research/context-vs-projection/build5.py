import numpy as np, pandas as pd, urllib.request, os, warnings
warnings.filterwarnings("ignore")
B = "https://github.com/nflverse/nflverse-data/releases/download"
os.makedirs("data/x", exist_ok=True)
MISSING = []
def dl(url, fn):
    if os.path.exists(fn) and os.path.getsize(fn) > 500: return fn
    try: urllib.request.urlretrieve(url, fn); return fn
    except Exception as e: MISSING.append(url.split("/download/")[1]); return None
NORM = {"LAR":"LA","OAK":"LV","SD":"LAC","STL":"LA","JAC":"JAX","WSH":"WAS"}; nt = lambda t: NORM.get(t, t) if isinstance(t, str) else t
yrs = range(2018, 2026)
D = pd.read_pickle("data/dataset4.pkl")
players = pd.read_csv("data/nfl/players.csv", low_memory=False); pfr2g = players.dropna(subset=["pfr_id","gsis_id"]).set_index("pfr_id").gsis_id.to_dict()
def trail_player(T, cols, k=4, minp=2):
    # rolling mean THROUGH each source row (includes it); merged later with an as-of join onto the next game
    T = T.sort_values(["gsis","season","week"]).copy()
    for c in cols: T["t_" + c] = T.groupby("gsis")[c].transform(lambda s: s.rolling(k, min_periods=minp).mean())
    return T[["gsis","season","week"] + ["t_" + c for c in cols]]
def asof_attach(D, T):
    T = T.copy(); T["tk"] = (T.season.astype("int64") * 100 + T.week.astype("int64")); T = T.drop(columns=["season","week"]).sort_values("tk")
    D = D.copy(); D["tk"] = (D.season.astype("int64") * 100 + D.week.astype("int64")); has = D.gsis.notna(); a = D[has].sort_values("tk")
    m = pd.merge_asof(a, T, on="tk", by="gsis", allow_exact_matches=False, direction="backward")
    return pd.concat([m, D[~has]], ignore_index=True).drop(columns=["tk"])
def trail_team(T, cols, k=6, minp=3):
    T = T.sort_values(["team","season","week"]).copy()
    for c in cols: T["t_" + c] = T.groupby("team")[c].transform(lambda s: s.shift(1).rolling(k, min_periods=minp).mean())
    return T[["team","season","week"] + ["t_" + c for c in cols]]
# ---------- PFR advanced ----------
def pfr(kind):
    fs = [dl(f"{B}/pfr_advstats/advstats_week_{kind}_{y}.csv", f"data/x/pfr_{kind}_{y}.csv") for y in yrs]
    return pd.concat([pd.read_csv(f, low_memory=False) for f in fs if f])
pp, pr_, pc, pd_ = pfr("pass"), pfr("rec"), pfr("rush"), pfr("def")
for T in (pp, pr_, pc): T["gsis"] = T.pfr_player_id.map(pfr2g)
pp = pp[pp.game_type == "REG"].dropna(subset=["gsis"]); pr_ = pr_[pr_.game_type == "REG"].dropna(subset=["gsis"]); pc = pc[pc.game_type == "REG"].dropna(subset=["gsis"])
PFRQ = trail_player(pp.rename(columns={"times_pressured_pct": "q_press_pct", "passing_bad_throw_pct": "q_badthrow_pct", "times_blitzed": "q_blitzed", "times_hurried": "q_hurried"})[["gsis","season","week","q_press_pct","q_badthrow_pct","q_blitzed","q_hurried"]], ["q_press_pct","q_badthrow_pct","q_blitzed","q_hurried"], k=6)
PFRR = trail_player(pr_.rename(columns={"receiving_drop_pct": "r_drop_pct", "receiving_broken_tackles": "r_brk"})[["gsis","season","week","r_drop_pct","r_brk"]], ["r_drop_pct","r_brk"], k=6)
PFRC = trail_player(pc.rename(columns={"rushing_yards_before_contact_avg": "c_ybc", "rushing_yards_after_contact_avg": "c_yac", "rushing_broken_tackles": "c_brk"})[["gsis","season","week","c_ybc","c_yac","c_brk"]], ["c_ybc","c_yac","c_brk"], k=6)
pd_ = pd_[pd_.game_type == "REG"].copy(); pd_["team"] = pd_.team.map(nt)
tdef = pd_.groupby(["season","week","team"]).agg(press=("def_pressures","sum"), hurr=("def_times_hurried","sum"), blitz=("def_times_blitzed","sum"), sacks=("def_sacks","sum"), tg=("def_targets","sum"), yds=("def_yards_allowed","sum"), cmp=("def_completions_allowed","sum")).reset_index()
tdef["ypt"] = tdef.yds / tdef.tg.replace(0, np.nan); tdef["cmp_pct"] = tdef["cmp"] / tdef.tg.replace(0, np.nan)
PFRD = trail_team(tdef.rename(columns={"press":"dp_press","hurr":"dp_hurr","blitz":"dp_blitz","ypt":"dp_ypt","cmp_pct":"dp_cmp"})[["team","season","week","dp_press","dp_hurr","dp_blitz","dp_ypt","dp_cmp"]], ["dp_press","dp_hurr","dp_blitz","dp_ypt","dp_cmp"]).rename(columns={"team": "opp"})
# ---------- Next Gen Stats ----------
def ngs(kind):
    fr = []
    for y in yrs:
        fn = dl(f"{B}/nextgen_stats/ngs_{y}_{kind}.csv.gz", f"data/x/ngs_{y}_{kind}.csv.gz")
        if fn: fr.append(pd.read_csv(fn, low_memory=False))
    d = pd.concat(fr); d = d[(d.season_type == "REG") & (d.week > 0)]; return d.rename(columns={"player_gsis_id": "gsis"})
NP, NR, NC = ngs("passing"), ngs("receiving"), ngs("rushing")
NGSQ = trail_player(NP[["gsis","season","week","avg_time_to_throw","aggressiveness","avg_intended_air_yards","completion_percentage_above_expectation"]].rename(columns={"avg_time_to_throw":"n_ttt","aggressiveness":"n_aggr","avg_intended_air_yards":"n_iay","completion_percentage_above_expectation":"n_cpae"}), ["n_ttt","n_aggr","n_iay","n_cpae"], k=6)
NGSR = trail_player(NR[["gsis","season","week","avg_cushion","avg_separation","avg_yac_above_expectation","percent_share_of_intended_air_yards","catch_percentage"]].rename(columns={"avg_cushion":"n_cush","avg_separation":"n_sep","avg_yac_above_expectation":"n_yacae","percent_share_of_intended_air_yards":"n_iay_share","catch_percentage":"n_catch"}), ["n_cush","n_sep","n_yacae","n_iay_share","n_catch"], k=6)
NGSC = trail_player(NC[["gsis","season","week","efficiency","rush_yards_over_expected_per_att","percent_attempts_gte_eight_defenders","avg_time_to_los"]].rename(columns={"efficiency":"n_eff","rush_yards_over_expected_per_att":"n_ryoe","percent_attempts_gte_eight_defenders":"n_box8","avg_time_to_los":"n_ttl"}), ["n_eff","n_ryoe","n_box8","n_ttl"], k=6)
# ---------- FTN (2022+) ----------
ftn_fs = [dl(f"{B}/ftn_charting/ftn_charting_{y}.csv", f"data/x/ftn_{y}.csv") for y in range(2022, 2026)]
ftn = pd.concat([pd.read_csv(f, low_memory=False) for f in ftn_fs if f])
pbp = pd.concat([pd.read_parquet(f"data/pbp/pbp_{y}.parquet", columns=["game_id","play_id","season","week","season_type","posteam","defteam","penalty","penalty_type"]) for y in yrs])
pbp = pbp[pbp.season_type == "REG"].copy()
ftn = ftn.merge(pbp[["game_id","play_id","posteam","defteam","season","week"]], left_on=["nflverse_game_id","nflverse_play_id"], right_on=["game_id","play_id"], how="inner", suffixes=("_f",""))
for c in ("is_play_action","is_motion","is_screen_pass","is_no_huddle","is_drop"): ftn[c] = ftn[c].astype(float)
fo = ftn.groupby(["season","week","posteam"]).agg(f_pa=("is_play_action","mean"), f_motion=("is_motion","mean"), f_screen=("is_screen_pass","mean"), f_nohud=("is_no_huddle","mean")).reset_index().rename(columns={"posteam":"team"}); fo["team"] = fo.team.map(nt)
fd = ftn.groupby(["season","week","defteam"]).agg(fd_blitzers=("n_blitzers","mean"), fd_rushers=("n_pass_rushers","mean")).reset_index().rename(columns={"defteam":"team"}); fd["team"] = fd.team.map(nt)
FTNO = trail_team(fo, ["f_pa","f_motion","f_screen","f_nohud"]); FTND = trail_team(fd, ["fd_blitzers","fd_rushers"]).rename(columns={"team": "opp"})
# ---------- referee crew tendencies (from games.csv referee + pbp penalties) ----------
G = pd.read_csv("data/games.csv"); G = G[(G.game_type == "REG") & G.season.between(2018, 2025)][["game_id","season","week","referee"]]
pen = pbp[pbp.penalty == 1].groupby("game_id").agg(pens=("penalty","sum"), dpi=("penalty_type", lambda s: s.isin(["Defensive Pass Interference","Defensive Holding","Illegal Contact"]).sum())).reset_index()
G = G.merge(pen, on="game_id", how="left").fillna({"pens": 0, "dpi": 0}).sort_values(["season","week"])
G["ref_pens"] = G.groupby("referee").pens.transform(lambda s: s.shift(1).rolling(20, min_periods=8).mean())
G["ref_dpi"] = G.groupby("referee").dpi.transform(lambda s: s.shift(1).rolling(20, min_periods=8).mean())
REF = G[["game_id","ref_pens","ref_dpi"]]
Gm = pd.read_csv("data/games.csv")[["game_id","season","week","home_team","away_team"]]
Gm["home_team"] = Gm.home_team.map(nt); Gm["away_team"] = Gm.away_team.map(nt)
gm = pd.concat([Gm.assign(team=Gm.home_team), Gm.assign(team=Gm.away_team)])[["game_id","season","week","team"]].merge(REF, on="game_id", how="left")
# ---------- player attributes ----------
pl = players.dropna(subset=["gsis_id"]).drop_duplicates("gsis_id").rename(columns={"gsis_id": "gsis"})
pl["birth"] = pd.to_datetime(pl.birth_date, errors="coerce")
cb = pd.read_csv(dl(f"{B}/combine/combine.csv", "data/x/combine.csv"), low_memory=False).dropna(subset=["pfr_id"]).drop_duplicates("pfr_id")[["pfr_id","forty","vertical","broad_jump","cone"]]
pl = pl.merge(cb, on="pfr_id", how="left")
ATTR = pl[["gsis","draft_pick","draft_round","rookie_season","birth","weight","height","forty","vertical","broad_jump","cone"]]
# ---------- merge ----------
for T in (PFRQ, PFRR, PFRC, NGSQ, NGSR, NGSC): D = asof_attach(D, T)
D = D.merge(PFRD, on=["opp","season","week"], how="left").merge(FTND, on=["opp","season","week"], how="left")
D = D.merge(FTNO, on=["team","season","week"], how="left").merge(gm.drop(columns=["game_id"]).drop_duplicates(["season","week","team"]), on=["team","season","week"], how="left")
D = D.merge(ATTR, on="gsis", how="left")
D["age"] = (pd.to_datetime(D.season.astype(str) + "-09-15") - D.birth).dt.days / 365.25
D["experience"] = D.season - D.rookie_season; D["draft_pick"] = D.draft_pick.fillna(300.0)
D = D.drop(columns=["birth"])
# ---- presence tripwire: a trailing feature must be present equally often whether or not the player did anything THIS week ----
chk = D[D.proj >= 3].copy(); chk["did"] = chk.played
for col in ["t_n_sep","t_n_ryoe","t_r_drop_pct","t_c_ybc","t_q_press_pct","p_adot","p_man_edge","q_sack","r_stuff"]:
    if col in chk.columns:
        a = chk[chk.did][col].notna().mean(); b = chk[~chk.did][col].notna().mean()
        print(f"  presence check {col:14} present when he played {a*100:5.1f}% | when he did not {b*100:5.1f}%")
D.to_pickle("data/dataset5.pkl")
S = D[D.played & (D.proj >= 3)]
new = [c for c in D.columns if c.startswith(("t_","dp_","fd_","f_")) or c in ("ref_pens","ref_dpi","draft_pick","age","experience","weight","height","forty")]
print("missing files skipped:", MISSING)
print("scored rows", len(S), "| new feature columns", len(new))
for g, pre in [("PFR QB","t_q_"),("PFR receiver","t_r_"),("PFR rusher","t_c_"),("NGS QB","t_n_ttt"),("NGS receiver","t_n_sep"),("NGS rusher","t_n_ryoe"),("PFR defense","t_dp_"),("FTN offense","t_f_"),("FTN defense","t_fd_"),("referee","ref_pens"),("attributes","age")]:
    cols = [c for c in D.columns if c.startswith(pre)] or ([pre] if pre in D.columns else [])
    if cols: print(f"  {g:14} {cols[0]:16} non-missing {S[cols[0]].notna().mean()*100:5.1f}%")
