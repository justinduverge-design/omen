# Corvus Current Sprint

Last updated: 2026-06-04 (launch-QA sync - agent inbox queue aligned)

## Current State

Corvus is live on the renamed route.

- Local repo path: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`
- GitHub repo: `justinduverge-design/corvus`
- Oracle checkout path: `~/corvus`
- Production service name: `corvus-api`
- Docker containers: `corvus_api`, `corvus_cron`
- Test baseline: latest recorded local backend suites passed 260/260 for the Stripe webhook recovery follow-up and 262/262 after ESPN connect input normalization on 2026-06-04.
- Production deploy: PR #22 merged and deployed as GitHub Actions run `26833528435`; completed successfully on 2026-06-02.
- Post-deploy smoke: `/api/health` returned `status: ok`; `/api/ready` returned `status: ready`.
- Tier 2 authenticated production smoke passed 13/13 on 2026-06-04.
- Current posture: launch-QA and ops validation, not broad feature build.

## Completed

- Repo renamed and restructured. Docker, GitHub Actions, Oracle deploy all updated.
- Live `/api/health` returns HTTP 200 `service: corvus-api`.
- Canonical Omen endpoint is `POST /api/omen/mvp-move`.
- Privacy routes, Stripe webhook, `GET /api/stripe/prices`, `GET /api/system/current-week` live.
- Legacy compat routes return explicit `410 legacy_route_retired`.
- Google OAuth, Discord OAuth confirmed working. Apple intentionally removed.
- `nextUrl.js` post-login default changed from `/` to `/account`.
- All 7 UX audit gaps fixed across Landing, Login, Account, Omen pages.
- `frontend/src/data/nflPlayers.js` — ~350-player static roster for Trade Analyzer Phase 1 autocomplete.
- `frontend/src/data/nflTeams.js` — 32-team color strategy (standard / secondary-swap / color rush), color utilities.
- `OmenFeedback.jsx` — HITL card wired below Omen success state. Calls `POST /api/omen/feedback`.
- `TeamTheme.jsx` — `/account/appearance` settings page. Live preview. Persists to localStorage. Optimistic API call.
- **Header redesign:** hamburger button + `[C] CORVUS` wordmark. Circle monogram is a logo placeholder — swap with SVG when ready.
- **NavDrawer:** left-side sliding panel. Sections: Dashboard (auth), Tools (public), League (auth), Account. Active-page accent indicator. Keyboard-accessible.
- **Footer:** converted from hardcoded `slate-*` to CSS vars.
- **HITL feedback backend:** `POST /api/omen/feedback` built locally. Auth required. Upserts `followed`, `user_stars`, and `user_note` to `moves` by `user_id + week_num + season`.
- **Team preference backend:** `PATCH /api/account/preferences` built locally. Auth required. Upserts `favorite_team` to `profiles`; dashboard summary now includes `user.favorite_team`.
- **HITL database gate:** approved `moves` feedback repair applied through Supabase connector. Live table now has `followed`, `user_stars`, `user_note`, `outcome`, and unique `(user_id, week_num, season)` index. Database idempotence smoke passed and temporary rows were cleaned up.
- **Move History backend:** `GET /api/moves` built locally. Auth required. Returns `moves-history.v1` with season/limit filters, user-only rows, W/L/pending summary, and backend-to-frontend column mapping.
- **League Standings backend:** canonical `GET /api/league/standings` built locally. Auth required. Supports Yahoo, Sleeper, and ESPN provider paths; old retired `410` behavior for this route was removed from the legacy router.
- **Supabase SQL applied:** `sql/corvus_rls_security.sql` was applied through the approved Supabase lane as migration `20260531160851_apply_corvus_rls_security_full_setup`. Verified live: `profiles.favorite_team`, `moves` HITL columns and unique idempotence index, subscription date columns, waitlist insert-only policy, platform connection safe-column grants, and service-role Vault wrapper RPCs.
- **Tier 2 frontend deployed (PR #22, run `26833528435`):**
  - `Account.jsx` — Account pricing display wired to `GET /api/stripe/prices` with null-safe fallback.
  - `OmenFeedback.jsx` — HITL feedback hardened to call real `POST /api/omen/feedback`; handles `200`, `401`, `422`, `500`.
  - `App.jsx` — team theme hydration reads `summary.user.favorite_team` on every sign-in event.
  - `MoveHistory.jsx` — Move History / Hall of Records wired to `GET /api/moves`; mounted on Football page "History" tab.
  - `LeagueStandings.jsx` — League Standings wired to `GET /api/league/standings`; mounted above tabs on Football page.
- **Font system corrected (PR #22):** Production font stack is Cormorant Garamond (display/brand), Alegreya Sans (body/UI), DM Mono (data/numbers).
- **Authenticated Tier 2 smoke passed:** `scripts/smoke-tier2-endpoints.js` verified Stripe prices, protected-route 401 guards, favorite-team preference patch and restore, dashboard hydration, Omen feedback, Move History, and Sleeper League Standings in production.
- **Full UI/UX audit completed:** all 15 routed pages and shared components passed the `/ui-ux-pro-max` audit. The Account and ConnectLeague UX pass from the old Next list is closed.
- **SPA cache header fix prepared locally:** `index.html` now uses no-cache headers while hashed Vite assets keep long static caching. Covered by `test/spaCache.test.js`.
- **Backend polish batch prepared locally:** added `GET /api/version`, `CORVUS_TIER2_CLEANUP=1` smoke cleanup mode, `Blueprints/api-routes.md`, and clearer League Standings error envelopes.
- **Stripe webhook recovery follow-up prepared locally:** old unmapped checkout/subscription events can be safely acknowledged with safe diagnostics, while true persistence failures still return `500`. Not deployed.
- **ESPN connect input normalization prepared locally:** `POST /api/platforms/espn/connect` accepts pasted cookie fragments and full ESPN league URLs without logging or echoing cookie values. Not deployed.

## Now

- Keep backend/frontend contracts aligned with tested app behavior and the candidate queue in `Direction/agent_inbox.md`.
- Treat `POST /api/omen/mvp-move` as paid live Omen for subscribed users.
- Keep Trade Analyzer Projection and Status as Corvus-owned enrichment signals, not Phase 1 user inputs.
- All Tier 2 frontend work and authenticated smoke checks are complete.
- The single active-task pointer is `Direction/agent_inbox.md`; keep it empty until Justin chooses a candidate.
- The remaining pre-launch blocker is ops-gated: deploy the Stripe webhook recovery follow-up, resend the failed event, and confirm `200` delivery without Account subscription regression.
- Prepared-local backend changes are not production behavior until a normal approved deploy happens.

## Next

1. **Stripe Webhook Recovery Gate:** deploy the prepared follow-up only after Justin approval, resend the failed Stripe event, and confirm `200` delivery without Account subscription regression.
2. **Stripe Subscription Date Verification:** after the webhook gate clears, confirm `trial_ends_at` and `current_period_end` persist into the dashboard subscription contract; patch only if verification fails.
3. **Real Provider QA:** QA Yahoo, Sleeper, and ESPN Omen plus League Standings flows with real connected accounts, especially ESPN reconnect behavior, without logging cookie values.
4. **Route Load-Test Evidence:** run `scripts/load-corvus-routes.js` against an approved local or staging target and capture status counts plus p50/p95 timings for Omen, Trade Analyzer, and dashboard summary.
5. **Sleeper/ESPN Omen Truth Reconciliation:** resolve the doc conflict between older `pending_live_engine` notes and newer live-path claims.
6. **Trade Analyzer Player Search API:** build `GET /api/players/search?position=<pos>&q=<query>` for Request 20 Phase 2 when Justin chooses feature work again.
7. **Trade Pulse API:** build `GET /api/trade/pulse` for buy-low and sell-high signal cards, with mock/static output clearly labeled if live market data is not ready.
8. **Tuesday Scoring Readiness Packet:** audit the cron/scoring path and document gates before anyone enables `CORVUS_CRON_SCORING_ENABLED=true`.
9. **Optimizer/Omen Route Decision:** decide whether `/api/optimizer/mvp-move` stays retired, remains separate, or merges into Omen as a Pro enrichment layer.
10. **Mock Omen Fallback Decision:** decide whether `getOmenOfTheWeekMock()` remains as a labeled fallback/dev contract or is retired.
11. **Logo Replacement:** when the logo SVG is ready, replace the `[C]` circle in `Header.jsx` and `NavDrawer`.

## Guardrails

- Do not recreate `Corvus/`.
- Do not touch `.env`, secrets, DNS, SSL, Nginx, Supabase migrations, Stripe production behavior, or package files without explicit approval.
- Do not deploy unless Justin explicitly approves the deploy action.
- ESPN must never log or display cookie values.
- Mock data must be clearly labeled and must not be presented as live fantasy advice.
- Frontend should not expose destructive account deletion until UX copy and Justin approval are explicit.
