# Shipped and in flight

Generated 2026-10-03 from GitHub by `node scripts/shipped.js`. Merged PRs since 2026-08-01: **276**. Open: **5**. Do not edit by hand; rerun the script. Not part of the startup read.

## Open now

- #535 Stop paging on expected ESPN reconnects
- #536 process: review before the PR, Codex on request; shipped.md from GitHub
- #537 docs: database redo applied to production
- #538 chore: stop tracking dd/ (Xcode build output from #453)
- #541 harness: two-file cold start, archived sprint/inbox, cost report

## Shipped by area

| Area | Merged |
|---|---|
| CI and tooling | 42 |
| Native iOS | 38 |
| Other | 36 |
| Football data | 27 |
| Docs and process | 27 |
| Providers (ESPN / Yahoo / Sleeper) | 24 |
| Database | 16 |
| League Office (retired 2026-10-02) | 14 |
| Performance and background jobs | 11 |
| Trade Analyzer | 11 |
| Native Android | 11 |
| Identity and accounts | 10 |
| Security | 5 |
| Omen of the Week / Moves | 3 |
| Web app | 1 |

### CI and tooling (42)

- 2026-10-02 #506 chore(db): retire superseded schema files; sql/ split into applied, pending and the redo
- 2026-10-01 #498 ci: make the contract drift check blocking (PR gate and deploy gate)
- 2026-09-28 #476 chore(deps): bump the production-dependencies group with 4 updates
- 2026-09-28 #475 chore(deps): bump the frontend-runtime group in /frontend with 2 updates
- 2026-09-21 #458 chore(deps-dev): bump autoprefixer from 10.5.6 to 10.6.1 in /frontend in the frontend-tooling group
- 2026-09-21 #457 chore(deps): bump the frontend-runtime group in /frontend with 2 updates
- 2026-09-21 #456 chore(deps-dev): bump playwright-core from 1.49.1 to 1.63.0 in the development-tooling group
- 2026-09-21 #455 chore(deps): bump the production-dependencies group with 3 updates
- 2026-09-14 #437 chore(deps-dev): bump autoprefixer from 10.5.4 to 10.5.6 in /frontend in the frontend-tooling group
- 2026-09-14 #436 chore(deps-dev): bump impeccable from 3.6.1 to 4.1.0 in the development-tooling group
- 2026-09-14 #435 chore(deps): bump the frontend-runtime group in /frontend with 4 updates
- 2026-09-14 #434 chore(deps): bump the production-dependencies group with 4 updates
- 2026-09-14 #433 chore(deps): bump actions/setup-java from 4 to 6
- 2026-09-09 #417 chore(deps-dev): bump impeccable from 3.6.0 to 3.6.1 in the development-tooling group
- 2026-09-09 #416 chore(deps): bump the production-dependencies group with 6 updates
- 2026-09-07 #415 chore(deps-dev): bump postcss from 8.5.26 to 8.5.28 in /frontend in the frontend-tooling group
- 2026-09-07 #414 chore(deps): bump the frontend-runtime group in /frontend with 3 updates
- 2026-09-02 #394 fix(deps): bump qs to 6.16.0 to clear the moderate audit advisory
- 2026-09-02 #390 chore(deps): bump the production-dependencies group with 6 updates
- 2026-09-02 #389 chore(deps): bump actions/setup-java from 5 to 6
- 2026-09-02 #388 chore(deps): bump the frontend-runtime group in /frontend with 2 updates
- 2026-08-24 #362 build(deps): bump @anthropic-ai/sdk from 0.117.1 to 0.120.0 in the production-dependencies group
- 2026-08-24 #367 Correct the merge/deploy records + the scripts/** CI gate (workflow file needs your push)
- 2026-08-24 #366 Close the three workflow gaps from the M1 contract revision (+ a false gate found en route)
- 2026-08-18 #326 build(deps-dev): bump impeccable from 3.5.0 to 3.6.0 in the development-tooling group
- 2026-08-18 #325 build(deps): bump the production-dependencies group with 3 updates
- 2026-08-18 #324 build(deps): bump the frontend-runtime group in /frontend with 2 updates
- 2026-08-16 #319 chore: staleness check, :app JVM test source set, and the M1 screen-contract canvas
- 2026-08-12 #286 build(deps-dev): bump postcss from 8.5.25 to 8.5.26 in /frontend in the frontend-tooling group across 1 directory
- 2026-08-12 #287 build(deps): bump @anthropic-ai/sdk from 0.115.0 to 0.116.0 in the production-dependencies group across 1 directory
- 2026-08-12 #277 build(deps): bump actions/upload-artifact from 4 to 7
- 2026-08-12 #274 build(deps-dev): bump impeccable from 3.4.0 to 3.5.0 in the development-tooling group across 1 directory
- 2026-08-12 #273 build(deps): bump the frontend-runtime group across 1 directory with 2 updates
- 2026-08-12 #281 build(deps): bump the production-dependencies group with 3 updates
- 2026-08-12 #285 Chore/dependency queue triage 2026 08 11
- 2026-08-02 #268 chore(legal): identify Valor Ventures as Omen operator
- 2026-08-01 #254 build(deps-dev): bump autoprefixer and postcss (safe subset of #252)
- 2026-08-01 #253 ci: add pull-request quality gate covering three CI blind spots
- 2026-08-01 #219 build(deps): bump actions/setup-node from 6 to 7
- 2026-08-01 #206 build(deps): bump the production-dependencies group across 1 directory with 9 updates
- 2026-08-01 #204 build(deps): bump the frontend-runtime group across 1 directory with 4 updates
- 2026-08-01 #208 build(deps-dev): bump impeccable from 2.1.9 to 3.4.0 in the development-tooling group across 1 directory

