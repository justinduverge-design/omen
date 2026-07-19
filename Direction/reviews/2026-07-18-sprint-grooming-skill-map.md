# Sprint Grooming and Skill-Routing Audit

**Date:** 2026-07-18  
**Repository:** `justinduverge-design/omen`  
**Scope:** `Direction/current_sprint.md`, `Direction/agent_inbox.md`, completed-history routing, repo coherence, skill activation, and next Claude/Codex/Jules handoff order.

## Executive verdict

The old sprint had strong individual task detail but had stopped functioning as an active queue. It mixed four different kinds of truth:

1. current open work;
2. giant completed receipts;
3. local-but-not-merged status snapshots;
4. stale items already superseded by later PRs.

The result was expensive agent context, stale auto-pulls, duplicate work risk, and weak use of the SLOPS skill library.

This grooming pass converts the sprint into an execution contract. Every active item now carries priority, cost, blockers, agent/gate status, skills, done-when, evidence, and boundaries. `agent_inbox.md` now gives a live pull order instead of preserving a diary of old auto-population sessions.

## Sources inspected

- `Direction/current_sprint.md`
- `Direction/agent_inbox.md`
- `Direction/sprints_completed.md`
- `Direction/decision_log.md`
- `Blueprints/playbooks/sprint-synergy.md`
- `Blueprints/playbooks/skill-activation-runbook.md`
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/backlog/ui-component-system.md`
- `Blueprints/specs/design/omen-ui-north-star-v1.md`
- current source references for the transparent lockup
- open PRs #132 and #140
- recent PRs through #139, including the July 12–18 merge sequence

## Core changes

### 1. Active queue only

`Direction/current_sprint.md` now contains active/gated/deferred work rather than completed implementation receipts. History remains in PRs, handoffs, `Direction/sprints_completed.md`, and `Blueprints/done/LEDGER.md`.

### 2. Skills are part of task scope

Each item lists either an explicit skill set or a named bundle. The bundles are grounded in `Blueprints/playbooks/skill-activation-runbook.md`:

- Core docs
- Core implementation
- UI / UX
- Trust boundary
- Data / ingest
- AI path
- Release / production
- Design contract

A task cannot claim clean completion without recording actual skill use, skips/substitutions, and one improvement verdict.

### 3. Next work follows current product reality

The top sequence is now:

1. unify the Omen recommendation contract;
2. build `DecisionBrief` from that contract;
3. migrate Draft Assistant;
4. migrate Connect League;
5. build the real Trade Pulse endpoint.

This order avoids migrating the Omen recommendation page onto a contract that is about to change, while still taking advantage of the component system already merged.

### 4. Claude/Codex/Jules guidance is advisory, not ownership

- Jules is best used for small component-only or precisely serialized migration briefs.
- Codex is best used for behavior-preserving migrations, backend/API work, and regression verification.
- Claude is best used for doctrine/spec reconciliation, large-context synthesis, copy/legal review, and product-gap analysis.

Agents remain lane-agnostic. Tool fit, blockers, context cost, and skill availability decide the pull.

## Stale and completed items removed from active pull consideration

| Prior item | Current truth | Evidence / reason |
|---|---|---|
| Operational rename approval | Complete | Repo and KVM1 deploy identity already operate as Omen; prior operational receipts remain in history. |
| Orphaned `src/omen_gdpr.js` cleanup | Complete | PR #119 merged. |
| Account subscription card removal | Superseded/complete | Full Stripe/paywall removal merged via PRs #117 and #118. |
| Stripe integration removal tech debt | Code complete on `main` | PRs #117/#118; only separately gated production schema cleanup remains. |
| Phase 4.20b public legal/support pages | Complete | PR #121 merged. |
| Phase 4.20d copy/claims audit | Complete | PR #115 merged. |
| ESPN mobile onboarding + public setup guide + walkthrough production | Complete as build work | PR #122 merged; regression test fix PR #123. Only production verification remains. |
| Phase 4.21 transparent lockup swap | Complete | PR #120 merged; current `Header.jsx`, `Landing.jsx`, and `OmenLanding.jsx` use `/omen-horizontal-lockup-transparent.png`; asset exists in `frontend/public/`. |
| UI primitive Phase A work | Complete | PRs #125, #127–#138. |
| Trade Analyzer primitive migration | Complete | PR #139 merged. |
| Per-team design docs and chant implementation as active sprint work | Removed from active queue | Team-based app theming was removed via PR #114; active North Star treats team skins as future-only. |
| Paid-launch / Omen Pro operating language | Retired | Omen is free indefinitely; Stripe/paywall implementation was removed. |

## Open review gates

### PR #140 — SVG masters

This is a real active brand asset review, not another “create the SVG” task. It requires visual/structure/size-tier review before merge. App wiring and favicon regeneration remain follow-up work.

### PR #132 — Master Design System Blueprint

This remains proposed and requires founder disposition. It also needs reconciliation against newer SVG work and merged UI-system changes before it can become active authority.

## Coherence conflicts surfaced

### Full app-store build vs relay-only native shell

The old sprint carried both Phase 4.20 full app-store hardening and Phase 5 relay-only iOS shell work without a single authoritative mobile product scope. A P0 decision item now forces that reconciliation before more native work.

### Omen recommendation duplication

The sprint previously told agents to merge `mvp-move` into Omen but did not force a contract-first step. The groomed queue splits contract synthesis from implementation and page migration.

### Completed source vs stale sprint state

The old sprint still described transparent-logo, ESPN-guide, legal-page, GDPR, and Stripe-removal work as open or local-only after those changes had merged. The new queue uses current `main` and recent PR state.

### Team-design backlog vs removed runtime system

The old design-doc/chant lane still assumed active team theming. It is no longer valid current sprint scope. Those materials may remain as future research, but agents must not build them without a new approved theme-pack plan.

## Treatment of `Direction/sprints_completed.md`

This pass audited but did not destructively rewrite `Direction/sprints_completed.md`.

Reason:

- the goal was to remove completed receipts from the active queue, not rewrite historical evidence;
- recent PRs and dated handoffs already preserve the immutable details;
- bulk editing the history file would add risk without improving task selection.

Future closeouts should add short summaries there using the existing sprint-synergy template. The active sprint should not paste those receipts back in.

## Skill-improvement loop

Every future closeout must answer:

1. Which skills were selected?
2. Which were actually invoked?
3. Which were skipped or substituted, and why?
4. What evidence did each skill produce?
5. Did the skill materially improve the result?
6. What instruction was unclear, wasteful, missing, or overly broad?
7. Should the skill be corrected, split, parked, retired, or left unchanged?

Repeated gaps route through `slops-retro`. A new or revised reusable procedure routes through `slops-skill-author` only when repeated evidence justifies it.

## Recommended first pilot

Pair the **F3 company-baseline skill-receipt pilot** with **B1 Unified Omen recommendation contract**.

Why:

- it is important enough to exercise planning, gap analysis, workflow-state, AI-review, security, and context-writing skills;
- it does not require production mutation;
- its artifacts are easy to inspect for whether the skills added value;
- it directly controls several downstream implementation tasks.

## Files changed by this grooming pass

- `Direction/current_sprint.md`
- `Direction/agent_inbox.md`
- `Direction/reviews/2026-07-18-sprint-grooming-skill-map.md`
- `Blueprints/handoffs/2026-07-18-sprint-grooming-skill-routing.md`

## Explicit non-changes

- no app code;
- no package or dependency files;
- no SQL or Supabase mutation;
- no deploy/workflow configuration;
- no secrets or environment values;
- no production action;
- no merge of PR #132 or PR #140.
