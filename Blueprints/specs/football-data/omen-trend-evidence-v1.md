# Omen trend evidence v1 — play-type splits, small-sample shrinkage, and cause / correlation / coincidence

**Status:** Proposed — awaiting founder approval
**Date:** 2026-10-10
**Sprint item:** `FM-TREND` in `Direction/current_sprint.md`
**Depends on:** `Blueprints/specs/football-data/omen-fantasy-metrics-v1.md` (xFP gives the "over expected"
measure; the role chart gives dated role changes)
**Production authority:** none. Phase T1 is local only.

## 1. The two problems this solves

**1. Over-broad claims (the curveball problem).** "He can't hit curves" is wrong when he can't hit *one kind*
of curve and this pitcher throws the kind he hits well.

Football version: "RB X struggles against top run defences" can hide that he's poor on inside runs into
8-man boxes but excellent outside, and this week's opponent is weak against outside runs. Omen must judge
a player in **the situations this opponent actually creates**, not by a blunt label.

**2. Trends without honesty about why.** Every trend Omen shows carries one of three labels, set by tests
in §6, never by judgement:

- **coincidence:** never drives a call
- **correlation:** context, with the alternative explanation named
- **likely cause:** can drive a call; worded "likely", never "proven"

## 2. Sources and rights (founder decision 2026-10-10: option A)

| Source | Used for | Rights | Path |
|---|---|---|---|
| nflverse play-by-play | run direction and gap, pass depth and location, down and distance, score, win probability, shotgun, QB hits, sacks | CC BY 4.0 | warehouse `football.nfl_plays` |
| nflverse schedules (`games.csv`) | home/away, roof, surface, temperature, wind, rest days, starting QB ids, head coaches | CC BY 4.0 (founder-accepted attribution) | warehouse `football.nfl_games` |
| **FTN charting via nflverse** | men in the box, blitzers, pass rushers, play-action, motion, screen, RPO, QB out of pocket, catchable / contested ball, drops | **CC BY-SA 4.0**, attribution "FTN Data via nflverse" | the existing football-intelligence FTN path (`src/services/footballIntelligence/ftnCharting.js`), with its receipts and 70% coverage gate |

FTN columns confirmed in the live 2026 file (2026-10-10): `n_defense_box`, `n_blitzers`, `n_pass_rushers`,
`is_play_action`, `is_motion`, `is_screen_pass`, `is_rpo`, `is_qb_out_of_pocket`, `is_catchable_ball`,
`is_contested_ball`, `is_drop`, `is_throw_away`, `is_interception_worthy`, `qb_location`,
`n_offense_backfield`.

**FTN handling:**

- **FTN is not loaded into the warehouse.** The warehouse keeps its nflverse-only `rights_basis`, per the
  founder's 2026-10-10 decision. It's read through the football-intelligence path that already admits it
  (decision log 2026-09-26).
- **Where results are stored:**
  - results built only from play-by-play and schedules go in warehouse metric tables, as in the fantasy
    metrics spec;
  - **anything derived from FTN** goes in the football-intelligence serving path and carries
    `ftn_derived: true`, `license: "CC BY-SA 4.0"` and the FTN attribution.
- **Share-alike:** Omen publishes derived numbers and statements, never raw FTN rows. FTN-derived output is
  treated as CC BY-SA adapted material and credited wherever it's shown. This is an engineering decision
  consistent with the 2026-09-26 admission, not legal advice.
- **Data window:** FTN starts in 2022, so FTN-based splits use 2022 onwards. Splits from play-by-play only
  can use every warehouse season.

## 3. Context dimensions (v1)

