# Phase 3.13 Token-Constrained Prompts AI Integration Review

## Scope

Review the local LLM narration path after adding CPU-friendly output limits for trade, start/sit, and Omen MVP Move explanation calls.

## Sources Reviewed

- `src/services/llm.js`
- `src/routes/omen.js`
- `src/routes/trade.js`
- `src/routes/startSit.js`
- `test/llmService.test.js`
- `Blueprints/handoffs/backend-to-frontend.md`
- `Direction/decision_log.md`

## Findings

| Severity | Finding | Status |
|---|---|---|
| P0 | Paid or cloud AI path added without a budget cap | Not present |
| P0 | LLM chooses or mutates the recommendation | Not present |
| P1 | LLM response can block deterministic Omen by default | Not present. Live Omen still skips LLM unless explicitly requested |
| P1 | Prompt/output remains too large for CPU inference mitigation | Fixed. Narration prompt limit is <=50 words / <=2 sentences with a 90-token generation cap |
| P2 | Manager-agent calls still use larger JSON-oriented budgets | Accepted. Phase 3.13 scoped narration prompts only; manager JSON is not user-facing narration |

## Data Flow

The model receives sanitized recommendation facts only. The LLM can narrate deterministic math, but does not select players, alter confidence, change risk, or change response state.

## Cost and Sovereignty

No cloud provider path, package, API key, or `AI_PROVIDER` toggle was added. Existing local Ollama/Gemma path remains optional and private through `LLM_BASE_URL`.

## Verdict

PASS. The integration is narrower and cheaper to run, while preserving deterministic fallback behavior.
