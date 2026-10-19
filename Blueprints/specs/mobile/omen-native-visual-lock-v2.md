# Omen native visual lock v2 — proven reads and living response

**Status:** Founder-directed working authority, 2026-10-16.  
**Revision of:** the 2026-09-13 visual lock, whose dated record remains intact.  
**Data baseline:** current `origin/main` after Build 12 and Sight v2 integration.  
**Product language:** `Blueprints/specs/design/omen-language-v1.md`.  
**Interaction authority:** `omen-native-interaction-response-v1.md`.
**Information binding:** `omen-native-information-fulfillment-v1.md`.

## 1. What remains locked

Dark-only Omen, Raven background, brass-led chrome, Wix Madefor Display/Text, provider marks as the
bounded colour exception, confidence bands rather than percentages, form as the carrier for semantic
data states, 44pt minimum targets, honest mock/live/stale/unavailable states, and the six journey model.

## 2. What changes

The September canvas was composed before Omen could serve its current per-player read, context layers,
cross-position grade, drivers, freshness and measured comparison with stored provider projections.
The new lock makes those data visible without turning `Sight` into a visual brand.

Every decision surface answers, in order:

1. **Verdict** — what to do, hold, or refuse.
2. **Leading Read** — which evaluated source leads for this exact cohort, or unresolved.
3. **Counsel** — the shortest evidence chain that supports the verdict.
4. **Crosswind** — material disagreement that survives coverage/error gates.
5. **Portents** — role, usage, availability, opponent and environment changes that matter.
6. **Fog** — missing, stale or underpowered evidence.
7. **Receipt** — source, scoring, week, freshness, method and evaluation cohort.

No screen labels a block `Sight`. Internal `sight` payloads decode into Omen Read presentation.

### Current implementation boundary

The recommendation engine still emits a fixed Sight/provider blend, while the read-enrichment layer
now returns the versioned authority receipt defined below. Native may display that server-owned
receipt, but it may not infer a winner on-device or claim that the receipt already controls the
optimizer. Missing or legacy evidence resolves closed.

## 3. Forecast authority

There is no permanent provider-first or Omen-first rule. Authority is selected by a versioned
evaluation receipt across position, scoring family, horizon and cohort.

Possible states:

- `provider_leads`
- `omen_leads`
- `unresolved_tie`
- `unresolved_low_sample`
- `unresolved_stale`
- `single_source_only`

A lead requires the same-player evaluation set, minimum sample, current method/version, leakage-safe
holdout, and a predeclared metric policy. MAE is the primary fantasy-points error measure; correlation
is supporting evidence and cannot override worse error alone. The receipt carries sample size, window,
metrics and evaluated-at time. Missing receipt means unresolved, never inherited provider authority.

The preregistered `forecast-authority.v1` policy is weekly PPR only: at least 50 same-player rows across
at least two graded weeks, a 0.15 MAE tie margin, and an evaluation no older than 21 days. It includes
the season/week range and model version in the receipt. These constants must change under a new policy
version, not through client presentation logic.

## 4. Journey revision order

1. **J3 — The first call:** establishes Verdict, Leading Read, Counsel, Crosswind, Portents and Fog.
2. **J2 — The desk:** establishes immediate interaction response, partial loading and context switching.
3. **J4 — Trade:** applies the proven-read receipt to Build, Find and Type without making one weekly
   forecast the whole trade value.
4. **J5 — Scout room:** brings Omen Reads to player/waiver context and preserves provider asymmetry.
5. **J6 — Ledger:** freezes the issued read, authority receipt and method version.
6. **J1 — Getting in:** completes tactile progress, success and recovery without credential exposure.

## 5. J3 proving slice

`OmenCall` leads with the Verdict and one sentence of Counsel. The compact receipt says, for example,
`Omen Read leads · WR · PPR`, `ESPN Read leads · QB · standard`, or `Reads unresolved`.

`OmenEvidence` expands into:

- both usable reads with labels and timestamps;
- the evaluation receipt that selected the leader;
- up to three Portents, ordered by server contribution rather than client opinion;
- one Crosswind block when the reads materially disagree;
- named Fog that survived the response budget;
- the exact league/scoring/player/week context.

The transition from call to evidence is a disclosure, not a reveal. The answer is never delayed for
theater. Pressed, selected, working and resolved behavior follows the interaction contract.

## 6. Evidence required before propagation

- contract fixtures for every authority state;
- light is out of scope: both normal and increased-contrast dark captures;
- Dynamic Type, VoiceOver, Reduce Motion and Reduce Transparency;
- slow, failed, stale, low-sample and single-source scenarios;
- cold/warm tap-to-acknowledgement, shell-ready and data-ready timings;
- provenance-printed paired-iPhone walk;
- fresh native UI and code review with no open P0/P1.

Only after J3 passes does this system propagate to the remaining journeys.
