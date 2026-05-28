# Corvus Launch Validation Backend Evidence

Date: 2026-05-26

Owner: Codex / backend

Mode: Finish mode — evidence, QA, cleanup, launch-truth validation

## Summary

Corvus backend is locally test-clean and launch-validation-ready, but not launch-approved. No production systems, secrets, Stripe live settings, Supabase production data, DNS, SSL, Nginx, Docker production config, or Oracle service config were touched.

## Commands Run

```powershell
git status --short
rg "app\.use|app\.get|app\.post|router\.(get|post|delete|put|patch)" src\server.js src\routes src\corvus_api_v2.js -n
node --test test\optimizerRoute.test.js
$env:SUPABASE_URL='https://example.supabase.co'; $env:SUPABASE_SERVICE_KEY='test-service-key'; $env:PORT='3107'; $env:LOG_LEVEL='error'; $p=Start-Process -FilePath 'node' -ArgumentList 'src/server.js' -PassThru -WindowStyle Hidden ...; node scripts/load-corvus-routes.js; Stop-Process -Id $p.Id -Force
npm test
npm audit --audit-level=moderate
git diff --check
npm --prefix frontend run build
```

## Final Local Check Results

- `node --test test\optimizerRoute.test.js`: 1/1 passing.
- `npm test`: 204/204 passing.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- `git diff --check`: passed.
- `npm --prefix frontend run build`: passed and emitted `frontend/dist`; Vite still prints the existing `NODE_ENV=production` warning.

## Route Load Smoke Output

Auth token was not supplied. This validates the public Trade route and auth gates, not real platform/paid flows.

```json
{
  "base_url": "http://127.0.0.1:3107",
  "iterations": 3,
  "auth_token_supplied": false,
  "reports": [
    {
      "name": "trade_compare",
      "count": 3,
      "statuses": { "200": 3 },
      "p50_ms": 3,
      "p95_ms": 39
    },
    {
      "name": "omen_mvp_move",
      "count": 3,
      "statuses": { "401": 3 },
      "p50_ms": 1,
      "p95_ms": 2
    },
    {
      "name": "dashboard_summary",
      "count": 3,
      "statuses": { "401": 3 },
      "p50_ms": 1,
      "p95_ms": 1
    }
  ],
  "threshold_notes": {
    "local_smoke_p95_ms": 1000,
    "investor_demo_p95_ms": 750,
    "rate_limit_expected": "Public tool routes allow 30 requests/minute/IP."
  }
}
```

## Routes Tested

- `POST /api/trade/compare`: public route returned 200 in load smoke.
- `POST /api/omen/mvp-move`: returned 401 without auth in load smoke, as expected.
- `GET /api/dashboard/summary`: returned 401 without auth in load smoke, as expected.
- `POST /api/optimizer/mvp-move`: focused test confirms compatibility wrapper to canonical `/api/omen/mvp-move`.

## Mounted Route Inventory

### Active

- `GET /api/health`
- `GET /api/ready`
- `GET /api/session`
- `GET /api/platform-status`
- `GET /api/dashboard/summary`
- `POST /api/draft-assistant/recommendations`
- `GET /api/draft-assistant/adp`
- `POST /api/stripe/checkout`
- `POST /api/stripe/portal`
- `POST /api/stripe/webhook`
- `GET /api/yahoo/auth`
- `GET /api/yahoo/callback`
- `GET /api/yahoo/roster`
- `GET /api/sleeper/roster`
- `GET /api/espn/roster`
- `GET /api/platforms`
- `GET /api/platforms/status`
- `POST /api/platforms/sleeper/resolve`
- `POST /api/platforms/sleeper/connect`
- `POST /api/platforms/espn/connect`
- `DELETE /api/platforms/:platform`
- `GET /api/optimizer/lineup`
- `GET /api/optimizer/waivers`
- `GET /api/optimizer/waiver`
- `POST /api/omen/mvp-move`
- `POST /api/trade/compare`
- `GET /api/user/export`
- `POST /api/user/consent`
- `DELETE /api/user/delete`

