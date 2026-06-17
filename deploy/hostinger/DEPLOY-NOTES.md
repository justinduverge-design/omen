# Hostinger Deploy Notes

These notes explain how the repo-side deploy files fit together. A more
detailed founder-safe runbook is planned for
`Blueprints/playbooks/hostinger-kvm1-deploy-runbook.md` (TBD — use this
file plus the compose and nginx configs as the source of truth in the meantime).

## How The Pieces Fit

- `docker-compose.prod.yml` runs two containers from GHCR:
  - `api` pulls `ghcr.io/justinduverge-design/corvus:main`.
  - `cron` pulls `ghcr.io/justinduverge-design/corvus-cron:main`.
- The API binds to `127.0.0.1:3000:3000`, so it is reachable only from the VPS itself.
- Nginx is the public front door on ports 80 and 443. It proxies public traffic to `127.0.0.1:3000`.
- The same API container serves both `/api/*` routes and the built SPA from `frontend/dist`, so Hostinger does not need a separate static-site host.
- The cron worker exposes no ports and should not receive inbound HTTP.
- Runtime secrets live in `deploy/hostinger/.env.production` on the VPS. That file is ignored by `deploy/hostinger/.gitignore` (and also by the repo root `.gitignore`) and must not be committed.

## GHCR Login

The primary deploy workflow logs KVM1 into GHCR with the workflow-scoped
`GITHUB_TOKEN`, pulls the just-built images, restarts containers, then logs out.
Do not keep a long-lived GHCR token on the VPS unless the self-hosted runner is
unavailable and a manual recovery requires it.

If a manual pull is needed and the GHCR images are private, the VPS must log in
before pulling:

```bash
echo 'YOUR_GITHUB_PAT' | docker login ghcr.io -u justinduverge-design --password-stdin
```

Use a GitHub Personal Access Token scoped to `read:packages`.

## Primary Release Path

`.github/workflows/deploy.yml` is the normal deploy path.

- `quality` and `build` run on GitHub-hosted runners.
- `deploy` runs on KVM1's self-hosted runner: `corvus-kvm1-deploy`.
- Required runner labels: `self-hosted`, `Linux`, `X64`, `kvm1`, `corvus-deploy`.
- Runner home on KVM1: `/home/justin/actions-runner/corvus`.
- The runner runs as `justin`, which is in the Docker group.
- A user crontab `@reboot` entry restarts the runner after reboot. Convert it
  to a root-managed systemd service later when sudo/root console access is
  available.

The deploy job does not SSH into KVM1. It is already running on KVM1 and runs
Docker Compose locally from `/opt/corvus/deploy/hostinger`.

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
cd /opt/corvus/deploy/hostinger
docker compose -f docker-compose.prod.yml --project-name corvus pull api cron
docker compose -f docker-compose.prod.yml --project-name corvus up -d --no-build api cron
docker compose -f docker-compose.prod.yml --project-name corvus ps
```

Then verify:

```bash
curl -s https://slopssaloon.com/api/health
curl -s https://slopssaloon.com/api/ready
```

## Nginx And Certbot

The checked-in Nginx file is valid before certificates exist. It lets Nginx
start and lets Certbot safely update the site. During the runbook's Certbot
step, choose the redirect option so Certbot adds HTTPS and HTTP -> HTTPS
redirect behavior.

## Justin Confirmed

- Public hostnames: `slopssaloon.com` and `www.slopssaloon.com`.
- Off-box backup target for the VPS-only `.env.production` file: handled by Justin.
- Tuesday scoring stays disabled for launch with `CORVUS_CRON_SCORING_ENABLED=false`.

## Remaining Guided Ops

- Convert the KVM1 GitHub runner from user-cron supervision to a root-managed
  systemd service when sudo/root console access is available.
- Add Tailscale OAuth secrets in GitHub if the manual fallback workflow should
  be runnable from Actions.
- Private LLM link: confirm KVM2 Tailscale routing before setting `LLM_BASE_URL`.
