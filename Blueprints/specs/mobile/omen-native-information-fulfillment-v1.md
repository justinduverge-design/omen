# Omen native information fulfillment v1

**Status:** Working contract, 2026-10-17.  
**Applies first to:** J3 Omen Call and Omen Evidence; then J2, J4, J5 and J6.  
**Presentation language:** `../design/omen-language-v1.md`.  
**Visual authority:** `omen-native-visual-lock-v2.md`.  
**Wire compatibility:** internal `sight` keys stay unchanged; customer copy says **Omen Read**.

## 1. Purpose

The canvas must describe information the product can actually obtain, distinguish information it is
still resolving from information it could not obtain, and tell engineering which contract owns every
visible claim. A screen is not fulfilled because a plausible sentence fits in its card. It is fulfilled
only when the sentence has a named source, state, freshness rule and failure presentation.

Omen does not permanently privilege a provider forecast or Omen's forecast. The server's
`forecast-authority.v1` receipt may elect either read for the evaluated cohort, or elect neither. The
client renders that result and never computes, repairs or guesses it.

## 2. The decision stack

Every full decision surface uses this order. Compact surfaces may collapse lower layers into a single
disclosure, but may not change their meaning.

| Layer | User question | Contract truth | Presentation when absent |
|---|---|---|---|
| Verdict | What should I do? | feature decision state and recommendation | Hold or refuse with the named limiting reason |
| Leading Read | Which forecast earned the lead here? | `sight.authority.state` plus its cohort fields | `Reads unresolved`; never infer from which number exists first |
| Counsel | Why is that the bounded action? | recommendation rationale plus decision evidence actually used | Omit unsupported prose; show Fog if the decision is constrained |
| Crosswind | Where do usable reads materially disagree? | `sight.crosswind` with both source values | Omit when no material disagreement; missing data is Fog, not Crosswind |
| Portents | What changed enough to matter? | ordered `sight.drivers` and typed feature evidence | Show only source-backed, material drivers; never manufacture three rows |
| Fog | What could Omen not see or prove? | `decision_context.limitations`, confidence-unavailable reasons, stale/low-sample authority | Name the missing input and the safe remaining action |
| Receipt | What exact context and method produced this? | league/scoring/week, freshness, authority and decision-context versions | Mark unavailable fields; do not substitute current values into an issued receipt |

## 3. Wire-to-screen binding

| Screen block | Primary field | Supporting fields | Client responsibility |
|---|---|---|---|
| Verdict title/action | feature response state, recommendation/action | confidence band, risk level | Map known enum states to bounded copy and action; unknown state fails closed |
| Leading Read label | `player.sight.authority.state` | `position`, `scoring_family`, `horizon`, `sample_size`, `weeks`, `evaluated_at`, `model_version` | Decode to Omen/provider/unresolved language; do not compare MAE locally |
| Omen value | `player.sight.sight_points` | `through_week`, `version`, `confidence`, `grade`, `flex_grade` | Label as Omen's read and retain its vintage |
| Provider value | `player.projected_points` | connected platform, response observation time when supplied | Name the provider only when known; preserve missing as missing |
| Crosswind gap | `player.sight.crosswind.gap_points` | `threshold_points`, both read values, `crosswind.drivers` | Render only from a server-issued Crosswind; do not derive a threshold |
| Portents | `player.sight.drivers[]` | typed start/sit, waiver, trade or league evidence | Preserve server order; cap visually without changing evidence priority |
| Fog | `decision_context.limitations[]` | authority unresolved state, confidence `unavailable_reason`, per-section status | Merge duplicate limitations by input identity; never relabel failure as empty |
| Receipt | `decision_context`, authority receipt, selected context | scoring, player, week, issued/evaluated/observed times | Present the issued snapshot; technical identifiers live behind disclosure |

## 4. Authority presentation

| Server state | Compact customer copy | Required detail |
|---|---|---|
| `omen_leads` | `Omen Read leads` | position, scoring family, evaluation window/sample and freshness |
| `provider_leads` | `{Provider} Read leads` | the same cohort and freshness fields |
| `unresolved_tie` | `The reads are level` | both MAEs and the declared tie policy in technical disclosure |
| `unresolved_low_sample` | `Not enough games to name a leader` | sample size, weeks and required threshold |
| `unresolved_stale` | `The comparison is out of date` | evaluated-at time and the current policy version |
| `single_source_only` | `Only one read is available` | which read exists and which is missing |
| missing/unknown state | `Reads unresolved` | Fog names the missing or incompatible receipt when known |

The compact label must never say one read **wins**, **beat** the other, or is universally more
accurate. Authority is scoped to a cohort and an evaluation window.

## 5. Canvas states required for J3

`OmenCall` and `OmenEvidence` each require these compositions before the visual lock can be called
complete:

1. Omen Read leads, both values present.
2. Provider Read leads, both values present.
3. Unresolved low sample.
4. One source only.
5. Material Crosswind with both values and vintages.
6. Decision delivered with one advisory input unavailable as named Fog.
7. Context resolving: shaped placeholders, no factual zero-state copy.
8. Request failure: local recovery action and no stale recommendation presented as current.

The call screen shows Verdict, one sentence of Counsel, the compact Leading Read receipt, at most one
urgent Portent, and a disclosure action. The evidence screen carries the complete comparison,
evaluation scope, ordered Portents, Crosswind, Fog and Receipt. Opening evidence must not trigger a
second decision request when the call response already contains those facts.

## 6. Loading, caching and time

The information lifecycle is explicit:

`resolving context -> requesting decision -> partial advisory enrichment -> delivered or failed`

- Context must resolve before a scoped personalized request begins.
- A delivered core decision is not held hostage by an advisory enrichment. A missed advisory budget
  lands as Fog in the delivered answer.
- The old league's decision is removed before a new league label is committed to the screen.
- Cached content may remain only when its league, player, scoring and week identity all match, and it
  carries a visible observation time.
- A retry replaces only the failed owner block unless the context itself failed.
- The three performance clocks are `input_ack_ms`, `shell_ready_ms` and `data_ready_ms`; canvas
  annotations name which visual transition stops each clock.

## 7. Feature propagation

| Journey | Omen Read's job | Boundary |
|---|---|---|
| J2 Command | one directional weekly summary and route to depth | no dense evidence ledger inside the desk |
| J3 Omen | choose or refuse the single bounded weekly action | first proving surface for the full decision stack |
| J4 Trade | one sign inside rest-of-season/team-context value | a weekly forecast never becomes total trade value |
| J5 League/waiver | player opportunity and replacement evidence | provider-specific absence remains named, not normalized away |
| J6 Ledger | freeze the values, authority and limitations used at issue time | current reads never rewrite the historical receipt |

## 8. Acceptance

A screen-data binding passes only when:

- contract fixtures cover every visible authority and availability state;
- unknown enum values fail closed without crashing or electing a leader;
- screen copy contains no customer-facing `Sight` label;
- the canvas state has a matching native screenshot scenario;
- slow and failed responses preserve immediate local interaction feedback;
- VoiceOver reads Verdict, leadership scope, Crosswind and Fog in that order;
- paired-iPhone evidence records cold and warm shell/data timings;
- a receipt can identify every displayed number's source and vintage.