| Group | Dimension | Buckets | Source |
|---|---|---|---|
| Rushing | run direction × gap | left/middle/right × end/tackle/guard | play-by-play |
| Rushing | men in the box | ≤ 6, 7, 8+ | FTN |
| Rushing | formation | shotgun / under centre; RPO | play-by-play / FTN |
| Receiving | target depth | behind the line, 1–9, 10–19, 20+ air yards | play-by-play |
| Receiving | target location | left / middle / right | play-by-play |
| Receiving | play design | play-action, motion, screen | FTN |
| Receiving | pressure | blitz (`n_blitzers > 0`), 5+ rushers, QB out of pocket | FTN |
| Receiving | ball quality | catchable (separates QB misses from receiver results) | FTN |
| Game | script | trailing 9+, within 8, leading 9+; win probability 10–90% ("neutral") | play-by-play |
| Game | conditions | home/away; dome/outdoor; wind ≥ 15 mph; temperature ≤ 32°F | schedules |

Every dimension and bucket edge is a v1 parameter recorded on the run.

## 4. Measuring a player in a context

- **Measure:** fantasy points **over expected** per opportunity, from xFP (fantasy metrics spec §3), plus EPA
  per play as a check. Using "over expected" stops field position and distance from masquerading as skill:
  a player used mostly at the goal line doesn't look like a TD machine just because of where he's used.
- **Shrinkage:** each player's number in a context is pulled toward his overall number, and his overall number
  toward his position-and-role average:

  ```text
  shrunk = (n × context_mean + k × parent_mean) / (n + k)
  ```

  - `n` = opportunities in the context.
  - `k` comes from the stat's stickiness (§6.1): it's the sample size at which the stat's split-half
    reliability reaches 0.5. Noisy stats get a large `k` and are pulled hard; stable stats keep more of their
    own signal.
- **Uncertainty:** every shrunk value carries a standard error. A context with fewer than 15 opportunities is
  reported but never used for a claim.

## 5. Matching this week's opponent

1. **Opponent profile.** For the defence, over its last 6 games: how often it creates each context (8-man box
   rate, blitz rate, play-action faced, share of runs to each direction), and its efficiency allowed in each,
   shrunk to the league average the same way.
2. **Context-weighted expectation.** The player's expected efficiency this week is the sum over contexts of
   the opponent's rate × the player's shrunk efficiency, compared with his overall number. That gives a
   **matchup-fit delta** with a standard error.
3. **The specificity rule:**
   - A broad claim about the player (e.g. "struggles against strong run defences") is **suppressed** when a
     context making up ≥ 25% of this opponent's expected plays shows a credible effect in the opposite
     direction.
   - Omen then shows the specific claim, e.g. "excellent on outside runs, which this defence allows most".
   - If credible contexts point both ways, Omen says **"mixed"** and the matchup doesn't move the call.
4. **"He did well against this team before."** Head-to-head history against one opponent is shown only when
   the matching context splits back it up. Otherwise it's labelled coincidence (§6).

**Credible** means |shrunk effect| ≥ z × standard error, where z rises with the number of contexts tested for
that player that week:

| Contexts tested | z |
|---|---|
| ≤ 5 | 2.0 |
| 6–20 | 2.5 |
| > 20 | 3.0 |

Testing more slices demands more evidence. That stops the "checked 40 splits, one looked amazing" trap.

## 6. Trend labels

### 6.1 Stickiness, computed once per stat

For every stat and context measure, from history:

- **split-half reliability:** odd weeks vs even weeks, same player and season;
- **year-over-year correlation:** same player, consecutive seasons.

Stickiness is stored as a reference artifact (formula version, seasons used, per-stat values, SHA-256).
Expected ordering, which the run verifies rather than assumes:

- **high:** target share and carry share
- **middle:** air-yard share and yards per carry over expected
- **low:** TD rate, catch rate on contested balls and yards after catch on deep targets

### 6.2 The tests

| Label | A trend gets this label when |
|---|---|
| **coincidence** | any of: fewer than the minimum opportunities; stickiness of the stat below 0.2; the effect isn't credible at the §5 z; or it's head-to-head history against one opponent (fewer than 4 games) without support from matching context splits |
| **correlation** | it passes the repeatability tests, but controlling for a named confounder shrinks the effect by ≥ 50%. Confounders checked in v1: game script (score and win probability), opponent strength, home/away, a teammate's absence, weather. The label names the confounder that explained it. |
| **likely cause** | it passes repeatability, it survives the confounder check, **and** it's tied to a dated event from §6.3, **and** the change begins at or after that event with at least 2 games after it, **and** the before/after difference is credible |

