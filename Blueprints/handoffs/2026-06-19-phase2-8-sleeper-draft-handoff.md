# Phase 2.8 Sleeper Live Draft Tracking Backend Handoff

## Files updated

- `src/adapters/sleeper.js` — added `fetchSleeperLeagueDrafts(leagueId)`, `fetchSleeperDraft(draftId)`, `fetchSleeperDraftPicks(draftId)` with Redis micro-cache (`meta` 60s, `picks` 5s).
- `src/services/sleeperDraft.js` — new pure shaping module: `sleeper-draft-list.v1`, `sleeper-draft-meta.v1`, `sleeper-draft-state.v1` envelopes, snake/linear on-the-clock math, `since` cursor delta, advisory `poll_after_seconds` + `debounce_ms`.
- `src/routes/sleeper.js` — added three `requireAuth` routes:
  - `GET /api/sleeper/draft?leagueId=`
  - `GET /api/sleeper/draft/:draftId`
  - `GET /api/sleeper/draft/:draftId/state?since=`
- `test/sleeperDraftService.test.js` — 14 tests; status folding, malformed-pick coercion, snake reversal on even rounds, linear preservation, complete null current_pick, cursor delta, unsorted-input tolerance, contract-version assertions.
- `test/sleeperDraftRoute.test.js` — 11 tests; 400 on missing leagueId / non-numeric since / negative since, 200 success shapes, 404 surfacing from adapter, since-cursor honored, complete-state long-poll.
- `test/sleeperDraftAdapter.test.js` — 4 tests; null upstream → empty list, URL encoding, 404 surfacing, picks null fallback.
- `Blueprints/handoffs/backend-to-frontend.md` — Phase 2.8 contract block added at top with example response and frontend polling snippet.
- `Direction/current_sprint.md` — Phase 2.8 row checked `- [x]` and dated.
- `Direction/decision_log.md` — Phase 2.8 contract + debounce/TTL decisions logged.
- `Direction/agent_inbox.md` — Active Task slot advanced and Phase 2.8 closure recorded.
- `Blueprints/done/LEDGER.md` — Feature + Recommendation + Security Done evidence row.

## Files discussed

- `src/routes/sleeper.js` existing `GET /api/sleeper/roster` — reused the auth + 404 + logging pattern verbatim.
- `src/adapters/sleeper.js` existing `readCache` / `writeCache` Redis pair — reused so Redis-off environments degrade silently.
- `Blueprints/handoffs/README.md` Required Handoff Shape — used as the section template for the contract block.
- `Blueprints/definition-of-done.md` + `done/feature-done.md`, `done/recommendation-done.md`, `done/security-done.md` — gate references for the closure ledger row.
- `Direction/agent_inbox.md` and `Direction/current_sprint.md` Phase 2.8 sprint line — debounced Lazy Sync; no long-polling sockets; Aug 15 deadline.

## Decisions made

- Canonical endpoints are `GET /api/sleeper/draft`, `GET /api/sleeper/draft/:draftId`, `GET /api/sleeper/draft/:draftId/state`. All `requireAuth`; subscription is **not** required (Draft Assistant is free; this is the live draft surface beside it).
- Lazy Sync is implemented as a **numeric `since` cursor** on `pick_no`, not as ETag/If-None-Match. Sleeper picks are append-only with monotonically increasing `pick_no`, so a cursor is the right shape and avoids hashing/304 semantics.
- The server returns `200` with `picks_since: []` + `has_new_picks: false` when nothing is new. No `304`.
- Response includes both `poll_after_seconds` (status-aware: 60 / 8 / 30 / 300 / 30) and `debounce_ms` (5000 floor). Frontends should poll at `max(poll_after_seconds * 1000, debounce_ms)`.
- No per-user in-memory debounce middleware was added. Upstream API protection is achieved by the adapter's Redis micro-cache (`picks` 5s, `meta` 60s) plus the existing `generalRateLimit`. Adding a finer per-user debounce can be a follow-up if real load shows abuse.
- Snake and linear/standard drafts compute `on_the_clock` server-side from `total_picks_taken`. Auction drafts pass through with `on_the_clock: null` and the raw Sleeper `type` so the frontend can detect.
- No new dependencies. Uses `axios` + `@upstash/redis` already in the adapter.

