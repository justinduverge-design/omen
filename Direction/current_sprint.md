# Omen Current Sprint

**Rebuilt:** 2026-10-03. The previous file (202 KB, 85 non-closed items, last updated 2026-09-27) is archived
verbatim at `Archive/sprints/2026-10-03-current_sprint-full.md`. Its item statuses were not re-verified; most
work since 2026-09-27 shipped from PRs, not sprint items. What has shipped: `Direction/shipped.md`
(regenerate with `node scripts/shipped.js`).

**Purpose:** active work only. States, `Claim:`/`Evidence:` and blocker grammar: `Direction/status-model.md`.
A pin in `Direction/agent_inbox.md` overrides this file. Do not auto-pull database, deploy, production,
founder, or store work.

## Active

### DB-REDO-PROD — Prepare production for the database redo (do not run it)

- **Status:** BLOCKED
- **Blocked by:** founder go/no-go. Applying SQL is a separate, explicitly authorized step (fact 8).
- **Unblock:** founder reads the go/no-go sheet and authorizes an exact command and blast radius.
- **Scope:** `Blueprints/handoffs/2026-10-02-prep-for-production-brief.md`, `Blueprints/rebuild/omen-database-redo-v1.md`,
  `sql/2026-10-01-redo/`. Open PRs: #529 (step 12), #530 (runbook, go/no-go, dry-run tooling).
- **Done when:** the redo is applied step by step on production with founder approval and verified.

### RELEASE-OCT-6 — Tuesday 2026-10-06 iOS release

- **Status:** READY
- **Scope:** `Direction/2026-10-01-tuesday-oct-6-release-prep.md` (build guard, version bump, connect
  confirmation wording, Command/League waiver disagreement, smaller fixes). Store actions are founder-gated.
- **Done when:** the founder ships the build; each "must fix" item in that file is done or descoped.

## Needs a decision

- **T2-FindATradeGenerator** — every PR it cited has merged (list in the archive file), but it was never
  moved past `READY`. Verify against `Direction/shipped.md`, then close with a `Closure:`.
- **Archived backlog** — 85 items. Before pulling one back, confirm with `Direction/shipped.md` that it has
  not already shipped, then copy it here with a fresh `Status:`.
