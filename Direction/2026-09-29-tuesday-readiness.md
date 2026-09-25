# Tuesday (2026-09-29) readiness — gaps, plan, and status

**Written:** 2026-09-24. **Target:** a TestFlight build Justin can push to his own phone and
present, archived and pushed by Justin on Tuesday.

**Closed out 2026-09-24: all 11 reachability findings resolved (0 remaining), Trade works on
all three providers, LLM reasoning gap corrected (was already live, not a stub).** Merged and
pushed to `origin/main` at `c8020dc4`, verified post-merge: 1175 backend tests, 332 Android
tests, iOS binary built clean, reachability at zero. **Still open, carried to the next
conversation on this thread:** team-switch-lag profiling (lead found, not fixed), #340
Command Center contrast (small, optional), `CURRENT_PROJECT_VERSION` bump before archiving.

This is a live tracking document, not a handoff. Update item status in place as work lands.
Sourced from `node scripts/check-screen-reachability.mjs` and direct code inspection on
`main` (`dbd30b97` at time of writing) — not from memory of what earlier sessions reported.

---

## 1. Canvas-to-code reachability gaps — 7 screens, 11 findings

All six journeys (J1–J6) and chrome (Account, ReportPill) are built, merged, and verified on
`main`. These seven screens exist, render correctly to their artboards, and photograph
cleanly in screenshot scenarios — but nothing in production navigation can reach them. A
screenshot is not evidence of a route. `check-screen-reachability.mjs` is the mechanical
check; the list below is its current output, unchanged since the chrome merge.

| # | Screen | Platform(s) | Why it's unreachable | Tuesday plan |
|---|---|---|---|---|
| 1 | `OmenCommandQuietScreen` | iOS + Android | No client slice for `quiet-week.v1` — the screen exists, nothing calls the route that would select it | Wire the client read; server predicate already exists (`quiet-week.v1`, done 2026-09-14) |
| 2 | `OmenConnectFailedScreen` | Android only | `ConnectFailure` is a plain enum with no diagnostic payload; iOS's equivalent already carries status/league/time | Promote to a sealed class carrying the diagnostic, mirroring iOS |
| 3 | `OmenStartSitScreen` | iOS + Android | Carried over from J3; never wired into the Omen destination | Wire into production Omen screen routing |
| 4 | `OmenTradeBuildScreen` | iOS + Android | No opponent-roster read to populate a real trade partner | See §2, Trade gaps |
| 5 | `OmenTradeRosterScreen` | iOS + Android | Same root cause as #4 | See §2 |
| 6 | `OmenTradeShareScreen` | iOS + Android | No native client call to the existing `POST /api/trade/share` route | See §2 — this one is cheap |

**Rule that stays in force while closing these:** never invent state to make a screen
reachable. `ConnectFailed` cannot be wired with a fabricated status; `TradeBuild`/`TradeRoster`
cannot be wired with a fake roster. Where a provider genuinely can't supply the read, the
screen renders the honest "not available for this provider" state this app already uses
everywhere else (`waiver_system: not_determined`, `three_team.supported: false`) — it does not
stay silently unreachable, and it does not lie.

**Not in scope for Tuesday, flagged so it isn't silently dropped:**
- `move-detail.v2` still doesn't carry historical band/risk/reasoning (contract gap, not a
  reachability gap — the screen is reachable, it's just thinner than its artboard).
- `BE-OmenBriefFalsifier` (P2) — `what_could_change_this` absent from the Omen brief.

---

## 2. Trade gaps — the demo centerpiece

Justin: *"If you're telling me all the pages are done, all the screens are done, then trade
has to be in there for Tuesday."* Agreed — this is now a hard requirement, not a stretch item.

### What's actually missing, traced to the data layer

**Revised 2026-09-24 (founder): ESPN and Yahoo must become available too, not fall back to
an honest-unavailable state.** Checked before committing to this — none of the three
providers need new integration built from scratch. Each capability already exists in some
form and needs extending, not building:

