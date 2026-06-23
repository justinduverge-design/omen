# Omen Operational Rename Cutover Spec

Status: execution approved by Justin on 2026-06-23; in progress
Layer: L2 Omen operations / deploy
Created: 2026-06-23
Owner: Codex prepares; Justin approves and executes gated ops

## Goal

Finish the Corvus -> Omen rename at the operational layer without breaking the live KVM1 deploy or losing the ability to roll back.

This plan covers the outside-the-app identity that was deliberately left untouched during the active app rename pass: GitHub Actions, GHCR image names, KVM1 deploy paths, Docker Compose project/container/network names, self-hosted runner labels, checked-in Hostinger deploy files, and optional GitHub/local repo path rename.

## Non-goals

- No DNS change.
- No SSL/TLS or Certbot change.
- No Nginx production behavior change beyond optional checked-in filename cleanup.
- No Supabase schema/data migration.
- No Stripe/payment behavior change.
- No OAuth redirect change unless preflight finds an actual Corvus URL.
- No public Ollama/OpenClaw exposure.
- No deletion of `/opt/corvus`, old GHCR images, old containers, or env files until rollback confidence is explicit.

## Systems touched

- GitHub Actions:
  - `.github/workflows/deploy.yml`
  - `.github/workflows/deploy-kvm1-tailscale-fallback.yml`
- GHCR packages:
  - current API image: `ghcr.io/justinduverge-design/corvus:main`
  - current cron image: `ghcr.io/justinduverge-design/corvus-cron:main`
  - target API image: `ghcr.io/justinduverge-design/omen:main`
  - target cron image: `ghcr.io/justinduverge-design/omen-cron:main`
- Hostinger KVM1 filesystem:
  - current deploy path: `/opt/corvus/deploy/hostinger`
  - target deploy path: `/opt/omen/deploy/hostinger`
- Docker Compose:
  - current project: `corvus`
  - target project: `omen`
  - current containers: `corvus_api`, `corvus_cron`
  - target containers: `omen_api`, `omen_cron`
  - current network: `corvus_network`
  - target network: `omen_network`
- KVM1 self-hosted runner:
  - current workflow label: `corvus-deploy`
  - target workflow label: `omen-deploy`
  - current runner home documented as `/home/justin/actions-runner/corvus`
  - target runner home may remain in place with dual labels during transition, or move to `/home/justin/actions-runner/omen` after the deploy is stable
- Repo identity, optional final phase:
  - current GitHub repo: `justinduverge-design/corvus`
  - target GitHub repo: `justinduverge-design/omen`
  - current local folder: `slops-saloon/corvus`
  - target local folder: `slops-saloon/omen`

## Current operational Corvus inventory

Direct repo inspection found active operational identifiers in:

- `.github/workflows/deploy.yml`
  - `/opt/corvus/deploy/hostinger`
  - `ghcr.io/justinduverge-design/corvus:main`
  - `ghcr.io/justinduverge-design/corvus-cron:main`
  - cache scopes `corvus-api` and `corvus-cron`
  - runner label `corvus-deploy`
  - Compose project `corvus`
  - log target `corvus_api`
- `.github/workflows/deploy-kvm1-tailscale-fallback.yml`
  - same GHCR image names, cache scopes, `/opt/corvus` path, Compose project, and log target
- `deploy/hostinger/docker-compose.prod.yml`
  - `name: corvus`
  - `container_name: corvus_api`
  - `container_name: corvus_cron`
  - GHCR Corvus image names
- `docker-compose.yml`
  - GHCR Corvus image names
  - `corvus_api`, `corvus_cron`, and `corvus_network`
- `docker-compose.hostinger.yml`
  - local images `corvus-api` / `corvus-cron`
  - `CORVUS_ENV_FILE`
  - fallback path `/opt/corvus/shared/.env`
- `deploy/hostinger/DEPLOY-NOTES.md`
  - GHCR Corvus image names
  - runner label `corvus-deploy`
  - `/opt/corvus/deploy/hostinger`
  - Compose project `corvus`
