# Phase 3.12 Handoff - KVM2 Gemma Bridge

Date: 2026-06-27
Branch: `codex/phase3-12-kvm2-gemma-bridge`
Implementation commit: `fbbf0c5`
Status: Merged and deployed. PR #70 squash-merged to `main` as `a13160b`; Deploy to Hostinger KVM1 run `28306784898` passed quality, image build/push, KVM1 restart, workflow health smoke, and independent public canary.

## What Changed

- Hardened `src/services/llm.js` so `LLM_BASE_URL` is accepted only for private/Tailscale-style hosts.
- Default local model target changed to `gemma4:e2b-q4_0`; `LLM_MODEL` still overrides.
- `/api/ready` now reports safe LLM bridge status at `checks.llm`.
- `/api/platform-status` now reports the same safe LLM bridge status at `dependencies.llm`.
- Public/invalid LLM URLs fail closed to the existing deterministic/template narration path.

## Contract Notes

No new route. Additive fields only:

- `GET /api/ready` -> `checks.llm.status`
- `GET /api/ready` -> `checks.optional_services.llm_private`
- `GET /api/platform-status` -> `dependencies.llm.status`

Possible status values:

- `not_configured`
- `configured_private`
- `misconfigured_public`
- `invalid_url`

The URL is never returned.

## Verification

- RED: `node --test test/llmService.test.js` failed before implementation.
- Focused: `node --test test/llmService.test.js test/systemRoutes.test.js test/omenMvpLiveRoute.test.js test/omenRoute.test.js` -> 51/51.
- Full backend: `npm test` -> 388/388.
- Root audit: `npm audit --audit-level=moderate` -> 0 vulnerabilities.
- Production-deps audit: `npm audit --omit=dev --audit-level=high` -> 0 vulnerabilities.
- Primary frontend build: `npm --prefix frontend run build` -> clean, existing Vite chunk warning.
- Legacy client build: `npm --prefix client run build` -> clean.
- Whitespace: `git diff --check` -> clean.

## Release Evidence

- PR: https://github.com/justinduverge-design/omen/pull/70
- Merge commit: `a13160b3b0ccaf286a6b73fb7c0b490394ca449d`
- Deploy run: https://github.com/justinduverge-design/omen/actions/runs/28306784898
- Workflow result: quality, build, and deploy jobs all passed.
- Independent canary: `https://slopssaloon.com/api/health`, `/api/ready`, `/api/platform-status`, homepage, `/demo`, and `https://www.slopssaloon.com/api/health` all returned 200.
- HTTP -> HTTPS redirect returned 301.
- HSTS present on homepage response.
- Live `/api/ready` reports `checks.optional_services.llm_private: true` and `checks.llm.status: "configured_private"` without exposing the URL.
- Live model is `gemma3:4b` because production `LLM_MODEL` overrides the new code default; this is expected.

## Gates Not Run

- No direct KVM2 shell/Tailscale smoke beyond the live API's `configured_private` status.
- No production `.env` edit.
- No Supabase migration.
- No Stripe production behavior.
- No package-file edit.

## Follow-Up

- Phase 3.13 can now reduce narration token volume for CPU inference.
- Phase 3.15 remains blocked until Justin logs a hard cloud-AI dollar cap.