### Native iOS (38)

- 2026-10-02 #504 fix(ios): numeric football_intelligence.quality.confidence no longer breaks every Omen call
- 2026-10-02 #502 ios: show where an unreadable server response failed (diagnostic for the Omen-tab error); walk-1 findings note
- 2026-10-01 #497 S0 complete: 30 API contracts guarded both ways (+ fix: FAAB/priority leagues showed 'not determined' on iOS)
- 2026-09-30 #496 S0: API contract schema, fixtures, lock and tests (+ fix: iOS showed 'update the app' for expired ESPN)
- 2026-09-30 #494 Native: dark-only, the lock's Command Center mounted, league multiselect restored, device gate
- 2026-09-21 #460 docs(native): direct the finish and polish workflow
- 2026-09-21 #459 feat(native): complete remaining visual-lock journeys
- 2026-09-16 #450 fix(ios): restore complete known-good ESPN connect snapshot
- 2026-09-16 #449 fix(ios): use ESPN current login page for WebKit connect
- 2026-09-16 #448 fix(ios): restore device-proven ESPN connect flow
- 2026-09-16 #447 fix(ios): restore ESPN WebKit login entry
- 2026-09-15 #442 Native visual lock: repair the type seam, land v2 wiring, record first canvas drift
- 2026-09-14 #440 Bind native visual-lock contracts
- 2026-09-14 #432 Native visual lock: Amendment 01 applied, contract lane minted, canvas to 30 screens
- 2026-09-09 #421 Route the two native design skills, and add the honest-states canvas
- 2026-09-05 #406 feat(ios): team switcher with favourites, and the canvas amended to match
- 2026-09-05 #403 refactor(ios): move the auth/connect primitives into DesignSystem, allowlist nothing
- 2026-09-05 #398 fix(ios): the league carousel built its query into the path, so every page 404'd
- 2026-08-27 #378 feat(android): mirror the league switcher, and fix an iOS defect only a screenshot found
- 2026-08-27 #377 feat(ios): build the team/league switcher sheet so a connected league can be chosen
- 2026-08-19 #343 feat(ios): O6 iOS crash reporting; close R3-BUILD-iOS and M4-Auth-Providers-v1
- 2026-08-18 #333 fix(ios): R3-BUILD-iOS — resolve App Store bundle validation errors
- 2026-08-18 #332 feat(mobile): O6 — Android native crash reporting to Sentry
- 2026-08-17 #320 feat(native): M5 slice E — wire the Ledger to GET /api/moves
- 2026-08-16 #317 feat(native): M5 slice D — wire the Omen destination to the live engine
- 2026-08-15 #313 fix(ios): deflake the contextual-help UI test
- 2026-08-15 #304 feat(mobile): Command Center platforms compact strip (iOS + Android)
- 2026-08-15 #312 feat(mobile): contextual help on every shipped native destination (M6-ContextualHelp)
- 2026-08-15 #310 feat(mobile): build the native connect flow (M5-NativeConnect, both platforms)
- 2026-08-15 #311 feat(ios): bundle the ESPN connect helper as a Safari Web Extension (M7) + feasibility memo
- 2026-08-14 #306 feat(brand): B2 vector masters + Liquid Glass iOS icon, vector Android icon, SVG favicon
- 2026-08-14 #299 fix(auth): complete native OAuth and email OTP flows
- 2026-08-13 #290 feat(ios): complete native auth and passkey onramp
- 2026-08-12 #289 chore(ios): establish local signed-device development path
- 2026-08-11 #283 docs(sprint): groom 2026-08-11 - four live-verified defects, iOS CI t…
- 2026-08-03 #271 M4: add native Waiver Watch composition
- 2026-08-02 #198 feat(auth): M4-Auth-Providers-v1 v1 — Discord OAuth (Android + iOS), Passkey on deck
- 2026-08-01 #250 fix(ci): repair broken quality checks (deploy.yml lockfile, ios-ci.yml YAML)