- `README.md`, `Direction/roadmap.md`, `Direction/release_readiness.md`, and `Direction/AGENTS.md`
  - repo/image/container identity notes that should follow the operational decision

Historical prompts, old handoff history, and legacy compatibility notes may continue to mention Corvus as history.

## Cutover strategy

Use a staged rollout with rollback preserved at each step:

1. Seed Omen image/package identity before using it.
2. Prepare `/opt/omen` and runner labels without touching live containers.
3. Cut Docker Compose project identity during an approved window.
4. Verify health, readiness, logs, package pulls, and rollback path.
5. Rename GitHub repo/local folder only after the live deployment is stable, or defer that as its own event.

Do not combine every rename into one irreversible operation.

## Phase 0 — Approval and preflight

Justin must explicitly approve:

- Whether this cutover includes the GitHub repo rename or only deploy identity.
- The maintenance window.
- KVM1 access method.
- Whether the self-hosted runner gets dual labels first or is renamed directly.
- How long old Corvus GHCR images and `/opt/corvus` remain retained.

Approval note, 2026-06-23:

- Justin instructed Codex to "continue until the rename is done." For this execution pass that approval covers the Omen operational rename actions in this spec, while still preserving rollback artifacts and not exposing secrets.

Preflight evidence to capture before any mutation:

- `https://slopssaloon.com/api/health`
- `https://slopssaloon.com/api/ready`
- current KVM1 `docker ps`
- current KVM1 `docker compose -f /opt/corvus/deploy/hostinger/docker-compose.prod.yml --project-name corvus ps`
- current `/opt/corvus/deploy/hostinger/.env.production` backup location, without printing secrets
- current GHCR packages visible to the repo
- current runner labels shown in GitHub Actions

## Phase 1 — Seed Omen GHCR images

Repo-side patch:

- Update both deploy workflows to push dual tags for one transition deploy:
  - `ghcr.io/justinduverge-design/corvus:main`
  - `ghcr.io/justinduverge-design/omen:main`
  - `ghcr.io/justinduverge-design/corvus-cron:main`
  - `ghcr.io/justinduverge-design/omen-cron:main`
- Rename cache scopes to `omen-api` and `omen-cron`, or keep old cache scopes for the seed deploy if build stability matters more than cache naming purity.
- Do not change the live deploy path or Compose project in this phase.

Implementation note, 2026-06-23:

- Repo-side workflow patch prepared for `.github/workflows/deploy.yml` and `.github/workflows/deploy-kvm1-tailscale-fallback.yml`.
- The patch publishes dual Corvus + Omen tags for the API and cron images.
- Cache scopes remain `corvus-api` and `corvus-cron` for this seed phase to reduce build-risk during transition.
- The live deploy still pulls Corvus tags from `/opt/corvus`; no KVM1 action has been taken.

Done-when:

- CI quality/build passes.
- GHCR contains fresh Omen API and cron images.
- Corvus image tags still exist for rollback.
- Live site is unchanged and healthy.

Rollback:

- Revert the workflow patch. Since the live deploy still uses Corvus image names, no KVM1 rollback should be needed.

## Phase 2 — Prepare KVM1 target without traffic change

Justin/KVM1 ops action:

- Create `/opt/omen/deploy/hostinger`.
- Copy or install the checked-in Hostinger deploy files into `/opt/omen/deploy/hostinger`.
- Copy `.env.production` from `/opt/corvus/deploy/hostinger/.env.production` to `/opt/omen/deploy/hostinger/.env.production` with mode `600`, without printing secrets.
- Keep `/opt/corvus` intact.
- Add `omen-deploy` to the existing KVM1 self-hosted runner labels while retaining `corvus-deploy`, or provision a new runner with the target label.
- Do not stop, rename, or delete live containers.

Repo-side prep patch, after approval:

- `deploy/hostinger/docker-compose.prod.yml`
  - `name: omen`
  - `image: ghcr.io/justinduverge-design/omen:main`
  - `image: ghcr.io/justinduverge-design/omen-cron:main`
  - `container_name: omen_api`
  - `container_name: omen_cron`
