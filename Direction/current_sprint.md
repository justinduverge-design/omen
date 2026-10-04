# Omen Current Sprint

**Rebuilt:** 2026-10-03. The previous file (202 KB, 85 non-closed items, last updated 2026-09-27) is archived
verbatim at `Archive/sprints/2026-10-03-current_sprint-full.md`. Its item statuses were not re-verified; most
work since 2026-09-27 shipped from PRs, not sprint items. What has shipped: `Direction/shipped.md`
(regenerate with `node scripts/shipped.js`).

**Purpose:** active work only. States, `Claim:`/`Evidence:` and blocker grammar: `Direction/status-model.md`.
A pin in `Direction/agent_inbox.md` overrides this file. Do not auto-pull database, deploy, production,
founder, or store work.

## Active

### FI-LEAGUE — Football intelligence for the whole league (the "why" behind every call)

- **Status:** IN_PROGRESS
- **Claim:** 2026-10-03 Claude — league-wide Scheme DNA, team signals, serving table, nightly job, and the start/sit and Omen call lines
- **Priority:** P0. The founder holds the beta until this is on the phone.
- **Cost:** large
- **Do not touch:** `mobile/` (the phone session owns it); production writes beyond what the founder approved under plan B (the serving table and the nightly publish)
- **Scope and running checklist:** `Blueprints/handoffs/2026-10-03-football-intelligence-league-build.md`. Tick boxes there as work lands.
- **Done when:** every team has a published system signal, and the founder sees team-system and usage lines on the phone for players on any team.

### RELEASE-OCT-6 — Tuesday 2026-10-06 iOS release

- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — store submission and any App Store Connect action
- **Priority:** P0
- **Cost:** medium
- **Do not touch:** the database and contract redo; store consoles without approval
- **Scope:** `Direction/2026-10-01-tuesday-oct-6-release-prep.md` (build guard, version bump, connect
  confirmation wording, Command/League waiver disagreement, smaller fixes). Store actions are founder-gated.
- **Done when:** the founder ships the build; each "must fix" item in that file is done or descoped.

## Needs a decision

- **T2-FindATradeGenerator** — every PR it cited has merged (list in the archive file), but it was never
  moved past `READY`. Verify against `Direction/shipped.md`, then close with a `Closure:`.
- **Archived backlog** — 85 items. Before pulling one back, confirm with `Direction/shipped.md` that it has
  not already shipped, then copy it here with a fresh `Status:`.
