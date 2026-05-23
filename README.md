# Corvus — Fantasy Football Decision Layer

> See the winning move.

Corvus is a multi-platform fantasy football decision layer from Slops Saloon. It connects to Yahoo, Sleeper, and ESPN, normalizes roster data across all three, and surfaces the highest-value action for your team each week — with math you can follow and reasoning you can trust.

Slops Saloon is the parent company, mission site, and long-term product studio. Corvus is the fantasy football product inside that ecosystem.

---

## DBS Navigation

- App work happens in `ssffmvp`.
- Product, brand, and spec context lives in `ssffmvp\Corvus`.
- Department docs, prompts, handoffs, and specs now live under `Direction`, `Blueprints`, `Solutions`, and `References`.
- Do not use old `Projects\ssffmvp` copies for active work.
- Do not touch `Archive\quarantine`.

---

## What It Does

**Trade Analyzer (free)** evaluates any trade using VORP v2 — a positional scarcity model that accounts for replacement-level value, injury risk, and roster depth. Every verdict is explainable.

**MVP Move (paid — coming soon)** surfaces the single highest-value action for your team each week: lineup swap, waiver pickup, or trade. Reasoned by an on-premise LLM against live roster data, live ESPN schedule context, and optional live OpenWeatherMap venue weather.

Current MVP Move data status:

| Signal | Status |
|---|---|
| Weather | Live via OpenWeatherMap when `OPENWEATHER_API_KEY` is set in Infisical; stub fallback otherwise |
| Travel/Home-Away | Live via ESPN scoreboard API |
| Game time/TV slate | Live via ESPN scoreboard API |
| Matchup DvP | Stub; Sportradar is the next MVP Move intelligence session |

---

## Supported Platforms

| Platform | Status | Connection |
|---|---|---|
| Yahoo Fantasy | ✅ Live | OAuth 2.0 |
| Sleeper | ✅ Live | Username lookup (public API) |
| ESPN | ✅ Live | ESPN_S2 + SWID cookies (Vault-encrypted) |

---

## Architecture

```
Browser (React / Vite)
        ↓
  Nginx  (reverse proxy, SSL, serves frontend/dist)
        ↓
  Express API  (Node.js 20, port 3000)
        ↓                         ↓
Platform Adapters          VORP Engine + Trade Analysis
(Yahoo / Sleeper / ESPN)   (src/services/vorp.js + tradeValue.js)
        ↓                         ↓
  Supabase                   Upstash Redis
  (Auth + Vault + RLS)       (roster cache, 5-min TTL)
        ↓
  Gemma on Hostinger  (LLM reasoning — internal, never user-facing)
```

All three platform adapters produce an identical normalized roster and player shape. Downstream services are platform-agnostic — they never know whether data came from Yahoo, Sleeper, or ESPN.

---

## Trade Analysis — VORP v2

The Trade Analyzer uses a two-component A+B scoring model:

**A — Net VORP (Value Over Replacement Player)**
Each player's weekly projected points, adjusted for injury risk, minus the replacement-level floor at their position — representing the best player freely available on the waiver wire in a 12-team league.

| Position | PPR | Half-PPR | Standard |
|---|---|---|---|
| QB | 15 pts/wk | 14 | 13 |
| RB | 6.5 pts/wk | 5.5 | 5 |
| WR | 8 pts/wk | 7 | 6.5 |
| TE | 4.5 pts/wk | 4 | 3.5 |

**B — Positional Scarcity Bonus**
Players who exceed the elite VORP threshold (QB ≥10 VORP, RB/WR ≥8 VORP, TE ≥7 VORP, DST ≥8 VORP) receive a +2.0 scarcity bonus per player, recognizing that they are genuinely hard to replace mid-season.

**Combined score = A + (B × 0.6)**

**Depth discount** — in uneven trades (e.g. 1-for-3), surplus receive players are discounted at 0.5× and 0.25× to reflect limited roster slots. Applied symmetrically to both sides.

Verdicts: `accept` (>2.0), `neutral` (±2.0), `decline` (<−2.0).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + Tailwind CSS |
| API | Node.js 20 + Express |
| Auth | Supabase Auth + Yahoo OAuth 2.0 + ESPN cookie-based |
| Database | Supabase (PostgreSQL + Row Level Security + Vault encryption) |
| Cache | Upstash Redis |
| Secrets | Infisical — no `.env` file on the production server |
| LLM | Ollama + Gemma (self-hosted on Hostinger, internal only) |
| Payments | Stripe (Checkout + Webhooks) |
| Deploy | Docker + docker-compose + Nginx on Oracle VPS |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- Supabase project
- Upstash Redis instance
- Infisical account (or set env vars manually for local dev)

### 1. Clone

```bash
git clone https://github.com/justinduverge-design/SlopsSaloon-Fantasy-Football-MVP.git
cd SlopsSaloon-Fantasy-Football-MVP
```

### 2. Environment variables

For local development, copy `.env.example` and fill in the values. For production, secrets are injected via Infisical — no `.env` file lives on the server.

Key variables:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Yahoo OAuth 2.0
YAHOO_CLIENT_ID=your-yahoo-client-id
YAHOO_CLIENT_SECRET=your-yahoo-client-secret
YAHOO_REDIRECT_URI=https://yourdomain.com/api/yahoo/callback

# Upstash Redis
REDIS_URL=rediss://...
REDIS_TOKEN=your-token

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
APP_BASE_URL=https://yourdomain.com
NODE_ENV=production

