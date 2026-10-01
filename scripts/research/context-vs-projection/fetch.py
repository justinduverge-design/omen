import json, os, sys, time, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor
OUT = "data"; os.makedirs(OUT, exist_ok=True)
POS = "position%5B%5D=QB&position%5B%5D=RB&position%5B%5D=WR&position%5B%5D=TE"
def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=60) as r: return json.load(r)
        except Exception as e:
            time.sleep(1.5 * (i + 1)); err = e
    raise err
def job(args):
    kind, season, week = args
    fn = f"{OUT}/{kind}_{season}_{week}.json"
    if os.path.exists(fn): return fn, "cached"
    base = "projections" if kind == "proj" else "stats"
    d = get(f"https://api.sleeper.app/{base}/nfl/{season}/{week}?season_type=regular&{POS}")
    slim = []
    for r in d:
        st = r.get("stats") or {}
        slim.append({"id": r.get("player_id"), "team": r.get("team"), "opp": r.get("opponent"),
                     "pos": (r.get("player") or {}).get("position"), "name": ((r.get("player") or {}).get("first_name","") + " " + (r.get("player") or {}).get("last_name","")).strip(),
                     "ppr": st.get("pts_ppr"), "gp": st.get("gp"), "gms": st.get("gms_active")})
    json.dump(slim, open(fn, "w")); return fn, len(slim)
jobs = [(k, s, w) for s in range(2018, 2026) for w in range(1, 19) for k in ("proj", "stats")]
with ThreadPoolExecutor(6) as ex:
    done = 0
    for fn, n in ex.map(job, jobs):
        done += 1
        if done % 40 == 0: print(done, "of", len(jobs), flush=True)
import urllib.request as _u
if not os.path.exists(f"{OUT}/games.csv"):
    _u.urlretrieve("https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv", f"{OUT}/games.csv")
print("done", len(jobs), "(+ games.csv)")
