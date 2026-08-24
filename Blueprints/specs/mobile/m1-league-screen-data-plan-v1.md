# M1 League Screen — Backend Data Plan v1

**Status:** PROPOSAL — awaiting founder ratification
**Date:** 2026-08-24
**Owner:** Backend lane + design steward
**Supersedes:** nothing. Adds the backend-data half the 2026-08-22 rejection required of `M1-Screen-League`.
**Authority above this document:** `omen-mobile-visual-briefs-v1.md` §1.2, §1.6, §2.3, §2.4, §2.5, §14 (founder-approved 2026-07-20). Where this plan and a brief disagree, the brief wins and this plan is the defect.

## 0. Why this document exists

The 2026-08-16 League contract was rejected on 2026-08-22 because its primary state was **standings plus an empty activity area**, which is not a complete League destination. The founder required "a backend-data plan plus revised iOS and Android contracts demonstrating a complete matchup view, standings, and meaningful league activity."

The 2026-08-16 pass reached its conclusion honestly — it checked for a league-activity feed, found none, and refused to draw one. What it did **not** do is ask the next question: *is "league activity" one feed, or several?* This plan answers that, and the answer changes the outcome.

**Two findings drive everything below.**

1. **The matchup view was never missing.** The flow is named "League matchup + standings/activity", and the rejected primary frame contains no matchup block at all. But the matchup data ships today on two of three providers, already inside this repo — `fetchSleeperMatchups()` (`src/adapters/sleeper.js:357`) and ESPN's `mMatchup` view, already fetched by `fetchEspnLastResult()` (`src/adapters/espn.js:621`). Both are reduced to a single win/loss letter for the Command Center's `lastResult` field, and everything else in the payload — both sides, both scores, both rosters — is discarded. **The matchup half of this screen needs a route, not an integration.**

2. **"Meaningful league activity" is three signal families, not one feed.** Visual briefs §2.4 lists waiver claims, completed trades, playoff-line changes, and verified league deadlines. Those have completely different data sources and completely different costs. The 2026-08-16 pass treated them as one missing feed and concluded the whole section must be empty. In fact **one of the three families is derivable from data that already ships**, with zero new provider calls:

   | Family | Source | Status today |
   |---|---|---|
   | **Standings signals** — tied for the final playoff spot, moved into/out of a playoff place, cut-line proximity | `league-standings.v1`, already shipped | **Derivable now.** No new provider call. |
   | **Deadline signals** — trade deadline, playoff start | league settings object, already fetched by `fetchSleeperLeague()` | **One field read.** Already in the response, never parsed. |
   | **Transaction signals** — waivers, trades | new provider integration | **Not built.** Sleeper and ESPN both expose it; Yahoo is refused. |

   A v1 activity panel built on the first two families is **factual, provider-backed, and non-empty for the ordinary in-season case** — while the third family remains honestly absent until it is built. That is the difference between "an empty panel is our approved experience" and "our activity panel shows what we can actually verify."

## 1. Provider capability matrix

Required by visual briefs §2.5 gate 1 ("what Sleeper, Yahoo, and ESPN can reliably provide for this exact feature"). **No global parity claim is made from any single provider** (§2.5 gate 5).

| Capability | Sleeper | ESPN | Yahoo |
|---|---|---|---|
| **Standings** | ✅ Shipped — `fetchSleeperStandings()` | ✅ Shipped — `buildLeagueStandings()` | ⛔ Code exists (`getLeagueStandings()`); every call returns 403 |
| **Matchup — both sides, scores** | ✅ Adapter shipped, unexposed — `fetchSleeperMatchups()` | ✅ View already fetched, discarded — `mMatchup` | ⛔ Refused |
| **Matchup — per-side projections** | ✅ `fetchSleeperProjections()` shipped | ⚠️ ESPN returns projected totals in the same view; **shape unverified** | ⛔ Refused |
| **Activity — standings signals** | ✅ Derivable from shipped standings | ✅ Derivable from shipped standings | ⛔ No standings to derive from |
| **Activity — deadlines** | ⚠️ In the shipped league object; **field names unverified** | ⚠️ In league settings; **unverified** | ⛔ Refused |
| **Activity — waivers/trades** | ❌ Not built. Provider exposes a transactions endpoint | ❌ Not built. Provider exposes a transactions view | ⛔ Refused |

**Yahoo is not a degraded provider on this screen — it is an unavailable one.** Facts-of-record #11: Yahoo Fantasy API access is refused at the app-entitlement level, verified live, issue [#308](https://github.com/justinduverge-design/omen/issues/308) open, escalation due ~2026-08-28. A Yahoo-only user reaches **every** state on this screen through the provider-unavailable path. That is a real state the contract must draw, not an edge case.

**⚠️ rows are unverified and are the honest limit of this plan.** They were read from code that already runs, but the specific field is not parsed anywhere in `src/`, so its name and shape are inferred from surrounding usage rather than observed. No live provider call was made in producing this document. Per §2.5 gate 5, **every ⚠️ row requires provider-specific live-data proof before the capability is claimed in a shipped screen** — and any of them failing that proof degrades one section, never the screen.

## 2. Proposed route — `GET /api/league/overview`

**Additive. `GET /api/league/standings` is unchanged and keeps its contract** — the Command Center context strip (M5 slice C) already consumes it and must not be disturbed.

