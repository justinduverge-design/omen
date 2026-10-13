# Omen Current Sprint

**Refreshed:** 2026-10-12 (founder set a rolling weekly Tuesday frame; scope is chosen one release at a time after inspection: `Direction/2026-10-12-rolling-three-beta-frame.md`). **Rebuilt:** 2026-10-03. The previous file (202 KB, 85 non-closed items, last updated 2026-09-27) is archived
verbatim at `Archive/sprints/2026-10-03-current_sprint-full.md`. Its item statuses were not re-verified; most
work since 2026-09-27 shipped from PRs, not sprint items. What has shipped: `Direction/shipped.md`
(regenerate with `node scripts/shipped.js`).

**Purpose:** active work only. States, `Claim:`/`Evidence:` and blocker grammar: `Direction/status-model.md`.
A pin in `Direction/agent_inbox.md` overrides this file. Do not auto-pull database, deploy, production,
founder, or store work.

## Active

### OMEN-FOUNDATION — inspect the shared football decision foundation before allocating Beta 2

- **Status:** IN_PROGRESS
- **Claim:** Codex, 2026-10-12, founder direction to begin future-build work after archive/upload
- **Priority:** P0 planning gate
- **Cost:** medium inspection; implementation explicitly excluded from this claim
- **Do not touch:** production/provider accounts, protected decision-engine files, preserved WIP branches, or future-release scope before the evidence is reviewed
- **Scope:** `Direction/2026-10-12-rolling-three-beta-frame.md` inspection gate; pass 1 evidence in `Direction/reviews/2026-10-12-omen-foundation-reassessment-pass-1.md`
- **Done when:** provider-by-feature matrix, shared-primitives map, canvas behavior delta, Xcode automation opportunities and preserve/consolidate/repair/replace/exclude register are evidence-backed enough to propose the smallest coherent 2026-10-20 outcome.

