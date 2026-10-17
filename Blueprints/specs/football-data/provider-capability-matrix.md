# Provider capability matrix

<!-- GENERATED from provider-capability-matrix.json by scripts/generate-provider-matrix.js. Do not edit. -->

As of 2026-10-15. Canonical machine-readable provider capability matrix. test/providerCapabilityMatrix.test.js fails when the code drifts from it. The markdown view is generated: node scripts/generate-provider-matrix.js. Edit this file, never the view.

Build 12 plan (PR 670, Provider direction correction) names four states that must never masquerade as one another. In this file: not implemented = status not_read; not yet proven = verification code (shape never seen live) on any entry; temporarily failed = a runtime outcome, never a matrix row (see runtime_reasons); provider unavailable = status unavailable, which no entry uses today because every capability above is either read or simply not read.

## Status

| Capability | sleeper | espn | yahoo |
|---|---|---|---|
| league_settings | available | available | available |
| league_scoring_rules | available | degraded (provider_restricted) | available |
| user_roster | available | available | available |
| league_roster_positions | available | available | available |
| matchup | available | available | available |
| standings | available | available | available |
| league_rosters | available | available | available |
| waiver_pool | available | available | degraded (requires_derived_projection) |
| waiver_system | available | available | degraded (probe_pending) |
| transactions | not_read (not_read_by_omen) | not_read (not_read_by_omen) | not_read (not_read_by_omen) |
| player_projections | available | available | degraded (derived_projection) |
| injury_status | available | available | available |
| draft_data | available | not_read (not_read_by_omen) | not_read (not_read_by_omen) |
| playoff_settings | available | available | available |
| trade_deadline | not_read (deliberately_omitted) | not_read (deliberately_omitted) | not_read (deliberately_omitted) |

## Everything that is not plainly available

| Provider | Capability | Status | Reason | Detail | Verified |
|---|---|---|---|---|---|
| sleeper | transactions | not_read | not_read_by_omen | Sleeper documents a per-round transactions endpoint. Omen reads none; the league overview names transactions as an unavailable family. | 2026-10-15 (code) |
| sleeper | trade_deadline | not_read | deliberately_omitted | settings.trade_deadline is a week number, and the league overview deliberately leaves the deadline signal out until a week-to-date conversion exists. | 2026-10-15 (code) |
| espn | league_scoring_rules | degraded | provider_restricted | Rules are read and recognised, but the Omen call states it cannot verify every scoring rule and final ESPN result, so point-based guidance is not exact scoring (A6 scoring-rights question is open). | 2026-10-15 (code) |
| espn | transactions | not_read | not_read_by_omen | ESPN's mTransactions2 view is community-documented. Omen reads none. | 2026-10-15 (code) |
| espn | draft_data | not_read | not_read_by_omen | ESPN's mDraftDetail is documented by the community. Omen does not read the league's own draft. | 2026-10-15 (code) |
| espn | trade_deadline | not_read | deliberately_omitted | The ESPN trade deadline field is unproven, and the deadline signal is deliberately left out. | 2026-10-15 (code) |
| yahoo | waiver_pool | degraded | requires_derived_projection | The available-player list is paged past Yahoo's 25-per-page cap (live: 50 players, 40 with a derived projection). Availability is still only confirmed where a derived projection exists. | 2026-10-15 (live) |
| yahoo | waiver_system | degraded | probe_pending | Priority branch read live on one connected league on 2026-10-15 (determined as priority; earlier verified on three leagues 2026-09-06). The FAAB branch is still unverified and returns not_determined. | 2026-10-15 (live) |
| yahoo | transactions | not_read | not_read_by_omen | Yahoo documents /league/{key}/transactions. Omen reads none. | 2026-10-15 (code) |
| yahoo | player_projections | degraded | derived_projection | Yahoo publishes no per-player projection. Omen builds one from Sleeper's public stat line, matched through the Yahoo id, scored with this league's own rules; a player with no unambiguous match, unreadable rules or a timeout stays null. | 2026-10-15 (code) |
| yahoo | draft_data | not_read | not_read_by_omen | Only ADP is read (getDraftAnalysis). The league's own draftresults are not read. | 2026-10-15 (code) |
| yahoo | trade_deadline | not_read | deliberately_omitted | trade_end_date is documented but not parsed, and the deadline signal is deliberately left out. | 2026-10-15 (code) |

## Provider data Omen receives or could receive but does not read

Provider fields and endpoints that are observed or documented but that no code in src/ reads. 'observed' means a recorded live response in this repo showed the field; 'documented' means the provider's docs or community docs list it and nobody here has seen it live. The test fails when any of these starts being read, so move it into entries when that happens.

| Provider | Field | Seen | Opportunity | Value | Needs |
|---|---|---|---|---|---|
| espn | eligibleSlots | observed | Real positional eligibility (FLEX, SUPERFLEX, IDP, bench) per player. Also the missing slot list for league_roster_positions. | high | none; already arrives |
| espn | keeperValue / draftAuctionValue | observed | Keeper and auction leagues: the league's own valuation of each player. | low | only matters for keeper leagues |
| espn | proTeamSchedules | documented | Provider-side NFL schedule and bye per player. | low | a live probe; Omen already has nflSchedule.js |
| sleeper | depth_chart_order / depth_chart_position | documented | Depth-chart role per player on a list Omen already fetches. | medium | none technically; check it against the warehouse depth data first |
| sleeper | practice_participation / practice_description / injury_notes | documented | Practice status and injury notes are the injury-report data the 2026-10-09 handoff lists as the biggest open start/sit gain. | high | founder rights decision: whether to admit NFL injury-report data via Sleeper |
| sleeper | traded_picks | documented | Pick ownership for trade context and trade value. | low | a live probe |
| sleeper | winners_bracket / losers_bracket | documented | Playoff bracket and outcomes for late-season screens. | low | a live probe |
| yahoo | percent_owned | documented | Same waiver-heat signal as ESPN; also the waiver versus free-agent distinction (status W vs FA). | medium | a live probe; needs the founder's Yahoo session |
| yahoo | bye_weeks | documented | Provider-side bye per player. | low | a live probe |
| yahoo | has_recent_player_notes | documented | Flags a news item on a player; a prompt to look, not content. | low | a live probe; news rights are undecided |

## Vocabulary

- **available**: Omen reads it and uses it as the provider gives it.
- **degraded**: Omen reads or derives it, but with a stated limitation (see reason).
- **unavailable**: The provider offers nothing Omen can use for this.
- **not_read**: The provider may offer it, but Omen has no code that reads it.

- `provider_restricted`: The provider's terms or Omen's own verification stop it claiming an exact result.
- `requires_derived_projection`: Availability is not confirmed unless a derived projection exists.
- `probe_pending`: The mapping fails closed to not_determined until a live probe confirms it.
- `derived_projection`: The provider gives none; Omen derives one from another source, or leaves it null.
- `not_read_by_omen`: No code in Omen reads it.
- `deliberately_omitted`: The code leaves it out on purpose until a prerequisite exists.

- verification `code`: Checked against source by the drift test. Says what the code does, not what the provider returns today.
- verification `live`: Exercised against a real provider account; last_verified is that date.
