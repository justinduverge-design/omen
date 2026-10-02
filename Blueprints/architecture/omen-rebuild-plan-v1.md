---
title: Omen Rebuild Plan
subtitle: Contract-first architecture and execution plan for a trustworthy fantasy football decision engine
status: Approved
approved_by: Justin
approval_date: 2026-09-29
version: 1.1
plan_date: 2026-09-29
revision_notes: Incorporates 2026-09-29 pipeline verification findings, peripheral-systems scope, and grounded data sizing. Approved by founder 2026-09-29.
owner: Valor Ventures
reference_customer: Omen
product_type: Fantasy football decision engine
public_beta: Paused
lead_client: iOS
supported_clients:
  - iOS
  - Android
  - Web
supported_providers:
  - Sleeper
  - ESPN
  - Yahoo
canonical_design_baseline: design/native-visual-lock-2026-09-13
canonical_screen_count: 32
repo_target_path: Blueprints/architecture/omen-rebuild-plan-v1.md
source_baseline:
  - State of Omen
  - Evidence Gate Report — Omen Rebuild
  - Football pipeline verification 2026-09-29
architecture_state: Gate 0 in progress; pipeline verification complete 2026-09-29; peripheral systems unverified
---

# Omen Rebuild Plan

**Plan date:** September 29, 2026  
**Owner:** Valor Ventures  
**Reference customer:** Omen  
**Approved:** September 29, 2026 — Justin

> Rebuild Omen as a trustworthy fantasy football decision engine, using customer-grade architecture, evidence, documentation, testing, deployment, and recovery practices.

---

## Executive decision

Omen will be rebuilt as a **decision platform**, not as a collection of screens and not as a social fantasy app.

Every supported experience must complete the same chain:

**League context --> Football evidence --> Decision --> Explanation --> Action or share**

The rebuild preserves the product assets that are already strong—provider integrations, native clients, artboards, contracts, tests, and operational experience—but replaces the structural ambiguity around identity, schema, API generations, football-data provenance, and client behavior.

### Decisions established by this plan

- **The 32-screen native visual lock is the canonical design baseline.** It is the only current set with a complete artboard inventory, screen contracts, and requirement records. The 17-screen experimental canvas is reference material, not a second implementation target.
- **The branch-added Trade Find Review and three-team Trade Builder are candidates, not baseline screens.** Their logic and contracts are retained for later review; they do not expand the canonical screen set until approved through the same product gate.
- **iOS leads product proof.** Justin receives private builds as coherent capabilities become usable on his phone.
- **Android receives equal semantic support.** It consumes the same contracts and must pass the same provider acceptance suite, even when its visual implementation follows iOS.
- **Web is maintained for required platform and authentication duties, then expanded during the offseason.** It does not control the initial rebuild sequence.
- **Sleeper, ESPN, and Yahoo are equal product promises.** Provider differences are isolated behind adapters and never leak into decision logic or client contracts.
- **Draft Assistant is designed for, not built.** The platform exposes stable extension seams without creating speculative draft workflows or tables.
- **The current production experience stays available while the replacement is proven.** Cutover is reversible and occurs only after security, data, parity, and recovery gates pass.
- **Public beta shipping remains paused.** Private founder builds are evidence checkpoints, not deadline-driven releases.

### Resolved dependency: pipeline verified 2026-09-29

The football pipeline on `pi-command-center` was verified read-only on September 29, 2026 (the full report was a planning-session working file and was never committed; this section is the surviving record). It is a **witness/verification pipeline**, not a data-feed pipeline: it independently downloads nflverse CSVs each Tuesday at 05:45 ET, stores immutable content-addressed snapshots, and compares their hashes against Omen production's football-data status pulled from KVM1 over an SSH forced-command channel — alerting to Discord on mismatch, outage, schema drift, or staleness. It does not feed data to the Omen app.

Verified findings that shape this plan:

- **A reusable snapshot corpus exists.** `snapshots/<dataset>/<season>/<sha256>.csv.gz`, write-once by hash, two newest retained per dataset; manifests retained with provenance records. Total state ~41 MB. This is the seed of the rebuild's immutable artifact store.
- **The KVM1 comparison channel has been broken since 2026-09-23 20:13 EDT.** The witness scripts hardcode the hostname `srv1737978`, which no longer exists on the tailnet; KVM1 now appears as `omen-prod` (100.115.155.19). Every 5-minute comparison since has failed. The fix is a one-line hostname update — pending founder approval because it touches production-facing monitoring config.
- **No off-host backup exists.** Artifact data has no rsync/restic/borg job and no backup documentation; durability is local only. The backup/restore gate now addresses a confirmed gap, not an assumed one.
- **Data sizing is grounded.** Witness state ~41 MB; full multi-season nflverse play-by-play is single-digit GB. The planned 500 GB Pi SSD holds the football corpus many times over — the drive is about boot reliability and Docker, not data volume.
- **No uptime monitor covers the football pipeline.** Four active monitors cover the app and GlitchTip only.

