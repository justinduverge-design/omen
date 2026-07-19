# B2 Unified Omen Recommendation Layer Plan

## Purpose

Implement the B1 contract without creating a second Omen recommendation system.

B2 is backend/internal-contract work. It should make `POST /api/omen/mvp-move` easier to trust, test, and migrate into `DecisionBrief`, while preserving current route behavior unless the field needs below explicitly say otherwise.

## Source Contract

Primary source:

- `Blueprints/specs/omen-mvp-move.md`
- `Direction/reviews/2026-07-19-b1-unified-omen-recommendation-contract.md`
- `Blueprints/handoffs/2026-07-19-b1-unified-omen-recommendation-contract.md`

Current code to inspect first:

- `src/routes/omen.js`
- `src/services/omen.js`
- `src/routes/dashboard.js`
- `src/routes/optimizer.js`
- `test/omenRoute.test.js`
- `test/omenMvpLiveRoute.test.js`
- `test/optimizerRoute.test.js`
- `test/dashboardSummary.test.js`

## Non-Negotiables

- Keep `POST /api/omen/mvp-move` as the only canonical Omen recommendation route.
- Keep `POST /api/optimizer/mvp-move` retired.
- Live UI request stays `{}`.
- Omen stays free and auth-gated.
- Live mode never silently falls back to mock data.
- No cloud AI spend, new provider credentials, SQL, package, deploy, production flag, or analytics in B2.
- ESPN cookie values, Vault ids, bearer tokens, and raw provider responses must not enter responses, logs, screenshots, analytics, or model prompts.

## Phase Plan

### B2A - Route-Level Contract Guard

Goal: Make direct POST behavior match B1 even when callers bypass dashboard.

Changes to consider:

- Add a direct `state: "off_season"` Omen envelope before provider adapter calls when the shared NFL calendar says off-season.
- Preserve dashboard as the normal frontend gate; this is defense-in-depth for API callers.
- Add route tests proving off-season POST returns no recommendation and no provider adapter call.
- Add tests proving non-mock live requests still require bearer auth.
- Add tests proving explicit mock requests still work and remain labeled.

Expected files:

- `src/routes/omen.js`
- `src/services/omen.js`
- `test/omenRoute.test.js`
- `test/omenMvpLiveRoute.test.js`

### B2B - Internal Recommendation Boundary

Goal: Reduce the current embedded recommendation logic without changing output shape.

Changes to consider:

- Extract a small internal builder only if it removes real complexity from `src/services/omen.js`.
- Keep provider selection, roster import, recommendation mapping, empty handling, and recovery response generation explicitly testable.
- Do not add waiver/trade recommendation generation in this phase.
- Do not add a broad abstraction that hides platform-specific recovery behavior.

Expected files:

- `src/services/omen.js`
- optional `src/services/omenRecommendation.js`
- `test/omenMvpLiveService.test.js`
- `test/omenRoute.test.js`

### B2C - DecisionBrief Field Completeness

Goal: Ensure every Omen response state supplies the fields B3/B4 can safely render.

This is not a UI migration. It is backend contract hardening and documentation.

Expected files:

- `src/services/omen.js`
- `test/omenRoute.test.js`
- `Blueprints/handoffs/backend-to-frontend.md`
- `Blueprints/specs/omen-mvp-move.md`

## Field Needs

### Every Omen Envelope

Every `POST /api/omen/mvp-move` response should have:

| Field | Type | Need |
|---|---|---|
| `contract_version` | string | Stable consumer contract identifier. |
| `state` | string | Primary render branch. |
| `feature` | `"omen_mvp_move"` | Product/telemetry identity. |
| `mode` | `"live"` / `"mock"` / `"demo"` | Truth label; frontend must not infer live from missing fields. |
| `request_id` | string | Debug/correlation id; must not contain secrets. |
| `generated_at` | ISO string | Freshness display/debug. |
| `platform` | object | Safe provider summary: name/status/recovery only. |
| `league` | object/null | Safe league context when available. |
| `team` | object/null | Safe team context when available. |
| `signals` | object | Input honesty map. |
| `recommendation` | object/null | Present only when `state === "success"`. |
| `alternatives` | array | Empty array when none. |
| `warnings` | array | Safe user-facing or developer-facing limitations. |
| `error` | object/null/absent | Present for error/recovery states as applicable. |