# Optional MVP Move weather data
OPENWEATHER_API_KEY=your-openweathermap-key
```

### 3. Start with Docker

```bash
docker-compose up --build -d
docker-compose ps          # verify healthy
curl http://localhost:3000/api/health
```

### 4. Build the frontend

```bash
cd frontend
npm install
npm run build
```

The built `frontend/dist` is served by Nginx in production.

### 5. Run tests

```bash
npm test    # 99 tests - all must pass before any deploy
```

---

## Project Structure

```
ssffmvp/
├── src/
│   ├── adapters/
│   │   ├── yahoo.js               # Yahoo platform adapter
│   │   ├── sleeper.js             # Sleeper platform adapter
│   │   └── espn.js                # ESPN platform adapter
│   ├── middleware/
│   │   ├── auth.js                # Supabase auth guard (requireAuth)
│   │   ├── logging.js             # Structured JSON logging
│   │   └── yahooOAuth.js          # Yahoo OAuth 2.0 via axios (ADR-004)
│   ├── routes/
│   │   ├── trade.js               # POST /api/trade/compare
│   │   ├── yahoo.js               # Yahoo auth + roster routes
│   │   ├── platforms.js           # Platform connection CRUD
│   │   └── optimizer.js           # Start/Sit + waiver routes
│   ├── services/
│   │   ├── vorp.js                # VORP calculation engine (v2)
│   │   ├── tradeValue.js          # Trade A+B scoring model
│   │   ├── optimizer.js           # Start/Sit + waiver math (pure)
│   │   ├── roster.js              # Yahoo roster normalization
│   │   ├── yahoo.js               # Yahoo Fantasy API client
│   │   ├── yahooAuth.js           # Yahoo token management + refresh
│   │   ├── espnAuth.js            # ESPN credential decryption (Vault)
│   │   └── llm.js                 # Ollama/Gemma wrapper (internal)
│   └── config.js
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Football.jsx       # Trade Analyzer + dashboard
│   │   │   ├── Account.jsx        # Platform connection manager
│   │   │   └── NotFound.jsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   └── platforms/PlatformConnections.jsx
│   │   └── lib/
│   │       ├── api.js
│   │       └── supabase.js
│   └── dist/                      # Built output served by Nginx
├── test/
│   ├── vorp.test.js               # VORP engine unit tests
│   ├── tradeValue.test.js         # Trade model unit tests
│   └── tradeRoute.test.js         # Trade route integration tests
├── Blueprints/
│   ├── handoffs/                   # frontend/backend coordination docs
│   ├── prompts/                    # repo prompt docs moved from root prompts/
│   └── specs/
│       └── docs/                   # ADRs and app docs moved from root docs/
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## API Reference

### System

| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Health check — used by Docker |

### Platform Auth

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/yahoo/auth?userId=` | — | Initiate Yahoo OAuth 2.0 flow |
| GET | `/api/yahoo/callback` | — | Yahoo OAuth callback handler |
| POST | `/api/platforms/sleeper/connect` | Required | Connect Sleeper by username + league |
| POST | `/api/platforms/espn/connect` | Required | Connect ESPN via cookies (Vault-encrypted) |
| GET | `/api/platforms/status` | Required | All platform connection statuses |
| DELETE | `/api/platforms/:platform` | Required | Disconnect a platform |

### Roster

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/yahoo/roster?leagueKey=&week=` | Required | Authenticated Yahoo roster (normalized) |
| GET | `/api/optimizer` | Required | Start/Sit + waiver recommendations |

### Trade

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/trade/compare` | Required | VORP v2 A+B trade analysis |

**POST /api/trade/compare** body:
```json
{
  "send": [{ "name": "Player A", "position": "RB", "projected_points": 15, "status": null }],
  "receive": [{ "name": "Player B", "position": "TE", "projected_points": 13, "status": null }],
  "scoring_format": "ppr"
}
```

**Response includes:** `net_value`, `verdict`, `a_score`, `b_score`, `combined_score`, `depth_discounted`, `scarcity_analysis`, `explanation` (LLM narration).

---

## Security

- **ESPN cookies** — encrypted at rest via Supabase Vault (pg_sodium). Only UUID secret_ids in database columns. Never logged anywhere.
- **Yahoo tokens** — encrypted via Vault. Automatically refreshed on expiry.
- **Row Level Security** — all Supabase tables enforce `auth.uid() = user_id`. Users can only access their own data.
- **Infisical** — all production secrets injected at runtime. No `.env` file on the server.
- **npm audit** — 0 vulnerabilities. The `passport` / `request` dependency chain was fully removed (ADR-004). 48 packages eliminated.
- **HTTPS** — Let's Encrypt via Nginx on Oracle VPS.
- **ESPN logging** — all ESPN request bodies are scrubbed from logs at the middleware level.

---

## Roadmap

- [x] Yahoo, Sleeper, ESPN platform adapters (normalized output)
- [x] Platform connection UI (OAuth, username, cookie flows with in-app instructions)
- [x] VORP v2 trade analysis — A+B model, positional scarcity, depth discount
- [x] Supabase auth + Vault encryption (ESPN cookies, Yahoo tokens)
- [x] Docker deployment on Oracle VPS
- [x] 0 npm audit vulnerabilities
- [x] Structured logging
- [ ] MVP Move engine — Intelligence Layer (weather, travel/home-away, and game time live; Matchup DvP still stubbed)
- [ ] Start/Sit recommendations with LLM reasoning
- [ ] Waiver wire optimizer
- [ ] Dashboard polish (Hall of Records)
- [ ] Stripe live keys + payment validation
- [ ] Security hardening pass (helmet, rate limiting)
- [ ] Load testing + final deploy

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

Built by [@justinduverge-design](https://github.com/justinduverge-design)

*Corvus — See the winning move.*
