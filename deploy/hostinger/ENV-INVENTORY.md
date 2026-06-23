# Hostinger Env Inventory

This inventory lists env var names only. Put real values only in
`deploy/hostinger/.env.production` on the VPS, never in git or chat.

`LLM_BASE_URL` must point from KVM1 to the KVM2 model over a private link
such as Tailscale or a tightly firewalled private route. Do not point it at a
public Ollama/OpenClaw address.

## Runtime Env For `deploy/hostinger/.env.production`

| Name | Purpose | Source | Secret? |
| --- | --- | --- | --- |
| `NODE_ENV` | Runs Express in production mode. | App | No |
| `PORT` | Internal Node listen port; current app default is `3000`. | App | No |
| `TZ` | Cron container timezone for the Tuesday 6 AM schedule; compose sets `America/New_York`. | App | No |
| `APP_BASE_URL` | Public app URL for redirects and Stripe return URLs. | App | No |
| `CORS_ORIGINS` | Optional comma-separated browser origins allowed by CORS. | App | No |
| `LOG_LEVEL` | Server log verbosity. | App | No |
| `SUPABASE_URL` | Supabase project URL used by API, worker, and health readiness. | Supabase | No |
| `SUPABASE_SERVICE_KEY` | Service-role key for server-side Supabase access. | Supabase | Yes |
| `REDIS_URL` | Upstash Redis REST URL for cache-backed services. | Upstash | Treat as sensitive |
| `REDIS_TOKEN` | Upstash Redis REST token. | Upstash | Yes |
| `SENTRY_DSN` | Sentry project DSN for backend error capture (api + cron). Empty = SDK no-op. | Sentry | Yes |
| `YAHOO_CLIENT_ID` | Yahoo OAuth app client id. | Yahoo | No |
| `YAHOO_CLIENT_SECRET` | Yahoo OAuth app client secret. | Yahoo | Yes |
| `YAHOO_REDIRECT_URI` | Yahoo OAuth callback URL. | Yahoo | No |
| `STRIPE_SECRET_KEY` | Stripe server API key. | Stripe | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret. | Stripe | Yes |
| `STRIPE_MONTHLY_PRICE_ID` | Stripe monthly plan price id. | Stripe | No |
| `STRIPE_SEASON_PRICE_ID` | Stripe season pass price id. | Stripe | No |
| `OMEN_BILLING_ENABLED` | Master billing kill-switch for checkout/portal/prices and Pro gate; launch value `false`. Legacy `CORVUS_BILLING_ENABLED` is still accepted as a fallback. | App | No |
| `LLM_BASE_URL` | Private KVM2 Ollama/OpenClaw model base URL for narration. | LLM | Private-only endpoint |
| `LLM_MODEL` | Model name sent to the LLM service. | LLM | No |
| `LLM_TIMEOUT` | LLM request timeout in milliseconds. | LLM | No |
| `OPENWEATHER_API_KEY` | Optional OpenWeather key for weather-aware Omen signals. | OpenWeather | Yes |
| `RESEND_API_KEY` | Optional transactional email key for waitlist email. | Resend | Yes |
| `ANTHROPIC_API_KEY` | Optional Anthropic key read by config/legacy surfaces. | App | Yes |
| `OMEN_CRON_SCORING_ENABLED` | Enables real Tuesday scoring when set to `true`. Keep false until approved. Legacy `CORVUS_CRON_SCORING_ENABLED` is still accepted as a fallback. | App | No |
| `OMEN_CRON_DRY_RUN` | Runs Tuesday scoring without writes when set to `true`. | App | No |
| `SPORTRADAR_API_KEY` | Legacy/deferred scoring provider key; not required by current nflverse scoring path. | Sports data | Yes |
| `PROMPT_HOT_RELOAD` | Optional local prompt-loader hot reload flag. | App | No |
| `GITHUB_SHA` | Optional build metadata returned by `/api/version`. | App | No |
| `COMMIT_SHA` | Optional build metadata returned by `/api/version`. | App | No |
| `SOURCE_VERSION` | Optional build metadata returned by `/api/version`. | App | No |
| `RENDER_GIT_COMMIT` | Optional build metadata returned by `/api/version`. | App | No |
| `GITHUB_RUN_ID` | Optional build metadata returned by `/api/version`. | App | No |
| `BUILD_ID` | Optional build metadata returned by `/api/version`. | App | No |
| `RENDER_SERVICE_ID` | Optional build metadata returned by `/api/version`. | App | No |
| `IMAGE_TAG` | Optional image metadata returned by `/api/version`. | App | No |
| `GHCR_IMAGE_TAG` | Optional image metadata returned by `/api/version`. | App | No |

## Build-Time Public Env

The Hostinger box pulls already-built GHCR images. These are normally supplied
to GitHub Actions when the images are built, not to the KVM runtime env file.

| Name | Purpose | Source | Secret? |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Public Supabase URL baked into the SPA bundle. | Supabase | No |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase anon key baked into the SPA bundle. | Supabase | No |
| `VITE_API_BASE_URL` | Optional SPA API base URL override; blank means same-origin `/api`. | App | No |
| `VITE_ESPN_ENABLED` | Build-time flag that shows the ESPN connection UI. | App | No |
| `VITE_SENTRY_DSN` | Public Sentry DSN baked into the SPA bundle for frontend error capture. Empty = SDK no-op. | Sentry | No (public client ID) |
| `VITE_COMMIT_SHA` | Optional commit hash baked into the SPA bundle as the Sentry release tag. | App | No |

## Cross-Check Notes

- `src/config/index.js` requires `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` at boot.
- `src/server.js` listens on `config.port`, which defaults to `3000`.
- `/api/ready` reports Supabase reachability plus optional Stripe, Yahoo, Redis, LLM, and OpenWeather configuration.
- `src/omen_tuesday_cron.js` requires `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` for scoring, optionally uses Upstash, and has no inbound HTTP listener.
