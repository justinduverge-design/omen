# Hostinger Deploy Notes

These notes explain how the repo-side deploy files fit together. A more
detailed founder-safe runbook is planned for
`Blueprints/playbooks/hostinger-kvm1-deploy-runbook.md` (TBD — use this
file plus the compose and nginx configs as the source of truth in the meantime).

## How The Pieces Fit

- `docker-compose.prod.yml` runs two containers from GHCR:
  - `api` pulls `ghcr.io/justinduverge-design/omen:main`.
  - `cron` pulls `ghcr.io/justinduverge-design/omen-cron:main`.
- Old Corvus GHCR tags are retained as rollback artifacts, but normal workflows
  now publish and pull Omen image names only.
- The API binds to `127.0.0.1:3000:3000`, so it is reachable only from the VPS itself.
- Nginx is the public front door on ports 80 and 443. It proxies public traffic to `127.0.0.1:3000`.
- The same API container serves both `/api/*` routes and the built SPA from `frontend/dist`, so Hostinger does not need a separate static-site host.
- The cron worker exposes no ports and should not receive inbound HTTP.
- Runtime secrets live in `deploy/hostinger/.env.production` on the VPS. That file is ignored by `deploy/hostinger/.gitignore` (and also by the repo root `.gitignore`) and must not be committed.

## ⚠️ `/opt/omen` on KVM1 is NOT a git checkout

The deploy directory on KVM1 (`/opt/omen/deploy/hostinger/`) holds **hand-copied** files, not
a clone — `git -C /opt/omen status` fails with "not a repository". The self-hosted runner
rebuilds and restarts *containers*; it does not sync these files. So `docker-compose.prod.yml`,
`nginx-omen.conf` and the watchdog units in this folder are **the source of truth in the repo
only** — the box can silently diverge from them, and did (its compose file was unchanged from
2026-06-23 until 2026-09-05 while this folder moved on).

**Editing any of them means copying it up by hand and recreating**, always with a dated backup
so the change is reversible and diffable:

```bash
scp deploy/hostinger/docker-compose.prod.yml justin@srv1737978.tailef1902.ts.net:/tmp/
ssh justin@srv1737978.tailef1902.ts.net '
  cd /opt/omen/deploy/hostinger
  sudo cp docker-compose.prod.yml docker-compose.prod.yml.bak-$(date +%Y%m%d)
  sudo cp /tmp/docker-compose.prod.yml docker-compose.prod.yml
  sudo diff docker-compose.prod.yml.bak-$(date +%Y%m%d) docker-compose.prod.yml
  sudo docker compose -f docker-compose.prod.yml config --quiet && \
  sudo docker compose -f docker-compose.prod.yml up -d'
```

Read the `diff` before the `up -d`. It is the only thing standing between a one-line change and
an unreviewed edit to production.

## The container watchdog (`omen-watchdog.*`)

`restart: unless-stopped` restarts a container that **exits**. It does nothing for one that is
running but **wedged**, and Docker's healthcheck detects exactly that case and only records it.
That gap kept Omen down all night on 2026-09-05 while every alerting layer fired correctly.

`omen-watchdog.sh` + `.service` + `.timer` close it. Installed on KVM1 by hand (see the drift
warning above) at:

| Repo file | Installed path on KVM1 |
|---|---|
| `omen-watchdog.sh` | `/usr/local/lib/omen/omen-watchdog.sh` (mode 0755) |
| `omen-watchdog.service` | `/etc/systemd/system/omen-watchdog.service` |
| `omen-watchdog.timer` | `/etc/systemd/system/omen-watchdog.timer` |

Enabled with `sudo systemctl enable --now omen-watchdog.timer`. State lives in
`/var/lib/omen-watchdog/`, keyed per container.

It captures evidence *before* restarting, and **stops after 3 heals in an hour**, escalating to
Discord instead — a container that needs restarting repeatedly is a bug report, not a solved
problem, and healing forever turns a loud outage into a silent flapping one. It is deliberately
silent on the healthy path so it adds no journal noise.

To test a change to it without touching production, point it at a throwaway container:

```bash
docker run -d --name watchdog-selftest --health-cmd "test -f /tmp/ok" \
  --health-interval 5s --health-retries 2 alpine:3 sh -c "sleep 3600"
sudo OMEN_WATCHDOG_CONTAINER=watchdog-selftest OMEN_WATCHDOG_GRACE=5 \
  /usr/local/lib/omen/omen-watchdog.sh
```

## GHCR Login

