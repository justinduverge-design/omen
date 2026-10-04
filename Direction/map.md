# Omen map

The one page every session reads first. It holds only what every task needs; the table at the bottom says
what else to read and which skills to call, per task. Budget: ~2k tokens, enforced by
`node scripts/harness-cost.js`. Why it is built this way: `Direction/reviews/2026-10-03-harness-design-outline.md`.
A rule lives once, in `Direction/facts-of-record.md`; this page links to it and never restates the history.

---

## What Omen is

A fantasy football app. The user connects an ESPN, Yahoo or Sleeper league; Omen says the best move this
week: what, why, risk, confidence, in plain English. iPhone is the active build (Android paused). Trade
Analyzer is the front door; Omen of the Week is the main event. Detail: `Direction/context.md`.

## Rules that never bend (from `Direction/facts-of-record.md`)

1. Omen is free. No billing, no Stripe.
2. ESPN cookie values are never logged, shown or echoed. Anywhere.
3. Mock data is always labeled; never mixed silently with live data.
4. Supabase SQL is review-only until the founder authorizes the exact command and blast radius: approval →
   staging → verify → production. Writing SQL is not applying it.
5. Deploys, production changes, provider credentials and store actions each need their own approval.
   Being the owner is not standing consent.
6. Required security controls and rollback proof are mandatory, not optional.
7. `connected` is not `usable`: check a provider connection can actually serve data.
8. Draft Assistant is a 2027 feature. The only mention allowed is the locked wording "2027 fantasy draft", and
   only on the marketing site or an in-app "not in this version" note. Never in store metadata, onboarding,
   legal copy, navigation or the tool list; never "coming soon" or a month. Do not delete the code.
9. `is_off_season` is the authority for the season; `week` is a clamped default, not evidence.
10. Do not merge, push to `main`, deploy, delete major files or rewrite architecture unless the task grants it.
11. Never expose, print, log or commit secrets, tokens, provider credentials or private user data.
12. Do not remove Demo Mode before the first App Store approval: it is the reviewer's only way in.
13. No third-party analytics SDK. Confidence is a band, never a percentage. No breach-detection claims.
    DM Mono is retired; the type system is two families. Before touching copy, analytics, demo or type,
    read the matching fact in `Direction/facts-of-record.md` (facts 16-21).

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
| Public copy, analytics, demo mode, type | `Direction/facts-of-record.md` facts 16-21, `Brand/brand-system.md` | `slops-ux-copy` |
| Auth, tokens, user data | `Blueprints/security-privacy.md` | `security-privacy-evidence`; request `@codex review` |
| A bug or failed check | `Direction/known_issues.md` (open only) | `slops-investigate` |
| Release, deploy, store consoles | `Direction/release/`, `Direction/release_readiness.md` | `slops-ship`, `slops-canary`, `slops-founder-admin-runbook` |
| Where a new file belongs | `RESOLVER.md` | — |
| Why something was decided | `Direction/decision_log.md` (search, do not read whole) | — |
| What a code area touches or depends on | Run `graphify update .` (about a minute, no API cost; the graph is generated and not in git), then `graphify explain "X"`, `graphify path "A" "B"` or `graphify query "question"`. Covers code only; scope in `.graphifyignore` | `slops-graphify` |

## Never read, only write to or run

`Blueprints/playbooks/skill-usage-ledger.md`, `Blueprints/done/LEDGER.md`, `Direction/decision_log.md`,
`Direction/shipped.md`, and the checks under `scripts/`. They are records and gates, not context.
