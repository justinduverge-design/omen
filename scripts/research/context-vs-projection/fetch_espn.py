import json, os, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
os.makedirs("data/espn", exist_ok=True)
def one(args):
    season, week = args; fn = f"data/espn/{season}_{week}.json"
    if os.path.exists(fn): return fn
    url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{season}/segments/0/leaguedefaults/3?view=kona_player_info&scoringPeriodId={week}"
    flt = {"players": {"limit": 500, "sortPercOwned": {"sortPriority": 1, "sortAsc": False}, "filterSlotIds": {"value": [0, 2, 4, 6]}}}
    for i in range(4):
        try:
            req = urllib.request.Request(url, headers={"X-Fantasy-Filter": json.dumps(flt), "User-Agent": "Mozilla/5.0"})
            d = json.load(urllib.request.urlopen(req, timeout=60)); break
        except Exception as e: time.sleep(2 * (i + 1)); d = None
    out = []
    for pe in (d or {}).get("players", []):
        p = pe["player"]; proj = act = None
        for s in p.get("stats", []):
            if s.get("seasonId") == season and s.get("scoringPeriodId") == week and s.get("statSplitTypeId") == 1:
                if s.get("statSourceId") == 1: proj = s.get("appliedTotal")
                if s.get("statSourceId") == 0: act = s.get("appliedTotal")
        out.append({"espn_id": p.get("id"), "name": p.get("fullName"), "pos": p.get("defaultPositionId"), "proj": proj, "act": act})
    json.dump(out, open(fn, "w")); return fn
jobs = [(s, w) for s in range(2018, 2026) for w in range(1, 19)]
with ThreadPoolExecutor(4) as ex:
    for i, _ in enumerate(ex.map(one, jobs)):
        if (i + 1) % 36 == 0: print(i + 1, "of", len(jobs), flush=True)
print("done")
