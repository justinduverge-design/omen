# Phase 3.13 Token-Constrained Prompts Security Evidence

## Scope

Security and privacy evidence for limiting local LLM narration prompts and outputs.

## Sources Reviewed

- `src/services/llm.js`
- `src/routes/omen.js`
- `src/routes/trade.js`
- `src/routes/startSit.js`
- `test/llmService.test.js`
- `deploy/hostinger/ENV-INVENTORY.md`
- `Blueprints/handoffs/backend-to-frontend.md`

## Confirmed Evidence

| Control / Claim | Evidence | Source | Confidence |
|---|---|---|---|
| No secrets added | No env, package, deploy, or config file changed for this feature | Git diff | Confirmed |
| LLM URL stays private | `LLM_BASE_URL` is read server-side and not returned by narration routes | `src/services/llm.js` | Confirmed |
| Deterministic fallback remains | LLM helpers return `null` on failures; Omen keeps deterministic explanation when parse fails | `src/services/llm.js`, `src/routes/omen.js` | Confirmed |
| Overlong Omen narration is rejected | `parseOmenExplanation()` now enforces <=50 words and <=2 sentences across prose fields | `src/services/llm.js`, `test/llmService.test.js` | Confirmed |
| ESPN cookies unaffected | No ESPN adapter, platform route, Vault path, or logging path changed | Git diff | Confirmed |

## Data Classification

| Data Type | Sensitivity | Source / Flow | Notes |
|---|---|---|---|
| Sanitized recommendation facts | Product data | Backend to local LLM | Contains selected move facts, not raw credentials |
| LLM narration output | Product explanation | Local LLM to backend response | Rejected if too long in Omen strict-JSON path |
| Platform credentials / ESPN cookies | Secret | Not touched | No new exposure |

## Gaps and Unknowns

- No live KVM2 model smoke was run here.
- Manager-agent JSON prompts remain outside this item because Phase 3.13 names narration prompts.

## Approval Required

- Deploy remains Justin-gated.
- Any cloud AI toggle remains blocked until Justin logs a hard dollar cap.

## Recommended Next Safe Step

Merge after review, then let the frontend Phase 3.14 skeleton work account for the unchanged fact that live Omen narration is opt-in and may still be slower than deterministic math.
