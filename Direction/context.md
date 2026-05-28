# Corvus Context

## Product Layer

Corvus is the Fantasy Football MVP product inside the Slops Saloon division.

Path:

```text
C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus
```

It is not the SLOPS company layer and not the Slops Saloon division layer. It is the first active product under that division.

## Current Route

- Layer 0 - SLOPS OS: `C:\Users\JDuve\OneDrive\Desktop\SLOPS`
- Layer 1 - Slops Saloon division: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon`
- Layer 2 - Corvus product repo: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`

The old nested `Corvus/` subfolder is retired. Product DBS folders now live at this repo root.

## Product Promise

Corvus should help users see the best fantasy football move without forcing them to understand heavy math.

The product should explain:

- what move to make
- why it matters
- what the risk is
- how confident Corvus is

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

## Current Build Truth — 2026-05-27

- Live Omen MVP route exists at `POST /api/omen/mvp-move`.
- Live Omen requires auth, Pro subscription, and a usable Yahoo, Sleeper, or ESPN league connection.
- Yahoo, Sleeper, and ESPN can produce the first live lineup/start-sit Omen envelope when credentials and league context are usable.
- Dashboard Omen gate source is `GET /api/dashboard/summary`.
- Omen frontend should call the live route with `{}` only after dashboard status is `tools.omen_of_the_week.status === "ready"`.
- `GET /api/system/current-week` provides public season/week context for routes that still need explicit week input.
- Trade Analyzer is free and public.
- Stripe checkout and portal return to `/account`.
- `GET /api/stripe/prices` is a read-only pricing display contract sourced from configured Stripe Price IDs.
- `GET /api/dashboard/summary` now includes a safe `subscription` block for Account page UI.
- Canonical frontend file `frontend/src/pages/OmenOfTheWeek.jsx` now handles `401`, `402`, and `pending_live_engine` defensively.
- Legacy compat routes listed in the frontend handoff now return `410 legacy_route_retired` with canonical hints where available.
- `sql/corvus_rls_security.sql` contains prepared SQL for `waitlist_signups`, `subscriptions.trial_ends_at`, and `subscriptions.current_period_end`, but no Supabase migration has been applied.
- Local backend test baseline: 216/216 passing on 2026-05-27.

## Current Backend / Frontend Boundary

- Codex owns backend contracts, auth gates, subscription state, live Omen, platform integration truth, and handoff answers.
- Claude owns frontend screens, Account subscription UI, Omen display states, and app polish.
- If Claude reports work from `.claude/worktrees/...`, verify it is merged into the canonical repo before treating it as live.
