# Corvus Draft Assistant — Product Spec
**Feature:** Draft Assistant (Corvus v1)
**Author:** Claude (Front-End Engineer, Slops Saloon)
**Date:** 2026-05-17
**Status:** Draft — Pending Justin approval

---

## 1. Problem Statement

Fantasy football drafts are one of the highest-stakes, highest-pressure moments of the entire season. A drafter has roughly 90 seconds per pick to evaluate 50–150 remaining players, account for their own roster construction, estimate what competitors are doing, and translate all of that into a single decision. Most drafters solve this by trusting gut instinct, a cheat sheet sorted by ADP, or a generic rankings list that does not know their team, their league's scoring format, or what happened in the previous 12 picks.

The pain is specific and compounding:

- **Value blindness.** The drafter cannot quickly see when a player is slipping past their consensus value — they miss the tier break.
- **Positional tunnel vision.** A drafter running thin at WR will reach for a mediocre receiver when a top-10 RB is falling.
- **Roster shape drift.** By round 8, the drafter has forgotten what they drafted in rounds 1–3 and stops optimizing for their actual team.
- **ADP anchoring.** Most tools show ADP as a static number, not as a live signal of what is happening in *this* draft right now.

Draft Assistant solves this by giving the drafter a single, disciplined recommendation per pick — grounded in real data about their roster, the board state, and proven scoring models — without pretending to predict outcomes.

---

## 2. Competitive Landscape

### What Exists Today

**ESPN Draft Grades**
- Assigns a letter grade to your overall draft after it is complete.
- Provides positional grades per pick.
- Weakness: Purely retrospective. Gives no in-draft pick guidance. Grade criteria are opaque. Optimizes for ESPN's own rankings, not the user's league settings.

**FantasyPros Draft Analyzer (My Draft Center)**
- Compares your picks to consensus expert rankings.
- Flags "reaches" and "values" relative to ADP.
- Weakness: Ranking-centric, not roster-centric. Does not model what you *need* given your current roster. Does not account for scarcity changes as the board depletes. LLM narration layer is thin and generic.

**MyFantasyLeague Draft Assistant**
- Rich data tool for experienced MFL users.
- Shows best available by position with projected points.
- Weakness: Complex UI designed for power users. No real-time roster-need signal. Steep learning curve. No LLM layer.

**Sleeper Draft Tools**
- Clean UI, live ADP tracking, trend indicators.
- "Who to pick" cards with positional projections.
- Weakness: Recommendations are rank-based, not VORP-adjusted. No tier break detection. No roster construction signal. Sleeper's own projections can lag third-party consensus.

### The Gaps Corvus Can Exploit

| Gap | Corvus Advantage |
|---|---|
| No tool adjusts recommendations to *your roster shape in real time* | Corvus tracks live roster state and weights need by position |
| ADP is shown as static context, not a live signal | Corvus computes ADP deviation against actual pick position in this draft |
| Tier breaks are invisible in most UIs | Corvus surfaces explicit tier break alerts when a player is the last of their tier |
| LLM narration is generic and disconnected from math | Corvus LLM narrates *the VORP output* — it explains the number, not a ranking list |
| Platform adapters are fragmented — users need separate tools per platform | Corvus runs on Yahoo, Sleeper, and ESPN through unified adapters |

---

## 3. Feature Definition — Draft Assistant v1

Draft Assistant is a live pick recommendation panel that activates during a fantasy football draft session. When it is the user's turn to pick, it evaluates the available player pool against the user's current roster and the board state, then presents one primary recommendation with supporting signals.

Draft Assistant does not tell the user who will win. It tells the user who the disciplined pick is, and why, given the math.

The feature operates in three modes:

- **Pre-draft:** Confirm league settings, scoring format, and draft position. Fetch initial player pool and pre-compute baseline VORP values.
- **Live draft:** Receive pick-by-pick updates (own picks and opponent picks). Recompute recommendations after each pick.
- **Post-draft:** Display roster summary with overall construction grade and positional balance assessment.

---

## 4. Key Inputs

The recommendation engine requires the following inputs for each pick cycle:

### League and Format Inputs (set once at session start)
| Input | Description | Source |
|---|---|---|
| `league_id` | Platform league identifier | Platform adapter (Yahoo / Sleeper / ESPN) |
| `scoring_format` | PPR / half-PPR / standard + any custom modifiers | Platform adapter |
| `roster_slots` | Exact slot configuration (flex rules, superflex, TE premium, etc.) | Platform adapter |
| `draft_type` | Snake, auction, linear | Platform adapter |
| `team_count` | Number of teams in league | Platform adapter |
| `total_rounds` | Total rounds in draft | Platform adapter |

