# Corvus Current Sprint

Last updated: 2026-06-05 (refreshed after the Trade Analyzer Phase 2 player-search backend contract; prior sprint archived to `Archive/current_sprint-2026-06-02.md`).

## How this feeds the loop

`Next` below is the queue. Each item lives under a **lane** and is a checkbox.
- Agents auto-pull the **top unchecked item in their own lane** when `Direction/agent_inbox.md` has no pinned Active Task.
- `agent_inbox.md` overrides this — pin a specific or custom task there and it wins.
- When an item is done, the agent checks it off here (`- [x]`) and logs it in `Direction/decision_log.md`.
- Agents never pull from **Ops / Justin**, **Verify**, or **Decisions** — those are not agent builds.

## Current State

- Live on the renamed route; PR #22 deployed (run `26833528435`); `/api/health` ok, `/api/ready` ready.
- Backend tests 274/274 local (2026-06-05); frontend build clean; `npm audit --audit-level=moderate` currently reports 1 transitive `hono` advisory through `promptfoo` and needs explicit package-file approval to fix.
- Tier 2 authenticated production smoke: 13/13 passed 2026-06-04.
- Posture: **launch-QA**. One ops gate stands between here and paid-launch confidence.

## Completed Since Last Sprint (evidence)

- Authenticated smoke 13/13 (2026-06-04): Stripe prices, 401 guards, favorite-team hydration, preference patch+restore, Omen feedback, Move History, Sleeper standings. (Closed old Next #2–#4.)
- Full `/ui-ux-pro-max` audit: all 15 routed pages + shared components. (Closed old Next #6.)
- The Ledger naming finalized (`/ledger`); `Standings.jsx` vs `LeagueStandings.jsx` separation; `Omen.jsx` dev-only at `/dev/omen`.
- Backend polish: `GET /api/version`, `CORVUS_TIER2_CLEANUP=1`, `Blueprints/api-routes.md`, standardized League Standings error envelopes.
- SPA cache headers fixed with regression test (`test/spaCache.test.js`).
- Stripe webhook hardening + recovery follow-up written locally (260/260). Code complete; **not deployed**.

## Now

- Hold all API contracts stable; keep docs aligned to the 2026-06-04 state.
- Single remaining pre-launch ops gate is the Stripe webhook recovery deploy (see Next → Ops).

## Next

### Ops / Justin (gated — agent prepares, Justin executes)
- [x] Deploy the Stripe webhook recovery follow-up; resend the failed `customer.subscription.created` event; confirm `200`.
- [ ] Final review of production secrets + Supabase settings before paid-launch confidence.
- [ ] Load testing for `POST /api/omen/mvp-move`, `POST /api/trade/compare`, `GET /api/dashboard/summary` via `scripts/load-corvus-routes.js`.
- [ ] Decide on enabling `CORVUS_CRON_SCORING_ENABLED=true` for Tuesday scoring after provider validation.

### Backend / Codex
- [x] Trade Analyzer Phase 2 — backend player-search endpoint (Request 20). Query string in; matching NFL players out (name, team, position, id) for autocomplete. Reuse existing roster/player data; no paid deps.
- [ ] After the Stripe gate clears: confirm the webhook persists `trial_ends_at` / `current_period_end`; implement if missing.

### Frontend / Claude
- [ ] When the logo SVG is ready: replace the `[C]` placeholder in `Header.jsx` and `NavDrawer` with an inline SVG component.

### Verify (confirm done vs open — restate findings, do not assume)
- [ ] Real-account QA of Yahoo / Sleeper / ESPN Omen + League Standings, especially ESPN reconnect, without logging cookie values.
- [ ] Resolve the doc conflict: does Sleeper/ESPN live Omen return `ready` or `pending_live_engine` for paid connected users? Settle to one truth and update docs.

### Decisions (Justin / Claude — not builds)
- [ ] `POST /api/optimizer/mvp-move` (`src/routes/optimizer.js`): merge into Omen as a Pro enrichment layer, or keep separate.
- [ ] Retire `getOmenOfTheWeekMock()` after Omen migration, or keep as a labeled fallback.
- [x] Final user-facing naming: Omen of the Week vs Omen vs MVP Move. **Confirmed: Omen of the Week.**
- [ ] Recovery analytics: ship before or after the first paid launch.

### Tech debt (later, low priority)
- [ ] 5 code TODOs: Yahoo per-player projected stats (`adapters/yahoo.js`); `rest_days` / `back_to_back` (`services/agents.js`); weather game-time interval (`services/weatherService.js`).

## Guardrails

- Do not recreate `Corvus/`.
- Do not touch `.env`, secrets, DNS, SSL, Nginx, Supabase migrations, Stripe production behavior, or package files without explicit approval.
- Do not deploy unless Justin explicitly approves the deploy action.
- ESPN must never log or display cookie values.
- Mock data must be clearly labeled and never presented as live fantasy advice.
- Account deletion stays hidden until UX copy + Justin approval are explicit.
