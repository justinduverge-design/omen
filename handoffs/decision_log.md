# Decision Log

## Confirmed Decisions

- Corvus is the main active product.
- Slops Saloon is the umbrella brand.
- Omen of the Week is the core MVP feature.
- Free Trade Analyzer is the free traffic tool.
- Draft Assistant is a supporting feature.
- Start/Sit and Waiver Wire support the weekly decision workflow.
- ChatGPT acts as foreman.
- Codex acts as engineering/backend/repo worker.
- Claude acts as frontend/product/UX worker.
- Gemini Chat is used for second opinions and brainstorming.
- Local Gemma is parked for now.
- Handoff files are required for Claude/Codex coordination.
- Agents may recommend next tasks but should not start the next phase without founder approval.

## Confirmed Technical Direction

- `is_mock` and `mode` are the source of truth for mock/live rendering.
- Mock data should be clearly labeled but not treated as a blocking error.
- Waiver Wire frontend should use `GET /api/optimizer/waiver` without `platform` or `leagueKey`.
- Draft Assistant ADP should use `GET /api/draft-assistant/adp?format={format}&teams=12`.
- Start/Sit signal weights are strings: `high | medium | low`.
- Backend should not expose `LLM_BASE_URL`, platform tokens, cookies, Vault secret IDs, or secrets.

## Open Decisions

- Final Corvus logo
- Final color palette
- Final landing page copy
- Whether "Coming Soon" should become a live auth CTA
- Final MVP feature list
- Whether Omen of the Week requires account creation at MVP
- Which fantasy platform gets priority after Yahoo
- Whether Draft Assistant is V1 or V1.5
- Pricing model
- Launch date

## Current Open Technical Questions

- Are the latest local dirty worktree changes merged?
- Are they deployed?
- Does dashboard summary already support `status: "token_expired"`?
- Does Omen response already include root `scoring_format`?
- Is the ADP exact-name matching good enough for MVP?
- Should shared `player_id` cross-reference be introduced later?
