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
```

`PREREGISTRATION.md` was written before any family test ran. Paths inside the scripts assume they run from a lab directory containing `data/`; adjust as needed.

Data is not committed. Report: `Direction/2026-09-30-first-factor-experiment.md`.
