#!/usr/bin/env bash
# ESPN matchup-projection shape proof — the one thing the 2026-09-07 bundle read could NOT settle.
#
# WHY THIS EXISTS AS A SCRIPT YOU RUN:
# It needs your ESPN cookies. Those are credentials, so they go into your own terminal and never
# into a chat. This prints FIELD NAMES, TYPES, COUNTS and BOOLEANS only — never a point value,
# never a team name, never a player, never a roster. Read-only: two GETs, no writes.
#
# WHAT THE BUNDLE READ ALREADY SETTLED (no credentials needed, done 2026-09-07):
#   · ESPN's own matchup fetch uses view=["mMatchup","mMatchupScore"] with a scoringPeriodId.
#   · `totalProjectedPointsLive` is computed BY THE CLIENT and assigned onto the model — it is
#     not expected on a response. The server field beside it is `totalProjectedPoints`.
#   · ESPN's headline projected total is the sum of `projectedPoints` over entries whose
#     lineupSlot is marked `starter: true`. Non-starters are ids 20 BE, 21 IR, 22 INV, 25 ALL.
#   · statSourceId 1 == "Projected", 0 == "Real". `appliedTotal` is the number.
#
# WHAT THIS SCRIPT SETTLES:
#   1. Does adding mMatchupScore actually change the payload versus mMatchup alone?
#   2. Is `totalProjectedPoints` present on a matchup side, and is `totalProjectedPointsLive`
#      absent as predicted?
#   3. Does a matchup side carry `rosterForCurrentScoringPeriod` (which the starter sum needs)?
#   4. Do those roster entries carry a statSourceId-1 row for the requested week?
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
#   export ESPN_WEEK=1                          # a week that has actually been played
#   ./scripts/espn-projection-proof.sh
set -euo pipefail

: "${ESPN_S2:?Set ESPN_S2 first — see the header of this file}"
: "${SWID:?Set SWID first — see the header of this file}"
: "${ESPN_LEAGUE_ID:?Set ESPN_LEAGUE_ID first — the number in your league URL}"
SEASON="${ESPN_SEASON:-2026}"
WEEK="${ESPN_WEEK:-1}"

BASE="https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leagues/${ESPN_LEAGUE_ID}"

fetch () { # $1 = query suffix
  curl -s --max-time 30 \
    -H "Cookie: espn_s2=${ESPN_S2}; SWID=${SWID}" \
    -H "Accept: application/json" \
    "${BASE}?$1&scoringPeriodId=${WEEK}"
}

echo "Reading ESPN season ${SEASON} week ${WEEK} (read-only, two calls)…"
fetch "view=mMatchup"                    > /tmp/espn-proj-a.json
fetch "view=mMatchup&view=mMatchupScore" > /tmp/espn-proj-b.json

ESPN_WEEK="${WEEK}" python3 - <<'PY'
import json, os

WEEK_ARG = int(os.environ.get("ESPN_WEEK") or 1)

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

def first_side(doc):
    for g in (doc.get('schedule') or []):
        for name in ('home', 'away'):
            s = g.get(name)
            if isinstance(s, dict) and s:
                return g, name, s
    return None, None, None

a, b = load('/tmp/espn-proj-a.json'), load('/tmp/espn-proj-b.json')
if "__error__" in a or "__error__" in b:
    for label, doc in (("mMatchup alone", a), ("mMatchup + mMatchupScore", b)):
        if "__error__" in doc:
            print(f"  {label}: COULD NOT READ: {doc['__error__']}")
    # The overwhelmingly common cause is an expired or mistyped cookie: ESPN answers with an
    # HTML error page, not JSON, so the failure surfaces as a JSON decode error that says
    # nothing about credentials. Say the useful thing instead of the literal one.
    print()
    print("  ESPN did not return JSON. Most likely one of:")
    print("    · ESPN_S2 or SWID is expired or mistyped — sign in at fantasy.espn.com and re-copy both")
    print("    · SWID must include its braces, e.g. '{AAAAAAAA-BBBB-...}'")
    print("    · ESPN_LEAGUE_ID is not a league this account belongs to")
    print(f"    · ESPN_SEASON / ESPN_WEEK name a season or week that does not exist")
    raise SystemExit(1)

