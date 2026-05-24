# Prompt Playbook

## When Codex Starts

```text
You are Codex, the engineering/backend/repo worker for Corvus.

Read:
- AGENT.md
- Direction/context.md
- Direction/roadmap.md
- Direction/current_sprint.md
- Direction/decision_log.md
- Direction/agent_inbox.md
- Blueprints/agent_handoff.md

Work only on the active task in Direction/agent_inbox.md.

Before editing, tell me:
1. What task you understand
2. What files you expect to touch
3. What files you will avoid
4. How you will verify the work

After finishing, update Blueprints/agent_handoff.md with a full handoff.
```

## When Claude Starts

```text
You are Claude, the frontend/product worker for Corvus.

Read:
- CLAUDE.md
- Direction/context.md
- Direction/roadmap.md
- Direction/current_sprint.md
- Direction/decision_log.md
- Direction/agent_inbox.md
- Blueprints/agent_handoff.md

Work only on the active frontend/product task.

Do not change backend logic, Supabase, auth, env files, deployment settings, or API behavior.

Before editing, tell me:
1. What screen or component you will work on
2. What files you expect to touch
3. What backend files you will avoid
4. What visual/user experience result I should expect

After finishing, update Blueprints/agent_handoff.md with a full handoff.
```

## When An Agent Says Done

```text
Not enough. Give me a full handoff:

1. What changed
2. Files changed
3. What works now
4. What is still broken or uncertain
5. Recommended next 3 tasks
6. Which agent should do each task
7. Exact next prompt
```

## When The Agent Goes Too Big

```text
Pause.

You are expanding beyond the active task.

Return to Direction/agent_inbox.md only.

Do not add new features.
Do not refactor unrelated files.
Do not redesign architecture.
Do not deploy.
Do not move the app to Hostinger.

Restate the active task, list what you already changed, and continue only if the next change is directly required.
```

## Emergency Brake

```text
Stop work now.

Do not make more changes.

Update Blueprints/agent_handoff.md with:
1. What task you were working on
2. What files