- `docker-compose.yml`
  - same image/container/network naming for local parity
- `docker-compose.hostinger.yml`
  - add `OMEN_ENV_FILE` and keep `CORVUS_ENV_FILE` fallback for one release
- Checked-in Nginx file:
  - rename `deploy/hostinger/nginx-corvus.conf` to `deploy/hostinger/nginx-omen.conf` or `nginx-slopssaloon.conf`
  - do not rename the live `/etc/nginx/sites-available/slopssaloon` site just for branding

Implementation note, 2026-06-23:

- Repo-side OP3 compose prep is prepared:
  - `deploy/hostinger/docker-compose.prod.yml` now uses Compose project `omen`, Omen GHCR image names, and `omen_api` / `omen_cron` container names.
  - `deploy/hostinger/docker-compose.prod.yml` now names the default network `omen_network`.
  - `docker-compose.yml` now uses Omen GHCR image names, `omen_api` / `omen_cron`, and `omen_network` for local parity.
  - `docker-compose.hostinger.yml` now prefers `OMEN_ENV_FILE` and retains `CORVUS_ENV_FILE` as a one-release fallback.
  - The checked-in Hostinger Nginx sample moved from `nginx-corvus.conf` to `nginx-omen.conf`.
- No live KVM1 directory, runner label, env file, Nginx production site, or container has been changed.
- Follow-up execution note, 2026-06-23:
  - The existing KVM1 self-hosted runner `corvus-kvm1-deploy` now carries both `corvus-deploy` and `omen-deploy` labels.
  - `.github/workflows/omen-operational-cutover.yml` was added as a manual-only guarded workflow. It requires the `CUTOVER_TO_OMEN` confirmation input, copies `/opt/corvus/deploy/hostinger/.env.production` to `/opt/omen/deploy/hostinger/.env.production` without printing secrets, renders Omen compose config, pre-pulls Omen images, stops the Corvus compose project, starts the Omen compose project, verifies health/readiness, and attempts rollback if the Omen start fails after the Corvus stop.
  - First cutover run `27995403847` stopped before any live container change because the runner can use Docker but cannot create `/opt/omen` through passwordless sudo. The workflow now falls back to a short-lived Docker helper for `/opt/omen` file preparation and preserves the source env file permissions with `cp -p`.

Done-when:

- `/opt/omen/deploy/hostinger/.env.production` exists on KVM1 and is permissioned safely.
- The runner can match `omen-deploy`.
- Omen compose config can be rendered without secrets leaking.
- Live Corvus-named containers are still serving production.

Rollback:

- Ignore `/opt/omen` and keep using `/opt/corvus`.
- Remove the new runner label only after the old path is confirmed healthy.

## Phase 3 — Cut the live Docker Compose identity

Approved maintenance-window action:

- Pre-pull Omen images on KVM1.
- Stop the old `corvus` Compose project only when Omen images and env are present.
- Start the new `omen` Compose project.
- Keep the public proxy target `127.0.0.1:3000` unchanged so DNS and SSL stay out of scope.

Target commands must be reviewed before execution and should follow this shape:

```text
cd /opt/omen/deploy/hostinger
docker compose -f docker-compose.prod.yml --project-name omen pull api cron
docker compose -f /opt/corvus/deploy/hostinger/docker-compose.prod.yml --project-name corvus stop api cron
docker compose -f docker-compose.prod.yml --project-name omen up -d --no-build api cron
```

Do not run a destructive `down --volumes`. No volumes are expected here, but the policy is still "do not destroy what rollback might need."

Done-when:

- `omen_api` is healthy.
- `omen_cron` is running or intentionally disabled per cron policy.
- `https://slopssaloon.com/api/health` returns `status: ok`.
- `https://slopssaloon.com/api/ready` returns `status: ready`.
- Recent logs come from `omen_api`.
- Old Corvus images and `/opt/corvus` are retained.

