# Omen Known Issues

Last updated: 2026-07-04

## Current Context Risks

- Some historical docs may still reference retired pre-DBS paths.
- Some archive/checkpoint files describe older launch states and should not be treated as current truth.
- Justin may still rewrite `AGENT.md` and `CLAUDE.md`; until then, follow `AGENTS.md`, `AGENT.md`, `Direction/`, and `Blueprints/handoffs/`.

## Product Risks

- Stripe webhook recovery is the remaining pre-launch ops gate: the follow-up is prepared locally but needs approved deploy, failed-event resend, and `200` confirmation.
- `POST /api/optimizer/mvp-move` and `POST /api/omen/mvp-move` still need a product-tier architecture decision.
- Recovery analytics timing is still open.
- Load testing for Omen, Trade Analyzer, and dashboard summary is still pending; local script exists.

## Backend / Data Risks

- Yahoo live features depend on valid OAuth tokens and usable Yahoo league ids.
- ESPN remains high-value and fragile because it depends on user-provided cookies.
- ESPN connect input normalization is prepared locally but not production behavior until deployed.
- Sleeper/ESPN live Omen code paths are wired but still need real-account staging QA before public claims.
- Docs still need one final truth pass on exactly when Sleeper and ESPN Omen reach `ready` versus `pending_live_engine`.
- ADP and provider-backed data should be verified before launch claims.
- Legacy API files remain mounted and should be handled carefully.
- Tuesday scoring is executable but intentionally gated behind `OMEN_CRON_SCORING_ENABLED=true` until production scoring/provider validation is complete.
- Legacy `src/omen_gdpr.js` remains present with historical account-deletion copy; the mounted `/api/user` route is `src/routes/userPrivacy.js` and uses `"DELETE MY OMEN DATA"`.

## Documentation Risks

- Current context should come from `Direction/` and `Blueprints/handoffs/`.
- Archive and historical handoffs are reference-only unless Justin reactivates them.
- Root SLOPS agent files may still need route cleanup after Justin's rewrite.
- Older handoff sections may preserve historical contract examples; the current backend truth is the 2026-05-26 contract section in `Blueprints/handoffs/backend-to-frontend.md`.

## Do Not Touch Without Approval

- `.env` or secrets.
- DNS, SSL, Nginx, or Oracle service config.
- Supabase migrations or production data.
- Stripe production behavior.
- Package files or dependency upgrades.
- Deployment workflow changes, except already-approved local hardening gates.

## Operating Loop (added 2026-06-04)

- Build loop is set up: `Direction/agent_inbox.md` (single active task) + `Blueprints/prompts/kickoff-backend-codex.md` / `kickoff-frontend-claude.md` + `Blueprints/definition-of-done.md`. Operator steps in `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`.
- `agent_inbox.md` was stale (old AGENT.md/CLAUDE.md rewrite request) and is now the single active-task pointer.
- `Direction/agent_inbox.md` is the active task slot and `Direction/current_sprint.md` is queue/history. `Blueprints/handoffs/*` is the active contract bus; `Blueprints/agent_handoff.md` should be treated as historical session-log material if encountered.
