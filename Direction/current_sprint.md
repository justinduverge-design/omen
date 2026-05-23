# ssffmvp Current Sprint

## Focus

ESPN recovery Account page wiring is complete. Next priority is Matchup DvP / Sportradar data integration and live LLM reasoning before paid launch.

## Current Priority

The Omen screen is live against the mock endpoint. All 8 states are verified. ESPN recovery CTA flow is wired end-to-end: Omen → Account with safe query params, Account reads recovery state, PlatformConnections shows state-specific copy, reconnect UI, and Return to Omen link.

## Completed

- Omen of the Week / MVP Move frontend — all 8 states verified. ✅
- ESPN recovery Account page wiring — all 6 changes implemented. ✅

## Near-Term Work

- Matchup DvP — approve Sportradar or equivalent provider, wire real confidence scores.
- LLM reasoning — wire Gemma/Ollama to the Omen route (`llm_reasoning` signal is still stub).
- Keep Trade Analyzer available as the front-door trust tool.
- Keep Draft Assistant framed as the preparation and seasonal tool.
- Preserve Start/Sit and waiver logic inside Omen / MVP Move unless Justin separates them later.

## Guardrails

No deploys, production changes, secrets work, or app behavior changes without explicit Justin approval.
