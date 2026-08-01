# A3 — Production Security and Supabase Review (Audit-Prep)

**Date:** 2026-07-31
**Authority:** ATA-20260731-01 (`Blueprints/agents/AGENT_INDEX.md` §9) — audit-preparation only, no secret values reviewed or displayed, no production mutation.
**Scope:** production settings/secrets checklist, reviewed by presence/structure only.

## Checklist reviewed

### 1. Secret handling in git

- `.gitignore:6-8` covers `.env`, `.env.*`, with an explicit `!.env.example` carve-out.
- `git ls-files | grep -E "^\.env"` confirms only `.env.example` is tracked. No real `.env*` file has ever been committed.
- **Finding: PASS.** No secret leakage into git history via `.env*`.

### 2. Env var inventory vs. runtime requirements

- `deploy/hostinger/ENV-INVENTORY.md` documents 27 runtime vars (names + purpose + secret classification) plus 6 build-time public `VITE_*` vars — names only, matches repo convention.
- Cross-checked against `.env.example` (template, no values): var names match the inventory (`SUPABASE_SERVICE_KEY`, `YAHOO_CLIENT_SECRET`, `REDIS_TOKEN`, `SENTRY_DSN`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `SPORTRADAR_API_KEY`, `OPENWEATHER_API_KEY` all present and correctly flagged `Secret? = Yes`).
- **Finding: PASS.** Inventory and template are in sync; secret-classified vars are consistently marked.

### 3. Insecure fallback defaults

- `src/config/index.js` — grepped every `process.env.X || <fallback>` pattern. All secret-bearing vars (`openWeatherApiKey`, `resend.apiKey`) fall back to `null`, never to a literal placeholder secret. Non-secret vars fall back to safe dev defaults (`"development"`, `"http://localhost:3000"`, `"info"`).
- **Finding: PASS.** No hardcoded secret defaults found.

### 4. Deploy/infra config exposure

- `deploy/hostinger/docker-compose.prod.yml` — secrets are injected via `env_file: .env.production` (gitignored, VPS-only per file header comment), never as literal `environment:` values. Only `NODE_ENV` and `PORT`/`TZ` are set as literals (non-secret).
- API container is bound `127.0.0.1:3000:3000` only — not exposed directly to the internet; Nginx is the sole public front door.
- `deploy/hostinger/nginx-omen.conf` — pre-Certbot HTTP-only config, proxies to localhost, no embedded certs/keys. Comment documents the expected `certbot --nginx` flow to add TLS. No secret material in the file.
- **Finding: PASS**, with one **observation**: this reviewer did not verify the live VPS Nginx config (post-Certbot) or confirm Certbot has actually run — that's server-state, out of scope for a repo-only audit-prep pass. Flag for a future access-window pass if Justin wants live-server confirmation.

### 5. RLS / Supabase schema state

- Per `Direction/facts-of-record.md`:15 and `Direction/context.md`:74, `sql/omen_rls_security.sql` is documented as applied and verified in Supabase (migration `20260531160851_apply_omen_rls_security_full_setup`), covering `waitlist_signups`, subscription date columns, `moves` feedback idempotence, `profiles.favorite_team`, platform connection safe-column grants, and service-role Vault wrapper RPCs.
- This audit did not re-verify live Supabase state (would require Supabase access/secrets, out of scope for this pass) — relying on the documented record. **Flag:** if Justin wants live re-confirmation, that needs a separate access window and is a bigger lift than this pass.
- Prepared-but-unapplied SQL exists at `sql/2026-06-12_phase1_adp_scoring_schema_review.sql` — per `Direction/facts-of-record.md`:15, authoring SQL is agent work; applying it is a separately gated Justin action. No evidence it has been applied; treat as still pending if/when needed.

## Overall classification

| Area | Status |
|---|---|
| Git secret hygiene | PASS |
| Env inventory accuracy | PASS |
| Fallback defaults | PASS |
| Deploy/infra config | PASS (live-server TLS state unverified — repo-only scope) |
| RLS/schema state | Relying on documented record; not independently re-verified live |

**No P0/P1 findings from this repo-only pass.** Two items would need a live-access window to fully close, not just repo review: (1) confirming Certbot/TLS is actually active on the VPS, (2) re-confirming RLS policy state directly against live Supabase rather than relying on the decision-log record. Recorded here rather than silently treated as done.

## Do-not-touch compliance

No secret values were read or displayed. No production database, DNS, Nginx, or environment variable was mutated. This is a review artifact only.
