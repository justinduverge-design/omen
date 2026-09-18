# Omen MVP latency budget and native private narration — 2026-09-17

## Scope and status

Founder-directed local implementation in clean worktree
`/private/tmp/omen-latency-budget`, branch `codex/omen-latency-budget`, based on
`1a698dab48adde35620cb72233980c26e4ea20a5`. It is **not committed, pushed, merged,
deployed, or production-smoked**. No SQL, secrets, provider credential/account action,
model/provider/configuration change, dependency, scoring/publication flip, or store release was
performed.

## Outcome

The canonical `POST /api/omen/mvp-move` now keeps the deterministic provider-backed move on a
bounded response path:

| Stage | Ceiling | Outcome when late |
|---|---:|---|
| Core live decision | 5 seconds | Retryable `503 omen_live_generation_timed_out`; no recommendation is issued. |
| Schedule/travel | 700 ms | Capability stays honestly unavailable. |
| Matchup DvP | 1.1 seconds | Capability stays honestly unavailable. |
| Private LLM narration | 1.25 seconds | `llm_reasoning` stays unavailable; deterministic move is unchanged. |
| Scoring metadata | 1.2 seconds | Pending scoring receipt; no invented scoring contract. |
| Ledger persistence | 2.5 seconds | Fail-closed `503 omen_recommendation_persistence_failed`; no recommendation is issued. |

Persistence is concurrent with advisory enrichment, not a final serial network wait. The route
emits numeric stage-duration/outcome telemetry only; it deliberately omits user, league, player,
token, request body, and provider/model payloads.

Both native clients now send the existing v3 contract plus
`include_signals.llm_reasoning: true`. This is a server-mediated request to the existing private
LLM bridge, never direct native access to Tailscale/Ollama. The request carries no roster,
league/provider facts, model URL, prompt, or credential. The LLM can narrate bounded,
already-selected facts only; it cannot select or alter the move, confidence, risk, players,
evidence, or response state.

## Files changed

- `src/services/latencyBudget.js` — typed bounded-operation primitive.
- `src/routes/omen.js` — stage ceilings, concurrent fail-closed persistence, honest fallbacks,
  privacy-safe latency telemetry.
- `src/services/llm.js`, `src/services/mvpEvidenceEnrichment.js` — per-call narration deadline.
- `mobile/ios/OmenIOS/OmenIOS/App/Api/DashboardRepository.swift` and
  `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/feature/api/Repositories.kt` —
  explicit v3 narration request.
- Native/backend regression tests and the API/shared-context contracts named in the diff.

## Verification

- `NODE_PATH=/Users/justinduvergecatalino/Documents/GitHub/Slops-OS/slops-saloon/omen/node_modules node --test test/latencyBudget.test.js test/omenMvpLiveRoute.test.js`
  — **17/17 pass**. The deliberately never-resolving core path produced retryable 503 in about
  5.0 seconds; a deliberately 5-second LLM returned the unchanged deterministic move in about
  1.25 seconds with `llm_reasoning: unavailable`.
- `./gradlew :app:testDebugUnitTest --tests 'com.slopssaloon.omen.app.feature.api.OmenDecisionTest' --no-daemon --console=plain`
  — **PASS**.
- `xcodebuild -project mobile/ios/OmenIOS/OmenIOS.xcodeproj -scheme OmenIOS -destination 'platform=iOS Simulator,id=9EC025C4-CA62-46C2-B066-7A0BDA209475' test -only-testing:OmenIOSTests/OmenDecisionTests`
  — **23/23 pass**, booted iPhone 17 / iOS 26.5 simulator, Xcode 27.0.
- Full `npm test` was run with the existing dependency runtime as `NODE_PATH`; it produced no
  failure before completion. The focused 17/17 is the explicit, inspectable count for this
  change. `git diff --check` — **PASS**.
- `node scripts/check-sprint-staleness.js` — **13 inherited findings**, none created by this
  worktree. L0 `node Blueprints/tools/truth-gate/truth-gate.mjs --quiet` — **PASS**, P0 0/P1 0.

## Security and review result

Manual final review found no P0/P1 issue after fixing an early-persistence-rejection handling
hazard: the concurrent persistence promise is converted to a settled result immediately, so a
fast failure cannot become an unhandled rejection while advisory work is still running. No new
user data classification, credential flow, consent, retention, or external-sharing boundary was
added. Existing private-bridge status behavior remains server-owned; raw model errors are not
returned to native.

## Skill receipt

- **Task:** Omen latency and native private narration.
- **Change type:** backend recommendation path + additive native request contract.
- **Skills invoked:** `engineering:debug`, `engineering:architecture`,
  `engineering:code-review`; native mobile read gate.
- **Conditional skills considered but not applicable/callable:** local `slops-tdd`,
  `slops-code-review`, `slops-quality-baseline`, `slops-ai-integration-review` were not exposed
  in this runtime. No provider-source or LLM-runtime/configuration change occurred.
- **Evidence:** commands and results above; `Blueprints/api-routes.md`,
  `Blueprints/specs/shared-decision-context-v1.md`, and
  `Blueprints/handoffs/backend-to-frontend.md` carry the client contract.
- **Procedure gap:** direct stalled-dependency regression tests were added and passed, but no
  separately captured RED-before-GREEN command exists; that strict TDD gate is recorded as a
  gap rather than claimed.

## Follow-up boundary

This delivers the bounded application-layer response path. Provider-specific adapter cancellation
is a separate hardening slice: old adapters that do not accept `AbortSignal` may finish their own
work after the response deadline, but cannot keep the user waiting. Before a merge/release,
measure the new server timing fields against a real connected league and choose an operational
SLO from observed provider p50/p95 rather than these first protective ceilings alone.
