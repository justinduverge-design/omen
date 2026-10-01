import os, urllib.request, time
os.makedirs("data/nfl", exist_ok=True)
def dl(url, fn):
    if os.path.exists(fn): return
    for i in range(4):
        try:
            urllib.request.urlretrieve(url, fn); return
        except Exception as e: time.sleep(2*(i+1)); err = e
    print("FAILED", url, err)
B = "https://github.com/nflverse/nflverse-data/releases/download"
dl(f"{B}/players/players.csv", "data/nfl/players.csv")
for y in range(2018, 2026):
    dl(f"{B}/stats_player/stats_player_week_{y}.csv", f"data/nfl/stats_player_week_{y}.csv")
    dl(f"{B}/injuries/injuries_{y}.csv", f"data/nfl/injuries_{y}.csv")
    dl(f"{B}/snap_counts/snap_counts_{y}.csv", f"data/nfl/snap_counts_{y}.csv")
    dl(f"{B}/stats_team/stats_team_week_{y}.csv", f"data/nfl/stats_team_week_{y}.csv")
    dl(f"{B}/depth_charts/depth_charts_{y}.csv", f"data/nfl/depth_charts_{y}.csv")
print("ok")
