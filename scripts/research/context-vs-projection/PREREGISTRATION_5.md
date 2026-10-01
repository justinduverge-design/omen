# Pre-registration, round 5: repeat the headline tests with ESPN's projection as the baseline (written before running)

Why: every earlier round used Sleeper's projection as the baseline, so the conclusion is about Sleeper's projection. The founder asked whether it
holds for ESPN and Yahoo. ESPN's public "league defaults" endpoint returns historical weekly projections (2018-2025) without credentials;
Yahoo has no public equivalent and cannot be tested historically (only going forward, with the shadow log).

Same split, metric, whole-week bootstrap, 99% CI, PASS rule (lower bound > 0, >= 4 of 5 test seasons positive, effect >= +0.5 points).
Same actual outcomes (nflverse PPR points, via player-ID match). Baseline replaced by ESPN's projected points (PPR, league defaults).
Tests, fixed in advance: (1) head-to-head quality of the two projections on the same player-weeks (MAE; close-call hit rate of ESPN vs Sleeper,
as a pure comparison, not a PASS test); (2) K1: trees on every feature (the round-4 feature set after the as-of fix) + ESPN projection + position;
(3) lines only (implied team totals), per position, the one family that showed a small real effect on Sleeper.
Caveat stated in advance: as with Sleeper, the as-of timing of ESPN's historical projection cannot be proven from outside.
