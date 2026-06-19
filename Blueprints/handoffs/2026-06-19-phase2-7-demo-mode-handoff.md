# Phase 2.7 Demo Mode Backend Handoff

## Files updated

- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/src/services/demoMode.js` — deterministic normalized roster and Omen-shaped demo response (`e966a0a`).
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/src/routes/demo.js` — public `GET /api/demo` route (`e966a0a`).
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/src/server.js` — public-tool-rate-limited Demo Mode mount (`e966a0a`).
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/test/demoMode.test.js` — determinism, normalized roster, recommendation, labeling, public access, and user-data isolation coverage (`e966a0a`).
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/Blueprints/demo-mode.md` — product demo fixture, labeling, swap, analytics, and model-use contract.
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/Blueprints/audits/2026-06-19-phase2-7-demo-mode-code-review.md` — `slops-code-review` verdict; no P0/P1.
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/Blueprints/api-routes.md` — public Demo Mode route reference.
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/Blueprints/handoffs/backend-to-frontend.md` — required endpoint contract and frontend adoption notes.
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/Direction/current_sprint.md` — Phase 2.7 backend closure and frontend unblock.
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/Direction/decision_log.md` — Demo Mode identity, determinism, and isolation decisions.
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/Direction/agent_inbox.md` — empty Active Task advanced to Phase 2.8.
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/Blueprints/done/LEDGER.md` — Feature + Recommendation Done evidence.

## Files discussed

- `src/services/systemContracts.js` and `src/services/omen.js` — existing mock/live shapes; unchanged.
- `src/services/roster.js` — normalized roster field contract; unchanged.
- `src/services/optimizer.js` — deterministic recommendation math, including merged Phase 2.6 defaults; unchanged.
- `Blueprints/specs/corvus-ux-ui-design-system-v1.md` and `Brand/brand-system.md` — mock/live labels, confidence/risk, and honest-copy guardrails.
- Feature and Recommendation Done docs plus frontend/backend request history.

## Decisions made

- Canonical backend route is public `GET /api/demo`, contract `corvus-demo.v1`.
- Demo is its own mode: `mode: "demo"`, `is_demo: true`, `is_live: false`, `is_mock: false`.
- Demo fixture and recommendation inputs are deterministic; only `generated_at` changes per request.
- Demo calls no auth, Supabase, provider adapter, or LLM and must not feed analytics or model training.
- Leaving Demo Mode for connected data requires an explicit frontend action; never auto-merge or silently fall back.

## Unresolved questions

- Frontend still needs to build `/demo`, persistently label Demo Mode, and add `demo` to its data-source status treatment.
- The reusable Layer 0 demo pattern remains a separately gated cross-layer harvest after the Corvus implementation proves out.

## Blockers surfaced

- None for the backend contract.
- No package, secret, migration, Supabase query, or frontend change occurred.

## Last verified build/test result

- 2026-06-19: `node --test test/demoMode.test.js` — 5/5 passed.
- 2026-06-19: `npm test` — 312/312 passed against merged Phase 2.6.
- 2026-06-19: `npm audit --audit-level=moderate` — 0 vulnerabilities.
- 2026-06-19: `git diff --check` — clean before implementation commit.
- `slops-code-review` — merge verdict; no P0/P1.

## Release evidence

- PR #51 squash-merged to `main` as `cccc857f69364146125ebdd87caab7bb843f234a`.
- `Deploy to Hostinger KVM1` run `27842680052` passed clean-runner tests, production audit, both frontend builds, API and cron image publication, KVM1 pull/restart, and workflow health smoke.
- Independent canary passed 24/24 checks across `slopssaloon.com` and `www.slopssaloon.com`: health, readiness, homepage, and `corvus-demo.v1` all returned `200`; Demo identity, populated roster, Omen recommendation, and telemetry exclusions matched contract; HTTP redirected to HTTPS; HSTS was present. p95 latency was 242 ms, max 262 ms.
- Rollback target: revert `cccc857` through a PR. The normal `main` workflow will rebuild and redeploy the prior API and cron images.

## Next recommended pull

- Phase 2.8 — Sleeper live draft tracking with debounced Lazy Sync and no long-polling sockets.