### Other (36)

- 2026-10-03 #539 feat: daily player crosswalk into the players tables (plan A1)
- 2026-09-29 #478 Add Omen Rebuild Plan v1.1 (founder-approved)
- 2026-09-14 #439 Canvas as source of truth: contract bindings, D11 device floor, iPad deferred
- 2026-09-13 #430 feat(command-center): auto-resolve GlitchTip issues that stopped happening
- 2026-09-12 #427 Repair the cited paths that no longer resolve, and archive two fired prompts
- 2026-09-12 #426 Close X4-SkillReach, gate close-out on Truth Gate, archive six dead files
- 2026-09-11 #425 One command for the end-of-batch screen capture
- 2026-09-11 #424 Catch clipped layout with tests instead of with the founder's eyes
- 2026-09-11 #423 Make the MFA code reachable, and put Command Center back on one fold
- 2026-09-09 #422 One typeface: Alegreya Sans, shipped for the first time
- 2026-09-05 #401 fix(schedule): the NFL week now ends on Tuesday, in one place instead of two
- 2026-09-05 #400 fix(test): the A4 season gate test expired today and is blocking every deploy
- 2026-09-05 #399 fix: the carousel loop that took production down, and the watchdog that will catch the next one
- 2026-09-02 #396 Point Omen at the L0 skill library, and contract the Command Center screen
- 2026-09-02 #395 Close out the 2026-09-02 session per the CLAUDE.md contract
- 2026-09-02 #392 Realign agent docs and kickoff as one contract, with a drift check and a gate that runs it
- 2026-09-02 #393 Stop issue-state-conflicts reading the historical record as a current claim
- 2026-08-31 #387 Omen is not yet Omen — founder requirements + next-session audit prompt
- 2026-08-27 #385 fix(schedule): the week endpoint claimed 'Week 1 regular' nine days before kickoff
- 2026-08-27 #384 fix(omen): live recommendations were broken in production by two missing columns
- 2026-08-27 #382 ops(o2): execute the rollback drill against production, and record what it found
- 2026-08-27 #375 feat(ops): bake build provenance so /api/version can name its commit
- 2026-08-27 #371 feat: close the backend gaps for the four approved-but-unbuilt screens, finish A6's agent half, and reconcile B2-D3-S2
- 2026-08-27 #373 Fix deploy access to protected production env
- 2026-08-27 #372 fix: hold unsafe grading and close A7B evidence
- 2026-08-21 #353 feat(ops): wire error tracking into Omen's real failure paths (O8)
- 2026-08-21 #350 fix(trust): F9 — fail closed on recommendation data modes; close on executed cross-platform evidence
- 2026-08-21 #349 feat(dbs): adopt Valor Brain metadata v1 in Omen
- 2026-08-21 #347 feat(ops): publish immutable sha image tags
- 2026-08-19 #337 feat(ops): O7 — server-driven forced-update / minimum-version gate
- 2026-08-16 #315 feat(1.0): take the draft path dark — P1-DraftAssistantSideline + R7
- 2026-08-14 #300 feat(mobile): complete Command Center parity pass
- 2026-08-02 #269 feat(legal): finalize Omen public contract
- 2026-08-02 #258 fix(ci): avoid false deploy canary failure
- 2026-08-01 #251 fix(server): make catch-all routes Express 5 compatible (unblocks #206)
- 2026-08-01 #249 Figma proposals (all 4 CC components approved), D1/A3 live verification, LeaguePulse brief

