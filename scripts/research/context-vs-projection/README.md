# Does football context improve on a provider's projection?

Run once on 2026-09-30. Reproduce (needs Python 3 with numpy and pandas; downloads about 60 MB):

```bash
python3 -m venv venv && ./venv/bin/pip install numpy pandas
cd scripts/research/context-vs-projection
../../../venv/bin/python fetch.py     # Sleeper projections + actual PPR points, 2018-2025, weeks 1-18; nflverse games.csv
../../../venv/bin/python exp.py       # builds the player-week dataset and the context features
../../../venv/bin/python -W ignore model.py
```

Data is not committed. Report: `Direction/2026-09-30-first-factor-experiment.md`.
