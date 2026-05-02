# 🍺 Slops Saloon Fantasy Football MVP (SSFFMVP)

> One perfect move every week. Built by AI agents. Proven by results.

SSFFMVP is an AI-powered Fantasy Football General Manager that analyzes weather, travel, game time, injuries, performance trends, and matchups — then delivers a single, mathematically-backed weekly recommendation. Every result is tracked and fed back into the model to make next week's call sharper.

---

## Features

| Tier | Feature |
|------|---------|
| Free | **Trade Analyzer** — AI-powered trade evaluation |
| Free | Waiver Scarcity Report (top 3 preview) |
| Free | VORP Preview (5 players) |
| **Pro** | **Weekly AI Move** — one perfect recommendation per week |
| **Pro** | Full VORP table + Positional Scarcity Analysis |
| **Pro** | Move History with Effectiveness scoring |
| **Pro** | Tuesday automated outcome tracking |

---

## Architecture

```
Browser (React/JSX)
      ↓
Express API  (ssffmvp_api_v2.js)       port 3000
      ↓
6 AI Agents + Manager Agent            claude-3-5-sonnet-latest
      ↓                    ↓
Supabase (PostgreSQL + Vault)     Upstash Redis (cache)
      ↓
Tuesday Cron (ssffmvp_tuesday_cron.js) — scores outcomes, self-improves
```

### Agent Pipeline
1. 🌦️ **Weather Agent** — OpenWeatherMap stadium forecasts
2. ✈️ **Travel Agent** — Rest days, road/home splits
3. 🕐 **Game Time Agent** — Slate analysis, primetime exposure
4. 📋 **Roster Agent** — Injury reports, depth chart shifts
5. 📈 **Performance Agent** — VORP calculation, 4-week trends
6. ⚔️ **Matchup Agent** — Defense vs. Position rankings

All six feed into a **Manager Agent** that synthesizes one move with a mathematically-constrained confidence score.

---

## Tech Stack

- **Runtime** — Node.js v20
- **Framework** — Express.js
- **Frontend** — React (JSX)
- **Database** — Supabase (PostgreSQL + Row Level Security + Vault encryption)
- **Cache** — Upstash Redis
- **AI** — Anthropic Claude (`claude-3-5-sonnet-latest`)
- **Auth** — Supabase Auth + Yahoo OAuth 2.0 (PKCE) + ESPN cookie-based
- **Payments** — Stripe (Checkout + Webhooks)
- **Containers** — Docker + docker-compose
- **Cron** — Alpine crond (Tuesday 6AM EST)

---

## Supported Platforms

| Platform | Connection Method |
|----------|------------------|
| Sleeper | Username lookup (public API) |
| Yahoo Fantasy | OAuth 2.0 with PKCE |
| ESPN | ESPN_S2 + SWID cookies |
| NFL.com | Coming soon |

---

## Getting Started

### Prerequisites
- Node.js v20+
- Docker + Docker Compose
- Supabase account
- Upstash Redis account
- Anthropic API key

### 1. Clone the repo

```bash
git clone https://github.com/justinduverge-design/ssffmvp.git
cd ssffmvp
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in your `.env` — see [Environment Variables](#environment-variables) below.

### 3. Run the Supabase SQL

Open your Supabase SQL Editor and run:
```
ssffmvp_rls_security.sql
```

This enables Row Level Security, creates Vault functions, and sets up all indexes.

### 4. Start with Docker

```bash
docker-compose up --build -d

# Verify both services are running
docker-compose ps

# Watch API logs
docker-compose logs -f api

# Watch cron logs
docker-compose logs -f cron
```

### 5. Test the API

```bash
# Health check
curl http://localhost:3000/api/health

# Expected response:
# { "status": "ok", "service": "ssffmvp-api", "uptime": "...", ... }
```

---

## Environment Variables

Create a `.env` file in the project root (never commit this file):

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Upstash Redis
REDIS_URL=rediss://...
REDIS_TOKEN=your-redis-token

# Sportradar (NFL scores for Tuesday cron)
SPORTRADAR_API_KEY=your-sportradar-key

# Yahoo OAuth
YAHOO_CLIENT_ID=your-yahoo-client-id
YAHOO_CLIENT_SECRET=your-yahoo-client-secret
YAHOO_REDIRECT_URI=https://yourdomain.com/api/auth/yahoo/callback

# App
APP_BASE_URL=https://yourdomain.com
NODE_ENV=production

# Push Notifications (optional)
PUSH_SERVICE_URL=
PUSH_SERVICE_SECRET=
```

See `.env.example` for a full template with descriptions.

---

## Project Structure

