# B2-D-S0 + S1 — Sleeper Waiver Foundation — 2026-07-26

## Session arc

Scoped the waiver pool (PR #213), started building S1, and immediately found that live Sleeper projections had been null for every player since the adapter was written. Stopped, surfaced it, got approval, fixed it as S0, then built S1 on top. Building S1 then surfaced a second defect — in my own first pass — caught by checking against live data rather than fixtures.

## Objective

Make `waiver_pickup` possible for Sleeper by producing an available-player pool, per `Blueprints/specs/b2d-live-waiver-pool-sleeper-espn-v1.md` Phase S.

## Delivered

### S0 — projection mapping fix (PR [#214](https://github.com/justinduverge-design/omen/pull/214))

`GET /projections/nfl/{season}/{week}` returns an **array** of records with points nested under `stats`. `projectionFor()` read it as an object map keyed by player id with a flat `pts_ppr`. Two defects: wrong container and wrong depth.

Measured before the fix: **null for 400/400 real players.** Because `src/services/optimizer.js:117` does `Number(player.projected_points) || 0`, **every Sleeper player scored 0 in live start/sit** — which has been live via `src/services/omen.js:889`.

The defects masked each other. `projections["17"]` on an array resolves to index 17, a *different player's* record, and returned null only because of the nesting bug. Fixing the nesting alone would have converted silent-null into silently-wrong points on the wrong player. Both fixed in one normalizer.

### S1 — available pool (PR [#215](https://github.com/justinduverge-design/omen/pull/215), stacked on #214)

`fetchSleeperAvailablePlayers(leagueId, week, season)` — active fantasy-eligible players minus every player rostered by any team, joined to projections and ranked.

## Validation

| Gate | Result |
|---|---|
| Adapter suite | 20/20 (11 new cases across S0 + S1) |
| Full backend suite | 425/425, 0 failures |
| Negative check (S0) | reverting the fix fails 3 of the new guards |
| Live normalizer run | 533/533 available projections mapped |
| Live-scale pool run | 3,293 pool · 529 projected · nulls strictly last · ranking topped by Josh Allen 23.79 / Burrow 23.78 / Hurts 21.90 / Mahomes 21.36 |
| `git diff --check` | clean |

## Findings

1. **A fixture invented a shape the live API has never returned.** `test/sleeperAdapter.test.js` fixtured projections as `{100: {pts_ppr: 18.4}}` — object map, flat points. The live payload is an array with nested `stats`. The suite passed while production returned nothing, for the life of the adapter. A green test suite certified the bug.

2. **Filtering on primary position withheld 74 rosterable players.** Sleeper lists fullbacks as `position: "FB"` with `fantasy_positions: ["RB"]`. Four are projected (Kyle Juszczyk, Alec Ingold, Hunter Luepke, Patrick Ricard). Switching to `eligiblePositions()` also correctly drops 3 players listed at a skill position with no fantasy eligibility (a TE marked `["OL"]`, a K marked `["DL"]`, a TE marked `["DL"]`). Net +71 at live scale, 3,222 → 3,293. This was my own defect, found by checking live data rather than trusting the fixture.

3. **Only 529 of 3,293 pool players have week-1 projections.** The other 2,760 records carry ADP fields with no `pts_ppr`. That is the upstream ceiling, not dropped data — verified separately. It shapes waiver ranking and feeds the open S4 decision.

## Explicitly not verified

**The roster subtraction is unverified against a real league.** S1's own PR names the subtraction as the primary correctness risk — miss one roster and an owned player is offered as available — and the live check used a *synthetic empty* roster set. It proves eligibility, the projection join, and ranking at real scale. It does not prove the subtraction.

That is S3, and it needs a founder-provided Sleeper league id. No claim of live capability proof is made.

## Live behavior change

S0 changes what live Sleeper start/sit recommends. Today's output is projection-blind (every player 0); after the fix it ranks on real projections. Founder-approved on that basis before implementation. S1 changes nothing at runtime — nothing calls the new function yet.

## Scope boundaries

`src/adapters/sleeper.js` and `test/sleeperAdapter.test.js` only. No provider credentials, schema, migration, deploy, dependency, production-data action, or new network shape — all three fetchers already existed and are cached. No engine wiring; that is S2.

## Open decisions

- **S4** — Sleeper waiver live-but-off-season via the existing DecisionBrief off-season surface, or dark until week 1? Product call; agent must not choose.
- **S3** — founder-provided league id for real capability proof.
- **E0** — ESPN cookie spike; blocks all of Phase E.

## Next session's first move

Review #214 first — it changes live output and #211's Yahoo waiver work sits adjacent. Then S2 (engine wiring), which is where S4 starts to bite because it decides what a user actually sees in July.

## Skill receipt

Task: B2-D-S0 projection mapping fix + B2-D-S1 available waiver pool.

Change type: backend correctness fix + new adapter capability.

Skills invoked: `slops-repo-inspector` (adapter/consumer mapping), `pre-build-research` (live API probing — the source of both findings), `slops-tdd` (RED-first on both; negative check on S0), `slops-git-flow` (stacked branches, explicit-path commits, push gated on founder approval), `slops-quality-baseline` (adapter + full suite + `diff --check`), `slops-code-review` (self-review surfaced the fullback defect before commit).

Skills N/A: `slops-ui-ux-audit` / `slops-mobile-smoke` / `slops-taste` / `slops-ux-copy` — no UI or user-facing wording. `security-privacy-evidence` / `rbac-risk-review` / `slops-legal-spot-check` — public unauthenticated API, no credential, permission, or legal surface. `slops-data-ingest-plan` — no new source or ingest path; existing cached fetchers only. `planning-pass` — backlog was authored in PR #213 ahead of this work.

Procedure gap found: **fixtures for external APIs must be captured from a real payload, not authored by hand.** The projections fixture encoded a shape the live API has never returned, so the suite certified a production bug indefinitely. `slops-tdd` should require that any fixture standing in for an external response cite the date and request it was captured from, and `slops-quality-baseline` should treat a green suite over a hand-authored external fixture as unproven rather than passing. Both S0 findings and my own S1 defect came from probing live data — none would have surfaced from the test suite.