### Football data (27)

- 2026-10-03 #540 feat: recent usage in the start/sit call, from nflverse (plan A2)
- 2026-10-03 #528 db: redo step 11, league scoring rules in a deletable compartment
- 2026-10-03 #527 db: step 06 snapshots must cite their own provider's projections ingest (plan A4)
- 2026-10-01 #500 research: first factor experiment — context did not measurably beat the projection
- 2026-09-27 #470 feat: complete local football intelligence stages B and D
- 2026-09-26 #469 docs: close football intelligence Stage A and canvas Stage C
- 2026-09-26 #468 docs: close Stage A/C football intelligence foundation
- 2026-09-25 #467 feat: add football intelligence foundation
- 2026-09-13 #431 docs: close out the 2026-09-13 football-data capture outage
- 2026-09-13 #429 fix(football-data): image guard could not build under ProtectHome; keep build output
- 2026-09-13 #428 fix(football-data): self-heal an unpullable image pin; end silent alert latching
- 2026-09-07 #418 Projections for ESPN and Sleeper, and a legible matchup card
- 2026-09-06 #410 feat(providers): Yahoo matchups, and exact ESPN scoring
- 2026-09-06 #409 fix(espn): read the projections ESPN was already sending
- 2026-08-27 #386 feat(ops): add a mechanical A4 scoring-enablement gate checker
- 2026-08-27 #381 feat(scoring): map A7B's fact rows onto A6's canonical events
- 2026-08-27 #380 fix(scoring): Sleeper retention was gated on the wrong axis; ratify the ESPN clause
- 2026-08-27 #379 feat(scoring): complete A6's replay matrix and fix a field-goal modelling defect
- 2026-08-27 #376 docs(a6): generate the per-provider scoring coverage matrix from the code
- 2026-08-27 #374 feat(scoring): join the A6 write path to the contract derivation (step 2)
- 2026-08-25 #370 feat: implement A7B football-data pipeline phases 1-3
- 2026-08-24 #365 A6/A7: establish full league scoring contract foundation
- 2026-08-24 #369 A6/A7: establish full league scoring contract foundation
- 2026-08-24 #368 fix: disclose ESPN full scoring limits
- 2026-08-19 #334 fix(scoring): matchupService.js — nflverse URL, season_type, CSV quoting
- 2026-08-15 #309 fix(scoring): repoint nflverse to the live release; add the native product API layer (M5 A+B+C, iOS + Android)
- 2026-08-02 #264 docs(b3): close nflverse scoring verification

### Docs and process (27)