---

## Product boundary

### Omen does

- Recommend start/sit choices in the user's actual league context.
- Evaluate trades, expose risks, and explain why a move helps or hurts.
- Identify waiver opportunities based on roster need and available players.
- Surface the highest-value move now through MVP Move.
- Preserve enough evidence and provenance for a recommendation to be examined.
- Share a trade verdict as text or a privacy-safe link, including the move and the reason.
- Support redraft, keeper, and dynasty league context where current decisions depend on those rules.

### Omen does not become in this rebuild

- A league social network.
- A generic news or statistics browser.
- A Draft Assistant.
- A public activity feed.
- A provider-specific product with three logos.
- A system that uses an LLM as the source of statistical truth.

### Feature admission test

A feature enters the rebuild only if it improves at least one of these outcomes:

1. Decision quality.
2. Decision speed.
3. Confidence through understandable evidence.
4. Ability to act on or share the decision.
5. Reliability, security, or operability of those outcomes.

---

## Architecture principles

1. **Contracts before implementation.** A screen contract states the decision, inputs, output, evidence, degraded behavior, and actions before client or service code changes.
2. **Deterministic facts before generated prose.** Statistics, roster state, eligibility, scoring, and confidence inputs come from governed data. Models explain and synthesize; they do not invent the evidence layer.
3. **One semantic core, many adapters.** Provider and client differences end at their boundaries.
4. **Identity is explicit.** Authentication identity, application user, league connection, provider account, fantasy team, and roster ownership are separately modeled and intentionally linked.
5. **Every decision is reproducible.** Store the input snapshot reference, ruleset version, decision-engine version, model route, and output schema version.
6. **Degraded states are product states.** Missing, stale, partial, or conflicting data is named in the API and shown by the client.
7. **Security is proved.** Row-level policies, grants, token boundaries, and cross-user denial paths are tested automatically.
8. **Migrations only move forward.** No hand-edited production schema and no undocumented repair SQL.
9. **Observable by default.** Data freshness, ingestion failures, decision latency, model routing, provider health, and restore status are visible.
10. **Extension without contamination.** Draft Assistant and future modules integrate through contracts, events, and stable entities rather than adding special cases to core tables.

---

## Target system

```text
Sleeper / ESPN / Yahoo          nflverse + approved sources
          |                               |
          v                               v
  Provider adapters                 Data ingestion
          |                               |
          +----------> Identity + normalization
                                |
                                v
                   Versioned football artifacts
                                |
                    +-----------+-----------+
                    |                       |
                    v                       v
              Decision services       Model gateway
              rules + scoring       local / frontier
                    |                       |
                    +-----------+-----------+
                                |
                                v
                  Versioned decision contracts
                                |
                  +-------------+-------------+
                  |             |             |
                 iOS         Android          Web
```

### Deployment roles

- **Production application tier:** API, workers, queues, operational database, cache, and secrets remain on production-grade infrastructure.
- **Supabase:** Managed Postgres and authentication may remain, but only behind a governed migration history, explicit identity model, least-privilege grants, and tested row-level policies.
- **KVM2:** Candidate inference host for local model workloads. It is activated through the model gateway only after quality, latency, availability, and fallback behavior are measured.
- **Pi `command-center`:** Verified 2026-09-29 — healthy host (disk 7% used) running the football witness pipeline plus Beszel Hub, Uptime Kuma, GlitchTip, and Pi-hole. Development and data-processing node: it may ingest datasets, build immutable artifacts, and retain a second copy; it is not the sole production source of truth.
- **Pi mirrored storage:** Lab and second-copy tier for datasets, artifacts, and recoverable development assets. RAID increases availability; it is not a backup by itself. Sizing: the football corpus is single-digit GB, so the planned 500 GB SSD carries it with large headroom.

**Naming standard:** Use `pi-command-center` for the physical host, `app-command-center` for the screen family, and `ops-control` for alerting scripts. New documentation and code must not use the ambiguous bare phrase “Command Center.”

---

## System scope: primary and peripheral

The rebuild centers on Omen's application systems, but several peripheral systems carry rebuild dependencies. Each is scoped below with its verification status as of 2026-09-29. Anything still founder-reported becomes defined Gate 0 verification work — the rebuild may not assume it.

