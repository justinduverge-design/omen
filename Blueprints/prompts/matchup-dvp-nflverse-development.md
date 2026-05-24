# Matchup DvP / nflverse Development Prompt

Use this prompt for the next backend development pass.

```text
You are Codex, the backend engineer for the Slops Saloon `slops-saloon` repo.

Implement live Matchup DvP support for the Omen of the Week / MVP Move backend path using nflverse-data, while preserving the existing Omen contract envelope and all ESPN recovery behavior.

Objective:
Replace the Omen `matchup_dvp: stub` signal with live DvP context when nflverse-data can provide enough trailing-week data. Keep deterministic fallback behavior when data is unavailable, too early in the season, fetch fails, or the player/opponent context is missing.

Scope:
- Backend only.
- Use `nflverse-data` as the DvP source.
- Prefer the existing `src/services/matchupService.js` implementation and tests as the starting point.
- Wire DvP into the Omen / MVP Move backend response only after the deterministic recommendation is built.
- Do not redesign or modify the frontend.
- Do not change deployment, production config, Docker, Nginx, DNS, SSL, payments, SQL, package files, scripts, secrets, `.env` files, tokens, cookies, credentials, or infrastructure.
- Do not expose secrets or private platform data.
- Do not scrape Pro Football Reference.
- Do not use ESPN hidden/private APIs for DvP.
- Do not implement paid provider integrations in this pass.
- Do not let DvP change player names, selected move, platform recovery state, or response envelope shape unless explicitly required by the existing contract.

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
- src/services/omen.js
- src/routes/omen.js
- src/services/matchupService.js
- src/services/nflSchedule.js
- src/services/agents.js
- test/omenRoute.test.js
- test/matchupService.test.js

Context:
- Omen / MVP Move is the main Corvus event.
- Users need plain-English reasoning, not heavy math.
- `matchup_dvp` is currently stubbed in the Omen response.
- `src/services/matchupService.js` already contains an nflverse-data DvP helper and graceful fallback behavior.
- Existing tests cover fetch failure, unsupported positions, minimum sample size, valid DvP context, and cache behavior.
- Omen’s current recommendation is deterministic mock/start-sit data. This pass should enrich signal quality and explanation/risk/confidence copy conservatively, not rebuild the recommendation engine.
- Gemma/Ollama reasoning is a separate enhancement and should remain optional.

Data source decision:
- Use nflverse-data.
- Free, no auth, MIT license.
- Preferred source pattern:
  - `https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats_{year}.csv`
- If the existing code currently uses a non-year-specific CSV, evaluate whether it should be updated to the year-specific release URL.
- Compute trailing DvP by `opponent_team + position` using games before the requested week.
- Require at least 3 sample weeks before treating DvP as live.
- Skip K and DEF/DST DvP.
- Return `null` on unavailable data, timeout, invalid shape, insufficient sample, unsupported position, or parsing failure.

Implementation requirements:

1. Harden `src/services/matchupService.js`.
   - Keep public helper behavior graceful: return `null` instead of throwing for normal data/provider failures.
   - Use a timeout.
   - Cache parsed data in-process.
   - Avoid package changes unless absolutely necessary.
   - Prefer year-specific nflverse URL if compatible with tests.
   - Validate required CSV columns.
   - Avoid logging raw provider bodies.

2. Define the DvP output shape.
   Existing shape is acceptable if preserved:
   {
     "opponent_team": "DAL",
     "position": "WR",
     "avg_points_allowed": 20,
     "sample_weeks": 5,
     "dvp_label": "favorable"
   }

   Optional additions are allowed only if they are user-safe and useful:
   - `rank`
   - `league_rank`
   - `window`
   - `source`

   Do not add fields that expose raw rows or raw provider response text.

3. Wire DvP into Omen.
   - Build the deterministic Omen response first.
   - For `success` only, derive a sanitized DvP lookup from the already-built recommendation and available schedule/opponent context.
   - If opponent context is not available in the current mock response, add the smallest deterministic mock opponent field needed inside backend-only decision data, or document the blocker and keep the signal stub.
   - If `include_signals.matchup_dvp === false`, skip lookup and keep it unused.
   - If DvP returns valid context:
     - set `signals.matchup_dvp.status = "live"`
     - set `signals.matchup_dvp.used = true`
     - set `signals.matchup_dvp.source = "nflverse_data"`
     - use a plain-English message such as "Matchup DvP uses nflverse-data trailing-week fantasy points allowed."
   - If DvP returns `null`, keep `signals.matchup_dvp.status = "stub"` or `unavailable` according to the existing signal pattern.
   - Do not call DvP for platform disconnected, ESPN recovery, empty, or error states unless there is an explicit reason and tests cover it.

4. Use DvP conservatively.
   - It may enrich `recommendation.confidence.rationale`, `recommendation.risk.reasons`, and/or `recommendation.explanation.data_used`.
   - It must not choose the recommendation in this pass.
   - It must not change response state.
   - It must not change platform recovery flows.
   - It must not make unsupported live-fantasy-advice claims when projection and waiver signals remain stubbed.

5. Preserve contract stability.
   - Keep `feature: "omen_mvp_move"`.
   - Keep first-class `state`.
   - Keep the existing response envelope fields.
   - Keep `recommendation.explanation` shape unchanged for success.
   - Keep `mode`, `request_id`, `generated_at`, `platform`, `league`, `team`, `signals`, `alternatives`, and `warnings`.
   - Do not require frontend changes.

Testing requirements:
- Do not call live nflverse GitHub in tests.
- Mock `global.fetch` or monkey-patch the DvP helper.
- Keep existing Omen route tests passing.
- Keep existing matchup service tests passing.
- Add focused tests for Omen DvP wiring:
  - success response marks `matchup_dvp` live when DvP context is available.
  - live DvP is used only when valid context is returned.
  - success response falls back when DvP returns `null`.
  - `include_signals.matchup_dvp: false` skips DvP lookup.
  - ESPN recovery states do not call DvP.
  - platform disconnected state does not call DvP.
  - error state does not call DvP.
- Run focused tests first:
  - `node --test test/matchupService.test.js`
  - `node --test test/omenRoute.test.js`
- Then run:
  - `npm test`

Documentation requirements:
- Update `Blueprints/handoffs/backend-to-frontend.md` only if the implemented contract differs from the current handoff.
- If only `signals.matchup_dvp` changes from `stub` to conditionally `live` with the same signal object shape, document that under the Omen / MVP Move known limitations/status section.
- Do not document or expose private URLs, secrets, credentials, cookies, `.env` values, raw provider bodies, or stack traces.

Completion report:
- files changed
- endpoint behavior changed
- DvP data source used
- DvP eligible states
- fallback behavior
- signal status behavior
- tests added or updated
- commands run
- whether the implementation matches the existing handoff/spec contract
- known limitations
```

## Notes From Previous Pass

- Gemma/Ollama Omen reasoning was implemented as optional explanation enrichment.
- Local smoke test on 2026-05-23 found no `LLM_BASE_URL` in the shell, so the route correctly returned deterministic template copy with `llm_reasoning.status: "stub"`.
- Do not depend on live LLM behavior for DvP tests.
