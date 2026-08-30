#!/usr/bin/env bash
# M11A claims 1 and 3 — ESPN shape proof.
#
# WHY THIS EXISTS AS A SCRIPT YOU RUN:
# It needs your ESPN cookies. Those are credentials, so they go into your own terminal and
# never into a chat. This prints FIELD NAMES, TYPES and SHAPES only — never a value, never a
# team name, never a roster. Read-only: two GETs, no writes.
#
# HOW TO GET THE TWO VALUES (one minute, in a browser):
#   1. Sign in at https://fantasy.espn.com in Chrome or Safari
#   2. Open developer tools  (Cmd+Option+I)
#   3. Application (Chrome) or Storage (Safari)  ->  Cookies  ->  https://fantasy.espn.com
#   4. Find `espn_s2` and `SWID`. Copy each value.
#
# THEN RUN:
#   export ESPN_S2='paste_espn_s2_here'
#   export SWID='{paste-swid-here}'
#   export ESPN_LEAGUE_ID='your_league_id'      # the number in your league's URL
#   ./scripts/espn-shape-proof.sh
set -euo pipefail

: "${ESPN_S2:?Set ESPN_S2 first — see the header of this file}"
: "${SWID:?Set SWID first — see the header of this file}"
: "${ESPN_LEAGUE_ID:?Set ESPN_LEAGUE_ID first — the number in your league URL}"
SEASON="${ESPN_SEASON:-2026}"
WEEK="${ESPN_WEEK:-1}"

BASE="https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leagues/${ESPN_LEAGUE_ID}"

fetch () { # $1 = view
  curl -s --max-time 30 \
    -H "Cookie: espn_s2=${ESPN_S2}; SWID=${SWID}" \
    -H "Accept: application/json" \
    "${BASE}?view=$1&scoringPeriodId=${WEEK}"
}

echo "Reading ESPN (read-only, two calls)…"
fetch mMatchup  > /tmp/espn-matchup.json
fetch mSettings > /tmp/espn-settings.json

python3 - <<'PY'
import json

def load(p):
    try:
        with open(p) as f: return json.load(f)
    except Exception as e:
        return {"__error__": str(e)}

def shape(v):
    if isinstance(v, bool): return "bool"
    if isinstance(v, int): return "int"
    if isinstance(v, float): return "float"
    if isinstance(v, str): return "string"
    if isinstance(v, list): return f"list[{len(v)}]"
    if isinstance(v, dict): return f"object({len(v)} keys)"
    return "null" if v is None else type(v).__name__

print("\n=== CLAIM 1 — does ESPN return per-side projected totals in mMatchup? ===")
m = load('/tmp/espn-matchup.json')
if "__error__" in m:
    print("  COULD NOT READ:", m["__error__"])
else:
    sched = m.get('schedule') or []
    print(f"  schedule            : {shape(sched)}")
    if sched:
        g = sched[0]
        print(f"  schedule[0] keys    : {sorted(g.keys())}")
        for side in ('home','away'):
            s = g.get(side) or {}
            if s:
                keys = sorted(s.keys())
                print(f"  {side:5} keys         : {keys}")
                for cand in ('totalPoints','totalProjectedPointsLive','totalPointsLive','rosterForCurrentScoringPeriod'):
                    if cand in s:
                        print(f"    {cand:34} -> {shape(s[cand])}")
                break

print("\n=== CLAIM 3 — ESPN deadline field on league settings ===")
st = load('/tmp/espn-settings.json')
if "__error__" in st:
    print("  COULD NOT READ:", st["__error__"])
else:
    settings = st.get('settings') or {}
    print(f"  settings            : {shape(settings)}")
    ts = settings.get('tradeSettings') or {}
    if ts:
        print(f"  tradeSettings keys  : {sorted(ts.keys())}")
        for k in sorted(ts.keys()):
            if 'deadline' in k.lower():
                print(f"    {k:34} -> {shape(ts[k])}   (value withheld)")
    sched = settings.get('scheduleSettings') or {}
    if sched:
        print(f"  scheduleSettings    : {sorted(sched.keys())}")

print("\nNo credential, team name, or roster was printed above.")
PY

rm -f /tmp/espn-matchup.json /tmp/espn-settings.json
echo
echo "Done. Paste the output above into the chat — it contains no secrets."
