# Spec: Corvus Decision Layer

## Status

Draft

## Product Decision

Corvus should be a trust-first fantasy football decision assistant.

The first version should prioritize explainable recommendations over complex AI reasoning.

The product moat is not local LLM hosting. The moat is:

- useful recommendations
- clear reasoning
- reliable data
- user trust
- simple decision UX

## Core V1 Features

### 1. Free Trade Analyzer

Purpose:
Help users quickly understand whether a fantasy football trade improves or weakens their team.

Product role:
Front door.

V1 logic:
- Net player value
- positional scarcity
- uneven-trade depth discount
- elite-player scarcity bonus
- clear winner/loser explanation

User promise:
“Know if the trade is actually helping you, not just adding more players.”

### 2. Draft Assistant

Purpose:
Help users find value during fantasy drafts.

Product role:
Preparation / seasonal utility.

V1 logic:
- Value-Based Drafting
- ADP comparison
- Corvus rank
- positional need

V1.5 ideas:
- stacking toggle
- correlation logic
- risk appetite setting

User promise:
“Find the best value before your league notices.”

### 3. Omen of the Week

Purpose:
Provide the best available weekly move recommendation.

Product role:
Main event.

V1 behavior:
- one recommended move
- confidence score
- risk level
- reasoning bullets
- mock/live label
- best available logic from current platform/data state

Omen may include:
- start/sit move
- waiver pickup
- trade angle
- roster weakness
- platform-specific opportunity
- weekly matchup edge

V2 behavior:
- Gemma/Ollama reasoning layer
- richer live signals
- rolling-horizon planning
- advanced matchup context

User promise:
“Here is the one move most likely to improve your week.”

### 4. Start/Sit

Purpose:
Help users make simple player-vs-player decisions.

Product role:
Supporting logic path inside Omen, plus optional utility page.

V1 logic:
- projected point edge
- injury/status signal
- matchup signal when available
- confidence label

User promise:
“Start the player with the better combination of projection, safety, and upside.”

### 5. Waiver Wire

Purpose:
Surface useful pickups when platform data is available.

Product role:
Supporting logic path inside Omen, plus optional utility page.

## Data Strategy

### Use Now

- Yahoo OAuth where already working
- Sleeper API where possible
- ESPN integration because ESPN is essential, with recovery playbook
- ADP sources for Draft Assistant
- nflverse for historical/stat baselines after research
- Supabase for auth/data
- Upstash Redis for caching

### Use Carefully

- OpenWeather for weather context
- ESPN cookie-based auth with clear recovery flow
- Local Gemma/Ollama for optional reasoning, not core blocking logic

### Do Not Use Yet

- SportsRadar paid integration
- complex opportunity forecasting
- fully autonomous LLM decision engine
- hard-coded draft stacking multiplier

## Risks

### Data Quality Risk

Bad data creates bad recommendations. Corvus should show confidence, risk, and source labels.

### API Stability Risk

ESPN cookie-based auth is brittle and may break. It is essential but needs a recovery playbook.

### User Trust Risk

Users may not understand raw math. UI should explain decisions in plain English.

### Latency Risk

Local Gemma/Ollama reasoning may be too slow during peak fantasy windows. V1 should not block core recommendations on LLM output.

## Product Rules

- Explain every recommendation in plain English.
- Do not hide behind “AI says so.”
- Always show mock/live state.
- Always separate confidence from risk.
- Prefer simple useful logic over complex fragile models.
- ESPN is essential.
- SportsRadar is not launch-critical.
- Gemma/Ollama is not launch-critical.

## Recommended Roadmap

### V1: Foundation

- Trade Analyzer front and center
- Basic Draft Assistant with ADP
- Omen of the Week using best available logic
- Start/Sit and Waiver logic under Omen
- ESPN/Yahoo/Sleeper platform strategy

### V1.5: Polish

- Draft stacking toggle
- Freemium conversion flow
- Start/Sit tiers
- Better explanation UI
- More source transparency

### V2: Intelligence Layer

- Gemma/Ollama reasoning
- rolling-horizon planning
- advanced opportunity forecasting
- richer matchup and weather logic
- paid data provider evaluation
