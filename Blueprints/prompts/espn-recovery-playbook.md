# ESPN Recovery Playbook Prompt

Use this prompt for the next Corvus product/documentation pass.

```text
You are Codex working on Corvus product/backend coordination for the Slops Saloon `ssffmvp` repo.

Create the ESPN recovery playbook for Corvus.

Do not implement code yet.

Objective:
Define what the user should see, do, and understand when ESPN connection or import recovery is needed. This playbook should turn the existing ESPN recovery states into clear product guidance that Claude/frontend and Codex/backend can both follow later.

Read first:
- DBS_INDEX.md
- README.md
- Corvus/README.md
- Corvus/Direction/context.md
- Corvus/Direction/decision_log.md
- Corvus/Blueprints/specs/omen-mvp-move.md
- Blueprints/handoffs/backend-to-frontend.md
- frontend/src/pages/Account.jsx
- frontend/src/pages/Omen.jsx
- src/routes/platforms.js
- src/adapters/espn.js
- src/services/espnAuth.js
- src/routes/espn.js

Write the playbook to:
Corvus/Blueprints/playbooks/espn-recovery.md

Scope:
- Product and UX recovery guidance only.
- Include backend/frontend contract notes where they clarify the playbook.
- Do not change app source code.
- Do not change secrets, Vault, Supabase schema, migrations, deployment, Docker, DNS, SSL, payments, or infrastructure.
- Do not expose ESPN cookies, logged values, or examples that look like real credentials.

Required playbook sections:
- Purpose
- When ESPN recovery appears
- Recovery state map
- User-facing copy by state
- Frontend behavior by state
- Backend behavior by state
- Account page recovery flow
- Omen / MVP Move recovery flow
- Security and privacy rules
- Analytics or logging notes
- QA checklist
- Open decisions
- Next implementation prompt

Recovery states to cover:
- `espn_reauth_required`
- `espn_league_context_missing`
- `espn_import_blocked`
- `espn_recovery_needed`

For each state, define:
- what probably caused it
- what the user should see
- what CTA should appear
- what the user should do next
- what frontend route or surface should handle it
- what backend should return or avoid returning
- what must never be logged or displayed
- when retry is appropriate
- when reconnect is appropriate
- when league selection or re-import is appropriate

Product rules:
- ESPN is essential but risky.
- Treat ESPN failures as recoverable product states, not generic errors.
- Keep copy plain-English and calm.
- Do not blame the user.
- Do not expose implementation details unless they help the user complete recovery.
- Do not expose raw `ESPN_S2`, `SWID`, Vault secret ids, cookies, auth headers, or response bodies.
- A user should always know whether to retry, reconnect ESPN, select a league, or wait.

Output requirements:
- Use the current DBS markdown style: short sections, direct headings, practical bullets.
- Keep the playbook specific enough for Claude to wire UI copy and for Codex to validate backend state handling later.
- Include a final "Next Implementation Prompt" section with a ready-to-run prompt for the next coding pass.

Validation:
- After writing the playbook, check that all four ESPN recovery states are covered.
- Check that security/privacy rules are explicit.
- Check that the playbook does not contain fake secrets or credential-like examples.
- Do not run frontend or backend tests because this is a documentation/playbook pass.

Completion report:
Report:
- file created
- recovery states covered
- key decisions encoded
- open decisions left for Justin
- next recommended implementation pass
```
