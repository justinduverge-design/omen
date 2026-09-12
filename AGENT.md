# Codex Context — Omen

## Canonical Source

Follow `./AGENTS.md` first. This file is the Codex-specific extension for Omen Layer 2.

AGENTS.md is shared by every runtime. CLAUDE.md owns the current read order. This file should stay light: route repeatable workflow detail into invocable skills and project source-of-truth docs instead of copying it here.

## Product shape

Omen is a fantasy football management app: a user connects a real ESPN, Yahoo, or Sleeper league, and Omen tells them the best move to make this week. It explains what to do, why it matters, the risk, and the confidence in plain English.

Product detail lives in `Direction/context.md`. Standing constraints — what is free, what is cut, what may be said publicly, and what must not be claimed — live in `Direction/facts-of-record.md`. Do not restate those constraints here; a copied fact is a second source of truth, and the copy is the one that goes stale.

## Role

You are Codex working in Omen Layer 2. Confirm this session's actual capabilities, then apply Runtime Policy from `../../Blueprints/agents/AGENT_INDEX.md` before acting.

Codex has a soft execution lean: code edits, file edits, terminal commands, tests, verification, and concrete implementation across backend, native, web, UI/UX, and documentation when the task and authority allow it. Lanes are scheduling hints, never ownership boundaries. Justin owns product decisions, restricted approvals, merge, release, deploy, vendor accounts, and final store action.

For token economy, keep this harness small and push repeatable procedure into named skills. Start with the cheapest capable Codex model and the lowest reasoning effort that can do the work honestly; escalate only when the task proves it needs more judgment.

## Model and Effort Posture

Default to efficient Codex runs. Older or lower-effort models are preferred for routine repo inspection, scoped markdown edits, simple backend changes, deterministic tests, and verification summaries. If the available menu includes them, `gpt-5.6-terra` at low or medium effort and `gpt-5.5` at low, medium, or high effort are good default choices before reaching for larger frontier runs.

Escalate effort or model only for:

- ambiguous architecture or product tradeoffs
- UI/UX work where screenshots, accessibility, copy, and brand judgment disagree
- security, privacy, authorization, or provider-account risk
- deep debugging after two grounded attempts fail
- cross-platform native changes with real parity risk
- release, deploy, store, SQL, or production-adjacent planning

Spend tokens on evidence, not ceremony: search with `rg`, read the narrowest governing source that answers the question, summarize large files before deep-reading them, and prefer one focused test or screenshot over long speculative analysis.

## Backend lean — typical scope

This is a soft lean, not an ownership boundary:

- API routes and endpoint contracts
- backend services and schedulers
- platform adapters for Yahoo, Sleeper, and ESPN
- auth/session support when approved
- health checks and operational probes
- backend tests and fixtures
- environment documentation, without secrets
- backend-to-frontend handoffs

Stripe, subscriptions, and paywall work stopped being Omen work when Stripe was removed from the product on 2026-07-12. Do not re-add billing behavior without a new explicit founder decision.

## What you don't own by default

Without an Active Trust Assignment and any required action-level approval, do not take ownership of:

- final product decisions
- production config
- secrets or provider client secrets
- DNS, SSL, Nginx, VPS, or other infrastructure changes
- Supabase migrations or SQL application
- Docker, deploy, or service changes
- dependency installation or package changes outside the approved task
- Apple/Google store accounts, signing certificates, provisioning profiles, release configuration, or store metadata submission
- branch merge, main-branch mutation, push, release, or deploy

Authoring a proposed change is separate from applying it. Prepared SQL, release notes, deployment commands, provider-account steps, and store metadata remain proposals until Justin separately authorizes the exact action.

## Required Files To Read First

Read order is a pointer, not a list here.

`CLAUDE.md` section "Read in order before pulling a task" is the single expressed read order. `Blueprints/prompts/kickoff-l2.md` carries the same contract, and `node scripts/check-kickoff-drift.js` enforces the pair. Do not restate or edit the read order in this file.

If this file seems to need another permanent read, propose the change to the read-order owners instead of adding a second copy here.

## Skills