### Live Draft State Inputs (updated each pick)
| Input | Description | Source |
|---|---|---|
| `current_pick_number` | Overall pick number in the draft | Draft state tracker |
| `current_round` | Round number | Draft state tracker |
| `user_pick_position` | User's slot in the draft order | Set at session start |
| `picks_until_next_user_turn` | Picks remaining before user's next selection | Draft state tracker |
| `drafted_players` | Full list of all drafted players (all teams) | Draft state tracker |
| `user_roster` | Players the user has already drafted, by slot | Draft state tracker |
| `available_player_pool` | Remaining undrafted players with normalized shapes | Backend: normalized player shape model |

### Per-Player Signals (pre-computed, updated as board depletes)
| Signal | Description | Source |
|---|---|---|
| `vorp_score` | Value over replacement player, scoring-format adjusted | Existing VORP model |
| `position_scarcity_score` | Scarcity index for player's position given remaining pool | Existing position scarcity model |
| `consensus_adp` | Pre-season consensus ADP across FantasyPros / Underdog / NFFC | New: ADP data source (see Section 7) |
| `adp_deviation` | Difference between consensus ADP and current overall pick number | Computed live |
| `tier` | Positional tier (1–5 scale, pre-clustered before draft) | New: tier clustering on normalized player shape |
| `bye_week` | Player's bye week | Normalized player shape |
| `injury_status` | Current injury designation | Normalized player shape (ingested pre-draft) |

---

## 5. Key Outputs

For each pick opportunity, Draft Assistant surfaces three output components:

### 5.1 Primary Recommendation Card

```
[ CORVUS RECOMMENDS ]

Justin Jefferson — WR, MIN
VORP Score: 84.2   |   ADP Deviation: +3.1 picks (falling)
Tier: WR1 (2 remain at this tier)

"Jefferson is slipping 3 picks past his consensus value with two WR1s
still on the board. Your current roster has no WR above the WR2 tier.
Taking him here locks your receiving corps before the drop-off."
```

- **Player name, position, team** — clearly labeled
- **VORP score** — normalized 0–100 for the user's scoring format
- **ADP deviation** — number of picks the player has fallen past consensus ADP, with directional label (falling / rising / on target)
- **Tier label** — player's positional tier and count of players remaining in that tier
- **LLM narration** — 1–2 sentences generated by the backend LLM. Narrates *the math*: why the VORP and scarcity signals point to this pick given this specific roster. Not a generic description of the player.

### 5.2 Positional Need Indicator

A compact row of position badges showing the user's current roster construction and urgency level for each slot:

```
QB [--]   RB [OK]   WR [NEED]   TE [OK]   K [--]   DST [--]
```

- `[NEED]` = position is unfilled or weak relative to round expectations
- `[OK]` = position is adequately covered
- `[--]` = not yet required by roster construction strategy

Color-coded: NEED = amber, OK = muted green, -- = neutral gray.

### 5.3 Tier Break Alert

When the top-recommended player is the last player in their positional tier, a distinct alert badge displays above the primary card:

```
[ TIER BREAK ALERT ]
Jefferson is the last WR1 on the board.
After him: 14-pick gap to the next WR2 tier.
```

This is a hard signal, not soft narration. It tells the user there is a scarcity cliff at this position and they should understand the cost of passing.

### 5.4 Alternative Picks (collapsed by default)

Up to 2 alternative picks ranked by adjusted VORP, presented in a collapsed accordion. Each shows player name, position, VORP score, and a single-sentence rationale. This keeps the primary card dominant while allowing the user to explore alternatives without cognitive overload.

---

## 6. Mapping to Existing Corvus Infrastructure

| Draft Assistant Need | Existing Corvus Asset | Notes |
|---|---|---|
| Scoring-format-adjusted player value | VORP model | Already built. Draft Assistant passes scoring format at session init; VORP returns adjusted scores. No model changes needed. |
| Position scarcity signal | Position scarcity scoring model | Already built. Wire to available player pool snapshot updated after each pick. |
| Consistent player data shape across platforms | Normalized player shape | Already built. Draft Assistant consumes this shape directly — ADP and tier fields added to the shape schema. |
| Yahoo / Sleeper / ESPN draft state | Platform adapters | Adapters already handle auth and data normalization. Need to extend each adapter to expose live draft pick stream (see Section 7). |
| LLM narration | Backend LLM (Hostinger KVM2) | LLM receives VORP output, scarcity signal, roster state, and ADP deviation. Returns 1–2 sentence narration. LLM does not replace product logic — it narrates the math. Prompt template owned by Codex. |

