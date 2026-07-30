# MANIFEST — L2 planning pipeline, pre-status-model

**Archive date:** 2026-07-29
**Status: HISTORICAL ONLY** — nothing in this folder is active authority.
**Reason this archive exists:** the planning pipeline moved from a checkbox mechanic
(`- [ ]` / `- [x]`, "pull the next 5 unchecked items", "tick the item") to the status model.
L2 also carried three auto-loading wrappers inside `Direction/` that duplicated the three at
the repo root, so agent behavior had two sources of truth depending on which loaded.

## Why these filenames end in `.archived.md`

`CLAUDE.md`, `AGENTS.md`, and `AGENT.md` are **auto-loading wrapper filenames** — agent tooling
reads them automatically based on the name alone. Archiving them under their original names
would keep them loading as if they were live doctrine. The filenames are therefore renamed
**inert**; the file contents are byte-identical to the originals and were moved with `git mv`.

## Artifacts

### 1. `Direction/CLAUDE.md` → `Direction/CLAUDE.archived.md`

- **Type:** auto-loading agent wrapper (Claude)
- **Reason archived:** duplicated the root `CLAUDE.md` one directory below it. Its read-first
  list and handoff rules had drifted from the root wrapper's.
- **Successor authority:** `CLAUDE.md` (Omen repo root), plus
  `Blueprints/prompts/kickoff-frontend-claude.md` for the session flow.
- **Prior active inbound references:** none in active surfaces. `Direction/agent_inbox.md`
  lists `CLAUDE.md` under "Do not touch unless explicitly pinned", which refers to the root
  wrapper, not this copy.

### 2. `Direction/AGENTS.md` → `Direction/AGENTS.archived.md`

- **Type:** auto-loading agent wrapper (Codex/generic)
- **Reason archived:** duplicated the root `AGENTS.md` one directory below it. It also carried
  stale stack facts — it listed **Stripe** under "Payments" and in its §5 decision table, but
  Stripe was fully removed from Omen on 2026-07-12 and Omen is free indefinitely
  (`Direction/facts-of-record.md` fact 1).
- **Successor authority:** `AGENTS.md` (Omen repo root) for identity/scope/patterns, and
  `Direction/facts-of-record.md` for current product facts.
- **Prior active inbound references:** one historical mention in
  `Blueprints/specs/omen-operational-rename-cutover.md:87`, which is a record and is left
  unedited.

### 3. `Direction/AGENT.md` → `Direction/AGENT.archived.md`

- **Type:** auto-loading agent wrapper (Codex backend)
- **Reason archived:** duplicated the root `AGENT.md`. **It held better doctrine than the file
  above it** — it carried the vendor-agnostic lane rule while the root `AGENT.md` still
  asserted hard vendor ownership ("Claude Code owns frontend/app UI planning… Codex owns
  backend systems"). Per the doctrine-extraction gate, that rule was extracted and verified
  live at the successor **before** this file was archived; it was not lost.
- **Extracted doctrine, now live at `AGENT.md`:** "Lanes are vendor-agnostic — any agent may
  pull any agent-buildable item from any lane in `Direction/current_sprint.md`. Pick by
  readiness, blockers, and token-cost, not by historical convention. Justin owns product
  decisions."
- **Successor authority:** `AGENT.md` (Omen repo root), which now carries the vendor-agnostic
  lane doctrine in place of the vendor-ownership text, with the backend capability list
  retained as a stated soft lean rather than an ownership boundary.
- **Prior active inbound references:** `Blueprints/prompts/kickoff-backend-codex.md:12` names
  `AGENT.md` — the root wrapper, which is the surviving successor, so that reference stays
  valid.