print("\n=== Q1 — does mMatchupScore change the payload? ===")
for label, doc in (("mMatchup alone           ", a), ("mMatchup + mMatchupScore ", b)):
    g, name, s = first_side(doc)
    n = len(doc.get('schedule') or [])
    print(f"  {label}: schedule={n} games, first side keys={len(s) if s else 0}")

ga, na, sa = first_side(a)
gb, nb, sb = first_side(b)
if sa and sb:
    added = sorted(set(sb) - set(sa))
    removed = sorted(set(sa) - set(sb))
    print(f"  keys ADDED by mMatchupScore   : {added or '(none)'}")
    print(f"  keys REMOVED by mMatchupScore : {removed or '(none)'}")

print("\n=== Q2 — projected-total fields on a matchup side (mMatchup + mMatchupScore) ===")
if sb:
    for cand in ('totalProjectedPoints', 'totalProjectedPointsLive', 'totalPoints',
                 'totalPointsLive', 'winProbability', 'adjustment'):
        print(f"  {cand:28} -> {shape(sb[cand]) if cand in sb else 'ABSENT'}")
    print(f"  all side keys: {sorted(sb.keys())}")

print("\n=== Q3 — does a side carry a roster the starter sum can read? ===")
if sb:
    for cand in ('rosterForCurrentScoringPeriod', 'rosterForMatchupPeriod',
                 'rosterForMatchupPeriodDelayed'):
        v = sb.get(cand)
        if v is None:
            print(f"  {cand:32} -> ABSENT")
        else:
            entries = v.get('entries') if isinstance(v, dict) else None
            print(f"  {cand:32} -> {shape(v)}, entries={shape(entries) if entries is not None else 'ABSENT'}")

print("\n=== Q4 — do roster entries carry a Projected (statSourceId 1) row for this week? ===")
roster = (sb or {}).get('rosterForCurrentScoringPeriod') or (sb or {}).get('rosterForMatchupPeriod') or {}
entries = roster.get('entries') or []
if not entries:
    print("  no entries to inspect")
else:
    e0 = entries[0]
    print(f"  entry keys                    : {sorted(e0.keys())}")
    print(f"  lineupSlotId present on all   : {all('lineupSlotId' in e for e in entries)}")
    slots = sorted({e.get('lineupSlotId') for e in entries if 'lineupSlotId' in e})
    print(f"  distinct lineupSlotIds        : {slots}")
    NON_STARTER = {20, 21, 22, 25}
    starters = [e for e in entries if e.get('lineupSlotId') not in NON_STARTER
                and e.get('lineupSlotId') is not None]
    print(f"  entries={len(entries)}  starters by ESPN's table={len(starters)}")

    def stats_of(entry):
        p = (entry.get('playerPoolEntry') or {}).get('player') or entry.get('player') or {}
        return p.get('stats') or []

    with_proj = 0
    split_ids = set()
    for e in starters:
        rows = [r for r in stats_of(e)
                if r.get('statSourceId') == 1 and r.get('scoringPeriodId') == WEEK_ARG]
        if rows:
            with_proj += 1
            for r in rows:
                split_ids.add(r.get('statSplitTypeId'))
    print(f"  starters with a statSourceId=1 row for week {WEEK_ARG}: {with_proj}/{len(starters)}")
    print(f"  statSplitTypeIds seen on those rows            : {sorted(x for x in split_ids if x is not None)}")
    if starters:
        rows = [r for r in stats_of(starters[0]) if r.get('statSourceId') == 1]
        if rows:
            print(f"  sample projected row keys                     : {sorted(rows[0].keys())}")
            print(f"  appliedTotal type                             : {shape(rows[0].get('appliedTotal'))}")

print("\nNo credential, team name, player name, or point value was printed above.")
PY

rm -f /tmp/espn-proj-a.json /tmp/espn-proj-b.json
echo
echo "Done. Paste the output above into the chat — it contains no secrets."