### Compatibility-Only

- `POST /api/optimizer/mvp-move`: now wraps canonical `/api/omen/mvp-move` and returns deprecation/canonical headers.
- `POST /api/auth/sleeper/connect`: legacy route from `corvus_api_v2.js`; keep only until frontend confirms no callers.
- `GET /api/auth/yahoo/authorize`: legacy route from `corvus_api_v2.js`; canonical route is `/api/yahoo/auth`.
- `GET /api/auth/yahoo/callback`: legacy route from `corvus_api_v2.js`; canonical route is `/api/yahoo/callback`.
- `POST /api/auth/espn/connect`: legacy route from `corvus_api_v2.js`; canonical route is `/api/platforms/espn/connect`.
- `GET /api/league/standings`: legacy/compat route; not in launch critical path.

### Retired

- `GET /api/omen-of-the-week`: not mounted; tests confirm 404 without leaking connection data.

### Internal / Deferred

- Tuesday cron scoring remains disabled unless `CORVUS_CRON_SCORING_ENABLED=true`.
- Standalone Start/Sit page is deferred by Layer 1. Backend `POST /api/start-sit` still exists as a public manual comparison route but is not part of the launch journey unless frontend already uses it.

## Stripe Validation Status

Completed locally:

- Fake/test harness route tests cover checkout URL, portal URL, checkout webhook activation with trial metadata, and payment-failed deactivation.

Not completed:

- Real Stripe test-mode checkout.
- Real Stripe portal.
- Real Stripe webhook delivery/retry.
- Real cancellation flow.
- Real payment failure event.

Reason: real Stripe test-mode validation needs approved Stripe test keys, price ids, webhook secret, and either Stripe CLI or configured test webhook endpoint. No secrets or production/test payment settings were touched.

## Supabase Schema Status

Prepared locally:

- `sql/corvus_rls_security.sql` includes subscription metadata columns: `trial_ends_at` and `current_period_end`.

Not applied:

- No Supabase production migration or data change was run.

Approval needed:

- Justin must approve applying schema changes to Supabase production/staging.

## Omen Platform QA Status

Locally tested:

- Yahoo, Sleeper, and ESPN service paths are covered by tests with normalized roster fixtures.
- ESPN missing Vault secret recovery is covered.
- Route gating for auth/subscription is covered.

Not completed:

- Real-account Yahoo Omen QA.
- Real-account Sleeper Omen QA.
- ESPN staged cookie QA.

Reason: real platform QA requires user account/platform credentials or staged accounts. No cookies, tokens, or secrets were requested or touched.

## ESPN Cookie Safety

Current backend behavior:

- ESPN cookies are stored/decrypted via Vault helpers.
- API responses do not echo cookie values.
- Server body logging skips ESPN credential routes.

Still required:

- Real ESPN recovery QA with log review using staged cookies.

## Route Ownership Decision

- Canonical route: `POST /api/omen/mvp-move`.
- Compatibility route: `POST /api/optimizer/mvp-move`.
- Decision implemented: compatibility-wrap optimizer MVP to canonical Omen rather than keeping a second MVP engine.

## Blockers

- Stripe test-mode secrets/config and webhook test setup are needed.
- Supabase schema application needs Justin approval.
- Real Yahoo/Sleeper/ESPN QA needs staged accounts or Justin-provided test context.
- Public ESPN launch remains approval-bound.

## Recommended Cuts / Deferrals

- Keep cron scoring out of launch.
- Keep standalone StartSit and WaiverWire pages out of launch.
- Keep public ESPN marketing claims out of launch until recovery QA is proven.
- Keep legacy auth routes compatibility-only, then retire after frontend confirms no callers.

## Next Smallest Safe Step

Run Stripe test-mode validation with approved test keys and save webhook/checkout evidence.
