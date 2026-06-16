# Corvus Current Sprint

Last updated: 2026-06-16 (Phase 1.4 actually live in production after PR #38 merge + PR #39 lockfile hotfix + manual KVM1 deploy dispatch; Phase 1.5 is the recommended next agent-buildable pull. Every unchecked agent-buildable item names its applicable Done docs.)

## How this feeds the loop

`Next` below is the queue. Each item lives under a **lane** and is a checkbox.
- Agents are lane-agnostic with soft lean: Claude leans frontend/docs/spec; Codex leans backend/code-volume/tests; either agent may pull any agent-buildable item.
- When `Direction/agent_inbox.md` has no pinned Active Task, agents organize the next unchecked agent-buildable items across Backend + Frontend lanes and surface blockers.
- `agent_inbox.md` overrides this — pin a specific or custom task there and it wins.
- When an item is done, the agent checks it off here (`- [x]`) and logs it in `Direction/decision_log.md`.
- Agents do not auto-pull from **Ops / Justin**, **Verify**, or **Decisions** unless Justin explicitly pins one.

## Current State

- Live on the renamed route; PR #22 deployed (run `26833528435`); `/api/health` ok, `/api/ready` ready.
- Backend tests 281/281 local (2026-06-05); frontend build clean; `npm audit --audit-level=moderate` currently reports 1 transitive `hono` advisory through `promptfoo` and needs explicit package-file approval to fix.
- Tier 2 authenticated production smoke: 13/13 passed 2026-06-04.
- Local authenticated load smoke completed 2026-06-05 with `scripts/load-corvus-routes.js`: Trade Analyzer 10/10 `200` p95 34ms; Omen 10/10 `200` p95 4999ms; dashboard summary 10/10 `200` p95 633ms. Omen latency is a follow-up concern, not an auth blocker.
- `VITE_ESPN_ENABLED=true` set in corvus root `.env.local` (2026-06-05). Build confirmed clean. ESPN real-account QA complete — all three platforms connected (Sleeper ✓, Yahoo ✓, ESPN ✓).
- Tuesday scoring nflverse adapter is implemented locally with fixture tests and dry-run no-write mode. Cron remains disabled until approved real-data dry-run validation and scoring enablement.
- Hostinger KVM1 launch env decision: set `CORVUS_CRON_SCORING_ENABLED=false` for launch. Do not enable Tuesday scoring during the hosting move.
- Posture: **KVM1-live / post-cutover QA**. Remaining gates: Stripe/payment surface gating (done 2026-06-08 — kill-switch built backend+frontend, reviewed; deploy pending), final production secrets/Supabase review, and Tuesday scoring enablement after backend provider implementation/validation.
- Phase 1.4 (font system) actually-in-prod 2026-06-16 ~21:30 UTC after PR #38 merge + PR #39 lockfile hotfix + manual KVM1 deploy dispatch. PR #38 was merged with the gating `ui-quality` check red; both the post-merge deploy and the prior 2026-06-15 doctrine push had been red. Two new operating rules captured in `decision_log.md`: (1) any Phase touching `package.json` / `package-lock.json` requires clean-clone (`rm -rf node_modules && npm ci` or `/tmp` clone) verification — local `npm install` history masks broken committed lockfiles; (2) never merge with the gating CI check red. Stale `KVM1_HOST` secret was the second blocker after the lockfile fix landed — when deploys time out post-infra-change, re-verify repo-secret freshness alongside ufw/sshd. Full incident: `Blueprints/handoffs/2026-06-16-phase1-4-lockfile-resync-handoff.md`.

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
- [ ] **Phase 2.5 — Proprietary ADP weighting service.** Build on top of `src/services/adp.js` and the schema landed in Phase 1.4. Output: per-player score combining FFC/Yahoo/MFL with weights configurable per league scoring config row. Done docs: feature + recommendation + security if DB/service-role access changes.
- [ ] **Phase 2.6 — Math engine parameterized.** Refactor `src/services/optimizer.js` + `src/services/tradeValue.js` to consume scoring config as a parameter. Inputs change; call sites stable; tests stay green at 240/240+. Done docs: feature + recommendation.
- [ ] **Phase 2.7 — Demo Mode backend.** Public route returning a populated normalized roster + Omen envelope labeled `mode:"demo"`. Distinct from `mode:"live"` and `mode:"mock"`. Drives the `/demo` frontend route. Done docs: feature + recommendation.
- [ ] **Phase 2.8 — Sleeper live draft tracking (Aug 15 deadline).** Debounced Lazy Sync against Sleeper draft endpoints. No long-polling sockets. Done docs: feature + recommendation + security.
- [ ] **Phase 2.10 — Trade share hash routes.** `crypto.randomUUID` + `POST /api/trade/share` (writes hash + payload) + `GET /api/trade/share/:hash` (public read). Done docs: feature + recommendation + security.

### Backend / Codex — Phase 3
- [ ] **Phase 3.12 — Tailscale → KVM2 Gemma 4-E4B bridge** for narration. `LLM_BASE_URL` already in env inventory. Done docs: feature + security.
- [ ] **Phase 3.13 — Token-constrained prompts** (≤50 words / 2 sentences) for CPU inference mitigation. Done docs: feature + recommendation.
- [ ] **Phase 3.15 — `AI_PROVIDER=local|cloud` toggle** with hard budget cap. **DO NOT BUILD until the cap is logged in `decision_log.md` with Justin's approved dollar figure.** Done docs: feature + security + release when deployed.

### Backend / Codex — Phase 4
- [ ] **Phase 4.16 — Termly base ToS + Privacy Policy** — Codex authors AI-drafted custom paragraphs for ESPN cookie handling, Yahoo attribution, Sleeper attribution. Justin reviews. Done docs: security + content-marketing if public pages/posts are produced.

### Backend / Codex — Pre-pivot completions (evidence)
- [x] Billing kill-switch implemented 2026-06-08: `CORVUS_BILLING_ENABLED` (default false) gates `/prices` + `/checkout` + `/portal` (`403 billing_disabled`); `requireSubscription` is a pass-through when off (auth still required); webhook untouched. `npm test` 290/290.
- [x] WS1 Hostinger KVM1 prep — draft compose, Nginx, env inventory, deploy notes, and local deploy ignore file under `deploy/hostinger/`.
- [x] Trade Analyzer Phase 2 — backend player-search endpoint (Request 20).
- [x] Webhook persists `trial_ends_at` / `current_period_end` — confirmed working 2026-06-08.

### Backend / Codex — Behind launch readiness (post-launch, not deferred to 2027)
- [ ] Tuesday scoring enablement (`CORVUS_CRON_SCORING_ENABLED=true`) after approved Supabase dry-run. Done docs: feature + recommendation + security + release.
- [ ] ESPN live draft tracking (Lazy Sync, same pattern as Sleeper). Done docs: feature + recommendation + security.
- [ ] Yahoo live draft tracking (Lazy Sync, same pattern as Sleeper). Done docs: feature + recommendation + security.

### Frontend / Claude — Phase 1
- [x] **Phase 1.2 — Sentry SaaS free tier wired (frontend half) (2026-06-13).** Shipped via `fa35c76` on `claude/wonderful-jepsen-afb4fd`. `@sentry/react@^8.55.2` added to `frontend/package.json` (version parity with backend). `initSentry()` runs in `frontend/src/main.jsx` before `createRoot` via new `frontend/src/lib/sentry.js`. `<App />` wrapped in `Sentry.ErrorBoundary` with Corvus-themed `CrashFallback` (≥44px reload button — meets Phase 1.3 touch-target discipline preemptively). `beforeSend`/`beforeBreadcrumb` scrubbers mirror the backend (`src/middleware/sentry.js`): ESPN-credential URL patterns (`/api/platforms/espn/connect`, `/api/auth/espn/connect`, `/api/espn/roster`) drop event entirely (also checked against `event.transaction`); sensitive headers, body keys, and URL query strings scrubbed with identical patterns to backend; stack traces truncated to last 20 frames; `__skipBodyLog` honored; fetch/xhr breadcrumbs for ESPN URLs dropped. `VITE_SENTRY_DSN` blank in `.env.example` (no-op locally); `VITE_COMMIT_SHA` added for release tagging; both rows in `deploy/hostinger/ENV-INVENTORY.md`. Source-map upload deferred to post-launch per spec. `npm --prefix frontend run build` clean (456 kB bundle, 1.67s). No frontend test runner configured; scrubber coverage is indirect via backend smoke tests.
- [x] **Phase 1.3 — Page-system spec (2026-06-15).** Authored `Blueprints/specs/page-system.md` v1 from QA Part 2 markdown + 17 annotated screenshots (light + dark mobile Safari). Per-route typography role, accent role, palette, copy anchor, approved/disapproved patterns, light/dark parity rules. Verified against `SKILL_ROUTING.md@2026-06-15`. Guardrails used: `design:design-system` + `ui-ux-pro-max`. Every Phase 1.4–1.12 item is "Blocked by Phase 1.3" and must reference a Page System Table row + Component Rule before shipping.
- [x] **Phase 1.4 — Font system propagation fix (2026-06-15 source; 2026-06-16 actually-in-prod).** Replaced the old Cormorant direction with Alegreya Sans for headings/card titles/UI and Alegreya for body text per Justin's brand decision. Updated the brand/design/page specs and applied the font propagation sweep across flagged pages/components. Fixed TE1 "1"-vs-"TE" parity by moving strategy titles to the heading/UI font. Fixed light-mode olive-gold "Continue with Email" token misuse. Source PR: #38 (`Codex/phase1 4 font system`, merged 2026-06-16 20:25 UTC with `ui-quality` red). Lockfile hotfix PR: #39 (`fix(ci): resync root package-lock.json with package.json`, merged 2026-06-16 ~21:07 UTC, `quality` ✅ `build` ✅). Production live after manual `Deploy to Hostinger KVM1` workflow_dispatch ~21:30 UTC (stale `KVM1_HOST` secret re-set by Justin). Two carry-forward rules added to `decision_log.md`: clean-clone verification required for any Phase touching package files; never merge with the gating CI check red. Full incident: `Blueprints/handoffs/2026-06-16-phase1-4-lockfile-resync-handoff.md`. Done docs: page + design.
- [ ] **Phase 1.5 — Team accent sweep (whole-app, both modes).** Audit every page where the page-system table marks "Accent active". Verify `--color-team-accent` consumption on CTAs, focus rings, active tab, "you" row, selected tile outline, header rules, Omen accept button. Confirm reads stay neutral. Confirm no team accent on body / mock / error. 32-team contrast cross-check (each accent vs both `--color-bg` modes — flag any team below WCAG AA, define secondary accent for those teams). **Blocked by Phase 1.3 [x] + Phase 1.4 [x].** Guardrails: `ui-ux-pro-max` accent-contrast library; verdict: `slops-ui-ux-audit`. Done docs: page + design.
- [ ] **Phase 1.6 — Position chip palette + selected-state styling.** RB=green, WR=blue locked. Add QB / TE / DEF / K hues (use `ui-ux-pro-max` palette library, color-blind distinguishability required). Define filled selected state in team accent (replaces broken yellow-with-X look on `/draft`). Apply to position chips + scoring-format chips. **Blocked by Phase 1.3 [x] + Phase 1.4 [x].** Guardrails: `ui-ux-pro-max` palette + color-blind validation; verdict: `slops-ui-ux-audit`. Done docs: page + design + recommendation if recommendation cards change.
- [ ] **Phase 1.7 — Platform brand color emphasis + button-style consistency.** Sleeper blue / Yahoo purple / ESPN red — verify exact hexes via `ui-ux-pro-max` platform-brand cross-check. Apply prominently on `/account/connect` tiles, `/account` connect-row buttons (Connect Sleeper / Yahoo / ESPN must share one button shape + size), `/standings` platform badge, league switcher. Both modes. **Blocked by Phase 1.3 [x] + Phase 1.4 [x].** Guardrail: `ui-ux-pro-max`; verdict: `slops-ui-ux-audit`. Done docs: page + design.
- [ ] **Phase 1.8 — Confidence gradient endpoints.** Rich dark crimson at 0% → rich dark green at 100%, HSL interpolation, amber midpoint. Apply to Omen confidence bar + Draft Assistant card confidence bar (current bars all gold — replace). Both modes — light-mode endpoints are darker variants, not lighter washes. **Blocked by Phase 1.3 [x] + Phase 1.4 [x].** Guardrail: `ui-ux-pro-max` gradient interpolation; verdict: `slops-ui-ux-audit`. Done docs: design + recommendation.
- [ ] **Phase 1.9 — Metallic tier treatment.** Draft Assistant top-3 ordinal pills: 1=antique gold (distinct from `--color-accent`), 2=brushed silver, 3=antique bronze. Subtle gradient + bevel, not flat fills. Optional add-on: metallic on selected Appearance tile glyph per Justin QA "3D effect on selections". **Blocked by Phase 1.3 [x] + Phase 1.4 [x].** Guardrail: `ui-ux-pro-max` metallic contrast; verdict: `slops-ui-ux-audit`. Done docs: design + recommendation if Draft Assistant cards change.
- [ ] **Phase 1.10A — UX copy options packet.** Invoke `slops-ux-copy` and present 3 options for each: (a) `/omen` offseason empty state ("resting / calibrating / meditating for the next Omen"); (b) `/onboarding` "You're ready" success copy rewrite; (c) landing-page Trade Analyzer Example headline replacement (current "Know the move before you make it." is brand-system-banned — replace with "Less guessing. Better moves." or "See the move before the league does."). No source changes in this item; Justin selects the final copy. **Blocked by Phase 1.3 [x].** Done docs: n/a — decision packet; evidence is the copy options/handoff.
- [ ] **Phase 1.10B — Apply approved copy and remove preview banner.** Implement Justin-approved Phase 1.10A copy and remove the yellow "Preview Mode — example recommendations" banner from `/draft`. **Blocked by Phase 1.10A.** Guardrail: `slops-ux-copy`; verdict: `slops-ui-ux-audit`. Done docs: page + design + recommendation where Omen/Draft/Trade recommendation surfaces change.
- [ ] **Phase 1.11A — Demo Mode frontend fixtures.** Add mock-roster fixture for Omen visual testing, mock previous-results fixture for Ledger, and mock-draft fixture for Draft Assistant. Private only — no public mock-draft route. Clearly labeled as mock, behind a dev flag, and distinct from Phase 2.7 public Demo Mode. **Blocked by Phase 1.3 [x].** Pattern guardrail: `demo-mode-pre-empty-state`. Done docs: feature + design + recommendation.
- [ ] **Phase 1.12 — Gray contrast pass + Standings refinements.** Pass: every gray body string vs its background must clear WCAG AA in both modes. Specific sites: `/account/appearance` paragraph, `/standings` W-L / PF / PA columns, `/hall-of-records` username column, `/onboarding` success paragraph. Standings "DarthSlops · you" row gets distinct row background + team-accent left edge (replaces too-subtle cyan underline). **Blocked by Phase 1.3 [x] + Phase 1.6 [ ]** (palette reuse for gray scale). Guardrail: `ui-ux-pro-max`; verdict: `slops-ui-ux-audit`. Done docs: page + design.
- [ ] **Phase 1.13 — iOS Safari mobile QA sweep.** Open every routed page on iOS Safari (real device or production at https://slopssaloon.com). Fix viewport overflows, flex overflows, touch targets <44px, focus rings, safe-area-inset issues. Single PR. **Soft-blocked by Phase 1.4 [x] + Phase 1.5 [ ]** (don't sweep what's about to be repainted). Skill: `mobile-first-qa-playbook` (use this — purpose-built for the sweep). Done docs: page + design.

### Frontend / Claude — Phase 2
- [ ] **Phase 2.7 — Demo Mode UI.** New public route `/demo`. Populated example roster + Omen envelope with prominent "Demo Mode — your real Omen will appear after your league drafts" labeling. Reuses Omen rendering components. **Blocked by Backend Phase 2.7.** Done docs: feature + page + design + recommendation.
- [ ] **Phase 2.9 — Account delete UI.** Expose backend route at `src/routes/userPrivacy.js:136` in `Account.jsx`. Confirmation phrase: `"DELETE MY CORVUS DATA"`. Place under a "Privacy" subsection. Done docs: feature + page + design + security.
- [ ] **Phase 2.10 — Trade share card.** Share button on Trade Analyzer result. OG image rendered server-side. Card copy: brand voice, recommendation-first, no emoji-soup. **Blocked by Backend Phase 2.10 hash routes.** Done docs: feature + page + design + recommendation.
- [ ] **Phase 2.11 — FP1 signal-honesty labels.** Surface each Omen input's `live` / `stub` / `unavailable` status. Backend vocabulary already exists at `src/services/omen.js:356`. Done docs: feature + page + design + recommendation.
- [ ] **Phase 2.12 — Trade Analyzer form redesign.** Replace position dropdowns with position-as-buttons surface (Justin QA Part 2 — X over current Send/Receive form). Multi-team trade support. Symmetry / industry-trick visual balance. Done docs: page + design + recommendation.
- [ ] **Phase 2.13 — Trade Analyzer Strategy + Mock Buy Low content rewrite.** "Buy after one bad week" / "Sell into the schedule" / "Depth wins championships" / "TE1 is a multiplier" + Mock Buy Low target list — Justin marked "SO SO". Rewrite via `slops-ux-copy`; specifically remove "Build roster depth now" tail from Depth bullet. Done docs: page + design + recommendation.
- [ ] **Phase 2.14 — Standings team-switching UX.** Easier inter-platform team switching per Justin QA. Pairs with Phase 1.7 platform color emphasis. Done docs: feature + page + design.
- [ ] **Phase 2.15 — Account subscription card removal (pre-launch hygiene).** Hide the Corvus Pro "All features included" card on `/account` while Corvus is free this season. Re-show when billing kill-switch flips. Done docs: page + design.
- [ ] **Phase 2.16 — IDP / defensive-player drafting prep.** Position chip palette (Phase 1.6) must already include DEF; this item carries the data + draft flow updates for leagues that draft defensive players. Done docs: feature + page + design + recommendation.

### Frontend / Claude — Phase 3
- [ ] **Phase 3.14 — Skeleton states for narration zones.** Math + numbers render instantly on KVM1; narration block shows skeleton until KVM2 returns. Done docs: page + design.

### Frontend / Claude — Phase 4
- [ ] **Phase 4.18 — Umami snippet** added to `frontend/index.html` once the container is live on KVM1. Done docs: feature + security + release when deployed.
- [ ] **Phase 4.19 — FP2 Sleeper/ESPN Omen render polish.** Ensure live envelopes render correctly across all three providers. Done docs: feature + page + design + recommendation.
- [ ] When the logo SVG is ready: replace the `[C]` placeholder in `Header.jsx` and `NavDrawer` with an inline SVG component. Done docs: page + design.

### Frontend / Claude — Pre-pivot completions (evidence)
- [x] Paid surfaces hidden behind `VITE_BILLING_ENABLED` (default false) 2026-06-08.

### Verify (confirm done vs open — restate findings, do not assume)
- [x] Real-account QA of Yahoo / Sleeper / ESPN Omen + League Standings, especially ESPN reconnect, without logging cookie values. **ESPN QA completed 2026-06-05 (off-season mode).** Four fixes shipped: (1) `seasonCandidates()` retry logic for off-season year; (2) `isSeasonRetryable` handles ESPN 202 redirect; (3) CORS localhost default in `docker-compose.yml`; (4) off-season connect mode — when ESPN API returns 202 for all seasons, credentials are stored and a gold "saved" banner shown. Full in-season QA (live API returning 200) deferred until 2026 season opens (~August). All code changes in source, 13/13 tests pass, frontend build clean.
- [ ] Resolve the doc conflict: does Sleeper/ESPN live Omen return `ready` or `pending_live_engine` for paid connected users? Settle to one truth and update docs. Done docs: n/a — verification/doc-conflict item; evidence is updated contract path.

### Decisions (Justin / Claude — not builds)
- [ ] `POST /api/optimizer/mvp-move` (`src/routes/optimizer.js`): merge into Omen as a Pro enrichment layer, or keep separate.
- [ ] Retire `getOmenOfTheWeekMock()` after Omen migration, or keep as a labeled fallback.
- [x] Final user-facing naming: Omen of the Week vs Omen vs MVP Move. **Confirmed: Omen of the Week.**
- [ ] Recovery analytics: ship before or after the first paid launch.
- [x] Monetization posture changed: Corvus should be free/non-monetized because Yahoo and ESPN cannot be monetized safely under current platform constraints.

### Tech debt (later, low priority)
- [ ] 5 code TODOs: Yahoo per-player projected stats (`adapters/yahoo.js`); `rest_days` / `back_to_back` (`services/agents.js`); weather game-time interval (`services/weatherService.js`). Done docs: feature + recommendation where recommendation behavior changes.
- [ ] Omen latency optimization: `POST /api/omen/mvp-move` p95 ~5s under repeated local load. Investigate LLM call caching, response streaming, or request coalescing. Not a launch blocker — route is functional. Done docs: feature + recommendation.

## Guardrails

- Do not recreate `Corvus/`.
- Do not touch `.env`, secrets, DNS, SSL, Nginx, Supabase migrations, Stripe production behavior, or package files without explicit approval.
- Do not deploy unless Justin explicitly approves the deploy action.
- ESPN must never log or display cookie values.
- Mock data must be clearly labeled and never presented as live fantasy advice.
- Account deletion stays hidden until UX copy + Justin approval are explicit.