| System | Role | Rebuild dependency | Status 2026-09-29 |
|---|---|---|---|
| `pi-command-center` (100.98.81.0) | Witness pipeline, Beszel Hub, Uptime Kuma, GlitchTip, Pi-hole, internal Postgres/Valkey | Immutable artifact seed; monitoring | Verified read-only; healthy |
| KVM1 / `omen-prod` (100.115.155.19) | Omen production at slopssaloon.com | Comparison target; cutover source | Not probed — outside verification scope; witness channel broken since 09-23 |
| KVM2 (100.77.202.56) | Ollama `gemma3:4b` on :11434 | Local model route for the model gateway | Founder-reported; unverified |
| `steward` (100.118.42.54) | Beszel agent; ingestion worker | Possible ingestion labor | Founder-reported; unverified |
| `sentinel` (100.109.57.11) | Passive network observer | None currently; assess before assigning any | Founder-reported; unverified |
| `model-host` (tailnet name) | Unknown | Unknown — identify before depending on it | Unverified |
| Supabase (Omen project) | Postgres + auth | Identity, schema, RLS foundation | Dashboard reviewed read-only 09-29; status "Unhealthy"; RLS gaps recorded |
| Upstash Redis / Oracle VPS / Hostinger | Cache, deploy targets | Delivery path | Code-reported; unverified live |

**Scope rule:** a peripheral system the rebuild depends on must be verified to the same ten-item Gate 0 standard as the pipeline before Gate 4 (football-data platform) or Gate 5 (decision platform) work assumes it. Verification is read-only; no configuration changes without founder approval.

---

## Bounded contexts

### 1. Identity and access

Owns users, authentication links, provider connections, consent, tokens, and data ownership.

**Required outcome:** one application user can safely own multiple provider connections and multiple leagues without nullable or orphaned user references.

### 2. League integration

Owns provider adapters, league settings, teams, rosters, matchups, transactions, and provider sync state.

**Required outcome:** Sleeper, ESPN, and Yahoo produce the same internal league model, with explicit capability and freshness differences.

### 3. Football data

Owns players, teams, schedules, injuries, usage, projections, identifiers, source provenance, artifact versions, and freshness.

**Required outcome:** any statistic used in a decision can be traced to a source, acquisition time, transformation version, and player identity mapping.

### 4. Decision engine

Owns recommendation requests, deterministic features, scoring, confidence, risk, evidence selection, and decision outcomes for start/sit, trade, waiver, and MVP Move.

**Required outcome:** the same request snapshot produces an explainable, versioned result regardless of client or provider.

### 5. Explanation and sharing

Owns structured explanations, model routing, share payloads, privacy rules, and short-lived public presentation.

**Required outcome:** generated language is constrained by the decision result and evidence; Trade Share exposes no provider credentials or unnecessary league identity.

### 6. Feedback and outcomes

Owns user reactions, accepted actions, observed outcomes, evaluation labels, and quality analysis.

**Required outcome:** feedback can improve the engine without mixing product events, model traces, and user records into one `moves` table.

### 7. Operations and governance

Owns migrations, configuration, feature flags, audit records, monitoring, backup evidence, restore drills, and runbooks.

**Required outcome:** an operator can determine system health and recover service without relying on undocumented founder knowledge.

---

## Canonical data model

The physical schema is designed after contract approval, but these are the stable concepts it must represent.

### Identity and ownership

- `app_users`: one canonical application identity linked one-to-one with an authentication subject.
- `provider_connections`: encrypted provider authorization metadata, status, scopes, and refresh health.
- `provider_accounts`: provider-side identity linked to a connection.
- `league_memberships`: application user, league, fantasy team, role, and ownership relationship.
- `consent_records`: versioned consent linked to the canonical application user.

**Non-negotiable:** user-owned rows cannot exist without a valid owner unless the table is deliberately system-owned. Referential integrity and row-level policy tests enforce this.

### League domain

- `leagues`, `league_seasons`, `scoring_rules`, `fantasy_teams`.
- `roster_snapshots`, `matchups`, `transactions`, `waiver_pools`.
- `provider_sync_runs`, `provider_capabilities`, `provider_raw_refs`.

Provider-native identifiers live in mapping records, not as the primary business identity of core entities.

### Football domain

- `players`, `player_identities`, `nfl_teams`, `seasons`, `weeks`, `games`.
- Versioned facts for participation, usage, injury, performance, matchup, and projection inputs.
- `data_sources`, `ingestion_runs`, `artifact_manifests`, `data_quality_findings`.

Time-sensitive facts carry effective time, acquired time, source, and artifact version. “Latest” is a query choice, not a destructive overwrite.

### Decision domain

