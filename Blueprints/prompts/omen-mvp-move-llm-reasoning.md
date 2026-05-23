# Omen / MVP Move LLM Reasoning Prompt

Use this prompt for the next backend development pass.

```text
You are Codex, the backend engineer for the Slops Saloon `ssffmvp` repo.

Implement Gemma/Ollama-backed plain-English reasoning for the Omen of the Week / MVP Move backend route.

Objective:
Replace the `llm_reasoning: stub` signal with live Gemma reasoning when the local Ollama/Gemma service is configured, while preserving deterministic template fallbacks and the existing Omen contract envelope.

Scope:
- Backend only.
- Use the existing `src/services/llm.js` wrapper.
- Keep the existing `POST /api/omen/mvp-move` contract shape.
- Keep the current deterministic recommendation math/mock decision data.
- Enrich explanation text only; do not let the LLM choose the move, confidence score, risk level, player names, expected value delta, or response state.
- Do not redesign or modify the frontend.
- Do not implement Matchup DvP in this pass.
- Do not implement the nflverse ETL in this pass.
- Do not change deployment, production config, Docker, Nginx, DNS, SSL, payments, SQL, package files, scripts, secrets, `.env` files, tokens, cookies, credentials, or infrastructure.
- Do not expose Ollama publicly.
- Do not send raw request bodies, credentials, cookies, auth headers, Vault ids, ESPN responses, or secrets to the LLM.

Read first:
- DBS_INDEX.md
- README.md
- Direction/context.md
- Direction/current_sprint.md
- Corvus/README.md
- Corvus/Direction/context.md
- Corvus/Direction/current_sprint.md
- Corvus/Blueprints/specs/omen-mvp-move.md
- Blueprints/handoffs/backend-to-frontend.md
- Blueprints/security-privacy.md
- src/services/llm.js
- src/services/omen.js
- src/routes/omen.js
- test/omenRoute.test.js

Context:
- Omen / MVP Move is the main Corvus event.
- Users need plain-English reasoning, not heavy math.
- `llm_reasoning` currently returns `status: "stub"` with templated explanation copy.
- `src/services/llm.js` already wraps the Ollama OpenAI-compatible API and returns `null` on failure.
- The app must work without the LLM. LLM output is an enhancement, not a dependency.
- DvP has a separate source decision: use `nflverse-data` later for weekly DvP ETL. That is out of scope for this pass. Leave `matchup_dvp` as `stub` unless it already changed before this task starts.

Implementation requirements:

1. Add an Omen-specific LLM helper.
   - Add a function to `src/services/llm.js`, such as `explainOmenMvpMove(payload)`.
   - Reuse the existing `chat` or `runAgent` pathway.
   - Keep the timeout/failure behavior graceful.
   - Return `null` on unavailable LLM, timeout, non-200 response, invalid JSON, or invalid shape.
   - Do not throw for normal LLM failures.

2. Use structured facts only.
   Send the LLM a sanitized, minimal payload derived from the already-built Omen response:
   - state
   - recommendation type
   - title
   - move
   - primary player name, position, team
   - comparison player name, position, team when present
   - expected value delta
   - confidence score, label, rationale
   - risk level and reasons
   - signal statuses and user-safe signal messages
   - data_used labels

   Do not send:
   - raw request body
   - auth headers
   - cookies
   - tokens
   - Vault ids
   - ESPN raw responses
   - platform credentials
   - stack traces
   - internal error objects

3. Require strict JSON from Gemma.
   The LLM should return only this shape:

   {
     "summary": "string",
     "why_it_matters": "string",
     "risk": "string",
     "confidence": "string",
     "data_used": ["string"]
   }

   Validation rules:
   - All text fields must be non-empty strings.
   - `data_used` must be an array of short strings.
   - Keep only user-facing, plain-English content.
   - Strip markdown fences if Gemma returns them.
   - If validation fails, use the existing deterministic template.

4. Enrich only eligible states.
   - Required: enrich `success` responses when `include_signals.llm_reasoning !== false`.
   - Optional if straightforward: enrich `empty` responses with a no-move explanation.
   - Never call the LLM for:
     - `platform_disconnected`
     - `espn_reauth_required`
     - `espn_league_context_missing`
     - `espn_import_blocked`
     - `espn_recovery_needed`
     - `error`

5. Update `llm_reasoning` signal truthfully.
   - If Gemma returns valid explanation JSON and the response is enriched:
     - `status: "live"`
     - `used: true`
     - `source: "ollama_gemma"`
     - message should say live Gemma reasoning generated the explanation.
   - If Gemma is unavailable, disabled, times out, returns invalid output, or the response is not eligible:
     - keep deterministic template explanation.
     - keep or set `status: "stub"` for eligible fallback.
     - set `status: "unavailable"` only if the request explicitly asked for LLM reasoning and config is missing, if that fits the existing signal pattern.
   - Do not mark LLM reasoning as live unless the LLM output was actually used.

6. Preserve contract stability.
   - Keep `feature: "omen_mvp_move"`.
   - Keep first-class `state`.
   - Keep the existing response envelope fields.
   - Keep `recommendation.explanation` shape unchanged for success.
   - Keep `explanation` shape unchanged for empty if enriched.
   - Keep `mode`, `request_id`, `generated_at`, `platform`, `league`, `team`, `signals`, `alternatives`, and `warnings`.

7. Route integration.
   - Make `src/routes/omen.js` async if needed.
   - Build the deterministic response first.
   - Then attempt LLM enrichment only for eligible states.
   - On LLM failure, return the original deterministic response.
   - Do not turn LLM failure into an endpoint error.

Testing requirements:
- Add focused backend tests for Omen LLM enrichment.
- Do not call a real Ollama/Gemma service in tests.
- Mock or monkey-patch the LLM helper.
- Cover at least:
  - success response uses live LLM explanation when helper returns valid JSON/object.
  - `signals.llm_reasoning.status` becomes `live` only when LLM output is used.
  - success response falls back to deterministic template when helper returns `null`.
  - invalid LLM output falls back to deterministic template.
  - ESPN recovery states do not call the LLM.
  - platform disconnected state does not call the LLM.
  - error state does not call the LLM.
  - `include_signals.llm_reasoning: false` skips the LLM.
- Keep existing Omen route tests passing.
- Run the focused Omen test file first.
- Then run the relevant backend test suite if available and reasonable.

Documentation requirements:
- Do not update `Blueprints/handoffs/backend-to-frontend.md` if the response contract shape stays the same.
- Update `Blueprints/handoffs/backend-to-frontend.md` only if the implemented contract differs from the current handoff.
- If the contract differs, document the exact difference under the Omen / MVP Move section.
- Do not document or expose private Ollama URLs, secrets, credentials, cookies, or `.env` values.

Completion report:
- files changed
- endpoint behavior changed
- LLM eligible states
- fallback behavior
- signal status behavior
- tests added or updated
- commands run
- whether the implementation matches the existing handoff/spec contract
- known limitations
```

## DvP Context For Later

Do not implement this in the LLM pass.

Justin's DvP source decision is:

- Use `nflverse-data`.
- Free, no auth, MIT license, nightly updates during season.
- Build a weekly Node.js ETL later from:
  - `https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats_{year}.csv`
- Compute rolling 3-week Defense vs. Position by `opponent_team + position + week`.
- Omen later needs `getDvP(opponentTeam, position, week)` returning `{ avg_pts_allowed, rank }`.
- Phase 2 paid upgrade path: Fantasy Nerds `/nfl/defense-rankings`.
- Skip Sportradar, ESPN hidden API, FantasyData, Sleeper API for DvP, and Pro Football Reference scraping.
