# Corvus Known Issues

Last updated: 2026-05-26

## Current Context Risks

- Some historical docs may still reference retired pre-DBS paths.
- Some archive/checkpoint files describe older launch states and should not be treated as current truth.
- Justin still plans to rewrite `AGENT.md` and `CLAUDE.md`.

## Product Risks

- Stripe live payment behavior still needs final validation before paid launch confidence.
- `POST /api/optimizer/mvp-move` and `POST /api/omen/mvp-move` still need a product-tier architecture decision.
- Recovery analytics timing is still open.
- Load testing for Omen, Trade Analyzer, and dashboard summary is still pending; local script exists.

## Backend / Data Risks

- Yahoo live features depend on valid OAuth tokens and usable Yahoo league ids.
- ESPN remains high-value and fragile because it depends on user-provided cookies.
- Sleeper/ESPN live Omen code paths are wired but still need real-account staging QA before public claims.
- ADP and provider-backed data should be verified before launch claims.
- Legacy API files remain mounted and should be handled carefully.
- Tuesday scoring is executable but intentionally gated behind `CORVUS_CRON_SCORING_ENABLED=true` until production scoring/provider validation is complete.
- Privacy routes are mounted under `/api/user`, but frontend settings should wait for UX copy and final delete-flow approval before exposing account deletion broadly.

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
