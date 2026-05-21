# Corvus Known Issues

Date: 2026-05-20

## Launch Blockers

- Deployment is not approved. Do not deploy.
- Final production domain is not confirmed.
- Supabase production Site URL, redirect URLs, and branded magic-link email template are not confirmed.
- Magic-link sign-in currently relies on Supabase project Site URL because `redirectTo` is not explicitly set in `Landing.jsx`.
- Local dirty/untracked work must be intentionally staged or committed before any release.
- Paid launch readiness is incomplete. Stripe/pro subscription behavior should not be treated as public-launch ready without review.
- Cron is not approved and must stay disabled.

## Mock Or Demo Limitations

- Draft Assistant recommendations are mock-only and use fictional players.
- Draft Assistant ADP may return mock data depending on env, Redis, and source availability.
- Omen supports mock preview and Yahoo lineup-swap live path only.
- Omen move types for waiver pickups and trades are not live.
- Waiver Wire can return mock fallback when Yahoo availability fails or returns no players.
- Start/Sit can return `explanation: null` if LLM is unavailable.
- ESPN is feature-gated and should remain hidden unless explicitly approved.

## Backend / Data Risks

- Yahoo live features depend on valid OAuth tokens and usable Yahoo league ids.
- Remotely revoked Yahoo tokens may first appear from a Yahoo route as a `401` before dashboard state catches up.
- ADP production behavior depends on Redis and external sources.
- FFC attribution must remain visible wherever FFC ADP is shown.
- MFL must remain server-side only.
- Production Supabase schema/RLS/Vault setup must be confirmed separately before deploy.
- Legacy `ssffmvp_api_v2.js` remains mounted, so Yahoo callback compatibility should be reviewed before launch.

## Frontend / UX Risks

- Users need unmistakable mock/live labels across Draft Assistant, ADP, Omen, and Waiver Wire.
- Landing CTA should not imply a public launch before deployment and auth settings are ready.
- Omen empty, mock, pending live-engine, and live states need final polish.
- Waiver Wire Pro and disconnected states need final copy review.
- Start/Sit should show useful fallback copy when explanation is unavailable.
- Trade Analyzer needs final policy: free, auth-gated, or conversion CTA.

## Do Not Touch Yet

- DNS
- SSL/TLS
- Nginx
- Production secrets
- `.env` or `.env.cloud`
- Deployment
- Cron
- Supabase migrations
- Stripe production behavior
- Public Ollama exposure
- Full ESPN launch