---

## 7. What Needs to Be Built New

### 7.1 ADP Data Source
**Owner: Codex**

Corvus does not currently ingest ADP data. Draft Assistant requires consensus ADP for each player to compute deviation signals.

Requirements:
- Pre-season ADP snapshot sourced from at least 2 of: FantasyPros consensus, Underdog ADP, NFFC ADP
- Stored in the normalized player shape as `consensus_adp` (overall pick number)
- Refreshed daily from early July through draft season (late August / early September)
- Scoring-format variants required: standard, half-PPR, PPR (some ADP sources provide separate tables)
- Fallback: if ADP is unavailable for a player, suppress the ADP deviation signal and rely on VORP + scarcity alone

**Frontend request to Codex:** Expose ADP deviation as a computed field on the recommendation response payload, not raw ADP. Front end should receive `adp_deviation` (integer, positive = falling, negative = rising) and `adp_label` (string: "falling" / "rising" / "on target" with a ±2 pick dead zone).

### 7.2 Positional Tier Clustering
**Owner: Codex**

Player tiers need to be pre-computed before the draft and updated as the board depletes.

Requirements:
- Cluster players by position into 5 tiers using VORP score breakpoints (not rankings)
- Tiers computed per scoring format
- After each pick, recalculate `tiers_remaining` count for each position-tier combination
- Expose `tier` (1–5), `tier_label` (e.g., "WR1"), and `tier_remaining_count` on each player in the available pool response

### 7.3 Draft State Tracker
**Owner: Codex**

A live session manager that tracks the full state of an active draft.

Requirements:
- Session created when user initiates a draft on a connected platform
- Ingests pick stream from platform adapter (one event per pick made by any team)
- Maintains: `drafted_players`, `user_roster` (by slot), `current_pick_number`, `current_round`, `picks_until_next_user_turn`
- State stored in-memory for active sessions (Redis or equivalent); no long-term persistence required in v1
- Exposes state via internal API consumed by the recommendation engine

### 7.4 Live Pick Recommendations Endpoint
**Owner: Codex**

A new API endpoint that the front end polls (or subscribes to) during the draft.

```
POST /api/corvus/draft/recommend

Request body:
{
  "session_id": "string",
  "pick_number": "integer"
}

Response:
{
  "recommended_player": {
    "player_id": "string",
    "name": "string",
    "position": "string",
    "team": "string",
    "vorp_score": "float",
    "adp_deviation": "integer",
    "adp_label": "string",
    "tier": "integer",
    "tier_label": "string",
    "tier_remaining_count": "integer",
    "narration": "string"
  },
  "positional_needs": {
    "QB": "need" | "ok" | "none",
    "RB": "need" | "ok" | "none",
    "WR": "need" | "ok" | "none",
    "TE": "need" | "ok" | "none",
    "K": "need" | "ok" | "none",
    "DST": "need" | "ok" | "none"
  },
  "tier_break_alert": {
    "active": "boolean",
    "position": "string",
    "tier_label": "string",
    "gap_to_next_tier_picks": "integer"
  },
  "alternatives": [
    {
      "player_id": "string",
      "name": "string",
      "position": "string",
      "vorp_score": "float",
      "rationale": "string"
    }
  ]
}
```

Latency target: recommendation response under 3 seconds from pick event. LLM narration generation is the likely bottleneck — Codex should stream or pre-generate narration if needed.

### 7.5 Draft Platform Adapter Extensions
**Owner: Codex**

Each existing platform adapter (Yahoo, Sleeper, ESPN) needs to be extended to stream live draft pick events.

- Sleeper: WebSocket connection to Sleeper's real-time draft API
- ESPN: Polling ESPN's draft endpoint (no public WebSocket available; 15–30 second polling acceptable)
- Yahoo: Yahoo's draft API supports push events; adapter needs to handle YDN authentication during draft

---

## 8. MVP Scope vs. Future Enhancements

### MVP (v1 — Target: August 2026 draft season)

- Live recommendation for snake drafts only
- Yahoo, Sleeper, ESPN platform support
- PPR, half-PPR, and standard scoring formats
- Primary recommendation card with VORP, ADP deviation, and LLM narration
- Positional need indicator
- Tier break alert
- 2 alternative picks (collapsed)
- Session lifecycle: start, active, complete
- Mobile-responsive layout (primary use case is phone during in-person draft)
- Mock data mode for onboarding and demo flows (no live draft session required)

