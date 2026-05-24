# Codex Prompt — Docker Prove-Out (Oracle)
## Prompt for: Codex
## Operation type: Local build + health check + teardown — no push, no deploy
## Date: 2026-05-24
## Repo: ssffmvp on Oracle VPS (not local machine)
## Run on: Oracle VPS — production env must be present

---

## Prerequisites

**This prompt must run on the Oracle VPS** where the production `.env` lives.
Running locally will fail — the compose file marks `SUPABASE_URL`,
`SUPABASE_SERVICE_KEY`, `REDIS_URL`, `REDIS_TOKEN`, `YAHOO_CLIENT_ID`,
`YAHOO_CLIENT_SECRET`, and `YAHOO_REDIRECT_URI` as hard-required
(`:?` syntax) and Docker Compose will refuse to start without them.

The `.env` file on Oracle provides these. `docker compose --env-file .env`
passes them through automatically — do not modify the env file.

---

## Context

Corvus deploys on Oracle via GitHub Actions. Before triggering a live deploy we
need to confirm the Docker build completes cleanly and the container boots and
passes its health check using the production env.

This is a **local prove-out only**. No push to GHCR, no production traffic,
teardown immediately after verification.

The active compose file is `docker-compose.yml` (Oracle lane).
`docker-compose.hostinger.yml` is **parked** — do not use it.

### Dockerfile structure
- Stage `client-builder` — Vite build of `client/` (legacy SPA, Node 20)
- Stage `frontend-builder` — Vite build of `frontend/` (active SPA, Node 22)
- Stage `builder` — Express API `npm ci`
- Stage `production` — runtime, copies from all three, runs `node src/server.js`

Both `client/` and `frontend/` must exist in the repo root. Confirm before
building.

---

## Scope Constraints

- Do NOT push any image to GHCR or any registry
- Do NOT deploy to Oracle production, Hostinger, or any live environment
- Do NOT use `docker-compose.hostinger.yml`
- Do NOT modify `.env`, source files, Dockerfiles, or compose files
- Do NOT leave containers running after the prove-out — always run teardown
- Stop and report if `docker compose build` fails — do not attempt workarounds

---

## Step 1: Verify prerequisites

```bash
cd C:\Users\JDuve\OneDrive\Desktop\SLOPS\ssffmvp
docker --version
docker compose version
ls client/package.json frontend/package.json
```

Confirm Docker and Docker Compose are available. Confirm both `client/` and
`frontend/` directories exist with `package.json`. If either is missing, stop
and report.

---

## Step 2: Verify env file is present

```bash
ls -la .env
```

Do NOT print the contents. Confirm the file exists.

The compose file requires these env vars to be set (`:?` syntax — compose will
refuse to start without them):
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `REDIS_URL`, `REDIS_TOKEN`
- `YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET`, `YAHOO_REDIRECT_URI`

These must be present in `.env` for the prove-out. If the file is absent, stop
and ask Justin for the correct env file path before proceeding.

---

## Step 3: Build the API image

```bash
docker compose --env-file .env build api 2>&1
```

This builds only the `api` service (skips `cron`). Expected duration: 3–8
minutes on first build (layer cache speeds up rebuilds).

Watch for:
- Any `COPY client/` or `COPY frontend/` failures — indicates missing source
- Any `npm ci` failures — dependency install error
- Any Vite build errors — frontend compilation failure

If the build fails, report the exact error and stop.

---

## Step 4: Start the API container

```bash
docker compose --env-file .env up -d api
```

Wait 15 seconds for the server to boot, then check it came up healthy:

```bash
sleep 15
docker compose ps api
docker compose logs api --tail 30
```

Look for:
- Container status: `healthy` or `running`
- Log line confirming server started on port 3000
- No `FATAL` or `process.exit(1)` in logs

If the container exits immediately or logs a fatal error, run `docker compose logs api` for the full output, report, and skip to Step 6.

---

## Step 5: Health check

```bash
curl -s http://localhost:3000/api/health
```

Expected: JSON response with `{ "status": "ok" }` or similar. Any `200` response
from `/api/health` confirms the server is running and routing correctly.

If the health check fails, run `docker compose logs api --tail 50` and report.

---

## Step 6: Teardown

Always run this, even if a previous step failed:

```bash
docker compose down
```

Confirm containers are stopped:

```bash
docker compose ps
```

Expected: empty or all containers in `exited`/`stopped` state.

---

## Completion Checklist

- [ ] Docker and Docker Compose available and versioned
- [ ] Both `client/` and `frontend/` confirmed present
- [ ] `.env` file confirmed present (contents not printed)
- [ ] `docker compose build api` completed without errors
- [ ] Container started and reached healthy/running state
- [ ] `GET /api/health` returned a 200 response
- [ ] `docker compose down` run — no containers left running
- [ ] Report: build time, container startup time, health check response body,
  any warnings in logs

---

## Do NOT

- Do not push to GHCR or any image registry
- Do not deploy to production or any live environment
- Do not use `docker-compose.hostinger.yml`
- Do not leave containers running after Step 6
- Do not modify Dockerfiles, compose files, or `.env`
- Do not run `docker compose up cron` — cron is a scheduled worker, not part
  of this prove-out
