# Codex — refresh your own AGENT.md

**One-shot. Founder-issued 2026-09-12.** Paste the block below into Codex, in the Omen repo.

Context for the reader: the 2026-09-12 agent-docs pass rewrote `CLAUDE.md` and
`kickoff-l2.md` as one contract and converted `AGENTS.md` and `AGENT.md` from read-order
restatements into pointers. That pass deliberately stopped at the pointer. **Codex owns the rest of
`AGENT.md` and should update it itself** — a runtime describing its own ownership, scope, and report
shape is the one doc it is best placed to write.

---

```text
You are Codex, working in the Omen repo (Layer 2).

TASK: update AGENT.md — your own context file. You own it. Do not rewrite AGENTS.md
or CLAUDE.md; propose changes to those instead (see BOUNDARIES).

STEP 0 — capability and authority
  Confirm this session's actual capabilities, then read Runtime Policy §8/§9 in
  Slops-OS/Blueprints/agents/AGENT_INDEX.md. Report the tier you are operating at.

STEP 1 — read
  AGENT.md, AGENTS.md, CLAUDE.md, RESOLVER.md, Direction/facts-of-record.md.
  Then Blueprints/prompts/PROMPTS_CHANGELOG.md, entry 2026-09-12 — it states what
  changed and why, so you are not re-deriving it.

STEP 2 — fix what is stale in AGENT.md
  a. The read-order section is now a POINTER to CLAUDE.md. Leave it a pointer.
     Do not restate the list. A second copy is a second source of truth and the
     copy is the one that goes stale — that is what this pass just removed.
  b. Every remaining section is yours: Role, Backend lean, What you don't own,
     Backend Priority Order, Handoff Rule, Safety Rules, Infrastructure Boundary,
     End Of Task Report. Check each against current truth and correct it.
  c. Close-out changed. It now runs four gates, and a P0 BLOCKS close-out:
       node scripts/check-sprint-staleness.js
       node ../../Blueprints/tools/truth-gate/truth-gate.mjs --quiet
       node ../../Blueprints/tools/valor-brain/validate.mjs
       node scripts/check-kickoff-drift.js
     An unrun check is not a passing check. In a standalone clone without the L0
     tree, say the gate did not run rather than reporting a pass.
     Make sure your End Of Task Report shape carries the gate result.
  d. Skills are INVOCABLE BY NAME as of 2026-09-12 — 61 are linked into
     .claude/skills/. Do not read them as files; do not copy one into this repo.
     Slops-OS/Blueprints/skills/SKILL_ROUTING.md is authoritative for status and
     scope. If your file describes skills as documents to read, fix that.
  e. Your "Product shape" section duplicates Direction/context.md and
     Direction/facts-of-record.md, both of which are in the read order. On
     2026-09-12 the copies in CLAUDE.md and AGENTS.md were found to have
     DRIFTED from the facts of record -- both still said Draft Assistant was
     "cut from 1.0" after that was extended to the 2027 season on 2026-08-11.
     Replace yours the same way: say in two sentences what Omen IS -- a fantasy
     football management app that tells a user the best move to make this week
     and why -- then POINT at context.md and facts-of-record.md. Do not restate
     constraints. A copy of a fact is a second source of truth and the copy is
     the one that goes stale.
  f. Entries appended TODAY to the append-only records (decision_log,
     sprints_completed, done/LEDGER, skill-usage-ledger) cite repo-relative paths
     that resolve today. Old entries stay as written.

STEP 3 — one finding to adjudicate, do not silently fix
  AGENTS.md line 1 reads "# Omen — Codex Context". AGENTS.md is the SHARED file
  every runtime reads; AGENT.md is the Codex-specific one. The title is inverted,
  and both files warn readers about exactly this inversion. It also duplicates
  CLAUDE.md's section structure.
  Report this to the founder with a recommendation. Do not rewrite AGENTS.md in
  this task — it is shared, and changing it affects every runtime.

BOUNDARIES
  - AGENT.md only. Propose, never apply, changes to AGENTS.md or CLAUDE.md.
  - Never change authority, permissions, tiers, or runtime policy. Rewording a
    permission is changing it. If a rewrite would alter what any agent may do,
    stop and raise it.
  - Do not touch the read order. It is one contract across CLAUDE.md and
    kickoff-l2.md, enforced by check-kickoff-drift.js.
  - Explicit-path commits. Never `git add -A`.

DONE WHEN
  - AGENT.md has no stale claim: every section matches current truth or says
    plainly when it stopped being true and what would falsify it.
  - AGENT.md still points at CLAUDE.md for the read order and restates none of it.
  - Your End Of Task Report shape includes the gate results.
  - node scripts/check-kickoff-drift.js passes.
  - node ../../Blueprints/tools/truth-gate/truth-gate.mjs --quiet reports 0 P0.
  - The AGENTS.md title finding is reported, not fixed.
  - A row is appended to Blueprints/playbooks/skill-usage-ledger.md.
```
