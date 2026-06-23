# Omen

## 1. Identity & Scope

Omen is the active Fantasy Football MVP product inside the Slops Saloon division. It helps users see the best fantasy football move without forcing them to understand heavy math.

## 2. Tech Stack

- **Backend:** Node.js / Express
- **Frontend:** Vite app served from `frontend/dist/`
- **Database/Auth:** Supabase, Supabase JWT, Supabase Vault for Yahoo/ESPN secrets
- **Cache:** Upstash Redis
- **Payments:** Stripe
- **AI:** Local Ollama/Gemma when configured; app must work without LLM
- **Deploy lane:** Oracle, service `omen-api`
- **Repo:** `justinduverge-design/corvus`

## 3. Key Commands

```bash
npm start          # node src/server.js
npm run dev        # same as start
npm run cron       # node src/omen_tuesday_cron.js
node --test        # Node built-in test runner
```

Do not run deploys, migrations, package installs, Docker, Stripe live actions, or production tasks without Justin approval.

## 4. Project Structure Hints

- `Direction/`: product context, sprint, roadmap, decisions.
- `Blueprints/handoffs/`: frontend/backend contracts and shared decisions.
- `Blueprints/specs/`: product and implementation-neutral specs.
- `src/server.js`: Express bootstrap; middleware order matters.
- `src/routes/`: new route files belong here.
- `src/adapters/`: platform adapter normalization.
- `src/services/`: subscription, LLM, VORP, agent support.
- `frontend/`: active UI/app shell.
- `src/omen_api_v2.js`: legacy monolith; avoid adding new work here.
- `src/omen_agents.js`: legacy active agent pipeline; do not remove casually.

## 5. Decision Tables

| Situation | → Use Current Pattern | → Avoid / Escalate |
| :--- | :---: | :---: |
| New backend route | ✅ `src/routes/` | legacy monolith |
| Env access | ✅ `src/config/index.js` | direct `process.env` reads |
| Canonical Omen endpoint | ✅ `POST /api/omen/mvp-move` | new competing Omen route |
| Start/Sit or waiver logic | ✅ inside Omen/MVP Move | separate unless Justin approves |
| ESPN work | ✅ explicit recovery/failure states | unsafe cookie/secrets changes |
| Frontend/backend mismatch | ✅ update `Blueprints/handoffs/` | guess silently |

## 6. Standard Patterns

### Server bootstrap order

```text
config → security middleware → Stripe webhook raw body → express.json → rate limits → routes → errors
```

### Required handoff shape

```text
feature, status, method/path, request, response, example, files changed, limitations, frontend call notes
```

### Current route truth

```text
Layer 0: SLOPS/
Layer 1: SLOPS/slops-saloon/
Layer 2: SLOPS/slops-saloon/corvus/
```

## 7. Hard Constraints

Do: Read `Direction/context.md`, `Direction/current_sprint.md`, `Direction/roadmap.md`, and relevant handoffs before product work.

Do: Keep mock/stub/live/unavailable states clearly labeled.

Do: Preserve the current API contracts unless the task explicitly changes them.

Don't: Do not recreate the retired nested `Corvus/` folder.

Don't: Do not edit `.env`, secrets, DNS, SSL, Nginx, Supabase migrations, Stripe production behavior, Docker/deploy config, or package files without Justin approval.

Never: Never expose credentials, wipe data, deploy, push to main, or present mock data as live fantasy advice.
