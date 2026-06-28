# Phase 3.12 Security Evidence - KVM2 Gemma Bridge

Date: 2026-06-27

## Scope

Backend-only hardening for the optional local LLM narration bridge. No deploy, no KVM command, no Tailscale mutation, no `.env` read/write, no Supabase migration, no Stripe production behavior, no package-file edit.

## Data Classification

- Input: bounded Omen narration prompts already produced server-side.
- Output: optional explanation text used as enhancement only.
- Secrets: none added or inspected.
- Provider credentials: none touched.
- ESPN cookies: none touched, logged, displayed, or returned.

## Controls Added

- `LLM_BASE_URL` now fails closed unless the host is private/Tailscale-style.
- Public URLs are reported only as `misconfigured_public`; the actual URL, hostname, and port are never returned by `/api/ready` or `/api/platform-status`.
- Invalid URLs are reported only as `invalid_url`.
- Public or invalid URLs do not trigger `fetch`.
- The route continues to work without LLM by returning deterministic/template narration.
- `/api/ready.checks.optional_services.llm_private` is true only when the bridge is configured to a private host.

## Verification

- RED: `node --test test/llmService.test.js` failed on missing bridge-status export before implementation.
- GREEN: `node --test test/llmService.test.js test/systemRoutes.test.js test/omenMvpLiveRoute.test.js test/omenRoute.test.js` -> 51/51.
- GREEN: `npm test` -> 388/388.
- GREEN: `npm audit --audit-level=moderate` -> 0 vulnerabilities.
- GREEN: `npm audit --omit=dev --audit-level=high` -> 0 vulnerabilities.
- GREEN: `npm --prefix frontend run build` passed after `npm --prefix frontend ci`; existing Vite chunk-size warning only.
- GREEN: `npm --prefix client run build` passed after `npm --prefix client ci`.
- GREEN: `git diff --check`.

## Residual Notes

- Real KVM2 Ollama/Tailscale connectivity was not smoke-tested because KVM/Tailscale access is Justin-gated.
- `frontend npm ci` and `client npm ci` reported existing dependency advisories in those package trees. No package files were edited because dependency remediation is outside this task and package edits are gated.

## Evidence Pointer

Implementation commit: `fbbf0c5`.