### Out of Scope for MVP

- Auction draft support
- Superflex / 2QB league support
- Keeper / dynasty league context
- Trade-up / trade-down recommendations during draft
- Opponent roster modeling (predicting what other teams will draft)
- Injury news ingestion during a live draft
- Draft recap export / shareable summary
- Notification push when it is the user's turn (requires native app)
- Historical draft grade benchmarking

### v2 Enhancements (post-2026 season)

- Opponent roster modeling: predict what positions competitors need to forecast which players will be gone by the user's next pick
- Auction draft support with budget-adjusted VORP
- Superflex support with QB premium modeling
- Real-time injury news ingestion mid-draft
- Shareable post-draft card with roster grade
- Draft recap: pick-by-pick replay with Corvus retrospective assessment
- Mobile app push notification: "Your pick is in 3 selections"

---

## 9. Success Metrics

### Adoption Metrics (measured at end of 2026 draft season)

| Metric | Target |
|---|---|
| Percentage of Corvus users who activate Draft Assistant for at least one draft | 40% |
| Average picks per Draft Assistant session (proxy for completion rate) | 14+ out of 15 rounds |
| Platform coverage: % of Draft Assistant sessions on each platform (Yahoo / Sleeper / ESPN) | Baseline — no target; used to prioritize v2 adapter work |

### Engagement Metrics

| Metric | Target |
|---|---|
| Tier break alert click-through rate (user taps alert to expand detail) | 30% |
| Alternative picks accordion open rate | 20% |
| Session abandonment rate before round 4 | Under 15% |

### Quality Metrics

| Metric | Target |
|---|---|
| Recommendation response latency (p95) | Under 3 seconds |
| Draft state desync rate (picks missed by tracker) | Under 2% of pick events |
| User-reported "recommendation made no sense" feedback rate | Under 5% of sessions |

### Business Metrics

| Metric | Target |
|---|---|
| Draft Assistant as a conversion event: % of Draft Assistant users who convert to paid tier within 30 days | Baseline in year 1 |
| Retention: 7-day return rate for users who completed a Draft Assistant session vs. those who did not | Expect positive delta; measure and report |

---

## 10. Open Questions for Justin

1. **Pricing / gating:** Is Draft Assistant a free feature (acquisition play) or a paid-tier feature (monetization play)? This affects how we gate the session start flow.
2. **Platform priority:** If adapter extensions run behind schedule, which platform ships first? Recommendation: Sleeper (cleanest WebSocket API), then Yahoo, then ESPN.
3. **Mock draft support:** Should Draft Assistant work in mock drafts (not just live drafts)? Sleeper and ESPN both support mock draft rooms. This dramatically expands testability and user onboarding.
4. **Brand voice for narration:** The LLM narration needs a prompt template that matches Corvus / Slops Saloon's omen-inspired voice. This is front-end copywriting territory — Claude to own the narration prompt framing; Codex owns the prompt engineering and LLM wiring.
5. **ADP source licensing:** Some ADP aggregators (FantasyPros) have terms of service restrictions on bulk data use. Codex to confirm which ADP sources are legally usable before implementation begins.

---

## 11. Handoff Notes

### Frontend to Backend Request
This spec is the triggering handoff document. Codex needs to begin work on the following items in priority order:

1. ADP data source ingestion pipeline (blocks tier break and deviation signals)
2. Draft state tracker (blocks all live recommendation work)
3. `/api/corvus/draft/recommend` endpoint (blocks front-end integration)
4. Platform adapter extensions (Yahoo and Sleeper first)
5. Tier clustering on VORP model output

Front end will build the Draft Assistant UI panel using mock data from the response schema defined in Section 7.4 and will integrate against the live endpoint once it is available.

### Frontend Ownership
- Draft Assistant panel component
- Recommendation card layout (primary + alternatives accordion)
- Positional need indicator component
- Tier break alert badge
- Session state UI (pre-draft setup flow, live state, post-draft summary)
- Loading and error states for recommendation latency and platform connection failures
- Mobile-first responsive layout
- Mock data harness for development and demo

---

*Missing files at time of writing: `context.md`, `roadmap.md`, `manifesto.md`, `handoffs/decisions.md`, `handoffs/backend-to-frontend.md`, `handoffs/frontend-to-backend.md`, `AGENT.md` — none found in project root. Spec written from provided context and CLAUDE.md.*