- **Sleeper** — `buildTradeCandidateForConnection` in `src/services/omen.js` already calls
  `sleeperAdapter.fetchSleeperLeagueRosters`, a working, proven read of every team's roster.
  Gated `if (connection.platform !== "sleeper") return null;` — the gate is the only thing
  stopping the other two, not a missing capability.
- **ESPN** — `fetchEspnMatchup` (`src/adapters/espn.js`) already requests `mMatchup` +
  `mMatchupScore` views, and ESPN returns the **whole league's schedule with every team's
  roster embedded** in `data.schedule` — not just the current matchup's two sides.
  `matchupFromEspnSchedule` currently extracts only the user's own matchup. Needs a sibling
  normalizer that walks the full schedule and returns every team, reusing the same
  authenticated call and the same session — no new ESPN surface, no new auth.
- **Yahoo** — `GET /team/{teamKey}/roster` (`src/services/yahoo.js:346`) already accepts an
  arbitrary team key, not just the caller's own. The full team-key list is already parsed
  from standings elsewhere in the same file (`league.standings[0].teams`, line 400). Needs
  composing the two calls that already work, not a new endpoint.

**Still real work**: per-provider response shapes differ, each needs its own normalizer and
fixture tests, and ESPN in particular gets careful treatment per this project's standing
fragility posture — but this is extension of three already-authenticated, already-working
reads, not new provider integration. Revised risk: moderate, not high.

**`TradeShare` is not a data gap at all.** `POST /api/trade/share` → `trade-share.v1` already
works server-side: 30-day hash, no auth, no provider data, names off by default. The only
thing missing is a native client that calls it. Low risk, fast.

**`TradeBuild`/`TradeRoster` need the same opponent-roster read** as the fix above — picking
a real trade partner and seeing their actual roster is the same capability.

### The plan

1. Expose the existing, proven Sleeper roster logic as a real route (reusing
   `fetchSleeperLeagueRosters`, not writing new provider integration).
2. Wire `TradeBuild` and `TradeRoster` on both platforms to call it.
3. Wire `TradeShare` on both platforms to the existing share route — independent of #1/#2,
   can happen in parallel.
4. **Revised**: extend `fetchEspnMatchup`'s schedule-walk and Yahoo's roster-by-team-key call to
   cover every team in the league, not just the caller's own — same shape as the Sleeper route,
   three provider-specific normalizers behind one route.
5. Only if a specific provider genuinely cannot supply this in time does it fall back to the
   honest-unavailable state — that is now the exception path, not the default, and needs a
   named reason if used.

---

## 3. UI/UX gaps — polish and presentation readiness

These affect how the app looks and feels to a real tester, separate from what's reachable.

| Item | Status | Tuesday call |
|---|---|---|
| **#340 — Command Center contrast** | Real, reproducing failure, confirmed by unmasking the `XCTExpectFailure` and running the audit | Small, scoped fix — in scope if time allows |
| **#338 — App-wide Dynamic Type audit blindness** | Real. **Already attempted once this week and reverted** — `Font.custom` clears the audit finding but breaks layout, because Wix Madefor's weight is only reachable via a `UIFontDescriptor` variation axis that `Font.custom` can't carry. A real fix needs font-instance registration, not a one-line swap. Full writeup in `Direction/known_issues.md`, entry dated 2026-09-19/20 | **Out of scope for Tuesday.** Re-attempting under deadline pressure is how the ramp goes flat again, silently — the file's own header already documents that exact failure shipping once. Text does scale correctly at runtime; this is audit visibility, not a user-facing break |
| **`Brand/brand-system.md` §7** | Stale — still shows the retired numeric-confidence example (`"74 — Medium-High Confidence"`), which fact-of-record #16 replaced with a confidence band | Trivial doc fix, low priority, can ride along with anything else touching that file |
| **Build/archive readiness** | `CURRENT_PROJECT_VERSION` is still `6` in `project.pbxproj`, dated to the Sep 11 archive — before any of this week's work. Release-config archive dry-run **succeeded** on current `main` (verified, not assumed) | Bump the version number before Justin archives Tuesday; otherwise unchanged |

---

