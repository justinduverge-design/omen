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

## Tool Hierarchy — revised 2026-08-31 by the app-wide page workshop

- Trade Analyzer is the front door.
- Draft Assistant is cut from 1.0 and ships 2027 on a Slops-built ADP.
- Omen of the Week / MVP Move is the main event.
- **Omen returns ONE call per week, and its type is not fixed.** That call may be a start/sit,
  a pickup, a drop, or a trade. The earlier reading — that Start/Sit and Waiver were sub-pages
  living *inside* Omen — was a misunderstanding carried over from backend work and is retired.
- **Waiver has its own section, and it lives in the League destination**, not inside Omen and not
  as a fifth tab. It is ranked pickups with reasons, each paired with its drop.
- **Command Center is the Small Council.** Omen's advisors give short reads on what they watch;
  the user picks what to go deeper on. The advisors are Omen speaking in different capacities —
  one voice, seats labelled by subject.

Authority: `Blueprints/specs/mobile/omen-app-pages-workshop-v1.md`.

## Platform Context

Yahoo, Sleeper, and ESPN all matter.

ESPN is essential but risky. Treat ESPN as a high-value integration that needs careful recovery flows, user guidance, and clear failure states.

## Voice

Users need plain-English reasoning, not heavy math. Math can support decisions, but the product should communicate like a trusted fantasy football analyst.

## Active Handoffs

- Frontend to backend: `Blueprints/handoffs/frontend-to-backend.md`
- Backend to frontend: `Blueprints/handoffs/backend-to-frontend.md`
- Shared engineering decisions: `Blueprints/handoffs/decisions.md`

## Current Build Truth — 2026-06-02 (Stripe/subscription lines corrected 2026-08-31)

- Live Omen MVP route exists at `POST /api/omen/mvp-move`.
- Live Omen requires auth and a usable Yahoo, Sleeper, or ESPN league connection. **There is no subscription gate** — Omen is free indefinitely and Stripe was fully removed 2026-07-12 (facts-of-record #1). Corrected 2026-08-31; this line read "requires auth, Pro subscription" for roughly seven weeks after billing was deleted.
- Yahoo, Sleeper, and ESPN can produce the first live lineup/start-sit Omen envelope when credentials and league context are usable.
- Dashboard Omen gate source is `GET /api/dashboard/summary`.
- Omen frontend should call the live route with `{}` only after dashboard status is `tools.omen_of_the_week.status === "ready"`.
- `GET /api/system/current-week` provides public season/week context for routes that still need explicit week input.
- Trade Analyzer is free and public.
- `GET /api/dashboard/summary` now includes `user.favorite_team`, returning the saved favorite team or `null` when the user has not chosen one.
- `POST /api/omen/feedback` is deployed for HITL feedback and upserts by user/week/season into `moves`. The live Supabase `moves` repair is applied and idempotence-smoked. Frontend: `OmenFeedback.jsx` is wired and handles `200`, `401`, `422`, and `500`.
- `GET /api/moves` is deployed for Move History and returns `moves-history.v1`. Frontend: `MoveHistory.jsx` is wired on the Football page "History" tab.
- `GET /api/league/standings` is deployed for League Standings and returns `league-standings.v1` for Yahoo, Sleeper, and ESPN. Frontend: `LeagueStandings.jsx` is mounted above the tab bar on the Football page.
- `PATCH /api/account/preferences` is deployed for favorite NFL team preference and upserts into `profiles`; the Supabase `profiles.favorite_team` column is applied and verified. Frontend: `TeamTheme.jsx` calls the endpoint; `App.jsx` hydrates team theme from `summary.user.favorite_team` on sign-in.
- Canonical frontend file `frontend/src/pages/OmenOfTheWeek.jsx` now handles `401`, `402`, and `pending_live_engine` defensively.
- **F2 status truth resolved 2026-07-19 (runtime) + 2026-07-22 (doc reconciliation).** `src/services/omenReadiness.js` is the single source; canonical contract `Blueprints/specs/mobile/omen-native-backend-state-contract-v1.md` §F2. `pending_live_engine` means "active connection lacks the provider-specific context required for a safe live attempt", not "engine unbuilt". Sleeper and ESPN engines shipped and return live `success`/`empty` when the connection has usable context.
- Legacy compat routes listed in the frontend handoff now return `410 legacy_route_retired` with canonical hints where available, except `/api/league/standings`, which has been restored as a canonical route.
- `sql/omen_rls_security.sql` has been applied and verified in Supabase as migration `20260531160851_apply_omen_rls_security_full_setup`. Verified live coverage includes `waitlist_signups`, subscription date columns, `moves` feedback idempotence, `profiles.favorite_team`, platform connection safe-column grants, and service-role Vault wrapper RPCs.
- Backend test baseline: 240/240.
- Tier 2 frontend deployed (PR #22, run `26833528435`): Account pricing display, Omen feedback hardening, team theme hydration, Move History / Hall of Records, and League Standings are all live.

## Current Backend / Frontend Boundary

- Codex owns backend contracts, auth gates, subscription state, live Omen, platform integration truth, and handoff answers.
- Claude owns frontend screens, Account subscription UI, Omen display states, and app polish.
- If Claude reports work from `.claude/worktrees/...`, verify it is merged into the canonical repo before treating it as live.

## Product Direction — 2026-08-31

The app-wide page workshop (`Blueprints/specs/mobile/omen-app-pages-workshop-v1.md`) is the current
product direction for every native screen. It was driven by beta feedback: Sleeper connect worked
without a question; **ESPN on iPhone had no phone path at all** — the only instruction was to find a
desktop and sideload a Chrome extension.

Read it before planning any native screen work. Wave 1 is contracted in
`Blueprints/specs/mobile/omen-wave1-contract-v1.md`.