- 2026-10-02 #520 docs: clear the last 3 Truth Gate P0s; record #516 close-out as done
- 2026-10-02 #510 docs: Tuesday Oct 6 release-prep checklist
- 2026-10-02 #509 docs/design: where-the-points proposal v3 (founder-approved) and decision-log entry
- 2026-09-30 #489 docs: WO-15 — Pi kernel update runbook, watcher liveness, kernel decision
- 2026-09-30 #486 docs: apply WO-13 intelligence pass amendments to v2 screen contracts
- 2026-09-30 #487 docs: WO-15 monitoring hardening — all Sentinel checks built, restart policy on all hosts
- 2026-09-29 #485 docs: WO-15 backup repair — root cause, fix, and verified restore
- 2026-09-07 #420 Reconcile the sprint queue against git log, and raise three gaps
- 2026-09-02 #391 Reconcile the sprint queue against what actually happened
- 2026-08-27 #383 docs(ops): record Justin as standing sole owner, and close O2
- 2026-08-24 #361 docs: approve beta recruitment copy
- 2026-08-24 #356 docs: record 2026-08-22 founder gate decisions
- 2026-08-21 #348 docs(ops): pilot Valor Brain on O2 rollback state
- 2026-08-20 #346 docs(ops): prepare the immutable-tag deploy fix; runbook states what is actually live
- 2026-08-20 #345 docs(ops): name Justin Duverge as O2 rollback owner
- 2026-08-20 #344 docs(ops): O2 rollback runbook — the pipeline destroys its own rollback artifact
- 2026-08-19 #342 docs(direction): reconcile known_issues against GitHub; close stale S8
- 2026-08-18 #330 docs: O8/O9 follow-ons, S4 fix, and GlitchTip resilience proof
- 2026-08-17 #322 docs: re-land the M1 design track on main + close M5 slice E as merged
- 2026-08-16 #318 docs(sprint): record M5 slice D as merged (#317)
- 2026-08-16 #316 docs(sprint): close P1-DraftAssistantSideline and R7 — merged as #315
- 2026-08-15 #305 docs(sprint): defer the platforms status dot to post-beta polish
- 2026-08-14 #303 docs(direction): clear stale status across the sprint, inbox, and known issues
- 2026-08-12 #288 docs(sprint): widen S7 to cover unused @anthropic-ai/sdk production dep
- 2026-08-03 #272 docs: reconcile canonical Omen engine evidence
- 2026-08-02 #270 docs(release): record LEGAL-V1 deployment
- 2026-08-01 #255 docs(direction): retract the GitHub Actions billing misdiagnosis

### Providers (ESPN / Yahoo / Sleeper) (24)

- 2026-09-30 #492 docs: record the forced ESPN reconnect (3 connections marked inactive)
- 2026-09-28 #472 fix: parallelize the two ESPN calls behind league-switch lag
- 2026-09-18 #451 Fix the ESPN connect red: assert the property, stop the race, keep the leagues
- 2026-09-06 #411 fix(espn): a league switch carried the previous league's team id across
- 2026-09-05 #408 fix(leagues): show the team name Yahoo and ESPN already have
- 2026-09-05 #407 fix(leagues): switching providers 500'd, because the new selection was written before the old one was cleared
- 2026-09-04 #397 Command Center rebuilt to the founder's sketch: horizontal provider row, league carousel, team picker
- 2026-08-21 #351 fix(yahoo): read the 403 body, confirm the entitlement, ship contractual attribution
- 2026-08-14 #307 feat(providers): pause Yahoo behind one flag; name Draft Assistant as 2027
- 2026-08-14 #301 fix(platforms): try every connected provider instead of preferring Yahoo
- 2026-08-13 #298 docs(yahoo): narrow the 403 to a missing Fantasy API approval on ZcZJXm8V
- 2026-08-13 #297 docs(yahoo): record that the 403 is app-entitlement, not token or grant
- 2026-08-13 #296 chore(yahoo): add temporary access probe to localize the live 403
- 2026-08-13 #295 fix(yahoo): surface the real cause on GET /leagues + POST /league 500s
- 2026-08-13 #294 docs(sprint): correct P1-YahooLeagueBinding's null-persistence guidance
- 2026-08-13 #293 fix(yahoo): let a Yahoo connection actually bind a real league
- 2026-08-13 #292 fix(yahoo): point Connect/Reconnect buttons at the working OAuth starter
- 2026-08-13 #291 fix(waiver): gate waiver readiness on any Omen-ready connection, not Yahoo only
- 2026-08-12 #284 docs(sprint): Yahoo root cause + reselect inbox to unblocked agent work
- 2026-08-02 #267 docs(espn): record drafted-league waiver proof
- 2026-08-02 #266 feat(omen): wire ESPN waiver candidates
- 2026-08-02 #265 feat(espn): normalize waiver pool candidates
- 2026-08-02 #257 docs(spec): protocol to close ESPN observation 12 on a drafted league
- 2026-08-01 #213 docs(spec): scope live waiver pool for Sleeper and ESPN (B2-D)

