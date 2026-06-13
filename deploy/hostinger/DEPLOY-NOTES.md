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

If the GHCR images are private, the VPS must log in before pulling:

```bash
echo 'YOUR_GITHUB_PAT' | docker login ghcr.io -u justinduverge-design --password-stdin
```

Use a GitHub Personal Access Token scoped to `read:packages`.

## Release Pull And Restart

After GitHub Actions publishes fresh `:main` images:

```bash
cd /opt/corvus
docker compose -f deploy/hostinger/docker-compose.prod.yml pull
docker compose -f deploy/hostinger/docker-compose.prod.yml up -d
docker compose -f deploy/hostinger/docker-compose.prod.yml ps
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

- GHCR pull access: Justin needs help creating a GitHub PAT with `read:packages`, then running `docker login ghcr.io` on KVM1 if the images are private.
- Private LLM link: Justin needs help setting up Tailscale between KVM1 and KVM2 before setting `LLM_BASE_URL`.