```
ssffmvp/
├── src/
│   ├── ssffmvp_api_v2.js            # Express API — OAuth, standings, roster, agent pipeline
│   ├── ssffmvp_agents.js            # AI agent pipeline — VORP, scarcity, move engine
│   ├── ssffmvp_tuesday_cron.js      # Tuesday scoring cron — outcome tracking
│   ├── ssffmvp_gdpr.js              # GDPR module — export, delete, consent
│   └── ssffmvp_prompt_loader.js     # Loads agent prompts from prompts/
├── client/
│   ├── App.jsx                      # React frontend (main)
│   └── PrivacyPolicy.jsx            # Privacy policy page
├── prompts/
│   ├── manager_agent.md             # Manager Agent prompt
│   ├── sub_agents.md                # Six sub-agent prompts
│   └── PROMPTS_CHANGELOG.md         # Prompt revision history
├── sql/
│   └── ssffmvp_rls_security.sql     # Supabase RLS + Vault setup (run once)
├── Dockerfile                       # API service — multi-stage build
├── Dockerfile.cron                  # Cron worker — Alpine crond
├── docker-compose.yml               # Orchestrates api + cron services
├── probo.yaml                       # Probo compliance config
├── .dockerignore
├── .gitignore
├── .env.example
└── package.json
```

---

## API Reference

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/sleeper/connect` | Connect via Sleeper username |
| GET | `/api/auth/yahoo/authorize` | Initiate Yahoo OAuth flow |
| GET | `/api/auth/yahoo/callback` | Yahoo OAuth callback handler |
| POST | `/api/auth/espn/connect` | Connect via ESPN cookies |

### League Data
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/league/standings` | Live standings (Redis-cached, 5 min) |
| GET | `/api/league/roster` | User's current roster (Redis-cached, 2 min) |

### Agent Pipeline
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/agents/run` | Full agent pipeline — returns weekly move |
| POST | `/api/agents/local-ingest` | Emergency local data override |
| GET | `/api/agents/vorp/:leagueId/:week` | VORP table for a league |
| GET | `/api/agents/scarcity/:leagueId` | Positional scarcity report |

### User & GDPR
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/user/export` | Export all user data (GDPR Article 20) |
| DELETE | `/api/user/delete` | Delete account + all data (GDPR Article 17) |
| GET | `/api/user/consent` | Get current consent record |
| POST | `/api/user/consent` | Record explicit consent |

### System
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Health check for Docker |

---

## Security

- **Encryption at rest** — Yahoo tokens and ESPN cookies stored via Supabase Vault (pg_sodium). Only UUID secret_ids in database columns.
- **Row Level Security** — every table enforces `auth.uid() = user_id`. Users can only access their own data.
- **Service role isolation** — Tuesday cron uses service key (bypasses RLS). API uses anon/user keys.
- **HTTPS only** — all traffic encrypted in transit via Let's Encrypt / Nginx.
- **GDPR compliant** — data export, deletion, and consent tracking built in.
- **Redis cache** — no sensitive data cached. Only standings and roster structures.

---

## Privacy & GDPR

SSFFMVP is built with Privacy by Design. See [GDPR compliance module](src/ssffmvp_gdpr.js) for implementation details.

Users have full control over their data:
- **Export** their complete data record at any time
- **Delete** their account and all associated data permanently
- **View** exactly what data is stored and why
- **Withdraw consent** at any time

Data we collect and why:
| Data | Purpose | Retention |
|------|---------|-----------|
| Email | Account identification | Until deletion |
| Fantasy league ID | Platform connection | Until deletion |
| Weekly moves | Self-improving AI model | Until deletion |
| Outcome scores | Model calibration | Until deletion |
| OAuth tokens | Platform API access | Encrypted, refreshed weekly |

We never sell user data. We never use it for advertising.

---

## Cron Schedule

The Tuesday cron runs automatically inside the `cron` Docker service:

```
0 6 * * 2   # 6:00 AM EST every Tuesday
```

To trigger manually for testing:
```bash
docker exec ssffmvp_cron node /app/src/ssffmvp_tuesday_cron.js
```

---

## Roadmap

- [x] AI agent pipeline (6 agents + Manager)
- [x] VORP mathematical engine
- [x] Positional scarcity analysis
- [x] Supabase Vault token encryption
- [x] Redis caching layer
- [x] Row Level Security
- [x] Docker containerization
- [x] GDPR compliance module
- [ ] Stripe payment integration
- [ ] Yahoo OAuth live connection
- [ ] ESPN roster fetch completion
- [ ] Push notifications
- [ ] NFL.com platform support
- [ ] Mobile app (React Native)

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Contact

Built by [@justinduverge-design](https://github.com/justinduverge-design)

*Slops Saloon Fantasy Football MVP — Play smarter. Win more.*
