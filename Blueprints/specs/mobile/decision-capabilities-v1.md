# Shared Decision Capabilities v1

**Status:** Founder-authorized implementation contract
**Date:** 2026-09-17
**Scope:** The versioned evidence/capability boundary shared by Omen, Command, League,
Start/Sit, Trade, and Ledger on iOS and Android.
**Does not authorize:** provider credential access or changes, database/schema writes,
production flags, scoring/publication changes, deployment, store release, dependencies, or
new visual components/tokens.

## 1. Job

Every Omen destination may rely on the same underlying facts, forecasts, model outputs, and
limitations. It must not independently decide whether a source is verified, fresh, applicable,
or actually used in a recommendation.

This contract defines one server-owned vocabulary. It is intentionally not a shared UI toolkit:
SwiftUI and Compose present it natively, and every destination shows only the subset appropriate
to its job.

## 2. Canonical entry

`decision-capabilities.v1` is an additive capability manifest. Its first negotiated carriers are
`omen-decision-brief.v3` and `start-sit-detail.v2`; `omen-decision-brief.v2`,
`start-sit-detail.v1`, and the legacy live envelope remain supported unchanged for existing
clients.

```json
{
  "contract_version": "omen-decision-brief.v3",
  "capability_contract": "decision-capabilities.v1",
  "capabilities": [
    {
      "name": "projections",
      "state": "live",
      "used": true,
      "kind": "projection",
      "source": "optimizer",
      "statement": "Projection edge is normalized from roster fields and optimizer math.",
      "observed_at": "2026-09-17T00:00:00.000Z",
      "fresh_until": null
    }
  ]
}
```

Fields are server-owned. Native clients must never derive a capability state, a source label,
freshness time, or a provider-specific limitation from local guesses.

## 3. Required fields and vocabulary

| Field | Meaning | Client rule |
|---|---|---|
| `name` | Stable capability identifier | Never turn an unknown identifier into a live claim. Render it as unavailable/unsupported until the app understands it. |
| `state` | `live`, `mock`, `demo`, or `unavailable` in v1 | This is availability, not evidence class. A legacy internal `stub` must become `unavailable` in a v3 manifest. |
| `used` | Whether this capability informed this specific decision | An available capability with `used: false` cannot be described as a recommendation driver. |
| `kind` | `verified`, `projection`, `model`, `inference`, or `limitation` | Never render a projection/model/inference as a verified fact. |
| `source` | Stable source identifier, not a credential or URL | Display only server-provided safe copy; never expose provider internals. |
| `statement` | Server-owned user-safe explanation | Render verbatim when it explains a limitation/recovery condition. |
| `observed_at` | When the source was observed/generated | Optional; clients do not invent a timestamp. |
| `fresh_until` | Server-declared expiration | Optional; a missing deadline does not imply indefinite freshness. |
| `reason_code` | Source-specific unavailable or completed-read distinction | Optional; preserve it verbatim instead of turning a no-move result into an outage. |
| `coverage_state` / `reconciliation_state` | Scoring evidence stage | Optional; only server-side `supported` + `exact` permits a league-exact live state. |

## 4. Evidence semantics

- `verified`: a directly observed, source-backed fact, such as a normalized roster or a
  confirmed kickoff.
- `projection`: a forecast. It is never a fact merely because its data source is live.
- `model`: output of an explicit deterministic or bounded model, such as a travel estimate.
- `inference`: a conclusion drawn from inputs, including matchup tendencies.
- `limitation`: missing, unsupported, unreadable, stale, or insufficient context.

`kind` describes the statement. `state` describes whether the capability was usable on this
request. They are deliberately separate.

## 5. Destination rules

| Destination | May consume | Must not do |
|---|---|---|
| Omen | Selected weekly call's capability list and used markers | Re-label a limitation as an edge, show an internal `Stub`, or show numeric confidence in v3. |
| Command | Compact coverage/routing summary only; sections continue to fail independently | Duplicate League waiver detail, Trade verdicts, or Ledger receipts. |
| League | Waiver/scout coverage and explicit provider asymmetry | Treat unread activity/pool data as empty. |
| Start/Sit | Selected matchup/scoring/evidence records | Assume PPR or an exact scoring result when coverage is unknown. |
| Trade | Supporting scoring/context limitations | Create or override a verdict client-side; `close_needs_context` and `insufficient_data` remain authoritative. |
| Ledger | Issue-time capability/evidence snapshot only | Re-resolve current schedule, DvP, waiver, or scoring data onto a historic receipt. |

## 6. Current capability boundaries

- Schedule kickoff, home/away, and opponent can be verified only after a normalized player NFL
  team and a public scoreboard event are found. A straight-line stadium distance is a modelled
  estimate, not verified travel.
- DvP remains a limitation unless its resolver has an explicit opponent, supported position,
  distinct-week sample, and source freshness. A mock opponent mapping may never enter a live
  request.
- Waiver detail remains owned by `waiver-analysis.v1`; this manifest may summarize coverage but
  cannot duplicate bid math, claim probability, or player rows. A `null` bid remains unknown,
  never zero.
- Scoring `supported` means rules were read and supported. It does not mean final scoring is
  exact; that claim additionally requires an `exact` reconciliation state. No scoring flag is
  changed by this contract.

## 7. Native parity and accessibility

Both native apps decode `kind` and `state` separately. The current SignalList may preserve the
approved visual availability badge, but its accessibility label includes the evidence kind so a
VoiceOver/TalkBack user can distinguish a live projection from a verified fact. New visual
patterns require their own approved component/Figma path.

Required fixture coverage for every native consumer:

1. verified + live + used;
2. projection + live + used;
3. model/inference + live + not used;
4. limitation + unavailable;
5. unknown capability/state fails safe rather than reading as live;
6. legacy v2 remains compatible;
7. Ledger uses issued-time evidence only.

## 8. Acceptance and non-goals

Acceptance for this first slice is a version-negotiated server manifest, iOS/Android decoding
parity, focused backend/native tests, and no user-facing `Stub` state on the v3 Omen path.

It does **not** certify a production request as live. Schedule/travel, DvP, bounded LLM narration,
waiver coverage, and exact scoring each have source-specific implementations, but their state is
still request-specific: a missing source, failed read, incomplete context, unconfigured private
model, or non-exact reconciliation stays unavailable.