### FI-LEAGUE — Football intelligence for the whole league (the "why" behind every call)

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — device verification: the build is on the founder's iPhone; usage lines and team-system lines for players on any team still need the phone walk (Gate G)
- **Priority:** P0 until the phone walk confirms it
- **Cost:** large (build merged: #545, #546, #549, #551; the warehouse now serves usage in `warehouse` mode)
- **Do not touch:** `mobile/` for new features (device fixes only); production writes beyond what the founder approved
- **Scope and running checklist:** `Blueprints/handoffs/2026-10-03-football-intelligence-league-build.md`.
- **Done when:** every team has a published system signal, and the founder sees team-system and usage lines on the phone for players on any team. Evidence: the walk notes (`Direction/2026-10-11-device-walk-2.md`).

### RELEASE-CYCLE — Build 11 uploaded; Build 12 targets 2026-10-20 at the earliest; 2026-10-27 remains hopeful

- **Status:** READY
- **Blocked by:** Build 12 scope-selection gate — Trade diagnosis, shared-primitives trace, provider capability matrix and unfinished-work recovery review
- **Priority:** P0
- **Cost:** medium
- **Do not touch:** store consoles without approval; merge cutoff is the Monday afternoon before each release, no deploying merges Monday evening through the release day
- **Scope:** `Direction/2026-10-20-build-12-plan.md` (active build), `Direction/2026-10-12-rolling-three-beta-frame.md` (cadence), `Direction/2026-10-27-beta-readiness.md` (unallocated horizon/index), `Direction/2026-10-13-release-rollback-card.md` (Build 9 rollback provenance).
- **Done when:** the founder ships the build and the release day's canary passes.

### FM-XFP — Omen fantasy metrics v1: expected fantasy points, opportunity, role chart, dynasty outlook

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — M2 and later phases each need their own yes (production write, deploy). The beta slice (descriptive start/sit lines, #592) is merged and deployed.
- **Priority:** P1
- **Cost:** large
- **Do not touch:** `mobile/`; warehouse schema and `rights_basis` (no migration); Supabase schema
- **Scope:** `Blueprints/specs/football-data/omen-fantasy-metrics-v1.md`. Phase M1 is local only: calculators,
  lookup-table builder and the backtest report.
- **Done when (M1):** the backtest report is in `Direction/reviews/` and shows, per position, whether xFP beats
  the last-3-weeks baseline; the founder has read it before M2 is requested.

### FM-TREND — Omen trend evidence v1: play-type splits, shrinkage, cause / correlation / coincidence

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — the spec; T2 and T3 each need their own yes (production write, deploy)
- **Priority:** P1
- **Cost:** large
- **Depends on:** `FM-XFP` (the over-expected measure and the role chart)
- **Do not touch:** `mobile/`; warehouse schema and `rights_basis` (FTN stays on the football-intelligence path)
- **Scope:** `Blueprints/specs/football-data/omen-trend-evidence-v1.md`. Phase T1 is local only. Catalogue of
  further stats and scenarios: `Direction/reviews/2026-10-10-fantasy-manager-stats-and-scenarios.md`.
- **Done when (T1):** the trend backtest report is in `Direction/reviews/` and shows whether "likely cause"
  trends persist more than "coincidence" trends, and whether matchup fit lowers next-week error; the founder
  has read it before T2 is requested.

### FM-REGISTRY — Omen stat registry v1: every stat defined once, names, position ratings (Augur)

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — definitions, and decisions D-NAMES, D-RATING-FAMILY, D-CROWN, D-IDP in the spec
- **Priority:** P1
- **Cost:** large (ratings phase R1); the registry itself is a document
- **Scope:** `Blueprints/specs/football-data/omen-stat-registry-v1.md`. A stat not in the registry is not built;
  definition changes are new versions logged in `Direction/decision_log.md`.
- **Done when (R1):** each position rating has its stability, predictive and top/bottom-10 report in
  `Direction/reviews/`, read by the founder.

### TV-V3 — Trade value v3 ("Crown Odds"): title and playoff odds change, scarcity explicit

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — the spec; V3 (replacing the live v2 verdict) needs its own yes (deploy)
- **Priority:** P1
- **Cost:** large
- **Do not touch:** the live `/api/trade/compare` verdict until V3 is approved; `mobile/`
- **Scope:** `Blueprints/specs/football-data/omen-trade-value-v3.md`. V0 (bipartite-matching lineup solver)
  comes first and has no data dependency.
- **Done when (V1):** the calibration, provider-comparison and v2-vs-v3 saved-trade reports are in
  `Direction/reviews/`; the founder has read them before V3 is requested.

### PROJ-OMEN — Omen's own projections: league provider leads, Omen challenges and fills Yahoo

- **Status:** IN_PROGRESS
- **Blocked by:** FOUNDER_APPROVAL — wiring any Omen projection into a live path needs its own yes after the backtest
- **Priority:** P1
- **Cost:** large
- **Do not touch:** `vorp.js`, `decisionBriefV2.js`, `decisionContext.js`, `systemContracts.js`, `llm.js`; the live projection paths until a backtest shows Omen is not worse
- **Claim:** Codex, 2026-10-13, PR #654 is locally staged on `codex/build-12`; scoring-family, minimum-evidence, and reader-role repairs pass 34/34 focused tests and fresh review with no P0/P1/P2; restored-warehouse run remains open
- **Scope:** PR #654 (spec `Blueprints/specs/football-data/omen-projections-v1.md`, pure model, offline backtest). The relevance-universe P1 is repaired. A later review found two more P1s: PPR-only certification and sparse paired evidence. Their local repair makes decisions per scoring family and requires versioned row/player floors. Decision: `Direction/decision_log.md` 2026-10-12; audit: `Direction/reviews/2026-10-12-build-12-unfinished-work-audit.md`.
- **Done when (backtest):** a read-only backtest on a restored warehouse copy (KVM2) is in `Direction/reviews/` and shows whether Omen beats the last-3 and season-average baselines per position.

### PROVIDER-READS — read everything the providers expose (trade targets, transactions, roster slots, Yahoo waiver status)

- **Status:** READY
- **Priority:** P1
- **Cost:** medium
- **Do not touch:** protected files above; no merge before the release day ends
- **Scope:** `Blueprints/specs/football-data/omen-provider-capability-matrix-v1.md` gap list G3-G8. Partial, untested work is preserved on branch `feat/provider-gap-g3-g8` (WIP commit `8a8c78b9`, no PR).
- **Done when:** each gap returns data or an honest "unavailable" per provider, with tests, contract record and a fresh-agent review.

### SPECS-NEXT — three planning specs to write (evidence-layer map, fantasy-week information architecture, provider discovery + probe plan)

- **Status:** READY
- **Priority:** P2
- **Cost:** medium (docs only)
- **Scope:** founder direction 2026-10-12 (`Direction/decision_log.md`); outputs `Blueprints/specs/football-data/omen-evidence-layer-map-v1.md`, `omen-information-architecture-v1.md`, `omen-provider-discovery-v1.md`. The first attempt was cut off by the rate limit and produced nothing.
- **Done when:** the three specs exist, cite files, and carry a phased plan.

### WH-PROJECTIONS-APPLY — apply the weekly projections schema and enable the store (after a release)

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — production schema apply, timer/unit change, and flag changes (exact commands first)
- **Priority:** P2
- **Cost:** small
- **Scope:** `Blueprints/handoffs/2026-10-11-warehouse-weekly-projections.md` (order: tolerant release live, backup, apply outside the 07:15 ET window, verify, ingest, flags). Code is merged with flags off.
- **Done when:** the store holds current-week projections and the read path is on with the kill switch tested.

### OPS-SSH-OMEN-USER — one `omen` user on both Omen VPSes

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — sudoers/authorized_keys changes on production
- **Priority:** P3
- **Cost:** small
- **Scope:** `infra/schedule/ACCESS.md`; additive: create, verify login and sudo, switch aliases, update the posture baseline, retire the old users after a week.
- **Done when:** `ssh omen-kvm1` and `ssh omen-kvm2` log in as `omen`; Sentinel baselines refreshed.

## Needs a decision

- **T2-FindATradeGenerator** — source shipped (#501 swipe review, #633 front door and real Save, #639 trade call in Omen), but the 2026-10-12 founder phone walk says it does not work. Do not close. Reproduce after the freeze and decide repair versus honest exclusion from the affected beta.
- **Archived backlog** — 85 items. Before pulling one back, confirm with `Direction/shipped.md` that it has
  not already shipped, then copy it here with a fresh `Status:`.