- `decision_requests`: decision type, user, league context, input snapshot, and idempotency key.
- `decision_runs`: engine version, status, timing, model route, and reproducibility metadata.
- `decision_candidates`: compared players, moves, roster changes, and feature values.
- `decision_results`: verdict, confidence band, risk, rationale structure, and limitations.
- `decision_evidence`: sourced evidence selected for the result.
- `decision_feedback`: user rating, action, correction, and reason.
- `decision_outcomes`: later-observed result used for evaluation.

These records replace the mixed-concern `moves` design. Raw prompts, provider payloads, product analytics, and user feedback do not share one row.

### Share domain

- `share_records`: hashed identifier, decision-result reference, redaction policy, created time, and expiry.
- Public retrieval returns an immutable redacted projection, never the owner’s live league record.

The existing 30-day hash, no-auth, no-provider-data rule remains the baseline for `trade-share.v1` unless a security review strengthens it.

---

## Draft Assistant extension seam

Draft Assistant is a future module with permission to consume stable core services, not permission to reshape them.

### Interfaces the rebuild must establish

- Player identity and season context.
- League settings, roster construction, keeper rules, and scoring rules.
- Versioned rankings and projections.
- Recommendation and explanation envelopes.
- Provider capability discovery.
- Event publication for roster, transaction, and future draft-state changes.
- Feature-flagged module registration in API and clients.

### Isolation rule

Future draft-only concepts—rooms, picks, clocks, queues, board state, and draft recommendations—must live in a separate module and migration namespace. No empty draft tables are created during this rebuild merely to appear “future-proof.”

### Acceptance test for the seam

A future Draft Assistant team must be able to build against documented contracts using synthetic league and player fixtures, then install the module without changing canonical user, player, league, scoring, provider, or decision-result identities.

---

## Contract system

### The screen contract becomes executable product truth

Each canonical screen contract must contain:

- User decision or job.
- Entry conditions and navigation outcomes.
- Required league and football inputs.
- API request and response schema.
- Evidence, confidence, risk, and limitation fields.
- Loading, empty, stale, partial, degraded, unauthorized, and failure states.
- Analytics events that measure product use without recording sensitive payloads.
- iOS and Android accessibility requirements.
- Provider parity cases.
- Contract version and owning domain.

### API rules

- One supported API generation after migration.
- Versioned schemas stored in the repository and validated in continuous integration.
- Additive evolution within a version; breaking changes create a new version.
- Idempotency for syncs, decision requests, and share creation.
- Cursor-based pagination for mutable collections.
- UTC timestamps at service boundaries; league timezone retained as domain data.
- Explicit `freshness`, `provenance`, `capabilities`, and `limitations` objects where relevant.
- No provider response shapes exposed to clients.

### Decision response envelope

Every decision endpoint returns the same semantic shell:

- `decision_id` and schema version.
- `verdict` with machine-readable code and user-facing statement.
- `confidence` band plus the factors that raise or lower it.
- `risk` carriers and meaningful alternatives.
- `evidence` rows with source and freshness.
- `limitations` naming what could not be read or resolved.
- `actions` the client may perform.
- `shareability` and redaction behavior.

This envelope supports start/sit, trade, waiver, MVP Move, and a future Draft Assistant without forcing identical business logic.

---

## Football-data platform

### Gate 0 verification of the reported pipeline

Verification completed 2026-09-29 (the full report was never committed; this section is the surviving record). All ten items below were captured; dispositions are recorded in the "Resolved dependency" section above. The same ten-item standard now applies to each unverified peripheral system in the scope table before the rebuild depends on it.

When verifying a new system, capture:

1. Repository or directory location and ownership.
2. Inputs, source licenses, credentials boundary, and acquisition method.
3. Output schemas, storage paths, and artifact formats.
4. Last successful run, runtime, logs, and failure history.
5. Player-identity resolution method and unresolved rate.
6. Season/week handling and backfill behavior.
7. Scheduling, idempotency, and retry behavior.
8. Data-quality checks and freshness thresholds.
9. Consumers of each output.
10. Backup and restore path.

Every component receives one disposition: **keep, consolidate, replace, defer, or remove**.

### Target pipeline behavior

- Raw inputs are retained or reproducibly referenced according to source terms.
- Transformations produce immutable, content-addressed or version-addressed artifacts.
- Each manifest records source, acquisition time, schema version, transform version, row counts, validation results, and checksum.
- Promotion from raw to normalized to product-ready data requires quality gates.
- Product services consume a named artifact version, not an untracked “latest” file.
- Backfills are separate from live refreshes and cannot silently rewrite published decision history.
- Freshness policies differ by fact type; injury status and season history are not treated alike.
- Missing data lowers confidence or creates a degraded state; it does not trigger invented values.

