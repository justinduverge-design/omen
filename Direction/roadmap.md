# Corvus Roadmap

Last updated: 2026-05-24

## What Is Live

- Trade Analyzer.
- Draft Assistant.
- Omen of the Week / MVP Move through `POST /api/omen/mvp-move`.
- Start/Sit inside Omen.
- Waiver logic inside Omen.
- Yahoo, Sleeper, and ESPN platform adapters.
- ESPN recovery Account page.
- Matchup DvP through nflverse-data.
- LLM reasoning through Gemma/Ollama when configured.
- Supabase auth and Vault encryption.
- Stripe backend surfaces.
- Oracle deploy lane for `corvus-api`.

## Current Infrastructure Route

- GitHub: `https://github.com/justinduverge-design/corvus`
- Local: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`
- Oracle: `~/corvus`
- GHCR API image: `ghcr.io/justinduverge-design/corvus:main`
- GHCR cron image: `ghcr.io/justinduverge-design/corvus-cron:main`

## Now

- Keep context, handoffs, and route docs aligned with the new layer structure.
- Let Justin rewrite agent files on top of stable context.
- Keep current API contracts stable.

## Next

1. Stale-doc cleanup for old paths and historical launch notes.
2. `npm audit` review/fix.
3. Stripe live validation.
4. Load testing for Omen and Trade Analyzer.
5. Final launch readiness review.

## Later

- Decide whether `POST /api/optimizer/mvp-move` merges into `POST /api/omen/mvp-move` as a Pro enrichment tier.
- Polish Hall of Records dashboard.
- Add Draft Assistant season content.
- Decide whether recovery analytics ship before or after paid launch.

## Guardrails

- Keep Start/Sit and waiver logic inside Omen / MVP Move unless Justin separates them.
- Keep ESPN recovery user-safe and explicit.
- Prefer plain-English reasoning over visible heavy math.
- Do not change deploy, secrets, auth, payments, SQL, package files, or production config from roadmap cleanup.