The primary deploy workflow logs KVM1 into GHCR with the workflow-scoped
`GITHUB_TOKEN`, pulls the just-built images, restarts containers, then logs out.
Do not keep a long-lived GHCR token on the VPS unless the self-hosted runner is
unavailable and a manual recovery requires it.

Omen rename note: the live deploy path is `/opt/omen/deploy/hostinger`, and
normal workflows publish Omen tags only. Corvus image tags and `/opt/corvus`
remain retained rollback artifacts until Justin approves cleanup.

If a manual pull is needed and the GHCR images are private, the VPS must log in
before pulling:

```bash
echo 'YOUR_GITHUB_PAT' | docker login ghcr.io -u justinduverge-design --password-stdin
```

Use a GitHub Personal Access Token scoped to `read:packages`.

## Operating Mode

Use the KVM1 self-hosted GitHub runner as the normal release path. Use the
Tailscale workflow only as the manual backup path when the self-hosted runner is
offline, stuck, or being repaired.

Do not go back to GitHub-hosted runner SSH over the public internet unless this
operating mode is explicitly changed in `Direction/decision_log.md`.

## Primary Release Path

`.github/workflows/deploy.yml` is the normal deploy path.

- `quality` and `build` run on GitHub-hosted runners.
- `deploy` runs on KVM1's self-hosted runner: `corvus-kvm1-deploy`.
- Required runner labels: `self-hosted`, `Linux`, `X64`, `kvm1`, `omen-deploy`.
- Temporary rollback rule: keep `corvus-deploy` on the runner until Justin approves removal.
- Runner home on KVM1 may stay `/home/justin/actions-runner/corvus` during transition; rename it only after the deploy identity is stable.
- The runner runs as `justin`, which is in the Docker group.
- A user crontab `@reboot` entry restarts the runner after reboot. Convert it
  to a root-managed systemd service later when sudo/root console access is
  available.

The deploy job does not SSH into KVM1. It is already running on KVM1 and runs
Docker Compose locally from `/opt/omen/deploy/hostinger`.

## Tailscale Fallback

`.github/workflows/deploy-kvm1-tailscale-fallback.yml` is manual-only and should
be used only if the primary KVM1 runner is offline or stuck.

- KVM1 is already joined to the tailnet and has Tailscale running.
- The fallback GitHub runner joins the tailnet using `tailscale/github-action@v4`.
- It then SSHes to KVM1 over MagicDNS/private Tailscale networking and runs the
  same pull + restart commands.

Required GitHub secrets for fallback:

- `TS_OAUTH_CLIENT_ID`
- `TS_OAUTH_SECRET`
- `KVM1_USER`
- `KVM1_SSH_KEY`

Required tailnet setup for fallback:

- A tag such as `tag:github` owned by an admin.
- ACLs allowing `tag:github` to reach KVM1 over SSH.

Optional GitHub variable:

- `KVM1_TAILSCALE_HOST` — defaults to KVM1's current MagicDNS name in the
  fallback workflow.

## Manual Release Pull And Restart

After GitHub Actions publishes fresh `:main` images:

```bash
cd /opt/omen/deploy/hostinger
docker compose -f docker-compose.prod.yml --project-name omen pull api cron
docker compose -f docker-compose.prod.yml --project-name omen up -d --no-build api cron
docker compose -f docker-compose.prod.yml --project-name omen ps
```

Then verify:

```bash
curl -s https://slopssaloon.com/api/health
curl -s https://slopssaloon.com/api/ready
```

## Nginx And Certbot

The checked-in Nginx sample is `deploy/hostinger/nginx-omen.conf`. It is valid
before certificates exist, lets Nginx start, and lets Certbot safely update the
site. During the runbook's Certbot step, choose the redirect option so Certbot
adds HTTPS and HTTP -> HTTPS redirect behavior.

## Justin Confirmed

- Public hostnames: `slopssaloon.com` and `www.slopssaloon.com`.
- Off-box backup target for the VPS-only `.env.production` file: handled by Justin.
- Tuesday scoring stays disabled for launch with `OMEN_CRON_SCORING_ENABLED=false`.
- Tailscale fallback OAuth secrets are configured in GitHub repo secrets.
- Manual Tailscale fallback deploy passed end to end on 2026-06-17.

## Remaining Guided Ops

- Convert the KVM1 GitHub runner from user-cron supervision to a root-managed
  systemd service when sudo/root console access is available.
- Private LLM link: confirm KVM2 Tailscale routing before setting `LLM_BASE_URL`.
