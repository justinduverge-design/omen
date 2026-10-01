# Pre-registration (written before running any family test)

Metric: close-call hit rate (same season/week/position, projections within 2.0, both >= 5, both played) of
  ordering by (projection + learned adjustment) vs ordering by projection alone. Secondary: MAE.
Model: ridge (lambda 30) per position on the family's fixed features, predicting (actual - projection);
  trained only on seasons before the test season; test seasons 2021-2025.
PASS rule (a family "works" only if ALL hold):
  1. 99% cluster-bootstrap CI of the hit-rate change has a lower bound > 0   (99% not 95%: ~8 families are tested)
  2. the change is positive in at least 4 of the 5 test seasons
  3. the effect is >= +0.5 percentage points (smaller is not worth shipping)
Families (features fixed in advance, in the code below):
  A availability: injury report status, practice status, returning-from-injury
  B usage leading indicators: trailing 3-week target share, WOPR, carries, snap %, and their trend
  C player-specific condition splits: shrunk historical residual in primetime / home / dome / cold-or-windy
  D team tempo and scheme: trailing team pass rate, plays per game, opponent pass rate faced, new head coach
  E (re-run under this rule) lines, rest/primetime, weather, opponent-vs-position, recent-vs-projection
  F variance: is a player's recent score variance predictive of next week's absolute error? (predictability only)
  G waiver / rest-of-season: predict the next-3-week average; compare to (1) trailing-4-week average and
     (2) next week's projection; PASS = lower MAE than both with a CI (paired) that excludes zero
Everything is reported, including failures. No feature, lambda, window or threshold is changed after seeing results.
