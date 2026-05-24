# slops-saloon Current Sprint

**Last updated**: 2026-05-23

## Focus

Canonicalize the Omen path. Then npm audit. Then launch validation.

## Completed (as of 2026-05-23 audit)

- Trade Analyzer — live, tested ✅
- Start/Sit with LLM reasoning — live, tested ✅
- Waiver wire optimizer — live, tested ✅
- Platform adapters (Yahoo, Sleeper, ESPN) — live, tested ✅
- Platform connection UI — live, tested ✅
- Supabase auth + Vault encryption — live ✅
- Structured logging — live ✅
- Security middleware (helmet, rate limiting) — live ✅
- ESPN recovery Account page — all 8 states verified ✅
- Matchup DvP — live via nflverse-data ✅
- LLM reasoning — live via Gemma/Ollama in POST /api/omen/mvp-move ✅
- SLOPS OS DBS migration — all phases (1–6) complete ✅

## In Progress / Next

| Priority | Task | Prompt |
|----------|------|--------|
| 🔴 1 | Omen path canonicalization | `Blueprints/prompts/codex-omen-path-canonicalize.md` |
| 🔴 2 | npm audit fix (3 moderate prod vulns) | Write after Omen migration |
| 🟡 3 | Stale doc cleanup | Claude pass |
| 🟡 4 | Stripe live key validation | Codex |
| 🟡 5 | Docker deploy prove-out | Codex |
| ⬜ 6 | Load testing + final deploy | After all above |

## Git State

- slops-saloon: diverged from origin/main — Codex prompt at `Blueprints/prompts/codex-git-slops-saloon-clean-tree.md`
- SLOPS root: untracked, never committed — Codex prompt at `Blueprints/prompts/codex-git-slops-initial-commit.md` (in SLOPS root)

## Guardrails

No deploys, production changes, secrets work, or app behavior changes without explicit Justin approval.
