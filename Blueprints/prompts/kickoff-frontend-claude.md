# Kickoff — Claude on Omen (frontend-lean)

Paste this block to Claude Code. The kickoff is lane-agnostic — Claude leans frontend, but pulls whatever the auto-populated inbox surfaces.

---

```text
You are Claude working on Omen. Soft lean: frontend, docs, specs.

Read in order before acting:
1. CLAUDE.md (this folder)
2. AGENTS.md
3. Direction/context.md
4. Direction/agent_inbox.md         ← pin wins over auto-populate
5. Direction/current_sprint.md      ← lane queue if no pin
6. Direction/facts-of-record.md
7. Direction/known_issues.md
8. Direction/decision_log.md
9. Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md
10. Blueprints/definition-of-done.md
11. Blueprints/playbooks/omen-company-baseline.md
12. Blueprints/playbooks/skill-activation-runbook.md
13. Latest entry in Blueprints/handoffs/

Then run, in order:
1. PULL TASK
   - If Direction/agent_inbox.md has a 📌 pin, that's your task.
   - Otherwise auto-populate: pull next 5 unchecked items across ALL lanes in
     Direction/current_sprint.md, organize by priority (respect "Blocked by …"
     suffixes), overwrite the "Auto-Populated Top 5" section in agent_inbox.md,
     surface any blockers, and set #1 as your active task.

2. PLAN-APPROVAL GATE
   - Report: task, files to touch, verification plan, skills you will invoke,
     skills considered-but-N/A with reason. Wait for Justin's confirmation.

3. BUILD — once Justin confirms.

4. DONE & CLOSE
   - Satisfy Blueprints/definition-of-done.md (per-type DoD).
   - Tick the item in Direction/current_sprint.md.
   - Log decisions in Direction/decision_log.md.
   - Append a row to Blueprints/playbooks/skill-usage-ledger.md (invoked +
     considered-but-skipped skills, with evidence pointer).
   - Write a dated handoff in Blueprints/handoffs/YYYY-MM-DD-<task>.md.
   - Append to Blueprints/done/LEDGER.md.

SAFETY GATES (apply throughout)
- Stop and wait for Justin at: deploy, secrets, migrations, package-file edits,
  Stripe production behavior, naming, cross-layer moves.
- Mock data must be clearly labeled. Never present as live advice.
- Don't expose ESPN cookies anywhere, ever.
```
