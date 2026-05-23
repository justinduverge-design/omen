# Corvus Current Sprint

## Focus

ESPN recovery Account page wiring is complete. The full Omen → Account → reconnect → Return to Omen user journey is implemented. Next product priority is live data: Matchup DvP and LLM reasoning.

## Product Priority

Keep the product centered on fantasy football decision intelligence:

- Trade Analyzer brings users in. ✅
- Omen of the Week / MVP Move frontend wired and all 8 states verified. ✅
- ESPN recovery Account page wiring complete. ✅
- Matchup DvP / Sportradar integration is the next data layer.
- LLM reasoning (Gemma/Ollama) wire-up is next for Omen signal quality.
- Draft Assistant is queued as the preparation and seasonal tool.

## Next App Task

Approve Matchup DvP data provider (Sportradar or equivalent). Wire live confidence scores into Omen. Wire Gemma/Ollama to replace the `llm_reasoning` stub.

## Current Guardrails

- Keep Start/Sit and waiver logic inside Omen / MVP Move for now.
- Treat ESPN as essential but fragile.
- Route ESPN recovery through Account with safe state/query context only.
- Do not auto-rerun Omen after recovery; require a user click.
- Keep Yahoo and Sleeper in scope.
- Prefer plain-English reasoning over visible heavy math.