## 4. Also agreed, tracked separately, not blocking Tuesday's UI work

- **LLM reasoning wiring — corrected 2026-09-24, was already built, not a stub.** My original
  read found two `signal("stub", ...)` sites in `services/omen.js` and stopped there without
  checking whether a downstream path overrides them — it does. `explainOmenMvpMove` in
  `src/services/llm.js` (shipped `a37211e8`, 2026-09-17) is a real, tested function calling
  Ollama's OpenAI-compatible chat API with a bounded timeout and strict output validation;
  `routes/omen.js`'s `enrichWithLlm()` wraps the live MVP call and sets `llm_reasoning` to
  `{status: "live", source: "ollama_gemma", ...}` on success or an honest `"unavailable"` on
  timeout — never falsely `"live"`. Both native clients already request it
  (`include_signals.llm_reasoning: true`). **Verified live in production**, `GET
  /api/ready` → `llm.status: "configured_private", model: "gemma3:4b"`.
  **What that status does NOT prove**: `configured_private` is a hostname-shape check
  (`src/services/llm.js:126` — is `LLM_BASE_URL` a private address), not a live reachability
  probe. Whether a real Omen call right now actually reaches the AI VPS and gets real
  reasoning back is unverified from here — needs a real authenticated Omen call to confirm,
  cheapest done when Justin tests the app on his phone. The two stale stub-copy sites were
  corrected (`tue/gemma`, `f5e8f9dc`) without changing their `status`/`source` fields, since
  they're pre-attempt defaults, not the path a live user hits on success.
- **Team-switch lag** — lead found (`POST /api/leagues/active` makes two serial provider
  calls before responding, then signals a 5-surface client refresh). Not yet profiled to a
  confirmed fix.
- **Real football data (snap counts, route participation)** — both verified available for
  free via nflverse (`snap_counts` and `pbp_participation` releases respectively), same
  ingestion shape the pipeline already uses. Scoped, not started.

---

## Working agreement

Work streams below are parallel-safe (separate files, separate platforms where noted) and
will run in isolated worktrees, same discipline as the journey builds — no shared checkouts.
Each stream reports real test counts, not exit codes; nothing is marked done without a
production-reachability grep proving it.

---

## 5. Tuesday parallel track — football intelligence + canvas foundation

**Added 2026-09-25.** This is the architecture track that should inform the next canvas-to-code
conversation. It is parallel to the remaining presentation items above, but it must not be mixed into
the UI reachability checklist or treated as already-wired backend functionality.

### Current truth

Omen has a substantial A7B scoring-data pipeline (`src/services/footballData/`) with exact manifests,
scoring acceptance, staging/shadow, correction, recovery, and fail-closed production-readiness gates.
That system verifies fantasy scoring data. It is not yet the customer-supporting football-intelligence
system.

The football-intelligence kernel/research work defines Scheme DNA, System Signal, Coaching Tree, and a
bounded Ben Johnson proof, but the current product path still lacks:

- a persisted canonical football-fact store;
- a Supabase schema and RLS boundary for intelligence data;
- source-artifact and derived-artifact persistence;
- an ingestion/correction/supersession lifecycle;
- a versioned serving read model;
- an authenticated football-intelligence API route;
- a customer decision surface that consumes the signal.

Do not add a route, SQL migration, production schedule, or customer-facing “scheme label” until the
architecture gates below are complete.

### Stage A — football authority and storage architecture

Run in parallel with Stage C. Deliver and review:

1. Source matrix for `schedules`, `pbp_participation`, `ftn_charting`, and the first admitted Tier 1
   families: release identity, real columns, row grain, coverage, cadence, license, attribution,
   freshness, and allowed customer use.
2. Domain ownership map: source fact, canonical fact, feature, model output, evidence, and customer
   interpretation.
3. Storage ADR separating immutable raw/derived artifacts from compact Supabase serving data.
4. Versioning/correction contract: source release, retrieval time, source hash, schema fingerprint,
   derivation version, model version, effective interval, supersedes/replaces, stale/partial/disputed.
