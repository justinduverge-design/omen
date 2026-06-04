# Corvus Current Sprint

Last updated: 2026-06-02 (post-PR-#22 reconciliation — Tier 2 frontend deployed)

## Current State

Corvus is live on the renamed route.

- Local repo path: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`
- GitHub repo: `justinduverge-design/corvus`
- Oracle checkout path: `~/corvus`
- Production service name: `corvus-api`
- Docker containers: `corvus_api`, `corvus_cron`
- Test baseline: 240/240 passing locally on 2026-05-31
- Production deploy: PR #22 merged and deployed as GitHub Actions run `26833528435`; completed successfully on 2026-06-02.
- Post-deploy smoke: `/api/health` returned `status: ok`; `/api/ready` returned `status: ready`.

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

## Now

- Keep backend/frontend contracts aligned with tested app behavior.
- Treat `POST /api/omen/mvp-move` as paid live Omen for subscribed users.
- Trade Analyzer Projection and Status inputs are intentionally removed from the user form. Corvus owns projection/status enrichment during analysis.
- Logo placeholder (`[C]` circle in header/drawer) is intentional — swap with SVG inline component when logo is ready.
- All Tier 2 frontend work is complete. Focus is QA, ops validation, and launch readiness.
- Tier 2 authenticated production smoke passed on 2026-06-04 using `scripts/smoke-tier2-endpoints.js`: 13/13 checks passed. Verified Stripe prices (`$5/mo`, `$20`), protected-route 401 guards, dashboard favorite-team hydration, preference patch + restore (`BAL` then back to `MIA`), Omen feedback write for season `2099` week `1`, Move History retrieval of that smoke row, and Sleeper League Standings (`12` teams). Token was cleared from the shell after the run.
- SPA cache headers fixed locally on 2026-06-04: `index.html` now sends `Cache-Control: no-cache, must-revalidate` while hashed Vite assets keep the long static cache. Regression coverage added in `test/spaCache.test.js`; full backend suite passes 244/244.
- Backend polish batch completed locally on 2026-06-04: added `GET /api/version`, added `CORVUS_TIER2_CLEANUP=1` smoke cleanup mode, added `Blueprints/api-routes.md` canonical/retired route reference, and standardized League Standings error envelopes with user-safe `message` and `action` fields.
- Stripe webhook hardening completed locally on 2026-06-04 after Stripe dashboard showed `500 ERR` for `customer.subscription.created`. Root cause: subscription-created events may arrive without Corvus `userId` metadata, even though the Checkout Session has it. Fix stamps metadata onto future monthly subscriptions, recovers user mapping from existing subscription rows or related Checkout Sessions, and acknowledges truly unmapped subscription events without activating or causing Stripe retry storms. Full backend suite passes 247/247. Needs normal deploy before resending the failed Stripe event.
- Stripe webhook recovery follow-up prepared locally on 2026-06-04 after resend still returned `{ "error": "handler failure" }`. Patch safely acknowledges old checkout/subscription events when fallback lookups fail or no Corvus user mapping exists, and adds safe event/object/customer diagnostics for any remaining true persistence failure. Full backend suite passes 260/260. Not deployed.

## Next

1. ~~Stripe price IDs~~ ✓ confirmed in Infisical. ~~$5/mo and $20 season prices~~ ✓ updated in Stripe dashboard. ~~`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`~~ ✓ confirmed. ~~`APP_BASE_URL`~~ ✓ confirmed. **Deploy the Stripe webhook recovery follow-up, resend the failed event, and confirm `200` delivery** — this is the only remaining pre-launch ops gate.
2. **Authenticated smoke:** `PATCH /api/account/preferences` → verify theme saves; `GET /api/dashboard/summary.user.favorite_team` → verify theme rehydrates on sign-in.
3. **Authenticated smoke:** `POST /api/omen/feedback` → confirm feedback records and Omen HITL loop closes.
4. **Authenticated smoke:** `GET /api/moves` and `GET /api/league/standings` → verify data returns for connected users.
5. QA real Yahoo/Sleeper/ESPN Omen and League Standings flows, especially ESPN reconnect behavior, without logging cookie values.
6. Run `/ui-ux-pro-max-skill` on Account page + ConnectLeague page before adding further features to those screens.
7. When logo SVG is ready: replace `[C]` circle in `Header.jsx` and `NavDrawer` with inline SVG component.

## Guardrails

- Do not recreate `Corvus/`.
- Do not touch `.env`, secrets, DNS, SSL, Nginx, Supabase migrations, Stripe production behavior, or package files without explicit approval.
- Do not deploy unless Justin explicitly approves the deploy action.
- ESPN must never log or display cookie values.
- Mock data must be clearly labeled and must not be presented as live fantasy advice.
- Frontend should not expose destructive account deletion until UX copy and Justin approval are explicit.
