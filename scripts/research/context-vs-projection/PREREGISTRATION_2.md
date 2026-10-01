# Pre-registration, round 2: combinations and interactions (written before running)

Why: round 1 tested families one at a time, plus one "all together" model that was LINEAR and ADDITIVE. It cannot
represent interactions (wind x pass rate, short week x primetime, dome x QB...), and it never chose a best subset.
So "no combination helps" is not established. Round 2 tests it properly.

Same data, same split (train on seasons < T, test 2021-2025), same metric (close-call hit rate, pairs within 2.0,
both >= 5, both played), same bootstrap (whole season-weeks), same PASS rule:
  99% CI lower bound > 0, positive in >= 4 of 5 test seasons, effect >= +0.5 points.
Four models, fixed in advance (4 tests, so 99% not 95%):
  M1  gradient-boosted trees (depth 3, 200 rounds, lr 0.05, min leaf 100, L2 5) on ALL context features,
      pooled over positions with position indicators. Learns interactions. Target: actual - projection.
  M2  same trees on all context features PLUS the projection itself (lets the model learn nonlinear calibration).
  M3  as M2 but one model per position.
  M4  nested forward selection of FAMILIES with ridge: for each test season T, using only seasons < T (the last of them as
      validation), add whichever family most reduces validation MAE, stop when none helps; evaluate the chosen
      combination on T. The selection never sees the test season, so this is an honest "best combination".
Nothing about features, hyperparameters, or the rule changes after seeing results. All results are reported.