### Database (16)

- 2026-10-03 #530 docs+db: production runbook, go/no-go and dry-run tooling for the database redo
- 2026-10-03 #529 db: redo step 12, saved trades in a table; export includes them
- 2026-10-03 #532 db: step 10 test keeps its pre-erase connection baseline (Codex on #523)
- 2026-10-03 #533 db: Yahoo refresh claims across processes before exchanging (Codex on #525)
- 2026-10-03 #525 db: credential writes use the redo step 02 functions when present (plan A0)
- 2026-10-02 #521 docs: prep brief — saved trades (T4) become redo step 12
- 2026-10-02 #512 ios: build guard for missing/fake Supabase config
- 2026-10-02 #508 db: bring the database redo onto main (the stacked #505 and #506 merged into their parent branches, not main)
- 2026-10-02 #505 db: redo design from the screens back + review-only SQL steps 01-07 (D2)
- 2026-10-01 #499 docs: database lane is Claude or Codex only (D2-D4 tickets); Jules does non-database code
- 2026-09-30 #491 docs: record the moves league-scope migration as applied to production
- 2026-09-29 #484 Revert WO-01 RLS policies and fix baseline migration
- 2026-09-29 #480 WO-02: Setup database migration framework and production schema baseline
- 2026-09-29 #479 WO-01: RLS policy repair (Omen rebuild, Gate 1, Wave 0)
- 2026-09-27 #471 chore: production database hardening, dead-code cleanup, OAuth state scrub fix
- 2026-08-18 #329 docs: close O1b (GlitchTip) and O5 (Supabase backup, doc-reconciled)

### League Office (retired 2026-10-02) (14)

- 2026-10-02 #518 db: record the League Office table drop; redo snapshot matches production again
- 2026-10-02 #515 chore: retire League Office (code only) + literal-\n comment guard
- 2026-09-29 #482 Fix League Office weekly handoff verification
- 2026-09-23 #466 fix(league-office): use ESPN historical player actuals
- 2026-09-22 #465 fix(league-office): final cleanup for reliable weekly workflow
- 2026-09-22 #464 fix(league-office): unblock quality gate and deploy
- 2026-09-22 #463 feat(league-office): make weekly workflow message-ready
- 2026-09-22 #462 fix(league-office): refresh completed week for weekly message
- 2026-09-22 #461 fix(league-office): make weekly rollover reconnect-safe
- 2026-09-16 #446 fix: persist required League Office matchup metadata
- 2026-09-16 #445 fix: expose safe League Office persistence error code
- 2026-09-16 #444 fix: make League Office sync diagnosable before retry
- 2026-09-16 #443 fix: restore League Office deploy gate
- 2026-09-16 #441 feat: add Slops Saloon League Office record book

### Performance and background jobs (11)

- 2026-10-03 #524 cron: run the redo's 30-day purges daily (plan A3)
- 2026-10-02 #517 docs: close out #516 (trade-finder cache scoped to the user)
- 2026-10-02 #516 security: scope the trade-finder cache to the authenticated user
- 2026-10-02 #513 perf: 60s per-user response cache on the five slow routes
- 2026-10-02 #507 perf(ios): league switch no longer waits on the directory re-read; request timing log
- 2026-09-05 #405 perf(omen): solve the lineup by assignment, not by enumerating every one
- 2026-08-14 #302 fix(cron): defer pre-season nflverse scoring instead of failing the move
- 2026-08-02 #262 fix(cron): read only scoring move fields
- 2026-08-02 #261 fix(cron): tolerate deployed moves schema
- 2026-08-02 #260 feat(cron): score Tuesday moves from nflverse
- 2026-08-01 #205 build(deps): bump actions/cache from 4 to 6

### Trade Analyzer (11)

