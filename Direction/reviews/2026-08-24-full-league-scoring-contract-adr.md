# ADR — Full League Scoring Contract

**Status:** Proposed — founder directed the full-fidelity outcome; implementation authorization remains separate
**Date:** 2026-08-24
**Decider:** Omen founder
**Scope:** architecture and source-rights research only. No collector, timer, provider credential, SQL application, dependency, deployment, or production scoring change is authorized by this record.

## Context

The original A6 correction correctly found that every scored move defaulted to PPR. Its partial implementation captures only reception points (`0`, `0.5`, or `1`) and chooses one of three base totals. That is insufficient for Omen’s actual promise: a league can differ in passing values, bonuses, fumble rules, kicker, DST, IDP, return scoring, roster constraints, and commissioner adjustments even when both leagues call themselves “PPR.”

The founder requires Omen to extract and calculate the full league scoring contract. Omen may call a result **league-exact** only when it captured every material rule and reconciled the named contract/version to the user-authorized provider’s final result.

## Decision

Model a league’s scoring as an immutable, versioned **Scoring Contract**, not as a `PPR`/`Half PPR`/`Standard` label.

Every recommendation will eventually point to:

```text
private provider-rule snapshot
        ↓
normalized Omen Scoring Contract + coverage status
        ↓
lawful immutable NFL event/stat snapshot
        ↓
versioned calculated result
        ↓
provider final outcome + reconciliation record
        ↓
recommendation outcome state
```

The provider’s final league result is the outcome authority. Omen’s calculation is an auditable explanation and independent reconciliation. A disclosed commissioner/provider adjustment remains a valid league outcome but is labelled `provider_adjusted`, never represented as independently reproduced math.

## Options considered

### A. Keep a three-format label

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Accuracy | Insufficient |
| User trust | Unsafe: falsely suggests league fidelity |
| Decision | Rejected |

It corrects reception scoring only and cannot represent full league rules.

### B. Build one scorer per provider

| Dimension | Assessment |
|---|---|
| Complexity | Medium initially, high permanently |
| Accuracy | Drifts as platforms add/change rules |
| User trust | Hard to explain or audit consistently |
| Decision | Rejected |

It duplicates calculation logic and makes a cross-provider recommendation/outcome policy brittle.

### C. Canonical versioned Scoring Contract with provider adapters

| Dimension | Assessment |
|---|---|
| Complexity | High, front-loaded |
| Accuracy | Auditable and testable per rule/family |
| User trust | Supports an explicit exact/adjusted/unavailable state |
| Decision | Proposed |

Provider adapters preserve the original configuration; an Omen canonical rules engine evaluates the same contract against lawful NFL event facts; reconciliation compares the result to the provider’s final score.

### D. Trust only the provider’s final points

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Accuracy | Provider outcome is useful, but Omen cannot explain or evaluate counterfactual advice |
| User trust | Opaque |
| Decision | Rejected as the sole model |

Provider points are necessary outcome evidence, not a substitute for the calculation and recommendation-evaluation contract.

## Contract objects

### 1. Provider Rule Snapshot — private account/league data

An immutable, minimally retained snapshot taken at recommendation time and whenever a provider reports a rules change:

- provider, private league identifier, season, retrieval timestamp, source version/endpoint identity, and SHA-256;
- raw provider settings only as needed to reproduce the contract, stored under the account-data boundary;
- provider stat identifiers, labels, modifiers, roster positions, matchup/playoff settings where they change evaluation meaning, and explicit commissioner/manual-adjustment fields when exposed;
- no credential value, token, cookie, or unrelated league-member data in the snapshot.

Its hash, not the raw private configuration, is referenced from the recommendation audit record.

### 2. Omen Scoring Contract — canonical rules

Each normalized rule contains:

| Field | Meaning |
|---|---|
| `ruleset_version` | Omen interpretation version; never silently overwritten |
| `subject` | offensive player, kicker, team DST, or individual defensive player |
| `event_key` | canonical event/stat fact, not a provider-specific label |
| `condition` | optional threshold, range, game condition, or roster condition |
| `operator` | multiplier, fixed award/deduction, threshold/bonus, cap, or override |
| `value` | points or calculation parameter |
| `source_rule_ref` | exact provider setting(s) that produced the rule |
| `coverage_state` | `supported`, `provider_adjusted`, `unsupported`, or `ambiguous` |

The initial vocabulary must inventory every rule exposed by each supported provider. It cannot treat an unknown key as zero, ignore it, or relabel it as a nearby rule.

### 3. Lawful event facts — shared football-data infrastructure

The existing rights-cleared nflverse allowlist supplies immutable completed-game facts and identity data. Its role is event evidence, not league settings or user outcome authority.

The rule/event matrix must cover, at minimum:

- passing, rushing, receiving, two-point conversions, interceptions, fumbles, and yardage thresholds/bonuses;
- kicking attempts, makes, misses, distance bands, and extra points;
- DST and special-teams scoring, including points/yards allowed, turnovers, sacks, blocks, safeties, return events, and shutout/threshold rules;
- individual defensive player rules where a provider/league uses them;
- return, penalty, stat-correction, and provider-specific stat semantics where material.

If lawful event data cannot supply a required event with a documented mapping, that rule family is not league-exact.

### 4. Provider Final Outcome — private reconciliation evidence

For a user-authorized league only, preserve the minimal final provider outcome needed to reconcile the affected recommendation: final points, relevant player/team score, matchup/period, finality timestamp if exposed, and a typed adjustment reason where exposed.

