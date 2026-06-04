# Corvus Current Sprint

Last updated: 2026-06-03 (session 8 — UI/UX audit + Ledger + Standings pages)

## Current State

Corvus is live on the renamed route.

- Local repo path: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`
- GitHub repo: `justinduverge-design/corvus`
- Oracle checkout path: `~/corvus`
- Production service name: `corvus-api`
- Docker containers: `corvus_api`, `corvus_cron`
- Test baseline: 231/231 passing locally on 2026-05-31

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
- `OmenFeedback.jsx` — HITL card wired below Omen success state. Calls `POST /api/omen/feedback` (soft success until backend built).
- `TeamTheme.jsx` — `/account/appearance` settings page. Live preview. Persists to localStorage. Optimistic API call.
- **Header redesign:** hamburger button + `[C] CORVUS` wordmark. Circle monogram is a logo placeholder — swap with SVG when ready.
- **NavDrawer:** left-side sliding panel. Sections: Dashboard (auth), Tools (public), League (auth), Account. Active-page accent indicator. Keyboard-accessible.
- **Footer:** converted from hardcoded `slate-*` to CSS vars.
- **HITL feedback backend:** `POST /api/omen/feedback` built locally. Auth required. Upserts `followed`, `user_stars`, and `user_note` to `moves` by `user_id + week_num + season`.
- **Team preference backend:** `PATCH /api/account/preferences` built locally. Auth required. Upserts `favorite_team` to `profiles`; dashboard summary now includes `user.favorite_team`.
- **HITL database gate:** approved `moves` feedback repair applied through Supabase connector. Live table now has `followed`, `user_stars`, `user_note`, `outcome`, and unique `(user_id, week_num, season)` index. Database idempotence smoke passed and temporary rows were cleaned up.
- **Move History backend:** `GET /api/moves` built locally. Auth required. Returns `moves-history.v1` with season/limit filters, user-only rows, W/L/pending summary, and backend-to-frontend column mapping.
- **League Standings backend:** canonical `GET /api/league/standings` built locally. Auth required. Supports Yahoo, Sleeper, and ESPN provider paths; old retired `410` behavior for this route was removed from the legacy router.
- **SQL readiness:** `sql/corvus_rls_security.sql` updated for `moves` feedback idempotence and `profiles.favorite_team`; `moves` repair has been applied, while `profiles.favorite_team` still needs Justin approval before Supabase application.
- **UI/UX audit (session 8 — 2026-06-03):** Full pass across all 15 routed pages + shared components. 44px touch targets, `motion-reduce` sweep, ARIA patterns, CSS token consistency, guided Sleeper flow on Account, hamburger/NavDrawer ARIA fix. 25 files, 256 insertions, 126 deletions.
- **`Omen.jsx` dev route:** Gated to `/dev/omen` (local Vite only) via `React.lazy` + `import.meta.env.DEV`. Stripped from production bundle at build time.
- **The Ledger (`/ledger`):** Auth-required page at `frontend/src/pages/Ledger.jsx`. Calls `GET /api/moves`. Loading/error/empty/populated states. Nav item under Dashboard. Brand name "The Ledger" approved; "Hall of Records" retired.
- **Standings (`/standings`):** Auth-required page at `frontend/src/pages/Standings.jsx`. Calls `GET /api/league/standings`. 5 states including disconnected CTA. PA column added vs. embedded widget. Nav item "Standings" in League section.
- **Trade Analyzer rework prep:** `Blueprints/handoffs/trade-analyzer-rework.md` written. Phase 1 confirmed already shipped. Remaining improvements queued for next session.

## Now

- Keep backend/frontend contracts aligned with tested app behavior.
- Treat `POST /api/omen/mvp-move` as paid live Omen for subscribed users.
- Keep prepared Supabase SQL distinct from applied database state unless Justin approves migration/application.
- Logo placeholder (`[C]` circle in header/drawer) is intentional — swap with SVG inline component when logo is ready.

## Next

1. Get Justin approval to apply `profiles.favorite_team`, then verify `PATCH /api/account/preferences` and `GET /api/dashboard/summary.user.favorite_team` against Supabase.
2. QA real Yahoo/Sleeper/ESPN League Standings with connected accounts, especially ESPN reconnect behavior.
3. Trade Analyzer improvements: scoring format selector, ⇄ glyph, VORP tooltip, MockBanner swap. See `Blueprints/handoffs/trade-analyzer-rework.md` for exact prompt.
4. When logo SVG is ready: replace `[C]` circle in `Header.jsx` and `NavDrawer` with inline SVG component.
5. Run Stripe test-mode checkout and webhook validation before paid-launch confidence (Codex).
6. QA ESPN cookie recovery without logging or displaying cookie values.

## Guardrails

- Do not recreate `Corvus/`.
- Do not touch `.env`, secrets, DNS, SSL, Nginx, Supabase migrations, Stripe production behavior, or package files without explicit approval.
- Do not deploy unless Justin explicitly approves the deploy action.
- ESPN must never log or display cookie values.
- Mock data must be clearly labeled and must not be presented as live fantasy advice.
- Frontend should not expose destructive account deletion until UX copy and Justin approval are explicit.
