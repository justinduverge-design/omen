# Corvus Current Sprint

Last updated: 2026-05-24

## Current State

Corvus is live on the renamed route.

- Local repo path: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`
- GitHub repo: `justinduverge-design/corvus`
- Oracle checkout path: `~/corvus`
- Production service name: `corvus-api`
- Docker containers: `corvus_api`, `corvus_cron`
- Test baseline: 175/175 passing after restructure

## Completed

- Repo renamed from `slops-saloon` to `corvus` on GitHub.
- Local repo lives under the Slops Saloon division folder.
- Retired nested `Corvus/` folder was folded into the repo root.
- Product DBS folders now live at repo root.
- `package.json` name is `corvus`.
- Docker image/container/network names use `corvus`.
- GitHub Actions deploy builds `corvus:main` and `corvus-cron:main`.
- Oracle deploy checkout was moved to `~/corvus`.
- Live `/api/health` returned HTTP 200 with `service: corvus-api`.
- Canonical Omen endpoint is `POST /api/omen/mvp-move`.

## Now

- Stabilize context files so Justin can rewrite `AGENT.md` and `CLAUDE.md`.
- Keep the product path and route unambiguous for all agents.
- Keep backend/frontend contracts stable while context docs settle.

## Next

1. Justin rewrites `AGENT.md` and `CLAUDE.md`.
2. Run targeted stale-doc cleanup for historical path references outside the active context set.
3. Run `npm audit` review/fix as a separate code/dependency task.
4. Validate Stripe live behavior as a separate approved production task.
5. Load test `POST /api/omen/mvp-move` and `POST /api/trade/compare`.

## Guardrails

- Do not recreate `Corvus/`.
- Do not change app behavior during context cleanup.
- Do not touch `.env`, secrets, DNS, SSL, Nginx, Supabase migrations, Stripe production behavior, or package files without explicit approval.
- Do not deploy unless Justin explicitly approves the deploy action.