Do not transform this private league evidence into a public NFL statistics corpus or use it to evaluate another account’s league.

### 5. Reconciliation record

The engine compares Omen-calculated and provider-final outcomes under the same rule snapshot:

| State | Meaning |
|---|---|
| `exact` | all material rules supported; calculated and provider final agree within documented precision |
| `provider_adjusted` | final provider outcome includes/exposes a manual or provider adjustment Omen did not independently derive |
| `unsupported` | a material rule/event cannot be faithfully calculated |
| `ambiguous` | provider rule or identity cannot be interpreted uniquely |
| `mismatch` | calculation and provider final conflict without a disclosed adjustment |
| `pending` | result or finality is not yet available |

Only `exact` earns the phrase **league-exact**. `provider_adjusted` is a final, valid league outcome with its own visible label. `unsupported`, `ambiguous`, `mismatch`, and `pending` are not approximated.

## Provider research and rights gates

| Provider | Technical evidence | Contract feasibility | Rights / next gate |
|---|---|---|---|
| Sleeper | Official league endpoint returns `scoring_settings`; matchup records expose calculated `points` and `custom_points` for commissioner overrides. [Official docs](https://docs.sleeper.com/) | Strong technical fit for full settings snapshot and adjustment-aware reconciliation. | Prior A7 research found commercial use requires written permission/licensing. Do not automate this contract in production until that permission explicitly covers settings retrieval, storage, calculation, and reconciliation. |
| Yahoo | Official Fantasy Sports API states league statistics, scoring modifiers, and rules are configurable and relevant only in the league context; it documents OAuth access to private user data. [Official guide](https://developer.yahoo.com/fantasysports/guide/) | Strong intended API model. Build must extract the complete settings resource—not only Receptions—and meet required Yahoo attribution. | Confirm current developer terms cover commercial retention, derived calculation, and reconciliation; use only user-authorized OAuth access and required attribution. No unreviewed use is assumed. |
| ESPN | Existing adapter technically reads a subset of `mSettings`, but Disney’s terms limit use to personal/noncommercial and prohibit automated access/copying without express written permission. [Terms](https://disneytermsofuse.com/english/) | Technically possible is not sufficient. | **Blocked.** Do not expand ESPN extraction or reconciliation without express written permission or an official commercial interface whose terms cover this use. Existing user cookies do not resolve this rights issue. |

These provider settings are not alternatives to the lawful NFL event source. They are private, user-authorized configuration/outcome evidence and require their own provider-specific rights review.

## Product and privacy rules

- Recommendation outcome evaluation follows Policy v1.2: factual provider outcome, Omen decision quality, user follow-through, and user impact remain separate.
- Recommendation logic follows Policy v1.3: no provider, advertiser, or commercial relationship may influence advice or outcome evaluation.
- A recommendation snapshot stores the scoring-contract hash, ruleset version, coverage state, exact advice/alternative, and time-bounded evidence used—never a later “current” league configuration.
- Account deletion deletes or irreversibly de-identifies account-linked rule snapshots, final outcomes, and recommendation history under Policy v1.1. Shared public event facts and non-identifying system evidence remain separate.

## Acceptance evidence before implementation approval

1. A fixture inventory captures every scoring-rule key and rule family exposed by each intended provider.
2. Every provider rule maps to a canonical rule, an explicit `unsupported` state, or a rights block—never an unrecorded fallback.
3. Canonical calculation tests cover each event/rule family, threshold boundary, negative value, and multi-rule interaction.
4. User-authorized non-production proof compares full weekly results for representative leagues against final provider outcomes, with zero unexplained mismatches before `exact` is claimed.
5. Known manual adjustments produce `provider_adjusted`, preserve the provider result, and never accuse or imply misconduct by the commissioner.
6. Source correction, rules-change, missing-event, identity ambiguity, provider timeout, and account deletion drills pass without fabricating a grade or leaking private configuration.
7. Legal review confirms the specific per-provider settings/outcome use, storage, attribution, and automation path before any production collection.

## Phased plan

1. **Phase 0 — contract inventory and rights:** complete the provider-rule catalog, rights evidence, event coverage matrix, and this ADR. No credentials or runtime work.
2. **Phase 1 — canonical rule language:** implement only pure, fixture-driven parsing/normalization and coverage reporting once approved. No production access.
3. **Phase 2 — lawful provider pilot:** begin with the provider whose written rights and complete settings/output evidence are confirmed; capture/reconcile non-production fixtures first.
4. **Phase 3 — scoring engine:** implement offensive, kicker, DST, IDP, bonus, and threshold rule families with replay evidence and correction versioning.
5. **Phase 4 — provider reconciliation and outcome evaluation:** prove `exact`, `provider_adjusted`, `unsupported`, `ambiguous`, `mismatch`, and `pending` user states.
6. **Phase 5 — staging and production gates:** separately authorize storage, provider access, scheduler, monitoring, rollback, and A4 scoring enablement. ESPN remains excluded unless its rights gate clears.

## Consequences

- The prior three-format code/SQL source is useful evidence but cannot merge as the final scoring implementation.
- “Full” is a coverage and reconciliation promise, not an assumption that every provider rule can be silently supported on day one.
- ESPN support may remain non-exact or unavailable unless an explicit lawful path emerges; Omen must say so honestly rather than using the existing cookie integration to stretch a prohibition.
- This is a materially larger program than the original 62–92 hour base-format pipeline estimate. A defensible implementation estimate follows the Phase 0 rule/event inventory and provider-rights verdicts.