- 2026-10-03 #519 feat(T4): saved trade queue backend — save/list/sent/outcome
- 2026-10-02 #522 docs: T4 save-data decision — the server remembers every trade it shows
- 2026-10-01 #501 Trade rework T3+T5 into main: swipe review, three-team builder, partner picker; trade-find.v1 contract-protected (35 screens)
- 2026-09-28 #474 T2: league-wide find-a-trade candidate generator
- 2026-09-28 #473 T1: three-team trade capability in trade-compare.v2
- 2026-09-06 #412 fix(espn): name the team in the switcher, and unstick the trade solve cap
- 2026-09-05 #404 fix(omen): bound the trade search that took production down for a day
- 2026-08-24 #364 M1-Screen-League + M1-Screen-Trade: revised contracts after the 2026-08-22 rejections
- 2026-08-17 #321 docs(design): M1 Trade + League screen contracts — acceptance gate, corrections, and four founder decisions
- 2026-08-02 #259 feat(omen): add live Sleeper trade candidates
- 2026-08-01 #256 docs(spec): scope live trade capability for Sleeper (B2-D3)

### Native Android (11)

- 2026-09-30 #488 Android CI parity
- 2026-09-28 #477 chore(deps): bump the android-dependencies group in /mobile/android with 2 updates
- 2026-09-21 #454 chore(deps): bump the android-dependencies group in /mobile/android with 3 updates
- 2026-09-14 #438 chore(deps): bump the android-dependencies group in /mobile/android with 3 updates
- 2026-09-07 #413 chore(deps): bump the android-dependencies group in /mobile/android with 2 updates
- 2026-09-05 #402 fix(android): keep the carousel and its pager in sync, and guard the path that creates
- 2026-08-24 #363 build(deps): bump the android-dependencies group in /mobile/android with 5 updates
- 2026-08-19 #336 docs(sprint): reconcile R2-Android approval; unblock R3/R4/R5
- 2026-08-18 #323 build(deps): bump the android-dependencies group in /mobile/android with 2 updates
- 2026-08-12 #282 build(deps): bump the android-dependencies group across 1 directory with 2 updates
- 2026-08-01 #209 build(deps): bump the android-dependencies group across 1 directory with 16 updates

### Identity and accounts (10)

- 2026-10-03 #534 db: no beta report after account erasure — tombstone and account lock (Codex on #530)
- 2026-10-03 #531 db: account deletion uses account_erase() when present (plan A1) — to main
- 2026-10-03 #526 db: account deletion uses account_erase() when present (plan A1)
- 2026-10-02 #514 db: account erase waits for a reconnect in flight; race check asserts both sessions; redo re-verified
- 2026-10-02 #511 db: resolve Codex's review of the redo; one call per team per week; one-transaction account erasure (step 10)
- 2026-10-02 #503 docs(db): league connections and identity review (Task A of the database redo)
- 2026-09-30 #493 WO-06: Identity unification
- 2026-09-18 #453 iOS: stop calling a refused provider an unverifiable sign-in
- 2026-08-19 #335 docs(android): R3-BUILD-Android — signing verified, close out
- 2026-08-16 #314 fix(onboarding): land on the dashboard after connecting; reconcile the sprint queue

### Security (5)

- 2026-10-03 #523 security: beta-report filter refuses ESPN cookie variants (plan A2)
- 2026-08-22 #355 S3 + S4 + O4 — hot-route rate limits, credential containment, and the load rehearsal
- 2026-08-21 #352 docs(yahoo): disprove the deleted-app theory by credential hash
- 2026-08-18 #331 security(mobile): S5 — verify token storage, add Keychain/Keystore regression tests
- 2026-08-18 #328 fix(security): scrub OAuth code/state from frontend Sentry URLs

### Omen of the Week / Moves (3)

- 2026-09-30 #490 fix(moves): Ledger v2 fails on production schema (GlitchTip #13)
- 2026-08-22 #357 M4 render-evidence package — close PlatformsCompact, WaiverWatch, and Help+Support on captured pixels
- 2026-08-01 #248 Founder-approval decisions: F1/A3/F4 audits, isolation tests, Waiver Watch Figma proposal

### Web app (1)

- 2026-09-30 #495 feat(weather): Open-Meteo client, venue table, validator (engine v2 groundwork)
