# How to Run the Build Loop

One short instruction per task. The folder carries the context; you approve the gates.

## The pieces

- **Task slot:** `Direction/agent_inbox.md` — top-5 auto-populated by the agent + optional pin
- **Queue:** `Direction/current_sprint.md` — full list, lanes (Frontend / Backend / Ops / Verify / Decisions / Tech debt)
- **Kickoffs:** `Blueprints/prompts/kickoff-frontend-claude.md`, `Blueprints/prompts/kickoff-backend-codex.md`
- **Modules:** inlined inside each kickoff prompt — pull-task, plan-approval, done-and-close, and safety-gates sections.
- **Self-check:** `Blueprints/definition-of-done.md`
- **Company baseline:** `Blueprints/playbooks/omen-company-baseline.md`
- **Skill routing:** `Blueprints/playbooks/skill-activation-runbook.md`
- **Skill evidence:** `Blueprints/playbooks/skill-usage-ledger.md`
- **Contract bus:** `Blueprints/handoffs/backend-to-frontend.md`, `frontend-to-backend.md`
- **Memory:** `Direction/decision_log.md` + facts-of-record + session handoffs

## Each task — 5 steps

1. **Paste the kickoff** for the agent you want to run (frontend-claude or backend-codex).
2. **Agent self-pulls** — reads inbox, honors pin, otherwise organizes top-5 from sprint across all lanes.
3. **Plan approval gate** — agent reports task / files / verification plan / selected skills and conditional-skill N/A reasons. You confirm or correct.
4. **Agent builds, verifies, commits, closes** — follows the company-baseline playbook, satisfies DoD, writes handoff, and logs decisions.
5. **Agent leaves a skill receipt** — records evidence in `Blueprints/playbooks/skill-usage-ledger.md` and routes any procedure gap through the retro/backlog.

## Pin override

If you want a specific task no matter what the auto-pull surfaces:

```text
📌 Phase 1.10 — Offseason voice anchor
```

Place at the top of `Direction/agent_inbox.md`. The agent reads pin, skips auto-populate, works the pinned item.

## Soft preference, not hard discipline

Claude leans frontend / docs / spec. Codex leans backend / code-volume / tests. **Either agent can pull any item.** The agent surfaces "outside my lean + high-risk — confirm?" only when both conditions are true. Use the pin if you want a specific assignment.

## Gates

You stay in only at: deploy, secrets, migrations, package-file edits, Stripe production behavior, naming, cross-layer moves. The agent stops there and waits.
