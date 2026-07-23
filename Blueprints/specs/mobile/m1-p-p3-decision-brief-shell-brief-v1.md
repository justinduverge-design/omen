# M1-P P3 Batch 3 — DecisionBrief Shell Preparation Brief v1

**Status:** Preparation brief (pre-implementation) authored 2026-07-22 alongside Batch 2.
**Applies to:** M1-P P3 Batch 3 — the final composition in the P3 lane before M4 feature screens.
**Governing authority:** `omen-native-design-system-registry-v1.md` §3.2 DecisionBrief row;
`omen-native-mobile-foundation-v1.md`; `omen-native-design-house-v1.md`;
`m1-native-resource-alignment-addendum-v1.md`.
**Batches consumed:**
- Batch 1 (metric family): ConfidenceBar, RiskPanel, MetricStrip, SignalList.
- Batch 2 (identity + connection): PlayerRow, ConnectionStatusBadge, PlatformConnectionCard, `OmenConnectionStatus`.
- Primitive layer: Card, Button, Badge, ListRow, StateSurface (existing).

## 1. Purpose

DecisionBrief is the **core Omen recommendation surface** per registry §3.2 — the shell that
turns a live MVP-move recommendation into a scannable "verdict → why → risk → confidence"
answer. It is the single composition Command Center, Omen tab, and Trade Analyzer will all
render, so its API and state surfaces must be settled before any feature screen ships.

DecisionBrief is a **shell**, not a data fetcher. It receives a resolved recommendation
envelope (or a state signal) and renders honestly; upstream owns the API call.

## 2. Field set (from registry §3.2 DecisionBrief row)

Every DecisionBrief has:

| Field | Type | Notes |
|---|---|---|
| `verdict` | short string | "Start Christian McCaffrey", "Hold on the trade", "Waive-wire priority: Tank Bigsby" |
| `move` | short string | The specific action being recommended |
| `impact` | optional string | One line, plain-English impact — "+4.1 projected over your bench" |
| `confidence` | 0–100 | Rendered via ConfidenceBar |
| `risk` | `OmenRiskLevel` + reasons | Rendered via RiskPanel |
| `explanation` | list of paragraphs | Plain-English reasoning |
| `signals` | list of `OmenSignalItem` | Data-source honesty; rendered via SignalList |
| `alternatives` | optional list of `PlayerRow` items | Other players considered |
| `metrics` | optional `OmenMetricItem` list | Rendered via MetricStrip (projected / opponent / ceiling / etc.) |
| `feedback slot` | callback + slot | Optional "was this useful?" affordance; opaque callback |

Any of these can be absent — the shell degrades gracefully rather than showing an empty
section header.

## 3. State surfaces (all 8 required)

Registry §3.2 explicitly enumerates 8 states. Each must have a distinct, honest treatment
composed from `OmenStateSurface` + the appropriate Card variant:

| State | Trigger | Treatment |
|---|---|---|
| `success` | Live recommendation returned | Full DecisionBrief render with all supplied fields |
| `empty` | Live path returned no advice (e.g. `state: empty` from POST /api/omen/mvp-move) | `OmenStateSurface(Empty, "Nothing to recommend right now", …)` inside Card |
| `loading` | In-flight recommendation | `OmenStateSurface(Loading, "Analyzing your matchup…", …)` — contextual copy, not "Loading…" |
| `error` | Backend or client-side error | `OmenStateSurface(Error, "Unable to build this recommendation", …)` with retry action |
| `disconnected` | Dashboard status `needs_platform` | `OmenStateSurface(Disconnected, "Connect a league…", …)` with Connect CTA |
| `stale` | Cached/expired data honest surfacing | `OmenStateSurface(Stale, "Showing your last sync", …)` |
| `mock` | Demo/preview fixture | `OmenStateSurface(Mock, "Demo analysis", …)` — visibly labeled, per facts-of-record #7 |
| `off_season` | Dashboard status `off_season` | Copy per §4 below |

The shell exposes a single sealed/enum state and a data payload — callers never mix a
success render with a mock badge; the shell decides which surface renders.

## 4. Copy anchors (draft — refine at implementation time, not now)

- **Off-season:** "The regular season isn't running. Omen will be back when Week 1 kicks off."
- **Disconnected:** "Connect Sleeper, Yahoo, or ESPN so Omen can read your roster and matchup."
- **Pending live engine:** covered by `disconnected` treatment when the dashboard reports
  `pending_live_engine` — per F2 resolution, the meaning is "active connection lacks the
  provider context required for a safe live attempt", not "engine unbuilt".

Copy is a Batch 3 decision, not a Batch 2 decision. `slops-ux-copy` invokes when the
implementation session begins.

## 5. Composition matrix

