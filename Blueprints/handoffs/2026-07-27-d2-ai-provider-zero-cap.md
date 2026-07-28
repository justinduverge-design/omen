# D2 — AI Provider Local/Cloud Zero Cap

**Status:** complete locally; not pushed, merged, deployed, or applied to production.

## Contract

`AI_PROVIDER` is normalized case-insensitively. Its default is `local`.

- `local`: preserves the existing private-route-only Ollama bridge behavior.
- `cloud`: returns LLM status `cloud_disabled_zero_budget` and performs no network call because the approved cloud-AI cap is `$0`.
- unknown values: return `invalid_provider` and perform no network call.

`GET /api/platform-status` and `GET /api/ready` expose the existing safe LLM-status block with additive `provider`; it contains no bridge URL, credentials, or secret values.

## Files Changed

- `.env.example`
- `src/config/index.js`
- `src/services/llm.js`
- `test/llmService.test.js`

## Verification

- TDD RED: `node --test test/llmService.test.js` failed because cloud mode did not report a provider state.
- TDD GREEN: focused LLM + system tests passed 18/18.
- Full backend tests: `npm test` passed 418/418.
- Audit: `npm audit --audit-level=moderate` found 0 vulnerabilities.
- `git diff --check` passed.
- Frontend build follow-up passed: the initial failure was stale local `frontend/node_modules` (`react-router@6.30.3`) versus the declared `react-router@8.3.0`. After `npm --prefix frontend ci`, `npm --prefix frontend run build` passed. No frontend source or package manifest change was needed.

## Limitations and Next Step

This is not a cloud implementation, provider integration, paid API approval, or deploy. A future cloud path requires a founder-approved nonzero cap plus a new AI/security review before any credential or egress work.