### Storage policy

- Production database and required production artifacts have independent, tested backups.
- The Pi storage tier holds development data, immutable artifacts, and second copies.
- RAID1 may reduce downtime after a disk failure, but deletion, corruption, and site loss still require separate backups.
- Restore drills produce evidence: date, source, target, duration observed, integrity result, and operator notes.

---

## Model architecture

### One gateway, measured routes

All model use goes through a model gateway that accepts a structured task and returns a schema-validated result. Clients and decision services never call a model host directly.

### Routing policy

- Use deterministic logic for eligibility, scoring math, roster legality, factual comparisons, and confidence inputs.
- Use the KVM2 local model for approved explanation or summarization tasks only after evaluation proves acceptable quality and latency.
- Use frontier models for tasks that exceed the approved local capability or when the local route is unavailable and fallback is allowed.
- Record route, model family, prompt/template version, latency, validation result, and cost category without storing secrets.
- Fail closed on invalid structured output. A plain deterministic result is preferable to an unsupported fluent explanation.

### Evaluation gate

For every model-backed task, maintain a provider-balanced evaluation set covering ordinary, edge, stale-data, partial-data, keeper, and dynasty cases. Promotion requires agreed thresholds for factual consistency, contract validity, explanation usefulness, latency, and fallback behavior.

No model is “production ready” because it produced one good answer.

---

## Native client strategy

### iOS: lead implementation

- Implement one canonical screen contract at a time.
- Produce an installable private build for Justin when a complete decision flow is usable.
- Compare the build with the canonical artboard and the contract, not with the old interface.
- Keep network, domain, persistence, and view layers separated so contract changes do not rewrite screens.

### Android: parity implementation

- Consume the same generated or shared schemas.
- Pass the same provider and degraded-state tests.
- Track visual conformance separately from semantic parity.
- Remain buildable throughout the rebuild; no long-lived dead branch.

### Web: controlled maintenance

- Preserve required Yahoo/API-domain and account flows.
- Eliminate duplicate frontend ownership during consolidation.
- Do not expand feature scope until the native foundation and API contracts are stable.
- Re-enter active product work as an offseason phase against the same contracts.

### Artboard authority and conformance

The repository should add an architecture decision record that declares:

- `design/native-visual-lock-2026-09-13/` is canonical for the 32-screen rebuild baseline.
- `design/app-rework-canvas/` is archived as design exploration unless individual ideas are promoted through a new contract version.
- Branch-added screens remain candidates until approved.
- A generated index links each artboard, contract, API schema, iOS implementation, Android implementation, and acceptance test.

Each screen receives a conformance record with four outcomes: **match, revise artboard, revise contract, or rebuild implementation**. A visual match alone is insufficient if the screen does not expose the intended intelligence.

---

## Security and privacy architecture

### Identity repair

Choose one canonical application-user key and migrate all owned records to it. The mapping to the authentication provider is explicit, unique, and tested. Nullable ownership is removed except for intentionally system-owned data.

### Row-level security

- Every client-exposed table has an explicit access matrix.
- Policies cover select, insert, update, and delete as applicable.
- Service-only tables are not exposed merely because they exist in the public schema.
- Automated tests prove allowed same-user access and denied cross-user access.
- New tables fail continuous integration if policy classification is absent.

### Provider credentials

- Tokens remain server-side and encrypted through approved secret handling.
- Logs, analytics, model prompts, artifacts, and share payloads exclude raw tokens.
- Connection status and capability are exposed to clients; credentials are not.

### Sharing

- Public share payloads are immutable, minimal, revocable where feasible, and time-limited.
- Default redaction removes user, league, team, and provider identity unless the product contract explicitly requires a field.
- Public access is rate-limited and independently monitored.

---

## Environments, delivery, and cutover

### Environment model

- **Local:** developer tests and contract fixtures.
- **Integration:** provider adapters against dedicated test leagues and safe fixtures.
- **Staging:** production-like migrations, data artifacts, model routing, and native release candidates.
- **Production:** current customer-facing system until the replacement passes all gates.

Environment configuration is validated at startup. Secrets and provider credentials are never copied into fixtures or documentation.

### Parallel-run strategy

For selected decisions, the new engine runs in shadow mode against the same normalized snapshot as the old path. Differences are recorded for review without changing the user-visible result. This proves parity where parity is desired and exposes intentional product improvements.

### Cutover requirements

- Forward migration tested from a production-like snapshot.
- Rollback or roll-forward recovery procedure rehearsed.
- Backups restored successfully in an isolated target.
- Provider matrix passes for all core decisions.
- RLS and authorization denial tests pass.
- Data freshness and model fallback alerts are active.
- Current native release can be pointed back to the old path if the new path fails.
- Justin approves the private build after real use across his three dedicated provider leagues.