### 6.3 Event registry: dated events Omen can prove from data it holds

| Event | Source |
|---|---|
| teammate absent (didn't play) | weekly rosters and player-week rows |
| starting QB change | `games.csv` `home_qb_id` / `away_qb_id` |
| head-coach change | `games.csv` `home_coach` / `away_coach` |
| role change | the role chart's role-change signal (fantasy metrics spec §5) |
| scheme shift | the team Scheme DNA rate change (`FI-LEAGUE`), e.g. play-action rate moving after a coaching change |

Coordinator changes have no open source (`FI-LEAGUE` handoff), so v1 can't use them as events.

### 6.4 How labels reach the call

Each trend row:

```text
{ claim_text, label, label_reason, sample: { opportunities, games }, stickiness,
  confounders_checked: [...], explained_by: <confounder|null>, event: <event|null>,
  ftn_derived, attribution }
```

How each label is used with `src/services/evidenceWhy.js`:

- **coincidence:** never enters `why_statements`. It may appear only in a separate "fun fact, not evidence"
  field, if the product wants one.
- **correlation:** inference tier, and the text names the alternative explanation.
- **likely cause:** inference tier, ranked above correlation. The wording uses "likely", never "because"
  stated as certainty.
- **"mixed" matchups:** a limitation row, so the call says the matchup doesn't settle it.

Copy rules (`Direction/facts-of-record.md` facts 16–21) apply. Confidence stays a band.

## 7. Proof before shipping

- **Do the labels mean what they say?**
  - Score every trend Omen would have flagged in 2022–2024, then check whether its direction held over the
    next 4 games.
  - **Gate:** "likely cause" trends must persist materially more often than "coincidence" trends.
    "Coincidence" trends should be close to a coin flip. If not, the labels don't ship.
- **Does matchup fit help?** Add the matchup-fit delta to the xFP baseline from the fantasy metrics backtest.
  It ships only if it lowers next-week error for that position in at least 2 of 3 test seasons (2023–2025).
- **Curveball cases:** the report lists every 2025 case where the specificity rule suppressed a broad claim,
  with what happened that week. The founder reads it before T2.
- Results go in `Direction/reviews/<date>-trend-evidence-backtest.md`.

## 8. Phases

| Phase | What | Approval |
|---|---|---|
| **T1** | stickiness artifact, context splits, shrinkage, opponent profiles, label tests, backtest report; local only | this spec |
| **T2** | publish play-by-play-only results to warehouse metrics and FTN-derived results to the football-intelligence serving path | separate founder yes (production write) |
| **T3** | trend rows and matchup fit in the start/sit and Omen calls | separate founder yes (deploy) |

## 9. Files (T1)

| File | Purpose |
|---|---|
| `src/services/footballMetrics/contexts.js` | context dimensions and bucket rules (pure) |
| `src/services/footballMetrics/shrinkage.js` | shrinkage and standard errors (pure) |
| `src/services/footballMetrics/stickiness.js` | split-half and year-over-year reliability (pure) |
| `src/services/footballMetrics/opponentProfile.js` | defence context rates and allowed efficiency (pure) |
| `src/services/footballMetrics/matchupFit.js` | context-weighted delta and the specificity rule (pure) |
| `src/services/footballMetrics/trendLabels.js` | event registry and label tests (pure) |
| `scripts/football-trend-backtest.js` | §7 report |
| `test/footballTrend*.test.js` | a curveball fixture (broad claim suppressed), "mixed", a confounder that explains a trend, an event-backed cause, a small sample that stays coincidence, z rising with contexts tested |

Skills: `slops-tdd`, `slops-code-review` before the PR.
