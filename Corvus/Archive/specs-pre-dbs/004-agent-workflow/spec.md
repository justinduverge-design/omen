# Spec: Claude/Codex Agent Workflow

## Status

Active

## Decision

Claude and Codex are the main workers.

ChatGPT is the foreman.

Gemini is a second-opinion/critic tool.

Local Gemma is optional and not central right now.

## Roles

### ChatGPT

- Strategy
- Prompt writing
- Product decisions
- Handoff interpretation
- Sprint planning
- Spec creation

### Codex

- Backend
- Repo structure
- Build errors
- API contracts
- Supabase
- Auth/session logic
- Tests
- Technical documentation

### Claude

- Frontend
- UX
- Landing page
- App screens
- Copy
- Visual polish
- Mobile responsiveness

### Gemini

- Research critique
- Second opinions
- Marketing brainstorming
- Alternative recommendations

## Handoff Rule

Every agent must end with:

1. What I completed
2. Files changed
3. What works now
4. What is still broken or uncertain
5. Recommended next 3 tasks
6. Which agent should do each task
7. Exact next prompt to use

## Continue Rule

If Claude or Codex asks to move to the next phase:

- Do not approve automatically.
- Ask for a handoff first.
- Choose the next task manually.

## Emergency Brake

If an agent goes out of scope:

```text
Stop work now.
Do not make more changes.
Update agent_handoff.md with what changed, what worked, what failed, and the exact next prompt.
```

## Current Boundaries

- No deployment unless explicitly requested.
- No Hostinger app cutover.
- No secrets changes.
- No `.env` changes.
- No DNS/SSL/Nginx changes.
