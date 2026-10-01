# Pre-registration, round 4: everything in nflverse, one time, hard stop (written before running)

Why: founder's proposal after rounds 1-3 — use ALL available nflverse data, since it is the same raw material teams' analysts use.
Rounds 1-3 used: schedules and lines, player stats, snap counts, injuries and practice status, team stats, play-by-play scheme and
coverage profiles. Round 4 adds what was unused: PFR advanced stats (pressure, blitz, drops, per-defender coverage), Next Gen Stats
(separation, cushion, time to throw), FTN charting (2022+), referee-crew tendencies, and player attributes (draft capital, age,
experience, combine athleticism). Everything is a feature.

Same data split, metric, whole-week bootstrap, 99% CI, PASS rule (lower bound > 0, positive in >= 4 of 5 test seasons 2021-2025,
effect >= +0.5 points). Two models, fixed in advance:
  K1  gradient-boosted trees on every feature plus the projection and position, regularised as in round 2, with the number of
      rounds chosen on the LAST TRAINING season (never the test season).
  K2  nested forward selection of feature GROUPS with ridge (selection sees only seasons before the test season).
Feature importance (permutation, on the validation season) is reported so any signal can be inspected, not just scored.

STOPPING RULE, agreed with the founder in advance: if neither model passes, we STOP searching for a projection-beating edge in
nflverse data and build on (1) honest confidence, (2) all three providers in one place, (3) workflow, and (4) an explanation of
WHY each projection is what it is. No further factor rounds without a new, specific hypothesis and a new pre-registration.