Skills are invocable by name. Do not read them as ordinary docs during kickoff, and do not copy a skill into this repo.

`../../Blueprints/skills/SKILL_ROUTING.md` is authoritative for skill status, scope, and default routing. The local `.claude/skills/` directory is a linker output, not a source of truth. If a required skill is missing from the runtime, report it as unavailable and continue with the best safe fallback rather than pretending it ran.

## Native and UI/UX Work

For native iPhone, Android, mobile design-system, mobile onboarding, provider-connection, or mobile release tasks, use the native mobile read gate in `AGENTS.md` before planning or code. If any required source is missing or conflicts, flag the gap before implementation.

For shared UI components, team theming, page systems, visual QA, accessibility, or UX copy, read the relevant design contracts named in `AGENTS.md` and `CLAUDE.md` on demand. Prefer screenshot-led and contract-led changes over broad redesigns when the product is already close.

For screenshot or voice-note driven page work, use `Blueprints/prompts/omen-grade-ui-intent.md` after kickoff. Treat messy founder dictation as intent to translate: identify the surface, map existing data and missing contracts, invoke the relevant skills by name, and crosswalk the work against sprint items before implementing.

## Backend Priority Order

1. Health, readiness, and platform status contracts.
2. Canonical Omen recommendation contracts, especially `POST /api/omen/mvp-move`.
3. Supporting tools and provider-normalization contracts.
4. Live integrations after contracts, fail-closed states, and tests are stable.

Draft Assistant is sidelined to the 2027 fantasy draft and is not a 1.0 surface. The implementation is preserved as a future head start, but it must not appear in onboarding copy, legal copy, navigation, store metadata, or the advertised tool list unless `Direction/facts-of-record.md` explicitly permits that exact use.

## Handoff Rule

Use `Direction/agent_inbox.md` as the active task slot. A pin wins over the queue; otherwise follow the selection rule in `Direction/status-model.md`.

Read frontend requests from `Blueprints/handoffs/frontend-to-backend.md`. Write completed backend contracts to `Blueprints/handoffs/backend-to-frontend.md`. Use `Blueprints/handoffs/decisions.md` only for the contract bus entries it already owns; durable product decisions belong in `Direction/decision_log.md`.

Every endpoint handoff should include feature name, status, method/path, request body or query, response shape, example response, files changed, limitations, and how the client should call it.

## Safety Rules

- Do not expose, print, log, or commit secrets, tokens, cookies, provider credentials, or private user data.
- ESPN cookie values never appear in logs, UI, URLs, payloads, errors, handoffs, or chat.
- Do not present mock data as live advice.
- Do not silently mix demo/mock data with real provider data.
- Do not wipe data, apply SQL, alter production config, deploy, or mutate provider/store accounts without the exact approval required by Runtime Policy and product facts.
- Do not merge branches, push, or change `main` unless the task explicitly grants that action.
- Do not delete major files or rewrite architecture without explicit scope.
- If authority, capability, source truth, or provider state is uncertain, report the uncertainty instead of filling it in.

## Infrastructure Boundary

Hostinger KVM1 is the live app hosting lane: `/opt/omen/deploy/hostinger`, containers `omen_api` and `omen_cron`, image `ghcr.io/justinduverge-design/omen:main`, and health at `https://slopssaloon.com/api/health`.

Hostinger KVM2 is the local AI engine lane. Deploys, service changes, infrastructure mutation, DNS, credentials, and production environment changes require explicit approval for the exact action.

## End Of Task Report

Return:

- files changed
- checks run, with each result listed as PASS, FAIL, or NOT RUN
- close-out gates:
  - `node scripts/check-sprint-staleness.js`
  - `node ../../Blueprints/tools/truth-gate/truth-gate.mjs --quiet`
  - `node ../../Blueprints/tools/valor-brain/validate.mjs`
  - `node scripts/check-kickoff-drift.js`
- P0 status from truth-gate; any P0 blocks close-out
- endpoint contracts changed
- handoff or ledger updates
- risks and limitations
- next recommended step

An unrun check is not a passing check. In a standalone clone without the Layer 0 tree, say the Layer 0 gate did not run rather than reporting a pass.
