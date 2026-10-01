# Pre-registration, round 3: scheme, coverage and route matchups (written before running)

Why: rounds 1-2 tested crude context. The "scheme" family was only team pass rate and a new-coach flag. The founder's
hypothesis is specific and untested: how a receiver's ROUTES and a team's scheme match up against the opposing
DEFENSE's scheme and coverage (man vs zone, deep vs short, pass rush) is not fully priced into a provider's projection.

Same data split, metric, whole-week bootstrap, 99% CI. PASS = lower bound > 0, positive in >= 4 of 5 test seasons
(2021-2025), effect >= +0.5 points. (R3-B has only 2 test seasons because coverage data ends in 2022; there PASS =
lower bound > 0, positive in both, effect >= +0.5, and the low power is stated.)

R3-A  all years, play-by-play only. Trailing 6 prior games of the same season (min 3), strictly earlier.
  Offense profile (player's team): neutral-situation pass rate, average depth of target, deep-target rate (air yards >= 15),
    shotgun rate, no-huddle rate, sack rate, YAC per completion, pass EPA/dropback, rush EPA/rush, plays per game.
  Defense profile (opponent): pass EPA/dropback allowed, rush EPA allowed, sack rate and QB-hit rate generated, average depth
    of target allowed, deep-target rate allowed, EPA allowed on deep and on short throws, YAC allowed, stuff rate, explosive-run
    rate allowed.
  Player profile (trailing, from play-by-play player ids): receiver average depth of target, deep-target share, YAC per reception;
    QB sack rate, scramble rate, average depth of target; RB stuff rate faced, explosive-run rate.
  M5  gradient-boosted trees (same fixed hyperparameters as round 2) on offense + defense + player profiles + projection + position.
  M6  ridge on hand-listed products only: team depth x defense depth allowed; receiver deep share x defense deep EPA allowed;
      QB sack rate x defense sack rate; offense rush EPA x defense rush EPA allowed; offense pass rate x defense pass EPA allowed.
R3-B  coverage x route (participation data, 2018-2022): league EPA per target by (route, coverage type) estimated ONLY on
  seasons before the test season; a receiver's route mix = his last up to 40 targets before the game; the defense's coverage mix =
  its last 6 games before the game. Feature: expected EPA per target against this defense minus against an average defense.
  M7  ridge on [edge, edge x trailing target share] for WR/TE/RB, test seasons 2021 and 2022.
All results are reported. No feature, hyperparameter or threshold changes after seeing results.
