# Build 12 reconciliation — PR #670 and PR #671

**Date:** 2026-10-15
**Purpose:** decide what each draft contributes to Build 12 without confusing source, database,
warehouse, provider or release proof.

## Decision

PR #670 remains the Build 12 release branch and review surface. PR #671 is an input branch, not a
second release train and not a wholesale merge candidate. Extract its independently useful provider
matrix and migration work only after reconciling them with the newer Trade behavior on #670.

## What #670 contributes

- the Build/Find/Type Trade composition and canonical-player boundary;
- two- and three-team Trade contracts, candidate review and provider-aware projection enrichment;
- the repaired `omen-projections-v1` source, deterministic tests and retained-analysis procedure;
- the Build 12 provider/recommendation ladder and current Trade evidence;
- the release branch on which simulator, physical-device and provider certification must converge.

Current proof is source, focused tests, CI and simulator evidence. It is not yet a connected-provider
physical-device pass, a restored-warehouse model verdict, a production database change or a release.

## What #671 contributes

1. A canonical 45-entry provider capability matrix (15 capabilities across Sleeper, ESPN and Yahoo),
   a generated view and a drift test that now pins the complete capability vocabulary.
2. A read-only database reconciliation showing that missing scoring-rule persistence and credential
   health are application gaps, not provider limitations.
3. Three justified indexes on the empty, append-only projection logs:
   `projection_shadow_log (player_id, season, week)`, a partial
   `projection_shadow_log (league_id)`, and a partial `projection_snapshots (league_id)`.
4. Evidence for deliberately not creating five other foreign-key indexes or a
   `nflverse_weekly_stats (season, week)` index today.

The step-16 migration is rehearsed in CI but has not been applied to a Supabase branch or production.
It does not index the KVM warehouse and does not make the projection model accurate. It prepares the
Supabase projection-accountability tables to grow without avoidable foreign-key/index debt.

## Reconciliation rules

| Area | Build 12 decision |
|---|---|
| Provider matrix JSON/generator/test | Integrate after rebasing its claims onto #670; retain explicit `available`, `degraded`, `not_read`, `unavailable` and verification vocabulary. |
| Yahoo projections | Keep #670's corrected derived-projection behavior and source labelling; do not restore stale “Yahoo has no projections” copy. |
| Three-team Trade | Keep #670's current capability/contracts and make the matrix reflect them. |
| Step 16 SQL/down/test/rehearsal | Preserve as reviewed source; production application is separately approved and not a release gate. |
| Data-layer gap review | Use to order follow-on foundation work; do not pull grading, credentials, startup checks and provider reads into one risky release. |
| Activity/decision logs | Resolve manually or omit from the functional extraction; never let bookkeeping conflicts choose product behavior. |
| Warehouse backtest | Governed by #670's isolated KVM2 procedure and approval packet, not by Supabase step 16. |

## Build 12 priority order

1. Terminal Trade reliability on connected leagues.
2. Trade-critical provider truth: partial-read honesty, roster shape and locks.
3. Recommendation evidence receipts and source labels.
4. Automated regression and physical-device/provider proof.
5. Projection backtest and step-16 source readiness as bounded foundation evidence; neither may
   delay a proven Trade release or silently become a production change.

## Deferred foundation queue

After Build 12 freezes, the next foundation slices should begin with a league-scoring-rules writer,
then Ledger grading, persisted credential health, automated data-quality/startup checks, remaining
provider reads and player-identity coverage. Each slice needs its own contract and proof. This order
turns Omen from a recommendation renderer into an accountable decision system without pretending the
whole feedback loop exists in Build 12.

## Evidence states at this checkpoint

| Claim | State |
|---|---|
| #670 Trade/projection source and focused tests | `PASS-CONTRACT` |
| #670 Trade simulator composition | `PASS-CONTRACT`; physical device still open |
| #671 provider capability inventory | `PASS-CONTRACT`; authenticated live proof is sparse |
| #671 step-16 migration | CI-rehearsed source only; not applied |
| Restored-warehouse QB/RB/WR/TE verdicts | `UNPROVEN`; approval-gated run not performed |
| Connected Yahoo/Sleeper/ESPN Build 12 Trade walks | `UNPROVEN`; paired-phone pass deferred |
| Build 12 release | Not frozen, archived, uploaded, distributed or merged |
