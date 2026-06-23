# Omen Context

## Product Layer

Omen is the Fantasy Football MVP product inside the Slops Saloon division.

Path: `<active-git-root>/slops-saloon/omen/`

It is not the SLOPS company layer and not the Slops Saloon division layer. It is the first active product under that division.

## Current Route

- Layer 0 - SLOPS OS: active Git root (`git rev-parse --show-toplevel` from L0)
- Layer 1 - Slops Saloon division: `<active-git-root>/slops-saloon/`
- Layer 2 - Omen product repo: `<active-git-root>/slops-saloon/omen/`

The old nested `Corvus/` subfolder is retired. Product DBS folders now live at this repo root.

## Product Promise

Omen should help users see the best fantasy football move without forcing them to understand heavy math.

The product should explain:

- what move to make
- why it matters
- what the risk is
- how confident Omen is

## Tool Hierarchy

- Trade Analyzer is the front door.
- Draft Assistant is the preparation and seasonal tool.
- Omen of the Week / MVP Move is the main event.
- Start/Sit lives inside Omen / MVP Move.
- Waiver logic lives inside Omen / MVP Move unless explicitly separated later.

## Platform Context

Yahoo, Sleeper, and ESPN all matter.

ESPN is essential but risky. Treat ESPN as a high-value integration that needs careful recovery flows, user guidance, and clear failure states.

## Voice

Users need plain-English reasoning, not heavy math. Math can support decisions, but the product should communicate like a trusted fantasy football analyst.

## Active Handoffs

- Frontend to backend: `Blueprints/handoffs/frontend-to-backend.md`
- Backend to frontend: `Blueprints/handoffs/backend-to-frontend.md`
- Shared engineering decisions: `Blueprints/handoffs/decisions.md`

## Current Build Truth — 2026-06-02

- Live Omen MVP route exists at `POST /api/omen/mvp-move`.
- Live Omen requires auth, Pro subscription, and a usable Yahoo, Sleeper, or ESPN league connection.
- Yahoo, Sleeper, and ESPN can produce the first live lineup/start-sit Omen envelope when credentials and league context are usable.
- Dashboard Omen gate source is `GET /api/dashboard/summary`.
- Omen frontend should call the live route with `{}` only after dashboard status is `tools.omen_of_the_week.status === "ready"`.
- `GET /api/system/current-week` provides public season/week context for routes that still need explicit week input.
- Trade Analyzer is free and public.
- Stripe checkout and portal return to `/account`.
- `GET /api/stripe/prices` is a read-only pricing display contract sourced from configured Stripe Price IDs; `Account.jsx` calls it live with a null-safe fallback.
- `GET /api/dashboard/summary` now includes a safe `subscription` block for Account page UI.
- `GET /api/dashboard/summary` now includes `user.favorite_team`, returning the saved favorite team or `null` when the user has not chosen one.
- `POST /api/omen/feedback` is deployed for HITL feedback and upserts by user/week/season into `moves`. The live Supabase `moves` repair is applied and idempotence-smoked. Frontend: `OmenFeedback.jsx` is wired and handles `200`, `401`, `422`, and `500`.
- `GET /api/moves` is deployed for Move History and returns `moves-history.v1`. Frontend: `MoveHistory.jsx` is wired on the Football page "History" tab.
- `GET /api/league/standings` is deployed for League Standings and returns `league-standings.v1` for Yahoo, Sleeper, and ESPN. Frontend: `LeagueStandings.jsx` is mounted above the tab bar on the Football page.
- `PATCH /api/account/preferences` is deployed for favorite NFL team preference and upserts into `profiles`; the Supabase `profiles.favorite_team` column is applied and verified. Frontend: `TeamTheme.jsx` calls the endpoint; `App.jsx` hydrates team theme from `summary.user.favorite_team` on sign-in.
- Canonical frontend file `frontend/src/pages/OmenOfTheWeek.jsx` now handles `401`, `402`, and `pending_live_engine` defensively.
- Legacy compat routes listed in the frontend handoff now return `410 legacy_route_retired` with canonical hints where available, except `/api/league/standings`, which has been restored as a canonical route.
- `sql/omen_rls_security.sql` has been applied and verified in Supabase as migration `20260531160851_apply_omen_rls_security_full_setup`. Verified live coverage includes `waitlist_signups`, subscription date columns, `moves` feedback idempotence, `profiles.favorite_team`, platform connection safe-column grants, and service-role Vault wrapper RPCs.
- Backend test baseline: 240/240.
- Tier 2 frontend deployed (PR #22, run `26833528435`): Account pricing display, Omen feedback hardening, team theme hydration, Move History / Hall of Records, and League Standings are all live.

## Current Backend / Frontend Boundary

- Codex owns backend contracts, auth gates, subscription state, live Omen, platform integration truth, and handoff answers.
- Claude owns frontend screens, Account subscription UI, Omen display states, and app polish.
- If Claude reports work from `.claude/worktrees/...`, verify it is merged into the canonical repo before treating it as live.