Cutover is a controlled change, not a calendar event.

---

## Test and acceptance strategy

### Required layers

- **Schema tests:** migrations, constraints, indexes, and rollback/roll-forward behavior.
- **Authorization tests:** same-user allow, cross-user deny, anonymous behavior, and service-role boundaries.
- **Adapter contract tests:** canonical fixtures for Sleeper, ESPN, and Yahoo.
- **Data-quality tests:** player resolution, duplicates, season/week binding, freshness, and provenance.
- **Decision tests:** deterministic feature values, verdict rules, confidence, risk, and limitations.
- **Model evaluations:** factual consistency, schema validity, usefulness, latency, and fallback.
- **API contract tests:** request/response compatibility and degraded states.
- **Native UI tests:** navigation, loading, empty, failure, accessibility, and visual conformance.
- **End-to-end tests:** user connection through decision and share.
- **Operational tests:** alerts, backup, restore, and dependency failure.

### Provider parity matrix

Every core decision is tested against Sleeper, ESPN, and Yahoo using equivalent scenarios. “Supported” means the same semantic result is possible or the API returns an explicit capability limitation. Silent omission is a failure.

### Milestone evidence packet

A milestone is complete only when the repository contains:

- Approved contract and architecture decision references.
- Implementation diff.
- Passing automated evidence.
- Provider coverage result.
- Security impact and tests.
- Data provenance and freshness result when applicable.
- Installable private build when user-facing.
- Deployment and rollback notes.
- Known limitations stated in product language.

---

## Execution sequence

The sequence deliberately establishes foundations first, then proves them through vertical slices. Backend completion is the platform gate; frontend growth continues after it.

### Gate 0 — Establish system truth

**Purpose:** Remove the remaining unknowns before implementation.

**Work:**

- Verify `pi-command-center` and the reported football pipeline. **Complete 2026-09-29** — findings recorded in this plan; the full report was never committed, so the findings in this plan are the record.
- Verify each peripheral system in the scope table to the same ten-item Gate 0 standard (read-only; no configuration changes without founder approval).
- Capture deployment topology, data paths, schedules, logs, and artifact state.
- Render at least one representative native screen per journey and compare it with its artboard and contract.
- Add the canvas-authority decision record.
- Inventory production schema and API consumers against the evidence report.
- Record keep, consolidate, replace, defer, or remove for every inherited component.

**Exit evidence:** Verified pipeline inventory; design-authority record; conformance samples; component disposition register.

### Gate 1 — Freeze the contracts

**Purpose:** Define what the platform must serve before rebuilding it.

**Work:**

- Perform the football-intelligence content pass on all 32 screen contracts.
- Add freshness, provenance, capability, limitation, and error semantics.
- Define canonical API schemas and the shared decision envelope.
- Define player, league, season, scoring, roster, and identity invariants.
- Define Draft Assistant extension interfaces without draft functionality.

**Exit evidence:** Versioned contract set passes schema validation; every screen maps to an owning service and accepted states.

### Gate 2 — Build the database foundation

**Purpose:** Establish safe identity, schema governance, and migration discipline.

**Work:**

- Introduce a migration framework and baseline the current production schema.
- Implement the canonical application identity and ownership model.
- Split mixed concerns currently stored in `moves`.
- Build RLS policy matrices and automated policy tests.
- Add audit, provenance, artifact, sync, and decision-run foundations.
- Prove backup and restore in an isolated environment.

**Exit evidence:** Clean database can be created from zero; production-like data can migrate; access tests and restore drill pass.

### Gate 3 — Normalize all providers

**Purpose:** Make provider differences an adapter concern.

**Work:**

- Define provider interfaces and capability reporting.
- Implement and test Sleeper, ESPN, and Yahoo adapters against dedicated leagues.
- Normalize users, leagues, teams, rosters, scoring, matchups, transactions, and waiver availability.
- Remove season-binding and nullable-ownership ambiguity.
- Add sync freshness, idempotency, and recovery behavior.

**Exit evidence:** The same canonical fixture and API contract are demonstrated for all three providers; limitations are explicit.

### Gate 4 — Establish the football-data platform

**Purpose:** Turn independent football data into governed product inputs.

**Work:**

- Apply Gate 0 pipeline dispositions: keep witness capture and the snapshot layout; fix the KVM1 hostname (pending founder approval); add off-host artifact backup and pipeline monitoring.
- Establish player identity mapping across provider and football sources.
- Version raw, normalized, and product-ready artifacts.
- Add data-quality gates, freshness policies, manifests, and alerts.
- Store production artifacts on production infrastructure and second copies on the Pi tier.

