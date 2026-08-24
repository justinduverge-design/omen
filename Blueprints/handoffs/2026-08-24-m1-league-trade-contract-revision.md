# Handoff — 2026-08-24 — M1-Screen-League + M1-Screen-Trade (revised contracts)

**Branch:** `feat/m1-trade-contract-revision` — 3 commits.
**Updated 2026-08-24, later same session — MERGED AND DEPLOYED.** Merged at founder instruction as PR [#364](https://github.com/justinduverge-design/omen/pull/364) (`0694a03`). `deploy.yml` runs on push to `main`, so the merge shipped the backend to production; the Hostinger KVM1 run completed `success` (quality + build + deploy). Verified live against `https://slopssaloon.com/api/trade/compare`: `contract_version: trade-compare.v2`, `verdict_state: close_needs_context` on the neutral case, `insufficient_data` with correct counts on a missing projection, and `unavailable_reason: unauthenticated` returning **200** rather than 401.

**Still NOT ratified.** Merging is not ratification: both sprint items remain `VERIFIED` (not `CLOSED`), every Figma frame keeps its `REVISED PROPOSAL — AWAITING FOUNDER APPROVAL` badge, and `M5` slices F and G stay blocked. The personalized path is inert in production until a client sends `league_context` with a session, which none does yet.

*This paragraph exists because the line above it originally read "Not merged. Not deployed." and was true for about twenty minutes. `Direction/current_sprint.md` records the same failure on 2026-08-16 — a record that still said "Not pushed, merged, or deployed" after the work had merged.*
**Figma writes are live** in `mWjrAKPi4JSIP5lAmGAtB3` (Figma has no unpushed state). Every new frame is badged `REVISED PROPOSAL — AWAITING FOUNDER APPROVAL — 2026-08-24`.

Both 2026-08-16 contracts were rejected on 2026-08-22. This package answers both rejections. `M5` slices F and G stay blocked.

## The finding that shaped both halves

**Neither rejection needed new data. Both capabilities were already in this repo, unused.**

| Rejected for | What was actually already running |
|---|---|
| League drew no matchup at all | `fetchSleeperMatchups()` (`src/adapters/sleeper.js:357`) and ESPN's `mMatchup` view (`src/adapters/espn.js:621`) — both reduced to a single win/loss letter for the Command Center, with both sides, both scores, and both rosters discarded |
| Trade deferred personalization | `compareTrade()` has always taken a `scoringConfig` third argument carrying `league_scarcity_weights` and roster slots. The route never passed one, so "Personalize" could only ever have meant a scoring-format label |

The 2026-08-16 pass asked *"is there a feed for this?"*, got a truthful **no**, and stopped. The answerable question was *"what does the code we already run actually return?"*

## M1-Screen-League

**Ratification was pre-authorized on 2026-08-22** subject to this evidence.

### The activity finding

"Meaningful league activity" is not one feed — visual briefs §2.4 names three signal families with very different costs:

| Family | Source | Cost |
|---|---|---|
| **Standings signals** — tied at the cut line, cut-line proximity | already-shipped `league-standings.v1` | **zero new provider calls** |
| **Deadline signals** — trade deadline, playoff start | a field on the league object already fetched | one field read |
| **Transaction signals** — waivers, trades | new integration per provider | genuinely not built |

A v1 panel built on the first two is factual, provider-backed, and non-empty for the ordinary in-season case. **The empty state survives — as the truthful thing shown when a real feed has nothing to report, which is what an empty state is for, rather than as the approved primary experience.**

### Delivered

- **`Blueprints/specs/mobile/m1-league-screen-data-plan-v1.md`** — the §2.5 gate-1 provider capability matrix (Sleeper / ESPN / Yahoo across standings, matchup, projections, each activity family); additive `GET /api/league/overview` → `league-overview.v1` with **independent per-section `status`** so one dead provider call degrades one section rather than blanking the destination; deterministic v1 activity derivation rules; four-step implementation sequence.
- **Figma** — iOS Primary `95:2` / Alternate `96:2`; Android Primary `95:35` / Alternate `96:32`.
  - **Primary (v2)** is complete: context strip, live **Matchup Spine** with one What to Watch signal, Playoff Picture, rank table, **populated** Around the League, and an explicit coverage disclosure naming waiver/trade activity as not yet available.
  - **Alternate (v2)** carries the honest degraded states: no matchup, off-season by clean omission, genuinely empty activity, provider unavailable (Yahoo), refresh delayed, demo, section independence.
- 2026-08-16 frames `30:162` / `30:181` / `30:194` / `30:213` annotated **SUPERSEDED**, not deleted. QA record `88:2` extended.

`GET /api/league/standings` is **unchanged** — M5 slice C consumes it and must not be disturbed. No schema change, migration, or production action is proposed. **No Draft entry** (facts-of-record #9).

## M1-Screen-Trade

**Ratification was NOT pre-authorized.** Backend and design shipped as one batch, as required.

### Neutral-first was not the defect

§8.1 — public-first, neutral by default, optionally personalized — is founder-approved from 2026-07-20 and is **unchanged**. The rejection was that the *personalized half* was deferred. Reading those as the same thing would have quietly overturned a standing approval while claiming to satisfy a rejection.

### What personalization actually does now

`POST /api/trade/compare` accepts an optional `league_context`. It is a **request** for personalization, never the data: a client may name which connected league to use, but roster, scoring rules, and settings are read server-side from the caller's own stored connection.

Three real inputs move the numbers (`src/services/tradeLeagueContext.js`):

1. **Scoring format** read from the provider's own settings, not the client's label.
2. **Roster construction** — a league starting three WRs drains the WR pool deeper than one starting two, so the replacement baseline drops and every WR gains value. Bounded to ±35%.
3. **The caller's own positional depth** — an incoming RB is worth less to a manager already four deep at RB.

These are expressed as the `league_scarcity_weights` rows `compareTrade()` already consumed, so **the comparison engine itself is unchanged**.

### Demonstrated, not asserted

| Check | Result |
|---|---|
| One identical offer (send RB 13.0, receive WR 14.0), neutral vs personalized in a 3-WR league | `close_needs_context` → **`favors_you`** |
| Two *different* league shapes, both reporting `mode: "personalized"` | two different `net_value`s — so the difference is **the league**, not the mode flag |
| Roster depth varied with league shape held constant | `combined_score` moves |
| Client sends `scoring_format: "ppr"` for a `standard` league | response is `standard` — the provider wins |

### Four verdict states, server-owned

`verdict_state`: `favors_you` · `close_needs_context` · `you_give_up_too_much` · `insufficient_data`. Derived from an additive `contract_version` (`trade-compare.v2`) plus an `evaluability` signal computed from the `missing_projection_count` the engine already emitted — exactly the founder decision of 2026-08-16. Any missing projection yields `insufficient_data` rather than a forced verdict (§9.4), and it **survives personalization** — real context cannot invent a projection.

**Additive throughout:** `verdict` is unchanged and still emits `accept`/`decline`/`neutral`, so the free web Trade Analyzer and `trade-share.v1` snapshots are untouched. Where the two disagree, `verdict_state` wins, and that precedence is written into `api-routes.md` rather than left for a client to guess.

### Honest fallback

`unauthenticated` · `no_connected_league` · `provider_unsupported` · `league_context_unavailable` each return a normal **200 with neutral analysis** and a named reason. Asking to personalize without a session is a downgrade, **not a 401** — Trade stays free and public.

**Yahoo is never offered as a personalization source** while its API is refused (facts-of-record #11, issue [#308](https://github.com/justinduverge-design/omen/issues/308)). **ESPN** has the data but its credential path lacks its own provider proof, so it resolves to `provider_unsupported` and is named rather than faked. **Only Sleeper personalizes today.**

### Figma

iOS builder `98:2` / `98:29`, verdict `99:2` / `99:29`; Android builder `98:53` / `98:80`, verdict `99:53` / `99:80`. Eight 2026-08-16 frames annotated **SUPERSEDED**. QA record `87:2` extended.

## Verification

- **`npm test` 651/651**, 0 failures. Baseline **618** established on `main` *before* any change and re-confirmed in the isolated worktree; +33 new.
- `node scripts/check-sprint-staleness.js` — see the run block below.
- No package file touched, no dependency added, no SQL applied, no migration, no deploy, no secret read.

## What is NOT proven

- **No live provider call was made.** The Trade maths is proven against deterministic fixtures, not a real Sleeper league. The League capability matrix marks **four rows ⚠️ unverified** — ESPN per-side projection shape, and the deadline field name/shape for both Sleeper and ESPN. Each needs §2.5 gate-5 provider proof before its capability is claimed on a shipped screen.
- **No implementation.** `M5` slices F and G were not started and must not be.
- **No rendered app UI.** These are screen contracts; Design Done gates 3 and 7 cannot be satisfied at contract stage and are annotated in `LEDGER.md` rather than skipped silently.
- **Nothing is ratified.** Every frame keeps its `REVISED PROPOSAL` badge.
- **No component was created, renamed, or published**, no token invented, no competitor layout, asset, or copy reproduced.

## Process note — a shared checkout is not safe with two agents live

Mid-session, another agent was working in this same working directory on A6/A7 football-data. One commit (`4bf00fa`, *"thus might belong to another branch maybr a7?"*) captured its work interleaved with this work, and my in-progress files were twice carried onto a branch I had not selected.

The remedy was an isolated **`git worktree`**, which is the only mechanism that actually prevents two concurrent sessions from clobbering each other's uncommitted files. `4bf00fa` is left untouched for its owner to sort out; this branch was re-cut from `d9d0440`.

**Nothing in the loop docs tells an agent to check whether it is alone in the tree.** An unfamiliar file in `git status` is currently the only signal. That should be a kickoff step.