## Unresolved questions

- Whether to add a per-user Redis-backed cooldown beyond the advisory `debounce_ms` once we have real Sleeper draft-day load numbers. Punted as launch tech debt.
- Frontend Phase 2.8 surface (draft room UI) is not yet scoped in `current_sprint.md` — this handoff makes the backend contract stable for that scoping pass.
- Whether to expose `picked_by` user-id resolution to display names. Today we return raw Sleeper `user_id` only.

## Blockers surfaced

- None for the backend contract. The Aug 15 Sleeper deadline is unchanged.
- No package, secret, migration, Supabase query, or frontend change occurred.
- ESPN and Yahoo live draft tracking remain post-launch (per `Direction/current_sprint.md`).

## Last verified build/test result

- 2026-06-19: `npm test` — 341/341 passed (was 312; +29 from the three new test files).
- 2026-06-19: `npm audit --audit-level=moderate` — 0 vulnerabilities.
- 2026-06-19: working tree edits limited to `src/adapters/sleeper.js`, `src/routes/sleeper.js`, `src/services/sleeperDraft.js`, and the three new `test/sleeperDraft*.test.js` files plus docs.
- `slops-code-review` — not run. Justin's "merge and deploy" directive bypassed the soft-review step; the gating CI checks (`quality` and `build` in `.github/workflows/deploy.yml`) ran on the merge-to-main push, passed, and the deploy job completed. No 2026-06-16 "never merge with the gating CI check red" rule was violated because the gating checks ran post-merge as part of `deploy.yml` and went green.

## Release evidence

- Implementation commit `8563cc4`.
- PR #53 squash-merged to `main` 2026-06-19T20:50:05Z as `8c6c3bd183ac0f483d12aecf9a6c71cdf4efafe1`.
- `Deploy to Hostinger KVM1` (`.github/workflows/deploy.yml`) primary self-hosted-runner path completed; KVM1 container restarted (`/api/health` uptime 282s at 21:01 UTC smoke; pre-merge baselines were 7642s and 7893s).
- Independent production smoke 2026-06-19 21:01 UTC:
  - `https://slopssaloon.com/api/health` → `200 {status:"ok"}`
  - `https://slopssaloon.com/api/ready` → `200 {status:"ready"}` (Supabase reachable; Stripe/Yahoo/Redis/LLM/OpenWeather optional all `true`)
  - `https://www.slopssaloon.com/api/health` → `200 {status:"ok"}`
  - `https://slopssaloon.com/api/version` → `200 {service:"corvus-api"}`
  - `https://slopssaloon.com/api/sleeper/draft?leagueId=ping` (no auth) → `401 Missing bearer token`
  - `https://slopssaloon.com/api/sleeper/draft` (Bearer fake) → `401 Invalid or expired token`
  - `https://slopssaloon.com/api/sleeper/draft/some-id` (no auth) → `401 Missing bearer token`
  - `https://slopssaloon.com/api/sleeper/draft/some-id/state?since=0` (no auth) → `401 Missing bearer token`
- `requireAuth` confirmed gating before query/path validation across all three new routes.
- Rollback target: revert `8c6c3bd` through a PR; the normal `main` workflow rebuilds and redeploys the prior API and cron images.

## Next recommended pull

- Phase 2.10 — Trade share hash routes (`crypto.randomUUID` + `POST /api/trade/share` + `GET /api/trade/share/:hash`). Independent of Phase 2.8, no shared adapters.
- Or Phase 2.17 — Platform `lastResult` field — blocks frontend Phase 1.5d. Yahoo/ESPN need pre-build research first.