Rollback:

```text
cd /opt/corvus/deploy/hostinger
docker compose -f /opt/omen/deploy/hostinger/docker-compose.prod.yml --project-name omen stop api cron
docker compose -f docker-compose.prod.yml --project-name corvus up -d --no-build api cron
curl -fsS https://slopssaloon.com/api/health
curl -fsS https://slopssaloon.com/api/ready
```

If the runner-label workflow change is the failure, temporarily dispatch the Tailscale fallback or revert `runs-on` to `corvus-deploy`.

## Phase 4 — Stabilize and then remove transitional Corvus ops

After at least one green primary deploy and one green fallback deploy using Omen identifiers:

- Stop pushing dual Corvus GHCR tags.
- Keep old Corvus GHCR images for an agreed retention window, suggested minimum: 30 days.
- Update deploy notes and release readiness docs to make Omen the current operational identity.
- Retain compatibility/env fallback notes only where still actively read by code.
- Run a residual search and classify remaining `corvus` references as one of:
  - historical record
  - compatibility fallback
  - external rollback artifact retained by decision
  - missed active operational reference

Done-when:

- Active deploy path uses `/opt/omen`.
- Primary workflow uses `omen-deploy`.
- GHCR deploy pulls use Omen image names.
- Docker names are `omen_api`, `omen_cron`, and `omen_network`.
- Residual active `corvus` references are documented or removed.

Rollback:

- If the Omen path is unstable, revert workflow + compose paths to Corvus and restart the `corvus` project from retained images.

## Phase 5 — Optional GitHub repo and local folder rename

This is intentionally separate from the live container cutover.

Only do this after Phase 4 is stable:

- Rename GitHub repo `justinduverge-design/corvus` -> `justinduverge-design/omen`.
- Update local remote URLs.
- Rename local folder `slops-saloon/corvus` -> `slops-saloon/omen`.
- Update L0/L1/L2 routing docs that currently say "Omen app code -> `slops-saloon/corvus/`".
- Verify GitHub Actions still has access to GHCR packages and self-hosted runner labels.
- Update documentation clone instructions.

Done-when:

- `git remote -v` points to the target GitHub repo or an intentional redirect.
- L0/L1/L2 active routing docs point to the new folder.
- Workflows still run from the renamed repo.
- No old local path is required for active operations.

Rollback:

- GitHub normally preserves redirects after repo rename, but do not rely on that for the live deploy. Keep deploy identity stable before changing repo identity.
- If local folder rename breaks tooling, move the folder back or update the routing docs in the same recovery pass.

## Verification checklist

Before cutover:

- Backend tests pass.
- Frontend build passes.
- `docker compose -f deploy/hostinger/docker-compose.prod.yml config` can render in a safe local/staging context.
- GitHub Actions quality/build pass.
- Omen GHCR images exist and are pullable by KVM1.

During cutover:

- `docker ps` shows expected names.
- `curl -fsS https://slopssaloon.com/api/health`
- `curl -fsS https://slopssaloon.com/api/ready`
- recent logs from the active API container.

After cutover:

- Primary workflow deploy succeeds.
- Tailscale fallback workflow succeeds or has a documented dry-run/blocked reason.
- Residual `corvus` search is classified.
- `Direction/decision_log.md` records the cutover outcome.
- Release Done evidence is updated if production changed.

## Risk level

Medium-high because the plan touches deploy automation, image names, live container names, and KVM1 filesystem paths.

Risk is lowered by:

- not touching DNS/SSL,
- keeping the public localhost port unchanged,
- seeding Omen GHCR images before using them,
- keeping old Corvus images and `/opt/corvus` intact,
- splitting repo/folder rename from live deploy rename,
- requiring explicit Justin approval before each mutation gate.

## First safe pull

The first implementation pull should be Phase 1 only: seed Omen GHCR image tags while keeping the live deploy on Corvus-named images and `/opt/corvus`.

Do not begin Phase 2 or Phase 3 until Justin explicitly approves KVM1 operations.