**Exit evidence:** A decision can cite a reproducible artifact version; stale and failed inputs create visible degraded behavior.

### Gate 5 — Build the decision platform

**Purpose:** Complete the stable backend product surface.

**Work:**

- Implement shared request, evidence, confidence, risk, limitation, and explanation services.
- Implement model gateway, local-model evaluation, and frontier fallback policy.
- Deliver domains as vertical slices: start/sit, trade, waiver, then MVP Move.
- Implement privacy-safe Trade Share.
- Add feedback and outcome capture as separate concerns.
- Retire the legacy API generation after all consumers migrate.

**Exit evidence:** All core decision contracts pass on all three providers; one supported API generation remains; backend platform definition of done is satisfied.

### Gate 6 — Rebuild native experiences

**Purpose:** Make the validated decision platform real on the phone.

**Work:**

- Rebuild or revise screens according to conformance records.
- Ship iOS private builds by complete decision journey.
- Maintain Android semantic parity and build health in the same gate.
- Exercise loading, stale, partial, degraded, and failure states—not only happy paths.
- Validate Trade Share through text and privacy-safe link flows.

**Exit evidence:** Justin completes each journey in real leagues on iPhone; Android passes the same contract and provider suite; visual exceptions are documented and approved.

### Gate 7 — Harden and cut over

**Purpose:** Move from private proof to a dependable customer system.

**Work:**

- Run shadow comparisons and resolve unexplained differences.
- Complete security review, load checks, alert tests, backup restore, and runbooks.
- Migrate production data and clients through a reversible rollout.
- Archive replaced code, branches, schemas, and documentation with clear status.
- Resume external beta only after founder acceptance.

**Exit evidence:** Cutover checklist signed; rollback path rehearsed; production health visible; external testers receive a coherent release.

### Gate 8 — Offseason expansion

**Purpose:** Grow the product without reopening the foundation.

**Work:**

- Consolidate and expand the web client against stable contracts.
- Review the candidate Trade Find and three-team Trade experiences.
- Begin Draft Assistant as an isolated module using the extension seam.
- Add further dynasty and keeper intelligence through approved contracts.

**Exit evidence:** New modules integrate without changing canonical identity, provider normalization, or decision-result contracts.

---

## First work orders

No coding agent receives a broad instruction such as “fix the backend.” Work begins with these bounded orders:

1. **Verify the reported football pipeline.** **Complete 2026-09-29.** Read-only inventory captured; dispositions recorded in this plan.
2. **Record canvas authority.** Add an architecture decision declaring the 32-screen visual lock canonical and classifying the 17-screen canvas plus branch-added screens.
3. **Build the screen traceability index.** Map all 32 screens to artboard, contract, endpoint, domain owner, iOS location, Android location, and tests.
4. **Run the intelligence content pass.** For each screen, name the decision, league inputs, football inputs, freshness, evidence, confidence, limitations, and action.
5. **Write core domain invariants.** Identity, player, season/week, league, scoring, roster ownership, provider mapping, and decision reproducibility.
6. **Choose and baseline the migration framework.** Demonstrate create-from-zero and migration of a production-like snapshot before feature schema work.
7. **Design the provider adapter contract.** Prove one representative league fixture from each provider normalizes to the same model.
8. **Design the decision envelope.** Validate start/sit and trade examples, including stale and partial data, before endpoint implementation.
9. **Build the security policy matrix.** Cover every exposed table and operation, then encode denial tests.
10. **Prove one thin vertical slice.** One provider-balanced decision from ingest to private iOS presentation, using governed football evidence and a reversible deployment.

The thin slice is not permission to bypass the architecture. It is the earliest proof that the architecture works end to end.

---

## Inherited work disposition

- **Keep:** `codex/football-data-research` as planning input.
- **Redirect:** three-team trade capability and find-a-trade generator into future contract-governed work; mine their tests and domain ideas.
- **Redirect:** iOS/Android Trade Find Review and three-team builder only after candidate screens are approved.
- **Archive:** `codex/root-cause-containment-20260928` implementation. Preserve useful regression assertions; do not merge broad repairs into the replacement architecture.
- **Do not merge paused branches wholesale.** Reintroduction occurs through small reviewed changes against the new contracts.

---

## Repository operating model

The plan and its evidence must be visible beside the code. Recommended structure:

```text
Blueprints/
  architecture/
    omen-rebuild-plan-v1.md
    decisions/
    component-disposition.md
    screen-traceability.md
  specs/
    design/screen-contracts/
    api/
    domain/
  runbooks/
    deploy/
    rollback/
    backup-restore/
    provider-recovery/
  evidence/
    milestones/
    security/
    data-quality/
    model-evaluations/
```

