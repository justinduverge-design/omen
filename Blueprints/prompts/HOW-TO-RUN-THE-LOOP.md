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
2. **Agent self-pulls** — reads inbox, honors pin, otherwise selects up to 5 `Status: READY` items from the sprint across all lanes, ordered by the selection rule, and claims one.
3. **Plan approval gate** — agent reports task / files / verification plan / selected skills and conditional-skill N/A reasons. You confirm or correct.
4. **Agent builds, verifies, commits, closes** — follows the company-baseline playbook, satisfies DoD, writes handoff, and logs decisions. Closing means advancing the item through the **status model** (`Blueprints/agent-modules/status-model.md`, L0): set `Status: VERIFIED` with an `Evidence:` pointer, then `Status: CLOSED` with a `Closure:` value once it lands in `Direction/sprints_completed.md`. `CLOSED` is terminal.
5. **Agent leaves a skill receipt** — records evidence in `Blueprints/playbooks/skill-usage-ledger.md` and routes any procedure gap through the retro/backlog.

## Native mobile design loop

For any iPhone, Android, onboarding, provider, native component, or mobile release task, the normal five steps are expanded by `Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`:

1. Read the native source-of-truth stack and the approved Figma node.
2. Define the state/API/security contract before visual or code work.
3. Research current Apple/Android behavior when it is uncertain.
4. Make the Figma/component contract, then build the smallest approved native slice.
5. Attach device, accessibility, state, Figma, and security evidence before review.

The iPhone path uses Liquid Glass only at system-chrome/control boundaries. Android remains Material 3-native. A visual concept is not implementation approval until it has the required state and evidence contract.

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