5. Identity/crosswalk design for nflverse, GSIS/PFR, provider IDs, teams, relocations, and coaches.
6. First customer contract and uncertainty language. Recommended first slice: coach-keyed transfer
   System Signal backed by Scheme DNA evidence, not a universal scheme taxonomy.

**Stage A gate:** no schema or route implementation until these artifacts agree and the storage boundary,
identity model, and first customer read are explicitly approved.

### Stage C — canvas/design-system foundation

Run in parallel with Stage A and feed the next canvas-to-code session:

1. Treat `design/native-visual-lock-2026-09-13/` as 32 artboards, not 30.
2. Add or explicitly exempt contracts for `LedgerDegraded` and `LedgerDetailDegraded`; currently there
   are 30 contracts for 32 artboards.
3. Correct stale 30-count references in `screen-journeys-v1.md`, the 2026-09-18 canvas handoff, and
   `capability-symbols-v1.md`.
4. Add an artboard/contract coverage checker for missing contracts, orphan contracts, duplicate IDs,
   missing artboards, and absent family/journey metadata.
5. Reconcile the three spacing authorities: web component scale, amended native registry scale, and
   canvas literals (`7`, `9`, `11`, `13`). Do not blind-replace values because fold/overflow behavior
   is part of the visual contract.
6. Reconcile the canvas/native typography narrative and fix the stale `OmenCall-v1.md` v2/v3 binding.
7. Add mechanical checks for iOS/Android spacing and typography parity, canvas raw font/spacing values,
   contract/API versions, 44pt/48dp hit-target requirements, Dynamic Type, long content, and horizontal
   overflow.
8. Decide and contract the quiet-week straight state before another broad canvas implementation run.

**Stage C gate:** a canvas-to-code agent must be able to prove one-to-one artboard/contract coverage and
one canonical token authority before writing native screen code.

### Stage B — backend implementation (after A/C review)

Implement in this order only after the gates pass:

```text
artifact registry
→ minimum canonical fact ingestion
→ identity/crosswalk dimensions
→ feature windows
→ Scheme DNA
→ System Signal
→ Coaching Tree
→ versioned serving read model
→ authenticated read-only API
→ one customer decision explanation
```

Keep this separate from the A7B scoring publisher. The first end-to-end slice should be:

```text
schedules + pbp_participation + ftn_charting
→ team/coach-season facts
→ Scheme DNA
→ coach-transfer System Signal
→ persisted evidence/read model
→ API
→ one existing Omen explanation block
```

### Tuesday stop conditions

- A/C architecture or token authority is unresolved: stop and record the decision; do not infer.
- A screen has no contract or a contract has no artboard: stop the canvas run for that screen.
- A source lacks row-grain, rights, freshness, or correction semantics: do not ingest it.
- A football-intelligence value cannot identify whether it is confirmed, derived, inferred, stale, or
  unavailable: do not expose it to a customer.
- A production backend change would require SQL, secrets, schedules, or a new package before the
  architecture review: keep it in the plan branch and do not wire it.

### Durable source of truth

The full staged plan is in
`Direction/reviews/2026-09-25-football-intelligence-and-canvas-implementation-plan.md`.
The next implementation session should start with Stage A and Stage C, in isolated worktrees, and should
not re-discover or re-litigate this sequence from conversation history.

### Execution status — 2026-09-25

- **Stage A:** active in an isolated worktree. The architecture package is being written from the current
  source, Supabase, route, cron, and production-readiness seams. No SQL, route, package, schedule, or host
  mutation is authorized in this pass.
- **Stage C:** active in an isolated worktree. The first mechanical artboard/contract coverage guard and
  evidence-safe documentation corrections are being implemented. Missing degraded contracts remain a
  deliberate review item until their source/state requirements are fully known.
- **Stage B:** not started; blocked by the A/C gates by design.
- **Stage D:** not started; blocked on a real serving API and customer contract.

When this conversation or context window ends, the next agent should pick up by reading this section and
the full plan named above, then inspect the two active stream commits before starting new work. Do not redo
the inventory, create a second competing schema, or wire a route from the fixture kernel alone.
