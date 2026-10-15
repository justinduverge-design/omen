# Provider capability matrix

<!-- GENERATED from provider-capability-matrix.json by scripts/generate-provider-matrix.js. Do not edit. -->

As of 2026-10-15. Canonical machine-readable provider capability matrix. test/providerCapabilityMatrix.test.js fails when the code drifts from it. The markdown view is generated: node scripts/generate-provider-matrix.js. Edit this file, never the view.

## Status

| Capability | sleeper | espn | yahoo |
|---|---|---|---|
| league_settings | available | available | available |
| league_scoring_rules | available | degraded (provider_restricted) | available |
| user_roster | available | available | available |
| league_roster_positions | available | degraded (borrowed_from_user_lineup) | degraded (borrowed_from_user_lineup) |
| matchup | available | available | available |
| standings | available | available | available |
| league_rosters | available | available | degraded (silent_partial_read) |
| waiver_pool | available | available | degraded (requires_derived_projection) |
| waiver_system | available | degraded (probe_pending) | degraded (probe_pending) |
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
| espn | league_roster_positions | degraded | borrowed_from_user_lineup | The league-wide roster read returns roster_positions: []. The trade solver borrows the slots from the user's own lineup, which is wrong when that lineup has an empty or unusual slot. | 2026-10-15 (code) |
| espn | waiver_system | degraded | probe_pending | fromEspn fails closed to not_determined until the settings mapping is confirmed by a probe. | 2026-10-15 (code) |
| espn | transactions | not_read | not_read_by_omen | ESPN's mTransactions2 view is community-documented. Omen reads none. | 2026-10-15 (code) |
| espn | draft_data | not_read | not_read_by_omen | ESPN's mDraftDetail is documented by the community. Omen does not read the league's own draft. | 2026-10-15 (code) |
| espn | trade_deadline | not_read | deliberately_omitted | The ESPN trade deadline field is unproven, and the deadline signal is deliberately left out. | 2026-10-15 (code) |
| yahoo | league_roster_positions | degraded | borrowed_from_user_lineup | The league-wide roster read returns roster_positions: [], so the trade solver borrows the user's own slots. | 2026-10-15 (code) |
| yahoo | league_rosters | degraded | silent_partial_read | One standings call plus one roster call per team. A team whose roster read fails comes back as an empty team with no flag, so Trade cannot tell it from a genuinely empty roster. | 2026-10-15 (code) |
| yahoo | waiver_pool | degraded | requires_derived_projection | The available-player list is read, but availability stays unconfirmed unless a derived projection exists, so waiver adds cannot be ranked without one. | 2026-10-15 (code) |
| yahoo | waiver_system | degraded | probe_pending | The priority branch was verified on three real leagues (2026-09-06). The FAAB branch is unverified and returns not_determined. | 2026-10-15 (code) |
| yahoo | transactions | not_read | not_read_by_omen | Yahoo documents /league/{key}/transactions. Omen reads none. | 2026-10-15 (code) |
| yahoo | player_projections | degraded | derived_projection | Yahoo publishes no per-player projection. Omen builds one from Sleeper's public stat line, matched through the Yahoo id, scored with this league's own rules; a player with no unambiguous match, unreadable rules or a timeout stays null. | 2026-10-15 (code) |
| yahoo | draft_data | not_read | not_read_by_omen | Only ADP is read (getDraftAnalysis). The league's own draftresults are not read. | 2026-10-15 (code) |
| yahoo | trade_deadline | not_read | deliberately_omitted | trade_end_date is documented but not parsed, and the deadline signal is deliberately left out. | 2026-10-15 (code) |

## Vocabulary

- **available**: Omen reads it and uses it as the provider gives it.
- **degraded**: Omen reads or derives it, but with a stated limitation (see reason).
- **unavailable**: The provider offers nothing Omen can use for this.
- **not_read**: The provider may offer it, but Omen has no code that reads it.

- `provider_restricted`: The provider's terms or Omen's own verification stop it claiming an exact result.
- `borrowed_from_user_lineup`: The league-wide read has no slot list, so the user's own lineup slots stand in for it.
- `silent_partial_read`: A failed sub-read becomes an empty result with no flag.
- `requires_derived_projection`: Availability is not confirmed unless a derived projection exists.
- `probe_pending`: The mapping fails closed to not_determined until a live probe confirms it.
- `derived_projection`: The provider gives none; Omen derives one from another source, or leaves it null.
- `not_read_by_omen`: No code in Omen reads it.
- `deliberately_omitted`: The code leaves it out on purpose until a prerequisite exists.

- verification `code`: Checked against source by the drift test. Says what the code does, not what the provider returns today.
- verification `live`: Exercised against a real provider account; last_verified is that date.
