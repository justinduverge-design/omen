# Corvus Current Sprint

Last updated: 2026-06-08 (Hostinger KVM1 cutover live; Chrome/Firefox smoke passed; Corvus is now non-monetized/free; billing gated behind `CORVUS_BILLING_ENABLED` kill-switch — decision logged; Justin canceled his own (only) subscription; kill-switch implemented backend+frontend — `npm test` 290/290, `npm run build` clean).

## How this feeds the loop

`Next` below is the queue. Each item lives under a **lane** and is a checkbox.
- Agents auto-pull the **top unchecked item in their own lane** when `Direction/agent_inbox.md` has no pinned Active Task.
- `agent_inbox.md` overrides this — pin a specific or custom task there and it wins.
- When an item is done, the agent checks it off here (`- [x]`) and logs it in `Direction/decision_log.md`.
- Agents never pull from **Ops / Justin**, **Verify**, or **Decisions** — those are not agent builds.

## Current State

- Live on the renamed route; PR #22 deployed (run `26833528435`); `/api/health` ok, `/api/ready` ready.
- Backend tests 281/281 local (2026-06-05); frontend build clean; `npm audit --audit-level=moderate` currently reports 1 transitive `hono` advisory through `promptfoo` and needs explicit package-file approval to fix.
- Tier 2 authenticated production smoke: 13/13 passed 2026-06-04.
- Local authenticated load smoke completed 2026-06-05 with `scripts/load-corvus-routes.js`: Trade Analyzer 10/10 `200` p95 34ms; Omen 10/10 `200` p95 4999ms; dashboard summary 10/10 `200` p95 633ms. Omen latency is a follow-up concern, not an auth blocker.
- `VITE_ESPN_ENABLED=true` set in corvus root `.env.local` (2026-06-05). Build confirmed clean. ESPN real-account QA complete — all three platforms connected (Sleeper ✓, Yahoo ✓, ESPN ✓).
- Tuesday scoring nflverse adapter is implemented locally with fixture tests and dry-run no-write mode. Cron remains disabled until approved real-data dry-run validation and scoring enablement.
- Hostinger KVM1 launch env decision: set `CORVUS_CRON_SCORING_ENABLED=false` for launch. Do not enable Tuesday scoring during the hosting move.
- Posture: **KVM1-live / post-cutover QA**. Remaining gates: Stripe/payment surface gating (done 2026-06-08 — kill-switch built backend+frontend, reviewed; deploy pending), final production secrets/Supabase review, and Tuesday scoring enablement after backend provider implementation/validation.

## Completed Since Last Sprint (evidence)