### Required metadata for controlled documents

Each architecture, contract, runbook, and decision record includes owner, status, version, approval date, superseded document when applicable, dependencies, and related tests. Documents are reviewed through pull requests and versioned with the code they govern.

### Roles

- **Justin:** Product owner, first user, acceptance authority, and final scope decision.
- **Muse:** Architecture owner, contract author, work-order author, and gate reviewer.
- **Coding agent:** Executes bounded work orders, tests its changes, and returns evidence.
- **Independent model reviewer:** Challenges architecture or risky changes without silently changing the approved direction.

Architecture and execution are intentionally separated. A coding agent cannot approve its own gate.

---

## Backend platform definition of done

The backend is “100%” for this rebuild when all statements below are true:

- One canonical identity and ownership model is in production.
- One reproducible migration history creates the database from zero and migrates a production-like snapshot.
- Every exposed table has tested access behavior.
- Sleeper, ESPN, and Yahoo pass one provider-parity acceptance suite.
- Football inputs have source, freshness, transformation, and artifact provenance.
- Start/sit, trade, waiver, MVP Move, explanation, and sharing contracts are implemented and versioned.
- Decision outputs are reproducible from an input snapshot and engine version.
- Model routing has schema validation, evaluation evidence, observability, and fallback behavior.
- Backup restoration and operational recovery are demonstrated.
- One supported API generation remains, with legacy routes removed or isolated behind a dated retirement plan.
- Native clients consume the same semantic contracts.
- Draft Assistant can attach through documented seams without altering canonical identities.

“Done” does not prevent additive features or tuning. It means new work extends a stable machine instead of reopening its foundation.

---

## Risks and controls

### Pipeline reality differed from memory — resolved 2026-09-29

**Finding:** The pipeline is a witness/verification pipeline with a reusable immutable snapshot corpus; its KVM1 comparison channel has been broken since 09-23 and its artifacts have no off-host backup.  
**Control applied:** Findings recorded in this plan; the hostname fix and backup work are explicit plan items rather than assumptions.

### Unverified peripheral systems

**Risk:** KVM2, steward, sentinel, model-host, and KVM1 live state remain founder-reported. The pipeline verification showed memory drifts — a stale hostname and no backups went unnoticed.  
**Control:** The scope table marks every dependency verified or founder-reported; Gate 4 and Gate 5 work may not assume an unverified system.

### Contract-first becomes document-only work

**Risk:** The team writes specifications that implementation never proves.  
**Control:** Every contract is tied to generated validation, a vertical slice, and a private build.

### Provider parity triples implementation effort

**Risk:** Equal support becomes three separate products.  
**Control:** Shared canonical models, adapter contract tests, and a provider capability matrix.

### iOS lead leaves Android behind

**Risk:** Android becomes expensive to revive.  
**Control:** Keep Android compiling and semantically contract-compliant at every milestone, while visual polish may follow iOS.

### Local AI becomes a mission-driven distraction

**Risk:** Infrastructure ideology overrides product quality.  
**Control:** Route by measured task performance; use local inference where it earns the role and frontier fallback where needed.

### RAID is mistaken for backup

**Risk:** Mirroring preserves deletion or corruption.  
**Control:** Independent, restorable copies and documented restore drills.

### Rebuild never ships

**Risk:** Foundation work expands indefinitely.  
**Control:** Vertical slices reach Justin's phone, gates have explicit exits, and new scope waits behind the feature admission test.

---

## Founder acceptance checklist

Approve this plan when the following statements match the intended company direction:

- Omen is a decision engine; social behavior is limited to useful sharing.
- The 32-screen native visual lock is the starting authority, subject to screen-by-screen revision.
- iOS leads, Android maintains equal semantic support, and web expansion waits for the offseason.
- Sleeper, ESPN, and Yahoo receive equal decision quality and acceptance testing.
- Real football data and visible evidence are central to the rebuild.
- Draft Assistant is outside current scope but receives stable integration seams.
- The current product remains available until a reversible replacement is proven.
- Private founder builds are milestones; public beta resumes only after the platform gates pass.
- Omen is documented, tested, secured, deployed, and recovered as Valor would do for a paying customer.

### Immediate next action

Continue **Gate 0** with three read-only tracks in parallel:

1. Verify the peripheral systems in the scope table to the ten-item Gate 0 standard (no configuration changes without founder approval).
2. Commit the canvas-authority architecture decision and generate the 32-screen traceability index.
3. Place this approved plan at `Blueprints/architecture/omen-rebuild-plan-v1.md` in the Omen repository via pull request.

No production code or data changes occur during Gate 0.
