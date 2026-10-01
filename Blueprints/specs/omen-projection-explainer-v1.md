# Projection explainer v1 — "why is this player projected where he is"

**Status:** PROPOSED — founder review, then a design pass (`slops-native-screen-design`) before any UI is built, because the native visual lock is canonical and forbids new components without approval.
**Date:** 2026-09-30. **Platform:** iOS first (Android paused, `Direction/decision_log.md`). **Owner lanes:** server contract and explanation logic — Claude; database tables, if any — Claude or Codex only (never Jules or Muse).
**Why this exists:** four rounds of testing (`Direction/2026-09-30-first-factor-experiment.md`) found no way to beat a provider's projection with public football data. What Omen can do honestly is show the user **why** a projection is what it is, with the scheme, role, route and matchup information a sharp fantasy player would look up, and say how much a call matters. Founder direction: *"explain why this player is projected here, this player runs this type of route better, this other team struggles against it."*

## The rule that keeps it honest

Every line in an explanation carries one of three labels, and the label decides what it may claim.

| Label | Meaning | May claim |
|---|---|---|
| **Projected** | A number the provider produced, or arithmetic done on it (the stat line, the points by source under the league's scoring) | Only what the provider said |
| **Observed context** | A fact about the past from public data, with its sample size ("allowed 0.31 EPA per deep target over the last 6 games; league average 0.18; 41 deep targets") | That it happened. **Never that it causes this projection.** |
| **Could change this** | Something known to move a projection: an injury designation, a weather forecast, a line move | That it could change it |

No line says "because" unless it is arithmetic (the projection is the sum of these parts). Observed context is **not** adjusted into the number: no feature has passed an out-of-sample test, so none is allowed to change a recommendation. A feature that later passes (shown first in the shadow log, then in a pre-registered test) may be promoted to **Adjusts the projection**; until then it only informs.

## The three layers

**1. Where the points come from** (needs no new data pipeline). Sleeper's projection includes the full stat line. Josh Allen, week 4 of 2026 at New England, 23.12 PPR points: 30.4 pass attempts, 19.2 completions, 227.4 yards, 1.2 touchdowns, 0.46 interceptions, 2.6 sacks, 8.3 rushes for 40.2 yards and 0.96 rushing touchdowns. Apply the league's own scoring to each line and show points by source, **summing to the provider's number** (any remainder shown as "other", never hidden). It also shows where the number is fragile: for Allen, about a quarter of the points are expected rushing touchdowns, which are volatile. Works for every player on every provider that supplies a stat line. Sleeper does; ESPN and Yahoo need a check (ESPN supplies projected points and, per the July spike, stat entries; Yahoo is unverified).

**2. His role** (small weekly data job). Target share, snap share, carries and their trend over the last three games; how this week's projection compares to his own recent average. Descriptive only.

**3. The matchup, in football terms** (weekly data job from play-by-play, participation and PFR/NGS data already investigated). For the receiver: his route mix and depth of target, and his production against man versus zone. For the defense: its coverage mix (man or zone, Cover 3, Cover 1), pass rush and blitz rate, and what it allows to the position by depth of target. Presented as paired facts with sample sizes: *"He runs short crossers and slants on 61% of his targets and has averaged +0.12 EPA per target against man coverage. NE plays man on 42% of dropbacks and is allowing -0.04 EPA per target on short routes."* Observed context, labelled as such.

## What it will not do

- Claim a matchup *causes* a number, or adjust a projection with unproven features.
- Show a statistic without its sample size, or present a small sample as a trend.
- Present a number the provider did not give as if the provider gave it. Where Omen computes something (points by source), it says so.

## Contract and screens

Additive only (`test/contracts/README.md`): an optional `projection_breakdown` on the decision brief and an `explanation_lines[]` list of `{ label, text, sample_size?, source, as_of }`, rendered by clients that know them and ignored by older ones. New evidence rows ride the existing capability manifest. **No UI is built until the founder approves a design for the breakdown and context blocks** (a new component, so the lock's rule applies). Shown on OmenEvidence and Start/Sit detail first.

## Phases

1. **Layer 1 on the phone** for the founder's Sleeper league: server computes points by source from the stat line and the league's real scoring (in memory only; league scoring rules are not retained in the database, per the open A6 rights question), contract + fixtures + iOS decoder test, design approved, device-verified (`definition-of-done.md` device gate). No new database tables.
2. **Layer 2** (role): weekly job, read-only against nflverse, compact table or file cache (database lane: Claude or Codex).
3. **Layer 3** (matchup): the same job extended with coverage, route and scheme descriptors; every statistic ships with its sample size.
4. **ESPN and Yahoo** layer 1 after their projection reads are verified live (`omen-call-slice-plan.md`, provider readiness gate).

## Done when

On the founder's iPhone, for a real league and a real player, the screen shows the provider's projection, where its points come from (summing to it), the player's role and the matchup facts with sample sizes, each labelled; nothing is worded as a cause; a rejected-claim test (a unit test that fails if a line outside "Projected" contains "because", "will" or "should") is in CI.

## Risks

- **Illusion of insight.** Matchup facts read as reasons. The labels, the sample sizes and the no-"because" test are the defence; the founder has accepted that the context informs and does not adjust.
- **Data lag.** Descriptors come from games already played, so they are stale on week 1 and thin early in a season; early-season lines say "n games".
- **Rights.** Sleeper and nflverse terms for derived display data are unresolved (Open question A6, `omen-football-intelligence-architecture-v1.md`); layer 1 uses only data the user's own connection already returns.