- Authenticated smoke 13/13 (2026-06-04): Stripe prices, 401 guards, favorite-team hydration, preference patch+restore, Omen feedback, Move History, Sleeper standings. (Closed old Next #2–#4.)
- Full `/ui-ux-pro-max` audit: all 15 routed pages + shared components. (Closed old Next #6.)
- The Ledger naming finalized (`/ledger`); `Standings.jsx` vs `LeagueStandings.jsx` separation; `Omen.jsx` dev-only at `/dev/omen`.
- Backend polish: `GET /api/version`, `CORVUS_TIER2_CLEANUP=1`, `Blueprints/api-routes.md`, standardized League Standings error envelopes.
- SPA cache headers fixed with regression test (`test/spaCache.test.js`).
- Stripe webhook hardening + recovery follow-up written locally (260/260). Code complete; **not deployed**.
- Tuesday scoring provider decision closed: first launch scoring should use `nflverse-data` weekly player stats, not the current unvalidated Sportradar cron path. Cron stays disabled until the nflverse adapter, scoreable move shape, tests, and dry-run validation are complete.
- Tuesday scoring nflverse adapter completed locally: `fetchNFLScores()` now uses nflverse weekly stats, `getPlayerActualPoints()` exists, `SPORTRADAR_API_KEY` is no longer required by `REQUIRED_SCORING_ENV`, and `CORVUS_CRON_DRY_RUN=true` avoids Supabase writes. Fixture tests passed in `npm test` 281/281.

## Now

- Hold all API contracts stable; keep docs aligned to the 2026-06-04 state.
- Keep Tuesday scoring disabled until scoreable move metadata is confirmed against real rows and an approved nflverse dry-run validates production Supabase data without writes.
- Treat Omen local p95 around 5s under repeated load as a performance follow-up before broad paid-user traffic.

## Next

### Ops / Justin (gated — agent prepares, Justin executes)
- [x] Deploy the Stripe webhook recovery follow-up; resend the failed `customer.subscription.created` event; confirm `200`.
- [ ] Final review of production secrets + Supabase settings before paid-launch confidence.
- [x] Hostinger KVM1 public hostname confirmed: `slopssaloon.com` with `www.slopssaloon.com`.
- [x] Hostinger KVM1 secrets backup target handled by Justin; real `.env.production` stays off git.
- [x] Hostinger KVM1 launch scoring setting decided: `CORVUS_CRON_SCORING_ENABLED=false`.
- [x] Hostinger KVM1 GHCR pull access confirmed; images pulled from GHCR.
- [x] Hostinger KVM1 private LLM link confirmed over Tailscale to KVM2 Ollama.
- [x] Hostinger KVM1 DNS/HTTPS cutover complete; root and `www` health/ready pass over HTTPS.
- [x] Browser smoke passed in Chrome and Firefox.
- [x] Load testing for `POST /api/omen/mvp-move`, `POST /api/trade/compare`, `GET /api/dashboard/summary` via `scripts/load-corvus-routes.js`. Local authenticated 10-iteration run passed 2026-06-05: Trade Analyzer p95 34ms ✓, dashboard summary p95 633ms ✓, Omen p95 4999ms ⚠ (functional, not blocked — latency concern logged; optimization deferred to post-launch tech debt).
- [ ] Decide on enabling `CORVUS_CRON_SCORING_ENABLED=true` only after the nflverse scoring adapter and dry-run validation are complete.
- [x] Stripe/payment surfaces decided (2026-06-08): keep the plumbing + guard the server via `CORVUS_BILLING_ENABLED` kill-switch (gate, don't delete). Logged in `decision_log.md`. Justin canceled his own (only) subscription in Stripe 2026-06-08; ungated webhook reconciles `is_subscribed`.

### Backend / Codex — Phase 1 (Spines)
- [x] **Phase 1.1 — CI/CD retarget to KVM1 (2026-06-12).** `.github/workflows/deploy.yml` retargeted: name → `Deploy to Hostinger KVM1`, secrets → `KVM1_HOST`/`KVM1_USER`/`KVM1_SSH_KEY`, working dir → `/opt/corvus/deploy/hostinger`, compose file → `docker-compose.prod.yml`. Dropped infisical (not installed on KVM1) and `git pull` (KVM1 is not a checkout — env lives in `.env.production` on disk, app comes from GHCR images). Dedicated ed25519 deploy key installed in KVM1's `authorized_keys`. First green deploy verified.
- [x] **Phase 1.2 — Sentry SaaS free tier wired (backend half) (2026-06-13).** Shipped via PR #33 (commit `cc14e79`). `@sentry/node@^8.55.2` added; `Sentry.init()` runs as first require in `src/server.js` + `src/corvus_tuesday_cron.js` via shared `src/middleware/sentry.js`. `Sentry.setupExpressErrorHandler(app)` wired before existing error handler. Cron has `uncaughtException` + `unhandledRejection` capture + `flushSentry()` on exit. `beforeSend`/`beforeBreadcrumb` scrubbers enforce `Blueprints/security-privacy.md`: ESPN-credential routes (`/api/platforms/espn/connect`, `/api/auth/espn/connect`, `/api/espn/roster`) drop event entirely; sensitive headers (`cookie`/`set-cookie`/`authorization`/`x-api-key`/`token`/`secret`) stripped; body keys (`password`/`cookie`/`token`/`secret`/`swid`/`espn_s2`/`vault`) replaced with `[scrubbed]`; URL query string scrubbed same way; stack traces truncated to 20 frames; `__skipBodyLog` honored. `SENTRY_DSN` blank in `.env.example` (no-op locally); row added to `deploy/hostinger/ENV-INVENTORY.md`. Smoke test at `test/sentryBoot.test.js` (3 tests). `npm test` 291/291. No new audit advisories (pre-existing `hono` only).
- [x] **Phase 1.4 — ADP schema + per-league scoring config tables (2026-06-12).** Review-only SQL written at `sql/2026-06-12_phase1_adp_scoring_schema_review.sql` with focused schema tests at `test/phase1SchemaReviewSql.test.js`. ADP tables = service-role only; league scoring config = service-role writable + authenticated self-readable via RLS. No Supabase apply, no production action.

### Backend / Codex — Phase 2 (waits until Phase 1 closes)
- [ ] **Phase 2.5 — Proprietary ADP weighting service.** Build on top of `src/services/adp.js` and the schema landed in Phase 1.4. Output: per-player score combining FFC/Yahoo/MFL with weights configurable per league scoring config row.
- [ ] **Phase 2.6 — Math engine parameterized.** Refactor `src/services/optimizer.js` + `src/services/tradeValue.js` to consume scoring config as a parameter. Inputs change; call sites stable; tests stay green at 240/240+.
- [ ] **Phase 2.7 — Demo Mode backend.** Public route returning a populated normalized roster + Omen envelope labeled `mode:"demo"`. Distinct from `mode:"live"` and `mode:"mock"`. Drives the `/demo` frontend route.
- [ ] **Phase 2.8 — Sleeper live draft tracking (Aug 15 deadline).** Debounced Lazy Sync against Sleeper draft endpoints. No long-polling sockets.
- [ ] **Phase 2.10 — Trade share hash routes.** `crypto.randomUUID` + `POST /api/trade/share` (writes hash + payload) + `GET /api/trade/share/:hash` (public read).

### Backend / Codex — Phase 3
- [ ] **Phase 3.12 — Tailscale → KVM2 Gemma 4-E4B bridge** for narration. `LLM_BASE_URL` already in env inventory.
- [ ] **Phase 3.13 — Token-constrained prompts** (≤50 words / 2 sentences) for CPU inference mitigation.
- [ ] **Phase 3.15 — `AI_PROVIDER=local|cloud` toggle** with hard budget cap. **DO NOT BUILD until the cap is logged in `decision_log.md` with Justin's approved dollar figure.**

### Backend / Codex — Phase 4
- [ ] **Phase 4.16 — Termly base ToS + Privacy Policy** — Codex authors AI-drafted custom paragraphs for ESPN cookie handling, Yahoo attribution, Sleeper attribution. Justin reviews.

### Backend / Codex — Pre-pivot completions (evidence)
- [x] Billing kill-switch implemented 2026-06-08: `CORVUS_BILLING_ENABLED` (default false) gates `/prices` + `/checkout` + `/portal` (`403 billing_disabled`); `requireSubscription` is a pass-through when off (auth still required); webhook untouched. `npm test` 290/290.
- [x] WS1 Hostinger KVM1 prep — draft compose, Nginx, env inventory, deploy notes, and local deploy ignore file under `deploy/hostinger/`.
- [x] Trade Analyzer Phase 2 — backend player-search endpoint (Request 20).
- [x] Webhook persists `trial_ends_at` / `current_period_end` — confirmed working 2026-06-08.

### Backend / Codex — Behind launch readiness (post-launch, not deferred to 2027)
- [ ] Tuesday scoring enablement (`CORVUS_CRON_SCORING_ENABLED=true`) after approved Supabase dry-run.
- [ ] ESPN live draft tracking (Lazy Sync, same pattern as Sleeper).
- [ ] Yahoo live draft tracking (Lazy Sync, same pattern as Sleeper).

### Frontend / Claude — Phase 1
- [x] **Phase 1.2 — Sentry SaaS free tier wired (frontend half) (2026-06-13).** Shipped via `fa35c76` on `claude/wonderful-jepsen-afb4fd`. `@sentry/react@^8.55.2` added to `frontend/package.json` (version parity with backend). `initSentry()` runs in `frontend/src/main.jsx` before `createRoot` via new `frontend/src/lib/sentry.js`. `<App />` wrapped in `Sentry.ErrorBoundary` with Corvus-themed `CrashFallback` (≥44px reload button — meets Phase 1.3 touch-target discipline preemptively). `beforeSend`/`beforeBreadcrumb` scrubbers mirror the backend (`src/middleware/sentry.js`): ESPN-credential URL patterns (`/api/platforms/espn/connect`, `/api/auth/espn/connect`, `/api/espn/roster`) drop event entirely (also checked against `event.transaction`); sensitive headers, body keys, and URL query strings scrubbed with identical patterns to backend; stack traces truncated to last 20 frames; `__skipBodyLog` honored; fetch/xhr breadcrumbs for ESPN URLs dropped. `VITE_SENTRY_DSN` blank in `.env.example` (no-op locally); `VITE_COMMIT_SHA` added for release tagging; both rows in `deploy/hostinger/ENV-INVENTORY.md`. Source-map upload deferred to post-launch per spec. `npm --prefix frontend run build` clean (456 kB bundle, 1.67s). No frontend test runner configured; scrubber coverage is indirect via backend smoke tests.
- [ ] **Phase 1.3 — iOS Safari mobile QA sweep.** Open every routed page on iOS Safari (real device or BrowserStack). Fix viewport overflows, flex overflows, touch targets <44px, focus rings, safe-area-inset issues. Single PR.

### Frontend / Claude — Phase 2
- [ ] **Phase 2.7 — Demo Mode UI.** New public route `/demo`. Populated example roster + Omen envelope with prominent "Demo Mode — your real Omen will appear after your league drafts" labeling. Reuses Omen rendering components.
- [ ] **Phase 2.9 — Account delete UI.** Expose backend route at `src/routes/userPrivacy.js:136` in `Account.jsx`. Confirmation phrase: `"DELETE MY CORVUS DATA"`. Place under a "Privacy" subsection.
- [ ] **Phase 2.10 — Trade share card.** Share button on Trade Analyzer result. OG image rendered server-side. Card copy: brand voice, recommendation-first, no emoji-soup.
- [ ] **Phase 2.11 — FP1 signal-honesty labels.** Surface each Omen input's `live` / `stub` / `unavailable` status. Backend vocabulary already exists at `src/services/omen.js:356`.

### Frontend / Claude — Phase 3
- [ ] **Phase 3.14 — Skeleton states for narration zones.** Math + numbers render instantly on KVM1; narration block shows skeleton until KVM2 returns.

### Frontend / Claude — Phase 4
- [ ] **Phase 4.18 — Umami snippet** added to `frontend/index.html` once the container is live on KVM1.
- [ ] **Phase 4.19 — FP2 Sleeper/ESPN Omen render polish.** Ensure live envelopes render correctly across all three providers.
- [ ] When the logo SVG is ready: replace the `[C]` placeholder in `Header.jsx` and `NavDrawer` with an inline SVG component.

### Frontend / Claude — Pre-pivot completions (evidence)
- [x] Paid surfaces hidden behind `VITE_BILLING_ENABLED` (default false) 2026-06-08.

### Verify (confirm done vs open — restate findings, do not assume)
- [x] Real-account QA of Yahoo / Sleeper / ESPN Omen + League Standings, especially ESPN reconnect, without logging cookie values. **ESPN QA completed 2026-06-05 (off-season mode).** Four fixes shipped: (1) `seasonCandidates()` retry logic for off-season year; (2) `isSeasonRetryable` handles ESPN 202 redirect; (3) CORS localhost default in `docker-compose.yml`; (4) off-season connect mode — when ESPN API returns 202 for all seasons, credentials are stored and a gold "saved" banner shown. Full in-season QA (live API returning 200) deferred until 2026 season opens (~August). All code changes in source, 13/13 tests pass, frontend build clean.
- [ ] Resolve the doc conflict: does Sleeper/ESPN live Omen return `ready` or `pending_live_engine` for paid connected users? Settle to one truth and update docs.

### Decisions (Justin / Claude — not builds)
- [ ] `POST /api/optimizer/mvp-move` (`src/routes/optimizer.js`): merge into Omen as a Pro enrichment layer, or keep separate.
- [ ] Retire `getOmenOfTheWeekMock()` after Omen migration, or keep as a labeled fallback.
- [x] Final user-facing naming: Omen of the Week vs Omen vs MVP Move. **Confirmed: Omen of the Week.**
- [ ] Recovery analytics: ship before or after the first paid launch.
- [x] Monetization posture changed: Corvus should be free/non-monetized because Yahoo and ESPN cannot be monetized safely under current platform constraints.

### Tech debt (later, low priority)
- [ ] 5 code TODOs: Yahoo per-player projected stats (`adapters/yahoo.js`); `rest_days` / `back_to_back` (`services/agents.js`); weather game-time interval (`services/weatherService.js`).
- [ ] Omen latency optimization: `POST /api/omen/mvp-move` p95 ~5s under repeated local load. Investigate LLM call caching, response streaming, or request coalescing. Not a launch blocker — route is functional.

## Guardrails

- Do not recreate `Corvus/`.
- Do not touch `.env`, secrets, DNS, SSL, Nginx, Supabase migrations, Stripe production behavior, or package files without explicit approval.
- Do not deploy unless Justin explicitly approves the deploy action.
- ESPN must never log or display cookie values.
- Mock data must be clearly labeled and never presented as live fantasy advice.
- Account deletion stays hidden until UX copy + Justin approval are explicit.
