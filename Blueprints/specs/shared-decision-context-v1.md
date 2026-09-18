# Shared Decision Context v1

**Status:** Founder-authorized backend implementation contract

**Date:** 2026-09-17

**Scope:** A server-side, provider-neutral input and decision-receipt layer for Omen, Command, League, Start/Sit, Trade, Waivers, and Ledger. It uses existing provider adapters, optimizer, football-data facts, and scoring-contract services. It does not add a provider, collect a new dataset, access a Raspberry Pi, change credentials, execute SQL, or alter production controls.

## Problem

Omen already has real building blocks: selected-league roster imports, projections, optimizer math, waiver pools, guarded Sleeper league-roster trade logic, schedule context, nflverse-backed DvP, and scoring-contract/reconciliation services. They are feature-owned. A route can calculate a useful local answer while another surface re-fetches the same inputs or only displays an after-the-fact capability label.

Omen needs one shared middle layer: its weekly MVP compares real Start/Sit, waiver, and trade candidates for a selected league; every supporting surface can say which verified inputs actually affected its answer.

## Decision

Introduce `shared-decision-context.v1` as a request-scoped context and receipt contract.

1. **Resolve only requested inputs.** A feature selects a profile and requested source inputs. Independent inputs may resolve concurrently; a context memoizes each input, so one request never reads the same source twice.
2. **Record actual use.** Candidate generation and ranking explicitly mark inputs they consumed. A resolved source is not described as decision-making evidence until an engine marks it used.

The context is not a global all-data bundle. Loading every source for every league switch would be slower, more failure-prone, and would allow an optional enrichment failure to block a valid recommendation.

## Profiles and input policy

| Profile | Required core inputs | Optional/ranked inputs | Does not block |
| --- | --- | --- | --- |
| `omen_mvp` | selected context, roster, roster projections | waiver pool, trade rosters, scoring coverage, schedule/DvP | a valid lineup candidate |
| `start_sit` | selected context, roster, roster projections | schedule/DvP, weather, scoring coverage | a projection-backed lineup decision |
| `waiver` | selected context, roster, waiver pool, projections | waiver system, scoring coverage | explicit unavailable/empty pool state |
| `trade` | selected context, own roster, eligible opponent rosters, projections | scoring coverage, roster construction | neutral/unavailable trade answer |
| `league` | selected context; independently resolved standings, matchup, playoff settings, derived activity, and transaction-read status | schedule, scoring coverage | a live section when another League section fails |
| `ledger` | persisted decision receipt, scoring/reconciliation outcome | final provider outcome | historical rendering |

Inputs use `live`, `unavailable`, `pending`, or `not_requested`. Missing, stale, fixture, mock, sample, and cross-context data never become live solely through this contract.

## Decision receipt

Every decision-capable response may expose an additive public-safe `decision_context` object:

```json
{
  "contract_version": "shared-decision-context.v1",
  "profile": "omen_mvp",
  "inputs": {
    "roster": { "state": "live", "used": true, "source": "espn_roster" },
    "matchup_dvp": { "state": "live", "used": false, "source": "nflverse_data" }
  },
  "inputs_used": ["projections", "roster"],
  "limitations": []
}
```

It contains no raw provider response, connection identifier, team identifier, credential, cookie, provider token, private rule body, or model prompt. Existing `decision_capabilities` remains the cross-surface explanation vocabulary; this receipt answers the distinct question: **did this source influence the decision?**

### League overview adoption

`GET /api/league/overview` remains `league-overview.v1` and adds this receipt only on successful
overview responses. Its `league` profile names `selected_context`, `league_standings`,
`league_matchup`, `league_playoff_settings`, `league_activity`, and `league_transactions`.
Those records mirror the route's independently resolved sections; they do not trigger another
provider read. A `no_matchup` result is a live completed provider read, while an unread
transaction family remains `not_requested`. `league_activity` is live only when the existing
standings-derived evaluator had a verified playoff setting; an empty activity array without that
setting is not promoted into a completed-read claim.

## Candidate policy

The deterministic selector remains the only ranking authority. A private LLM may narrate safe deterministic facts but cannot select a move, change numeric confidence, introduce data, or override a limitation.

MVP resolves the core Start/Sit candidate first. It conditionally resolves a waiver pool only for an actionable need and trade rosters only when no numeric Start/Sit or waiver candidate clears the threshold. Schedule/DvP and scoring coverage may refine explanation, risk, or eligibility only after their source-specific policy is explicit and tested; they cannot invent a numeric edge.

## Performance and isolation

- Memoization is request-scoped: no cross-user or cross-league cache key exists here.
- Existing source-specific Redis/process caches remain the persistent cache boundary.
- Resolver failures become typed unavailable inputs rather than rejected promises that erase a valid deterministic answer.
- Optional timeouts belong to source adapters with explicit bounded policy and tests. The
  canonical MVP route also applies a response budget around a source when an older adapter
  cannot yet accept cancellation; that stops it blocking the user response, while any
  adapter-specific cancellation remains independently owned at its own boundary.

## Existing data systems

- Provider adapters remain the source of selected roster, availability, and eligible Sleeper opponent rosters.
- nflverse/owned football facts remain lawful football-event and DvP evidence, not league scoring or roster truth.
- The Command Center/Raspberry Pi witness pipeline is an operational integrity witness, not silently a production recommendation source. A future adapter needs a versioned, rights-cleared artifact and separate source/activation approval.
- Scoring contracts and reconciliation provide provenance/calibration. Only `exact` supports the phrase league-exact; unknown coverage is never coerced to PPR or zero.
- Private LLM via Tailscale is narration only and off the critical path. Native clients may opt
  into a server-mediated narration attempt, but they never receive a private model URL, prompt,
  provider credential, or raw model failure. A late or invalid narration remains an unavailable
  capability and never delays, selects, or changes a deterministic move.

## Adoption sequence

1. Implement and unit-test the request-scoped context/receipt core.
2. Make canonical MVP record the selected candidate's actual inputs.
3. Route existing shared capability records through the same receipt semantics.
4. Migrate Start/Sit, Waiver, Trade, League, and Ledger one surface at a time with response-contract tests.
5. Resume native Canvas-to-Code only once examples and unavailable states are stable. Native binds to this additive contract and does not invent absent data.

## Non-goals

No deployment, merge, production scoring/publication flip, SQL, secrets, new dependency, provider onboarding, Raspberry Pi operation, or store release.
