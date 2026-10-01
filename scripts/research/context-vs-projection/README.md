# Does football context improve on a provider's projection?

Run once on 2026-09-30. Reproduce (needs Python 3 with numpy and pandas; downloads about 60 MB):

```bash
python3 -m venv venv && ./venv/bin/pip install numpy pandas
cd scripts/research/context-vs-projection
../../../venv/bin/python fetch.py     # Sleeper projections + actual PPR points, 2018-2025, weeks 1-18; nflverse games.csv
../../../venv/bin/python exp.py       # builds the player-week dataset and the context features
../../../venv/bin/python -W ignore model.py   # first pass: context groups E1-E5 only
../../../venv/bin/python fetch2.py            # nflverse injuries, snap counts, team stats, player stats
../../../venv/bin/python -W ignore build2.py  # player-ID crosswalk + merge (checks itself: Sleeper vs nflverse points, corr 0.998)
../../../venv/bin/python -W ignore fam.py     # families A-E under PREREGISTRATION.md
../../../venv/bin/python -W ignore fam2.py    # families F (variance) and G (waiver / rest of season)
../../../venv/bin/pip install scikit-learn
../../../venv/bin/python -W ignore fam3.py    # round 2: combinations and interactions (PREREGISTRATION_2.md)
# round 3: scheme / coverage matchups (PREREGISTRATION_3.md); needs play-by-play and participation parquet files
../../../venv/bin/python -W ignore build4.py && ../../../venv/bin/python -W ignore fam4.py
# round 4: everything in nflverse, one time, hard stop (PREREGISTRATION_4.md)
../../../venv/bin/python -W ignore build5.py && ../../../venv/bin/python -W ignore fam6.py
```

`PREREGISTRATION.md` was written before any family test ran. Paths inside the scripts assume they run from a lab directory containing `data/`; adjust as needed.

Data is not committed. Report: `Direction/2026-09-30-first-factor-experiment.md`.

## A rule learned the hard way: attach player history with an as-of join

Player-level trailing features must be attached to a game from the player's most recent **earlier** row (`pandas.merge_asof`, `allow_exact_matches=False`). A plain merge on `(player, season, week)` attaches a value only where the player has a source row for the *current* week, so "the feature is present" secretly means "he had qualifying targets in this game". Round 4 first reported a +5.6-point, rule-passing result from exactly that leak; it was +0.04 once fixed (see `Direction/2026-09-30-first-factor-experiment.md`). `build5.py` prints a presence check for this reason.
