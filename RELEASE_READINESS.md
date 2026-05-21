# Corvus Release Readiness

Date: 2026-05-20
Status: local demo ready, not public-launch ready

## Deployment Freeze

Deployment work is paused by Justin.

Do not:

- Deploy
- Touch DNS
- Touch SSL/TLS
- Touch Nginx
- Touch production secrets
- Modify `.env` files
- Enable cron

## What Works Locally Right Now

- Frontend build is verified locally: `npm run build` passes with 96 modules and 0 errors.
- Backend tests are verified locally: `npm test` passes with 144 tests and 0 failures.
- Landing page has a Supabase magic-link sign-in form.
- Authenticated app shell uses `GET /api/session` and `GET /api/dashboard/summary`.
- All five Corvus tools have usable local mock/demo states:
  - Draft Assistant
  - Omen of the Week
  - Start/Sit
  - Trade Analyzer
  - Waiver Wire
- Draft Assistant recommendations use backend mock data and clearly mark mock responses.
- Draft Assistant ADP endpoint exists at `GET /api/draft-assistant/adp?format=half-ppr&teams=12`.
- Omen has mock preview and a local Yahoo roster-backed live lineup-swap path.
- Dashboard summary can report Yahoo `status: "token_expired"` for reconnect UI.
- Omen responses include root `scoring_format`.
- Start/Sit returns deterministic `signals` with `weight` as `high`, `medium`, or `low`.
- Waiver Wire frontend is wired to platform-centric `GET /api/optimizer/waiver`.
- Hostinger deploy override exists locally in `docker-compose.hostinger.yml`, but deployment is paused.

## What Is Still Mock Or Demo Only

- Draft Assistant recommendations are mock-only. They use fictional/sample player names.
- Draft Assistant ADP returns mock data outside production Redis/source availability.
- Omen mock preview remains public and deterministic.
- Live Omen is Yahoo-first and only covers roster-backed lineup-swap recommendations.
- Omen move types beyond `lineup_swap` are not live yet.
- Waiver Wire can return a mock fallback when Yahoo availability fails or returns no players.
- Start/Sit uses deterministic math and may return `explanation: null` when LLM is unavailable.
- Trade Analyzer is a local tool path and still needs public-launch polish and auth/user-flow review.
- ESPN remains feature-gated and should stay hidden unless explicitly approved.
- Stripe/subscription behavior exists for gates, but paid launch readiness is not complete.
- Cron should remain disabled until explicitly approved.

## Must Finish Before Public Launch

- Product decision: confirm whether launch target is demo, private beta, or public production.
- Auth: set a final production domain and add explicit frontend magic-link redirect to `/football`.
- Supabase: configure production Site URL, redirect URLs, and branded magic-link email template.
- Yahoo: confirm OAuth app callbacks for the final domain.
- Platform UX: make reconnect/token-expired states fully clear for users.
- Omen: polish live/mock/empty states so users can distinguish preview data from live recommendations.
- Draft Assistant: decide whether mock recommendations are acceptable for launch or require live draft logic.
- ADP: confirm production Redis/source behavior and FFC attribution display.
- Waiver Wire: decide how to message Pro gating before paid launch.
- Trade Analyzer: confirm whether it should be free, auth-gated, or CTA-gated at launch.
- Start/Sit: verify UI gracefully handles `explanation: null`.
- Release process: intentionally stage or commit all current local work before any deploy attempt.
- Security: confirm no secrets are present in tracked files or build artifacts.

## Must Check Before Hostinger Deployment

Deployment is paused. These checks are for future use only.

- Confirm Justin approves deployment to Hostinger.
- Confirm target domain or subdomain.
- Confirm whether this is staging, private beta, or public launch.
- Confirm `.env` values exist only on the server and are not copied from local files.
- Confirm `APP_BASE_URL` and `YAHOO_REDIRECT_URI` match the final domain.
- Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` point to the intended Supabase project.
- Confirm `VITE_ESPN_ENABLED` remains unset unless ESPN should show.
- Confirm `LLM_BASE_URL` is private or blank.
- Confirm cron remains disabled.
- Confirm no DNS, SSL/TLS, or Nginx changes are made without explicit approval.
- Confirm local preflight passes:
  - `git status --short`
  - `npm test`
  - `cd frontend && npm run build`
- Confirm Hostinger Compose config validates with production env before starting anything.

## Claude Should Polish Next

- Make Landing CTA copy reflect the current product state without implying full public launch.
- Add explicit Supabase magic-link `redirectTo` once the final domain is approved.
- Polish Omen live/mock/empty states and the `Live - Yahoo` attribution behavior.
- Polish Draft Assistant ADP loading/empty/mock states.
- Confirm Waiver Wire Pro and disconnected states feel clear.
- Ensure Start/Sit handles `explanation: null` with useful fallback copy.
- Review mobile spacing and tab/tool ergonomics across all five tool screens.

## Codex Should Fix Next

- Keep backend contracts stable and documented in `handoffs/backend-to-frontend.md`.
- Add or update backend tests only when contract behavior changes.
- Confirm production-readiness of Supabase schema/RLS separately before deployment.
- Confirm Yahoo OAuth callback paths and legacy callback compatibility before deployment.
- Verify ADP production behavior with Redis/source availability before public launch.
- Review Trade Analyzer auth/free-tool policy with Justin before changing behavior.
- Keep Hostinger deploy docs available but inactive until Justin reopens deployment work.

## Should Not Be Touched Yet

- Deployment
- DNS
- SSL/TLS
- Nginx
- Production secrets
- `.env` or `.env.cloud`
- Cron
- Supabase migrations
- Stripe/payment production behavior
- Public Ollama exposure
- Full ESPN launch
- Full league hosting
- Fantasy basketball or baseball
- Legacy Research Team
- Slops Saloon media hub expansion
