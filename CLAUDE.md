# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Slops Saloon Fantasy Football MVP (SSFFMVP)** — branded as **Corvus**. Node.js/Express backend with an AI-powered fantasy football multi-agent pipeline. Integrates Sleeper, Yahoo, and ESPN platforms. Persistence: Supabase. Caching: Upstash Redis. Payments: Stripe. AI: Anthropic Claude + local Ollama (Gemma).

---

## Commands

```bash
npm start          # node src/server.js
npm run dev        # same as start (no hot reload)
npm run cron       # node src/ssffmvp_tuesday_cron.js — run Tuesday scoring manually
node --test        # Node built-in test runner
```

---

## Backend Architecture

### Entry Point & Bootstrap Order

`src/server.js` — order matters:
1. Config (env validation — fails fast)
2. Security middleware (Helmet, CORS) **before** body parser
3. Stripe webhook router (needs raw body) **before** `express.json()`
4. `express.json()` body parser
5. Rate limits
6. Routes
7. 404 / error handlers

`src/config/index.js` — single source of truth for env. Only `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` are required at boot. Always import this instead of reading `process.env` directly.

### Route Map

| Mount | File | Notes |
|-------|------|-------|
| `/api` | `routes/system.js` | Health, mock contracts |
| `/api/dashboard` | `routes/dashboard.js` | Summary data |
| `/api/stripe` | `routes/stripe.js` | Checkout, portal, webhook |
| `/api/yahoo` | `routes/yahoo.js` | Yahoo roster adapter |
| `/api/sleeper` | `routes/sleeper.js` | Sleeper public API adapter |
| `/api/espn` | `routes/espn.js` | ESPN cookie-auth adapter |
| `/api/platforms` | `routes/platforms.js` | Connect/disconnect status |
| `/api/optimizer` | `routes/optimizer.js` | Pro-gated lineup/waiver |
| `/api/start-sit` | `routes/startSit.js` | Free start/sit comparison |
| `/api/trade` | `routes/trade.js` | Trade value comparison |
| `/api/draft-assistant` | `routes/draftAssistant.js` | Draft tool |
| `/api` | `ssffmvp_api_v2.js` | **Legacy monolith**: Yahoo OAuth, standings, ESPN. New code goes in `src/routes/` instead. |
| `/api` | `ssffmvp_agents.js` | Legacy Claude-based agent pipeline (still active) |

### AI / Agent Layer — Two Implementations

**1. Current/modular** (`src/services/agents.js` + `src/services/llm.js`):
- Six sub-agents (Weather, Travel, GameTime, Roster, Performance, Matchup) each return one sentence via local Ollama (Gemma).
- Manager Agent synthesizes into a JSON move recommendation.
- `llm.js` returns `null` on any failure — the app must work without LLM.

**2. Legacy standalone** (`src/ssffmvp_agents.js`):
- Uses Anthropic Claude directly (`claude-3-5-sonnet-latest`).
- Contains the VORP engine, positional scarcity analysis, local snapshot fallback, and a pure-math fallback move if AI fails.
- Still mounted as a router at `/api`. Exports `calcVORP`, `buildVORPTable`, etc. used by the Tuesday cron.

### Key Services

- `services/vorp.js` — VORP math. Replacement baselines calibrated per season (revisit each August).
- `services/subscription.js` — Stripe subscription state (activate/deactivate). Routes never touch Supabase for subscription state directly; always use this service.
- `services/llm.js` — Ollama wrapper. `LLM_BASE_URL` empty → all calls return `null`.
- `src/adapters/` — thin wrappers normalizing Sleeper/Yahoo/ESPN API responses into a common shape.

### Middleware

- `middleware/auth.js` — `requireAuth`: validates Supabase JWT, attaches `req.user`. Fails closed.
- `middleware/subscription.js` — gates Pro-only routes via `users.is_subscribed` (denormalized fast-check).
- `middleware/security.js` — Helmet, CORS, `generalRateLimit`, `authRateLimit`.

### Tuesday Cron (`src/ssffmvp_tuesday_cron.js`)

Schedule: `0 6 * * 2` (6 AM EST). Flow:
1. Fetch only `followed = true` moves (Human-in-the-Loop gate — only score moves the user actually executed in their platform).
2. Archive `followed = false` moves as `not_executed` (excluded from calibration).
3. Fetch NFL scores via Sportradar → cache 3600s in Redis.
4. Score moves with VORP-adjusted projections.
5. Push notify users.
6. Write calibration stats to `system_context` table for the Manager Agent self-improving loop.

