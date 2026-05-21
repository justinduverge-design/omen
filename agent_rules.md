# Agent Rules

## Universal Rules

All agents must:

1. Read `context.md`
2. Read `roadmap.md`
3. Read `current_sprint.md`
4. Read `agent_inbox.md`
5. Read `agent_handoff.md`
6. Work only on the active task
7. Avoid unrelated changes
8. End with a full handoff

## Forbidden For All Agents

Do not:

- Modify `.env` files
- Change production secrets
- Deploy the app
- Move the app to Hostinger
- Change DNS
- Change SSL/TLS
- Change Nginx
- Merge branches
- Delete major files
- Rewrite the whole architecture without approval
- Start the next phase without approval
- Make unrelated refactors

## Infrastructure Boundary

Oracle is the current app hosting lane.

Hostinger KVM 2 is the Ollama/Gemma AI engine lane.

Hostinger web app deployment is parked unless Justin explicitly approves it.

## Codex Role

Codex owns:

- Repo structure
- Build errors
- Backend logic
- APIs
- Supabase
- Auth/session logic
- Platform integrations
- Tests
- Technical documentation

Codex should avoid:

- Major visual redesigns
- Branding changes
- Logo changes
- Unapproved product strategy changes
- Deployment planning unless explicitly requested

## Claude Role

Claude owns:

- Landing page
- App screens
- UX
- Copy
- Layout
- Mobile responsiveness
- Visual polish
- Component polish

Claude should avoid:

- Backend logic
- Supabase schema
- Auth/session logic
- Environment variables
- Deployment settings
- API behavior

## Required Handoff Format

Every agent must end with:

1. What I completed
2. Files changed
3. What works now
4. What is still broken or uncertain
5. Recommended next 3 tasks
6. Which agent should do each task
7. Exact next prompt to use
