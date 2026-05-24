# Corvus Current Sprint

**Last updated**: 2026-05-23

## Focus

Canonicalize the Omen path. Then npm audit. Then launch validation.

## Reality Check (2026-05-23 audit)

What is actually done vs. what the docs said was next:

| Item | Status |
|------|--------|
| Trade Analyzer | ✅ Live, tested |
| Start/Sit with LLM reasoning | ✅ Live, tested |
| Waiver wire optimizer | ✅ Live, tested |
| Platform adapters (Yahoo, Sleeper, ESPN) | ✅ Live, tested |
| Platform connection UI | ✅ Live, tested |
| Supabase auth + Vault encryption | ✅ Live |
| Structured logging | ✅ Live |
| Security middleware (helmet, rate limiting) | ✅ Live |
| ESPN recovery Account page wiring | ✅ Complete, all 8 states verified |
| Matchup DvP | ✅ Live — nflverse-data (not Sportradar) |
| LLM reasoning (Gemma/Ollama) | ✅ Live — wired in POST /api/omen/mvp-move route |
| Omen path — canonical | 🔴 Split — OmenOfTheWeek.jsx still calls GET; needs migration to POST |
| npm audit (0 vulnerabilities) | 🔴 3 moderate production vulns — not clean |
| Docker deployment on Oracle VPS | 🟡 Config exists, live state not proven |
| Stripe live keys + payment validation | 🟡 Backend exists, live validation not proven |
| Load testing + final deploy | ⬜ Not started |
| Dashboard polish / Hall of Records | 🟡 Partial |

## Current Next Task

Run `ssffmvp/Blueprints/prompts/codex-omen-path-canonicalize.md` in Codex.

Migrates `OmenOfTheWeek.jsx` to POST `/api/omen/mvp-move`, adds ESPN RecoveryPanel,
retires `GET /omen-of-the-week` and unregisters `Omen.jsx` route.

## After Omen Migration

1. `npm audit fix` — targeted fix for 3 moderate production vulns, verify tests still pass
2. Stale doc cleanup — manifesto.md, Blueprints/README.md missing; security-privacy.md probo claim wrong
3. Stripe live validation + Docker deploy prove-out
4. Load test

## Guardrails

- Keep Start/Sit and waiver logic inside Omen / MVP Move.
- Treat ESPN as essential but fragile.
- Route ESPN recovery through Account with safe state/query context only.
- Do not auto-rerun Omen after recovery; require user click.
- Keep Yahoo and Sleeper in scope.
- Prefer plain-English reasoning over visible heavy math.
- No deploys, production changes, or secrets work without explicit Justin approval.