- **Contract:** `league-overview.v1`
- **Auth:** required (same posture as `/api/league/standings`)
- **Query:** `platform`, `leagueId` — both optional, same selection semantics as `/standings`
- **Errors:** reuse `league-standings-error.v1` verbatim. Same codes, same recovery actions; the native error path is already built.

### Response shape

```jsonc
{
  "contract_version": "league-overview.v1",
  "generated_at": "2026-09-15T14:02:11.000Z",
  "platform": "sleeper",
  "league_id": "1234567890",
  "league_name": "Dynasty Dogs",
  "season": 2026,
  "week": 3,

  "matchup": {
    "status": "live",           // pregame | live | final | no_matchup | unavailable
    "you":      { "team_id": "4", "team_name": "Justin Titans",  "record": "6-1", "points": 64.8,  "projected": 119.6 },
    "opponent": { "team_id": "7", "team_name": "Marcus's Team",  "record": "5-2", "points": 58.1,  "projected": 114.2 },
    "what_to_watch": {
      "text": "Projected within 5.4 points.",
      "kind": "margin"          // margin | players_remaining | lineup_risk
    },
    "unavailable_reason": null  // set only when status is unavailable
  },

  "standings": {
    "status": "available",      // available | off_season | unavailable
    "playoff_picture": {
      "rank": 3, "team_count": 12,
      "line": "3rd of 12 · Currently in a playoff spot",
      "cut_line_note": "2 games clear of the cut line",   // null when playoff settings unknown
      "settings_known": true
    },
    "teams": [ /* league-standings.v1 rows, unchanged and unreordered */ ]
  },

  "activity": {
    "status": "available",      // available | empty | partial | unavailable
    "unavailable_families": ["transactions"],   // named, never silently dropped
    "items": [
      { "category": "standings", "text": "Two teams are tied for the final playoff spot.", "source": "derived_standings" },
      { "category": "deadlines", "text": "Trade deadline is in 12 days.",                  "source": "league_settings" }
    ]
  }
}
```

### Rules the shape enforces

- **`status` is always explicit per section.** A section never infers health from whether its array is empty. This is the F9 rule — a renderable success must not mint a live signal nobody verified — applied at section granularity.
- **Sections fail independently.** A dead matchup call returns `matchup.status: "unavailable"` beside live standings. One provider hiccup must not blank the destination. This mirrors the existing per-connection fallback loop in `src/routes/league.js`.
- **`unavailable_families` is required whenever `activity.status` is `partial`.** The screen says *which* half is missing. "Standings available/activity partial → show standings and name unavailable activity portion" is a §14.3 requirement, and it cannot be satisfied by a client that was not told what is missing.
- **`items` is capped at three and grouped by category** (§14.2). The server enforces the cap; the client never trims.
- **Omen never reorders a league** (§14.1). `standings.teams` preserves provider rank exactly.
- **No probability, ever, in v1.** `playoff_picture` carries verified current position and, when settings are known, deterministic cut-line arithmetic. Likelihood stays behind §2.1's evidence gate.

## 3. Activity derivation rules — v1

Only these three signals ship in v1. Each is deterministic, checkable against the standings payload it came from, and carries no inference.

| Signal | Condition | Emitted text | Requires |
|---|---|---|---|
| Tied at the cut line | two or more teams have identical W-L at the playoff boundary | "Two teams are tied for the final playoff spot." | playoff team count known |
| Cut-line proximity | the user's team is within one game of the boundary, either side | "You are one game from the playoff cut line." | playoff team count known |
| Deadline approaching | trade deadline or playoff start is within 14 days | "Trade deadline is in 12 days." | deadline field verified for that provider |

**Explicitly not in v1** (§2.6 priority order puts them later, and each needs its own §2.5 evidence pass): clinch and elimination scenarios, playoff likelihood, points-for movement, rivalry/head-to-head history, and any waiver or trade transaction item.

**When no signal fires, the panel shows the approved empty line** — "No major league activity to flag right now." (§14.3). **This is the change the rejection demanded:** the empty state remains as a truthful state, but it is now the *exception* — what happens when a real feed has nothing to report — instead of the primary approved experience.

## 4. Implementation sequence

Each step is independently shippable and independently provable. **None of it is authorized by this document** — this is the plan the founder asked for, not a work order.

| Step | Work | Provider proof required |
|---|---|---|
| 1 | `GET /api/league/overview` with matchup + standings; activity returns `status: "empty"` | Sleeper and ESPN matchup live-read |
| 2 | Standings-derived activity signals | none — derived from a payload that already ships |
| 3 | Deadline signals | verify the settings field per provider (§1 ⚠️ rows) |
| 4 | Transaction signals (waivers/trades) | full new integration per provider; own §2.5 pass |

Steps 1–2 are what make the screen complete. Step 3 adds a signal family. Step 4 is the only one that is a genuine new integration, and the screen is already a complete destination without it.

## 5. What this plan does not do

- **It applies no schema change, no migration, and no production action.** No new table, column, or Supabase object is proposed; every input is a provider read or an existing payload.
- **It authorizes no implementation.** `M5` slice F stays blocked until the contracts are ratified.
- **It makes no Yahoo claim.** Yahoo remains refused; nothing here is contingent on the 2026-08-28 escalation succeeding, and nothing here is blocked by it failing.
- **It adds no Draft entry.** Draft is cut from 1.0 (facts-of-record #9); the destination carries no draft affordance.
- **It verified nothing against a live provider.** Every ⚠️ in §1 is an unproven inference and is marked as one.
