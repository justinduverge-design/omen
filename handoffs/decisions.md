# Decisions

## 2026-05-17 (Session 17 — Omen of the Week UI + parallel build)

- Claude owns frontend.
- Codex owns backend.
- Hostinger KVM2 is the AI Engine.
- Oracle VPS 1 hosts Slops Saloon web app.
- Oracle VPS 2 is dormant utility node.
- Omen of the Week is the main MVP feature and the first tab in the Hall of Records dashboard.
- Backend may use mock data first.
- No paid OpenAI API dependency for local agent testing.
- The Football.jsx page is now titled "Hall of Records" — the product's authenticated decision center.
- ADR-002 through ADR-010 are written and live in `ssffmvp/docs/decisions/`.
- `GET /api/omen-of-the-week` mock is live and the frontend OmenOfTheWeek.jsx component is built against it.
- Start/Sit LLM enrichment spec written for Codex (see `handoffs/backend-to-frontend.md`).
- Waiver wire optimization spec written for Codex (`GET /api/optimizer/waiver`) (see `handoffs/backend-to-frontend.md`).
- Parallel agent workflow established: Explore, Technical Writer, and Backend Spec agents run concurrently.

## 2026-05-18 (Session 18/19 - Corvus backbone implemented locally)

- Corvus remains the active product and main build focus.
- Backend backbone endpoints are implemented locally:
  - `GET /api/session`
  - `GET /api/dashboard/summary`
  - `POST /api/draft-assistant/recommendations`
  - `GET /api/optimizer/waiver`
- `.env.example` now documents `VITE_ESPN_ENABLED`.
- Backend verification: `npm test` passed with 139 tests / 0 failures.
- Claude Code wired the frontend to the new backbone contracts:
  - `ProtectedRoute.jsx` verifies `GET /api/session` after Supabase session resolution.
  - `Football.jsx` uses `GET /api/dashboard/summary` for platform/tool state.
  - `DraftAssistant.jsx` calls `POST /api/draft-assistant/recommendations` and removed local mock fallback behavior.
  - Trade Analyzer and Start/Sit use shared error/empty state components.
  - Omen of the Week handles nullable live Yahoo delta values.
  - Mobile tab navigation and landing hero sizing received first-pass cleanup.
- Frontend verification: `npm run build` passed after the 3A/3B/3C wiring work.
- Deployment status: local dirty worktree only. Not confirmed merged or production-deployed.
- Current active phase is Phase 4: live Omen polish plus platform reconnection flow.
- Phase 4 priority queue:
  - Wire `WaiverWire.jsx` to the platform-centric `/api/optimizer/waiver` endpoint and remove the frontend platform selector.
  - Add `Live · Yahoo` style attribution for live Omen responses.
  - Add token-expired/re-auth recovery UI for Yahoo platform connections.
  - Revisit landing page CTA now that usable tools exist locally.
  - Fix Start/Sit signal rendering for string weights (`high | medium | low`).

## Canonical handoff file paths

- Frontend → Backend requests: `handoffs/frontend-to-backend.md`
- Backend → Frontend contracts: `handoffs/backend-to-frontend.md`
- Decisions: `handoffs/decisions.md`

Files prefixed with `handoffs` (e.g., `handoffsREADME.md`) are deprecated redirects. Do not write new content there.
