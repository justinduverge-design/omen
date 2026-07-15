# Codex/Claude Code Prompt — Sandbox Fixture Expansion (SB-A)

**Date:** 2026-07-14
**Spec:** `Blueprints/specs/sandbox-environment-spec-v1.md` (Phase A)
**Sprint item:** `Direction/current_sprint.md` → Sandbox Environment lane → SB-A
**Scope:** Backend fixture data only. Do not touch auth, schema, or platform-adapter dispatch — that's
SB-B, a separate, gated, larger piece of work. This prompt is additive fixture data, safe to build now.

## Goal

Add two new deterministic fixtures alongside the existing `DEMO_ROSTER_FIXTURE` in
`src/services/demoMode.js`: a multi-team trade scenario and a draft-board scenario. Same placeholder-
identity convention as the existing fixture (`"Sample QB Starter"`, `"Sample RB Two"`, etc.) — never real
player names, never real team/league identifiers beyond the existing `demo-league-omen` / `demo-team-*`
style keys.

**Immediate use:** the multi-team trade fixture unblocks a specific content backlog item — CP4 in
`slops-saloon/Direction/current_sprint.md` needs a real multi-team trade result screenshot for the
all-users promo reel, and none exists today. This fixture is what gets captured for that.

## Build

1. **Multi-team trade fixture.** A 3-team (or more) trade scenario with realistic-shaped roster/player
   data (positions, teams, projected points — same fields as `DEMO_ROSTER_FIXTURE`'s player objects),
   run through whatever the real Trade Analyzer contract expects (`POST /api/trade/compare`'s response
   shape — check `src/routes/trade.js` or equivalent for the exact contract, don't guess the shape).
   Output should be renderable by the existing `TradeAnalyzer.jsx` / trade-share components without any
   frontend changes — this is a data-shape match exercise, not a new UI.
2. **Draft-board fixture.** A deterministic draft-board scenario (multiple rounds, multiple picks,
   placeholder player pool) matching whatever `DraftAssistant.jsx` / the draft recommendation contract
   expects. Reuse the existing "Preview Mode" pattern if it already has a compatible fixture shape —
   check `frontend/src/pages/DraftAssistant.jsx`'s Preview Mode branch before building a new shape from
   scratch.
3. **Exposure mechanism (pick one, state which):** either extend `GET /api/demo`-style routes with new
   query params/sub-routes for these two scenarios, or add new dev-only preview routes matching the
   existing `?fixture=...` convention documented in `Blueprints/demo-mode.md` (private frontend fixtures
   section) — note that convention is currently `import.meta.env.DEV`-gated and explicitly NOT meant to
   become a public route, so if these fixtures need to be reachable for content capture outside of a dev
   build, that's a real design decision — flag it rather than silently making these dev-only or silently
   making them public without checking the existing rule.
4. **Labeling.** Whatever route/mechanism renders these fixtures must carry the same non-dismissible
   demo/mock labeling discipline as the rest of the app — don't ship a labelless preview screen.

## Constraints

- No real Supabase, platform-adapter, or LLM calls introduced by this work.
- No real player names or real league/team data.
- No schema changes, no auth changes, no `platform_connections` changes — that's explicitly SB-B's scope,
  gated separately.
- Analytics/LLM-training exclusion should apply to any new fixture-rendering surface, same as existing
  demo fixture rules in `Blueprints/demo-mode.md`.

## Verification

- `npm test` clean, no regressions.
- Manual/browser check: both new fixtures render through their respective pages exactly as a real
  connected user's data would (correct component tree, no missing fields, no console errors).
- Screenshot the multi-team trade result once rendered — hand that back to the content pipeline as the
  asset CP4 needs.

## Done-when

Both fixtures exist, render correctly through existing frontend components with no frontend changes
required, are clearly labeled as non-live, and a usable multi-team trade screenshot has been captured and
handed to the content backlog (CP4).
