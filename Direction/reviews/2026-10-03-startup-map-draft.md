# Startup map — DRAFT for founder edit (2026-10-03)

**Status: proposal. Nothing reads this yet.** It is the page a session would load instead of the 92k-token
read list. It holds only what every task needs; everything else is pulled by the table below. Edit it,
then the drift-checked docs (`CLAUDE.md`, `AGENTS.md`, `AGENT.md`, `kickoff-l2.md`) get rewritten to point
here via `slops-agent-docs-refresh`. Target: under ~2k tokens once live.

Design basis: ICM (Van Clief & McDermott, arXiv 2603.16021 — load only the current stage's context, keep
reference separate from working files), "thin harness, fat skills" (gstack), grill-before-build (Pocock).
Sources are in the session notes; none of them is a requirement.

---

## What Omen is

A fantasy football app. The user connects an ESPN, Yahoo or Sleeper league; Omen says the best move this
week: what, why, risk, confidence, in plain English. iPhone is the active build (Android paused). Trade
Analyzer is the front door; Omen of the Week is the main event. Detail: `Direction/context.md`.

## Rules that never bend (from `Direction/facts-of-record.md`)

1. Omen is free. No billing, no Stripe.
2. ESPN cookie values are never logged, shown or echoed. Anywhere.
3. Mock data is always labeled; never mixed silently with live data.
4. Supabase SQL is review-only until the founder authorizes the exact command: approval → staging →
   verify → production.
5. Deploys, production changes, provider credentials and store actions each need their own approval.
   Being the owner is not standing consent.
6. Required security controls and rollback proof are mandatory, not optional.
7. `connected` is not `usable`: check a provider connection can actually serve data.
8. Draft Assistant is a 2027 feature; the only allowed mention is the locked wording "2027 fantasy draft".
9. `is_off_season` is the authority for the season; `week` is a clamped default, not evidence.

## Right now

Focus: database redo and the Tuesday 2026-10-06 release prep. Pinned task: `Direction/agent_inbox.md`.
What is shipped and open: `node scripts/shipped.js` → `Direction/shipped.md`.

## How work flows

Plan (grill the plan before code) → build → review the diff **before** the PR → PR → merge. Review policy
and the risky-PR list: `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md` § Review. Close-out: only what
`Blueprints/definition-of-done.md` requires for the type of work.

## When you touch X, read Y (and call Z)

| You are touching | Read | Call by name |
|---|---|---|
| Database, migrations, RLS, erase/export | `Blueprints/rebuild/omen-database-redo-v1.md`, `sql/2026-10-01-redo/`, latest `Blueprints/handoffs/2026-10-0*` | `slops-api-hardening`, `security-privacy-evidence`, `rbac-risk-review`; request `@codex review` |
| ESPN / Yahoo / Sleeper connection or sync | `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md`, `Blueprints/specs/espn-connect-guide-v1.md` | `slops-provider-resilience` |
| API routes, server code | `Blueprints/api-routes.md`, `test/` | `slops-tdd`, `slops-api-hardening` |
| Native iPhone screen | the seven-file native gate in `CLAUDE.md`, approved Figma node | `slops-native-screen-design`, `slops-figma-to-native`, `slops-native-sim-drive`, `slops-native-ui-audit` |
| Shared UI components or team theming | `Blueprints/specs/design/component-lock-v1.md`, `team-theme-contract-v1.md` | `slops-ux-copy` for words |
| Recommendations / scoring / football data | `Blueprints/specs/football-data/`, `Direction/football-data-and-schemes-research.md` | `slops-tdd` |
| Auth, tokens, user data | `Blueprints/security-privacy.md` | `security-privacy-evidence`; request `@codex review` |
| A bug or failed check | `Direction/known_issues.md` (open only) | `slops-investigate` |
| Release, deploy, store consoles | `Direction/release/`, `Direction/release_readiness.md` | `slops-ship`, `slops-canary`, `slops-founder-admin-runbook` |
| Where a new file belongs | `RESOLVER.md` | — |
| Why something was decided | `Direction/decision_log.md` (search, do not read whole) | — |
| What a code area touches | `graphify-out/` once refreshed (see skill audit) | — |

## Never read, only write to or run

`Blueprints/playbooks/skill-usage-ledger.md`, `Blueprints/done/LEDGER.md`, `Direction/decision_log.md`,
`Direction/shipped.md`, and the checks under `scripts/`. They are records and gates, not context.

---

## Open questions for the founder

- Rule 8 and rules 1–9 are my reading of `facts-of-record.md` facts 1, 6, 7, 8, 9, 10, 12, 13, 14, 15. Is
  anything missing that a session must know before touching code? Facts 11 (Yahoo access state) and 16
  (League section order) are state, not rules, so they stay in `facts-of-record.md` and the specs.
- Should the native gate stay as a seven-file list in the map, or collapse to one pointer?
- The "Call by name" column assumes `slops-provider-resilience`, `slops-api-hardening` and
  `slops-figma-to-native` are worth wiring in; they have zero recorded use (skill audit). Keep, or drop
  them from the table?