### Success Recommendation

Every success recommendation should have:

| Field | Type | DecisionBrief Use |
|---|---|---|
| `id` | string | Stable render/key and feedback reference. |
| `type` | string | Decision family; currently `start_sit`. |
| `title` | string | Verdict headline. |
| `move` | string | Primary command/action. |
| `primary_player` | object | Main player surface. |
| `comparison_player` | object/null | Sit/alternate player surface. |
| `expected_value_delta.points` | number/null | Impact metric. |
| `expected_value_delta.label` | string | Human impact label. |
| `confidence.score` | number 0-100 | Confidence bar/metric. |
| `confidence.label` | string | Confidence badge. |
| `confidence.rationale` | string | Why confidence is what it is. |
| `risk.level` | `low` / `medium` / `high` | Risk badge. |
| `risk.reasons` | string[] | Risk explanation. |
| `explanation.summary` | string | Plain-English summary. |
| `explanation.why_it_matters` | string | Reasoning section. |
| `explanation.risk` | string | Plain-English risk. |
| `explanation.confidence` | string | Plain-English confidence. |
| `explanation.data_used` | string[] | Evidence list. |

### Signal Fields

Each `signals.<key>` entry should have:

| Field | Type | Need |
|---|---|---|
| `status` | `live` / `stub` / `mock` / `demo` / `unavailable` | Input honesty label. |
| `used` | boolean | Whether the signal affected the recommendation. |
| `source` | string | Safe source name, no secret/provider raw payload. |
| `message` | string | Plain-English limitation/source note. |

### Empty / Off-Season / Recovery / Error

| State | Required Field Need |
|---|---|
| `empty` | `recommendation: null`, `explanation`, `confidence`, `signals`, `warnings`. |
| `off_season` | `recommendation: null`, safe `empty_state` or `explanation`, no provider call required, no mock advice. |
| `platform_disconnected` | `recommendation: null`, `platform.status`, `platform.recovery`, unavailable roster signal. |
| `pending_live_engine` | `recommendation: null`, `platform.status`, `platform.recovery`, unavailable roster signal. |
| provider recovery states | `recommendation: null`, `platform.recovery.code`, `platform.recovery.cta`, optional `fields_needed` names only, no values. |
| `error` | `recommendation: null`, `error.code`, `error.message`, `error.retryable`, no raw exception/provider body. |

## Test Plan

Intended RED examples:

- Direct live POST during off-season currently does not return `state: "off_season"` before provider calls.
- A route-level field-completeness assertion should fail if any success/empty/recovery envelope lacks the required field group.

GREEN examples:

- Focused Omen route/service tests pass.
- Retired optimizer route test still proves `410`.
- Dashboard summary tests still prove `ready`, `needs_platform`, `pending_live_engine`, and `off_season`.
- LLM tests still prove live `{}` requests skip LLM by default.

Broader checks:

- `npm test`
- `npm audit --omit=dev --audit-level=moderate`
- `git diff --check`
- Root `npm audit --audit-level=moderate` should be reported separately; pre-existing dev `promptfoo` chain may still fail.

## Done When

- Direct POST behavior has no silent mock fallback and has route-level off-season defense or an explicit documented reason it remains dashboard-only.
- Current success, empty, recovery, and error envelopes satisfy the field needs above.
- The internal recommendation path is clearer without changing the external route or adding unsupported recommendation types.
- AI/security evidence confirms no new model/data/credential boundary.
- Backend handoff tells frontend exactly what B3/B4 can render.

## Out Of Scope

- `DecisionBrief` component implementation.
- `/omen` page migration.
- Recovery analytics.
- Live waiver/trade recommendation generation.
- Provider connection mechanics.
- SQL/Supabase migrations.
- Production deploy or flags.
- Package updates.
