# AI Integration Review - Omen Recommendation Contract

## Scope

Review the B1 unified Omen recommendation contract for AI/model, cost, fallback, and data-flow risk.

## Sources Reviewed

- `src/routes/omen.js`
- `src/services/omen.js`
- `src/services/llm.js`
- `src/routes/dashboard.js`
- `Direction/facts-of-record.md`
- `Direction/decision_log.md`
- `Blueprints/specs/omen-mvp-move.md`

## Verdict

PASS for B1 contract work.

B1 does not add a model, paid API, prompt, provider, dependency, or new data egress path.

## Findings

| Severity | Finding | Evidence | Required Action |
|---|---|---|---|
| P0 | None. | N/A | N/A |
| P1 | None. | N/A | N/A |
| P2 | Live Omen still has optional LLM explanation code, but live route defaults LLM reasoning off unless explicitly requested. | `src/routes/omen.js` | B2 must preserve local/default-off behavior unless Justin approves a new AI path. |

## Cost Cap

Cloud AI spend remains `$0` per Justin's 2026-07-12 decision. B2 must not introduce paid AI calls or credentials. Any `AI_PROVIDER=cloud` path must remain disabled or fail closed until a new founder decision changes the cap.

## Data Flow

The existing LLM payload is built from sanitized recommendation facts: selected move, players, confidence/risk labels, signal statuses, and data-used labels. It does not need ESPN cookie values, OAuth tokens, Vault ids, auth headers, or raw provider responses.

## Fallback Behavior

The deterministic explanation remains the source of truth. If LLM output is unavailable, invalid, or disabled, the route keeps deterministic copy. This is the correct posture for B1 and should survive B2.

## Required B2 Guardrails

- Keep deterministic recommendation and explanation available without any LLM.
- Do not make cloud AI a required path.
- Do not send secrets, cookies, auth headers, raw provider responses, or private URLs to a model.
- Preserve explicit live/stub/mock/unavailable signal labels.
- Add tests for any change that alters LLM inclusion, fallback, or prompt payload shape.