### Token Security

Yahoo and ESPN credentials stored encrypted in Supabase Vault (`pg_sodium`). Only a UUID `secret_id` lives in DB columns; plaintext decrypted at query time via `vault_decrypt_secret` RPC — never persisted.

### Redis Cache Key Schema (prefix `ssff:`)

- `ssff:scores:{season}:{week}` → 3600s
- `ssff:outcomes:{leagueId}:{week}` → 300s
- `ssff:vorp:{leagueId}:{week}:{scoring}` → 600s
- `ssff:scarcity:{leagueId}:{scoring}` → 300s

### Data Fallback Chain

Any live data fetch: Cloud API → Redis → Local ssff-bot snapshot (`POST /api/agents/local-ingest`).

### Frontend

Served from `frontend/dist/` (built with Vite). Server falls back to JSON status if no build exists. `VITE_ESPN_ENABLED` is a Vite build-arg controlling the ESPN connection card.

### Key Env Vars

See `.env.example`. Hard required: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`. Optional with graceful fallback: `LLM_BASE_URL`, `REDIS_URL`/`REDIS_TOKEN`, `ANTHROPIC_API_KEY`, `OPENWEATHER_API_KEY`. Required for cron: `SPORTRADAR_API_KEY`.

---

## Role

You are Claude Code acting as the front-end engineer for Corvus.

Your job is to build the user-facing app experience, app UI, screen flows, reusable components, and polished front-end product experience for Corvus.

Codex owns the backend.

Justin owns product decisions.

---

## Current Focus

Corvus is the active product.

The current priority is app backbone completion before feature expansion.

Draft Assistant is the first-impression tool and is free this year only.

MVP Move / Omen of the Week is the paid centerpiece.

---

## Your Ownership

You own the actual app UI. This includes screens, components, layout, navigation, interaction states, and front-end polish.

You own:

- frontend structure
- routing UX
- landing and app pages
- dashboard shell
- Draft Assistant UI
- Omen/MVP Move UI
- Trade Analyzer UI
- Start/Sit UI
- Waiver Wire UI
- loading states
- error states
- empty states
- disconnected states
- mobile responsiveness
- copy clarity
- visual polish

---

## Do Not Own By Default

Do not edit backend logic, database schema, auth, payment, Docker, deployment, secrets, DNS, SSL, or VPS configuration unless Justin explicitly asks.

Do not build unrelated future products.

Do not expand the Slops Saloon landing page into a full content/media hub.

---

## Required Files To Read First

Read these if present:

1. `../context.md`
2. `APP_UI_PLAN.md`
3. `../roadmap.md`
3. `../manifesto.md`
4. `../TODO.md`
5. `handoffs/backend-to-frontend.md`
6. `handoffs/frontend-to-backend.md`
7. `handoffs/decisions.md`
9. `AGENT.md`

If a file is missing, continue and mention it.

---

## Handoff Rule

When you need backend support, write to:

```text
handoffs/frontend-to-backend.md
```

Use clear contracts:

- feature name
- endpoint needed
- method
- request shape
- response shape
- example response
- frontend behavior
- open questions

---

## Backbone Rule

Before adding feature complexity, make sure the app has:

- consistent navigation
- reusable layout
- stable page structure
- shared loading/error/empty states
- platform disconnected states
- clean mobile experience
- clear CTA behavior

---

## Draft Assistant Rule

Draft Assistant is the first-impression tool.

It should feel polished and useful, but must reuse shared Corvus patterns.

Do not build it as a standalone one-off page disconnected from the rest of the app.

---

## End Of Task Report

Return:

- files changed
- UI states added/changed
- backend needs written to handoff
- tests/checks run
- limitations
- next recommended frontend step


---

## Required App UI Work

Claude Code must treat app UI as part of the active build scope.

Build and improve:

- Slops Saloon lightweight landing page
- Corvus entry/marketing page
- app shell/dashboard
- navigation
- Draft Assistant UI
- MVP Move / Omen of the Week UI
- Trade Analyzer UI
- Start/Sit UI
- Waiver Wire UI
- platform connection/status UI
- mobile views
- loading/error/empty/disconnected states

Do not only write plans. When the session mode is implementation, build the UI in the app.

## UI Inspection Requirement

Before major UI edits, identify:

1. active frontend folder
2. routing system
3. main layout file
4. dashboard entry point
5. reusable component location
6. current design/styling system

Then proceed according to the requested session mode.
