# Omen / MVP Move Backend Mock Endpoint Prompt

Use this prompt for the next backend development pass.

```text
You are Codex, the backend engineer for the Slops Saloon `slops-saloon` repo.

Implement the Omen of the Week / MVP Move backend mock endpoint.

Scope:
- Backend only.
- Do not redesign or modify the frontend unless a tiny integration-safe change is unavoidable.
- Do not change deployment, secrets, production config, SQL, payments, or infrastructure.
- Do not expose Ollama publicly.
- Use mock or stub data only when clearly labeled in the response.

Read first:
- DBS_INDEX.md
- README.md
- Blueprints/handoffs/backend-to-frontend.md
- Corvus/Blueprints/specs/omen-mvp-move.md

Then inspect only the backend files needed to follow existing route, service, middleware, and test patterns.

Goal:
Implement `POST /api/omen/mvp-move` as a stable backend mock endpoint that returns the contract envelope already defined in the handoff/spec.

Required endpoint behavior:
- Return `feature: "omen_mvp_move"` on every response.
- Return a stable `state` field first-class in the response.
- Support these states:
  - `success`
  - `empty`
  - `platform_disconnected`
  - `espn_reauth_required`
  - `espn_league_context_missing`
  - `espn_import_blocked`
  - `espn_recovery_needed`
  - `error`
- Support platform values:
  - `yahoo`
  - `sleeper`
  - `espn`
- Keep Yahoo, Sleeper, and ESPN platform behavior contract-compatible even when mock data is used.

Request shape:
Accept the request shape from `Blueprints/handoffs/backend-to-frontend.md` and `Corvus/Blueprints/specs/omen-mvp-move.md`:
- `platform`
- `league_id`
- `team_id`
- `season`
- `week`
- `scoring_format`
- `decision_scope`
- `include_signals`
- `use_mock_data`

Response shape:
Return the envelope from the handoff/spec, including:
- `state`
- `feature`
- `mode`
- `request_id`
- `generated_at`
- `platform`
- `league`
- `team`
- `signals`
- `recommendation`
- `alternatives`
- `warnings`

Signal flags:
Every relevant signal should include:
- `status`
- `used`
- `source`
- `message`

Supported signal status values:
- `live`
- `stub`
- `mock`
- `unavailable`

Initial signal expectations:
- `roster`: `live` when a platform is treated as connected, otherwise `unavailable`
- `projections`: `stub`
- `weather`: `live` or `stub`, depending on available config
- `travel_home_away`: `live`
- `game_time_tv`: `live`
- `matchup_dvp`: `stub`
- `waivers`: `stub`
- `llm_reasoning`: `stub` until Gemma/Ollama reasoning is wired

Recommendation requirements:
On `success`, include:
- `id`
- `type`
- `title`
- `move`
- `primary_player`
- `comparison_player` when relevant
- `expected_value_delta`
- `confidence`
- `risk`
- `explanation`

Confidence requirements:
- `score`: integer from `0` to `100`
- `label`: `low`, `medium`, `medium_high`, or `high`
- `rationale`: plain-English explanation of why confidence is what it is

Risk requirements:
- `level`: `low`, `medium`, or `high`
- `reasons`: short user-facing strings

Plain-English explanation requirements:
Include:
- `summary`
- `why_it_matters`
- `risk`
- `confidence`
- `data_used`

State requirements:
- `success`: return one mock/stubbed MVP Move recommendation with clearly labeled signal statuses.
- `empty`: return `recommendation: null` and a plain-English explanation that no move clears the threshold.
- `platform_disconnected`: return `recommendation: null`, platform recovery metadata, and roster signal `unavailable`.
- `espn_reauth_required`: return ESPN recovery metadata with `fields_needed: ["ESPN_S2", "SWID"]`.
- `espn_league_context_missing`: return ESPN recovery metadata telling the frontend to ask the user to select or re-import the league.
- `espn_import_blocked`: return ESPN recovery metadata telling the frontend to retry, reconnect, or verify league access.
- `espn_recovery_needed`: return ESPN recovery metadata for unclear ESPN auth/access/response failures.
- `error`: return a stable error envelope with `code`, `message`, and `retryable`.

Testing requirements:
- Add focused backend tests for the new route.
- Cover at least:
  - success response envelope
  - empty state
  - platform disconnected state
  - each ESPN recovery state
  - error state
  - signal status values
  - confidence/risk/explanation presence
- Follow existing test style and route registration patterns.
- Run the focused test file first, then the relevant backend test suite if available.

Documentation requirements:
- Do not update `Blueprints/handoffs/backend-to-frontend.md` if the implementation matches the proposed contract.
- Update `Blueprints/handoffs/backend-to-frontend.md` only if the implemented contract differs from the proposed one.
- If the contract differs, clearly describe the difference under the current Omen / MVP Move handoff section.

Completion report:
When finished, report:
- files changed
- endpoint added
- states supported
- test coverage added
- commands run
- whether the implementation matches the handoff/spec contract
```
