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

### Backend / Codex
- [x] Billing kill-switch implemented 2026-06-08: `CORVUS_BILLING_ENABLED` (default false) gates `/prices` + `/checkout` + `/portal` (`403 billing_disabled`); `requireSubscription` is a pass-through when off (auth still required); webhook untouched. `npm test` 290/290. Reviewed by Claude — guards precede all Stripe calls.
- [x] WS1 Hostinger KVM1 prep — draft compose, Nginx, env inventory, deploy notes, and local deploy ignore file under `deploy/hostinger/`; no VPS, SSH, DNS, secrets, or deploy action touched.
- [x] Trade Analyzer Phase 2 — backend player-search endpoint (Request 20). Query string in; matching NFL players out (name, team, position, id) for autocomplete. Reuse existing roster/player data; no paid deps.
- [x] Webhook persists `trial_ends_at` / `current_period_end` — confirmed working 2026-06-08. Verified before billing was gated off; the persistence path is intact and retained for when billing returns (Sleeper-first). No change needed.
- [ ] Tuesday scoring enablement follow-up — nflverse adapter, fixture tests, stored `season/week_num` scoring, and dry-run no-write mode are complete locally. Remaining: confirm scoreable Omen metadata on real rows, run an approved Supabase dry-run, then decide whether to enable `CORVUS_CRON_SCORING_ENABLED=true`.

### Frontend / Claude
- [x] Paid surfaces hidden behind `VITE_BILLING_ENABLED` (default false) 2026-06-08: `UpgradeState` returns null; Account shows "All features included" (PlanPicker/checkout unreachable); `?upgrade=true` is a no-op; Header has no upgrade link. Gated not deleted; `npm run build` clean. Reviewed by Claude. (`WaiverWire` `ProGate` left as-is — reactive to backend 402, which the pass-through no longer emits.)
- [ ] When the logo SVG is ready: replace the `[C]` placeholder in `Header.jsx` and `NavDrawer` with an inline SVG component.

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