```
DecisionBrief (Card, variant per state)
├── Header row
│   ├── Verdict (h2 typography)
│   └── ConnectionStatusBadge (if degraded state)
├── Move + Impact (body typography)
├── MetricStrip (if metrics present)
├── ConfidenceBar (labeled "Confidence")
├── RiskPanel (level + reasons)
├── Explanation (body paragraphs)
├── SignalList (data-source honesty)
├── Alternatives (list of PlayerRow, optional)
└── Feedback slot (optional composable / view slot)
```

State surfaces replace the body under the header. The Card remains the outer container in
every state so scroll position and outer chrome stay stable.

## 6. API sketch

### Compose

```kotlin
sealed class OmenDecisionBriefState {
    data class Success(val payload: OmenDecisionBriefPayload) : OmenDecisionBriefState()
    data class Empty(val message: String) : OmenDecisionBriefState()
    object Loading : OmenDecisionBriefState()
    data class Error(val message: String, val onRetry: (() -> Unit)?) : OmenDecisionBriefState()
    data class Disconnected(val onConnect: (() -> Unit)?) : OmenDecisionBriefState()
    data class Stale(val payload: OmenDecisionBriefPayload, val lastSynced: String) : OmenDecisionBriefState()
    data class Mock(val payload: OmenDecisionBriefPayload) : OmenDecisionBriefState()
    object OffSeason : OmenDecisionBriefState()
}

data class OmenDecisionBriefPayload(
    val verdict: String,
    val move: String,
    val impact: String? = null,
    val confidence: Int,
    val risk: OmenRiskLevel,
    val riskReasons: List<String> = emptyList(),
    val explanation: List<String> = emptyList(),
    val metrics: List<OmenMetricItem> = emptyList(),
    val signals: List<OmenSignalItem> = emptyList(),
    val alternatives: List<OmenDecisionBriefAlternative> = emptyList(),
)

data class OmenDecisionBriefAlternative(
    val name: String,
    val position: OmenPosition,
    val team: String? = null,
    val meta: String? = null,
)

@Composable
fun OmenDecisionBrief(
    state: OmenDecisionBriefState,
    modifier: Modifier = Modifier,
    feedbackSlot: (@Composable () -> Unit)? = null,
) { … }
```

### SwiftUI

Mirror shape: `enum OmenDecisionBriefState { case success(payload), empty(String), loading,
error(String, (() -> Void)?), disconnected((() -> Void)?), stale(payload, String),
mock(payload), offSeason }`. `struct OmenDecisionBrief: View` accepts `state` and an
optional `@ViewBuilder feedbackSlot`.

## 7. Not in Batch 3 scope

- Fetching the recommendation (upstream owns POST /api/omen/mvp-move).
- Feedback envelope submission (opaque callback; upstream owns POST /api/omen/feedback).
- Off-season *detection* (dashboard status is the source; shell just renders).
- Provider connect flow launch (`Disconnected` state emits an `onConnect` opaque
  callback; upstream owns navigation).
- Motion / transitions beyond registry §4 reduce-motion rule.
- SF Symbol / Material Symbol selection. Feedback slot is a slot, not a hard-coded icon.

## 8. Resource-alignment addendum §7 citations that Batch 3 will need

Batch 3 introduces no new iconography by default. If the implementation session decides to
add a leading icon to the empty/error/disconnected state surfaces beyond what
`OmenStateSurface` already renders, addendum §7 requires:

1. Cite the applicable Omen contract (§3.2 DecisionBrief row + this brief).
2. Cite the resource that authorizes the icon choice — SF Symbols for iOS, Material Symbols
   for Android. Give the exact symbol name (e.g. `exclamationmark.triangle` /
   `warning`).
3. Confirm the choice does not override any addendum §5 item.

## 9. Verification plan for Batch 3

- Compose unit test per state renders the expected `OmenStateSurface` or payload block.
- XCTest per state proves the enum branch → visible-label mapping (reflection-free
  helper pattern from Batches 1/2).
- Gallery entry on both platforms shows all 8 states with representative fixtures.
- Enforcement scanners stay green.
- Downstream `:app:assembleDebug` still passes.

## 10. Open questions to settle before or during Batch 3

- **Feedback slot API shape.** Slot (`@ViewBuilder`) vs. structured props
  (`(rating: Int) -> Unit`). Slot is more flexible; props are more testable. Batch 3
  session picks one and documents.
- **Alternatives limit.** Cap at ~3 for compact rendering, or unbounded with scroll?
  Registry doesn't specify. Batch 3 session picks based on typical MVP-move payload
  volume.
- **Stale banner placement.** Under the header vs. above the Card. Batch 3 session
  picks based on a scan-order sketch on both platforms.

These are implementation-time decisions, not blockers for the shell contract.
