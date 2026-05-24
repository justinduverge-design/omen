# Corvus Roadmap

**Last updated**: 2026-05-24

## What Is Live

All core features are built and tested (175/175 tests pass):

- Trade Analyzer ✅
- Draft Assistant ✅
- Omen of the Week / MVP Move — canonical path live (`POST /api/omen/mvp-move`) ✅
- Start/Sit inside Omen ✅
- Waiver logic inside Omen ✅
- Platform adapters: Yahoo, Sleeper, ESPN ✅
- ESPN recovery Account page — all 8 states verified ✅
- Matchup DvP via nflverse-data ✅
- LLM reasoning via Gemma/Ollama ✅
- Supabase auth + Vault encryption ✅
- Stripe backend — exists, live validation pending

## Now — Launch Gate

| Item | Status |
|------|--------|
| ssffmvp git tree rebase + clean commit | Pending (prompt ready) |
| npm audit fix (3 moderate prod vulns) | Pending |
| Stripe live key validation | Pending |
| Docker deploy prove-out on Oracle VPS | Pending |

## Next — Deploy

1. Load test `POST /api/omen/mvp-move` and `POST /api/trade/compare` under concurrent users
2. Tag release
3. Push to `main` → trigger Oracle GitHub Actions deploy
4. Smoke test `https://slopssaloon.com/api/health` and the Omen/Trade flows

## Later — Post-Launch

- **optimizer/omen tier merge**: Decide whether `POST /api/optimizer/mvp-move` (Pro six-agent pipeline) merges into `POST /api/omen/mvp-move` as a tier enrichment layer, or remains a separate route
- Hall of Records dashboard polish
- Draft Assistant season content
- Recovery analytics shipping gate decision
- `getOmenOfTheWeekMock()` in systemContracts.js — retire or keep as fallback

## Guardrails

- No deploys, production changes, or secrets work without explicit Justin approval.
- ESPN is essential but fragile — treat recovery flows as production-critical.
- Keep Start/Sit and waiver logic inside Omen / MVP Move.
- Plain-English reasoning over visible math.
