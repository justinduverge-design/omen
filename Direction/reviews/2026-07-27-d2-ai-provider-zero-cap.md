# D2 AI Provider Zero-Cap Review

## Scope

Implement `AI_PROVIDER=local|cloud` without authorizing cloud AI spend. Audience: internal merge review.

## Sources Reviewed

- `Direction/current_sprint.md` (D2 acceptance criteria)
- `Direction/decision_log.md` (approved cloud-AI cap: `$0`)
- `src/config/index.js`
- `src/services/llm.js`
- `test/llmService.test.js`

## Confirmed Evidence

| Control | Evidence | Confidence |
| --- | --- | --- |
| Local remains the default | Missing `AI_PROVIDER` normalizes to `local`. | confirmed |
| Cloud cannot make an LLM request | `cloud` clears the bridge URL and returns `cloud_disabled_zero_budget`; focused test observes zero `fetch` calls. | confirmed |
| Invalid provider fails closed | Unknown values clear the bridge URL and report `invalid_provider`. | confirmed |
| Status does not expose a bridge URL | Status returns provider, model, and state only; the cloud test asserts the configured hostname is absent. | confirmed |

## Data Classification and External Systems

No new data category, provider credential, endpoint, or external egress path is added. Existing local LLM calls continue to use the previously approved sanitized recommendation payload. Cloud mode sends no request.

## Review Verdict

PASS. No P0/P1 findings. D2 remains local-only until Justin explicitly raises the `$0` cap and separately approves a cloud provider, credentials, data-egress review, and implementation.

## Quality Note

Focused tests passed 18/18; full backend tests passed 418/418; root moderate audit found 0 vulnerabilities. The frontend production build currently fails on the unchanged base import `HelpButton.jsx:2` (`Link` is not exported by installed `react-router`); it is outside D2 scope and must be fixed in its own frontend/dependency task.
