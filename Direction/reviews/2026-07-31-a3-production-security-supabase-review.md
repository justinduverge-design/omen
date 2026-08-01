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
- **Finding: PASS.** **Live-confirmed 2026-08-01** via direct TLS handshake (`openssl s_client -connect slopssaloon.com:443`): certificate issued by Let's Encrypt (`CN=YE1`), valid `2026-06-08` to `2026-09-06`, subject `CN=slopssaloon.com`. Certbot is active and the cert is current — no repo-only caveat remains on this point.

### 5. RLS / Supabase schema state

- Per `Direction/facts-of-record.md`:15 and `Direction/context.md`:74, `sql/omen_rls_security.sql` is documented as applied and verified in Supabase (migration `20260531160851_apply_omen_rls_security_full_setup`), covering `waitlist_signups`, subscription date columns, `moves` feedback idempotence, `profiles.favorite_team`, platform connection safe-column grants, and service-role Vault wrapper RPCs.
- **Live-confirmed 2026-08-01** via Supabase MCP against project `xyudxfhqejbwvjngiwhw` ("Omen", `ACTIVE_HEALTHY`): `select rowsecurity from pg_tables where schemaname='public'` shows RLS **enabled on all 11 public tables** — every user-owned table (`moves`, `platform_connections`, `profiles`, `users`, `consent_records`, `oauth_credentials`, `deletion_audit_log`, `system_context`) plus `waitlist_signups`, `oauth_state`, `local_snapshots`. Security advisors flag the latter three as "RLS Enabled No Policy" (INFO level) — correct by design: these are service-role-only tables (confirmed in the F1 audit), so RLS-enabled-with-no-policy means "deny all except service role," which is the intended lockdown posture, not a gap.
- **New finding (bonus, not part of the original two flags):** Supabase security advisors report **Leaked Password Protection is disabled** (WARN level) — Supabase Auth's HaveIBeenPwned check against compromised passwords is off. This is a quick toggle in Supabase Auth settings, not a code change. Recommend enabling it. Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Prepared-but-unapplied SQL exists at `sql/2026-06-12_phase1_adp_scoring_schema_review.sql` — per `Direction/facts-of-record.md`:15, authoring SQL is agent work; applying it is a separately gated Justin action. No evidence it has been applied; treat as still pending if/when needed.

## Overall classification

| Area | Status |
|---|---|
| Git secret hygiene | PASS |
| Env inventory accuracy | PASS |
| Fallback defaults | PASS |
| Deploy/infra config | PASS — TLS live-confirmed 2026-08-01 |
| RLS/schema state | PASS — live-confirmed 2026-08-01 via Supabase MCP |

**No P0/P1 findings.** Both live-access-window items from the original repo-only pass are now closed (2026-08-01): Certbot/TLS confirmed active via direct handshake; RLS confirmed enabled on every table via Supabase MCP. One new WARN-level finding surfaced during the live check: leaked-password protection is disabled in Supabase Auth — a one-toggle fix, not urgent, but worth doing.

## Do-not-touch compliance

No secret values were read or displayed. No production database, DNS, Nginx, or environment variable was mutated. This is a review artifact only.
