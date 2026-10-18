# Omen tracing (OpenTelemetry), self-hosted

Status: **live since 2026-10-18.** Collector on Command Center (`/opt/omen-telemetry`); KVM1 sets
`OTEL_EXPORTER_OTLP_ENDPOINT` in `.env.production` (founder-approved 2026-10-17). First spans checked for privacy:
route templates and allowlisted keys only.

## What the app does

`src/services/telemetry.js` is a small manual tracer. It does nothing until
`OTEL_EXPORTER_OTLP_ENDPOINT` is set.

- **Off by default.** No endpoint, or `OTEL_ENABLED=false`: no SDK is loaded, no network
  calls, `withSpan()` just calls the function.
- **Self-hosted only.** There is no default endpoint. An endpoint whose host is not private
  (our own tailnet's `*.ts.net` names when `OTEL_TAILNET_SUFFIX` is set, `100.64.0.0/10`, RFC 1918, loopback, or a single-label Docker service name) is
  refused at boot with a log line, and tracing stays off. Credentials in the URL are refused.
  This keeps facts-of-record #17: nothing about users leaves our infrastructure.
- **Privacy.** Span attributes pass an allowlist (`SAFE_ATTRIBUTE_KEYS`). Requests are named by
  route template (`POST /api/trade/:id`), never the raw URL. No user ids, emails, league ids,
  cookies, tokens, headers, query strings or bodies. Errors record `error.type` (the class
  name) only, never the message. Incoming `traceparent` headers are ignored.
- **Sentry coexistence.** `@sentry/node` 11 does not register an OpenTelemetry tracer provider
  or context manager unless `enableOpenTelemetrySetup: true` (default `false`; see the
  SDK init and client sources in the installed `@sentry/node` package). Our tracer is also
  never registered globally: it keeps its own provider and its own `AsyncLocalStorage`. So
  neither side can replace the other, and libraries that self-instrument through the global
  `@opentelemetry/api` (supabase-js) still get the no-op tracer.
- **Sampling.** Parent-based trace-id ratio. `OTEL_TRACES_SAMPLER_ARG` (0..1), default `0.1`
  for the API and `1` for cron (one trace per run).
- **Shutdown.** `server.js` flushes spans in its SIGTERM drain; each cron flushes before exit.

### Spans

| Span | Where |
|---|---|
| `http.request` (renamed `METHOD /route/template`) | every request, `server.js` |
| `omen.request` | `POST /api/omen/mvp-move`, `src/routes/omen.js` |
| `omen.db.read` | active platform connections, `src/services/omen.js` |
| `omen.provider.read` (`omen.platform`) | roster read per connection, `src/services/omen.js` |
| `omen.warehouse.usage` | `readRosterUsage`, `src/services/omen.js` |
| `omen.decision.waiver` (`omen.platform`) | `buildWaiverCandidateForConnection` |
| `omen.decision.lineup` | `optimizer.evaluateLineup` in the MVP path |
| `omen.decision.select` (`omen.candidates`, `omen.selected_type`) | `omenSelector.selectDecision` |
| `omen.llm.enrich` | `generateMvpLlmNarration` |
| `trade.request` | `/api/trade` mount, `server.js` (route level only) |
| `cron.<job>` | each `src/omen_*_cron.js` entry point |

Not yet instrumented: inside the trade search (`omenTradeCandidate.js`, `tradeLineup.js`,
`tradeFind.js`, `src/routes/trade.js`), so the baseline's `omen.decision.trade` / `trade.find.scan`
attributes (`teams`, `players`, `solves`, `budget_exceeded`) and event-loop delay are still to add.

## Env vars (KVM1, both `omen_api` and `omen_cron`)

| Name | Value |
|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://100.98.81.0:4318` (Command Center tailnet IP; a `*.ts.net` name also needs `OTEL_TAILNET_SUFFIX`). Unset = off. |
| `OTEL_TRACES_SAMPLER_ARG` | Optional. `0.1` default for the API. |
| `OTEL_ENABLED` | Optional kill switch. `false` turns tracing off even with an endpoint. |

Git sha comes from the existing `GITHUB_SHA` / `BUILD_ID` env as `service.version`.

## Collector placement (recommendation)

Run `otelcol-contrib` on **Command Center** (Raspberry Pi 4, the only fleet device that runs
Docker; see `Blueprints/specs/infrastructure/slops-os-raspberry-pi-fleet-v1.md`). It already
hosts the observability stack (Kuma, Beszel, GlitchTip), it is on the tailnet, and KVM1 already
reaches it over Tailscale. Steward and Sentinel are too small and run no Docker.

Files here:

- `otel-collector.yaml`: OTLP/HTTP receiver bound to `100.98.81.0:4318` only, memory limiter,
  an attribute scrub (defence in depth), batch, and a rotated JSON file exporter (14 days,
  ~500 MB cap) plus a `debug` exporter. Nothing leaves the box.
- `docker-compose.yml`: reference compose. Host networking so the receiver binds the
  Tailscale IP itself (Docker-published ports bypass UFW). **Check and pin the image tag
  before deploying**; the tag in the file has not been verified against the registry.

Later, if file output is not enough to read p50/p95: add a small local backend on the same box
(for example Jaeger v2 with on-disk Badger storage, bound to the Tailscale IP) and point a
second `otlp` exporter at it. Watch RAM on the 4 GB Pi.

## Deploy steps (all done 2026-10-18)

1. On Command Center: copy this directory to `/opt/omen-telemetry`, create the data dir owned by the
   image user (`sudo install -d -o 10001 -g 10001 data`), then `sudo docker compose up -d`. The image is
   pinned by digest in `docker-compose.yml`.
2. Check: `curl -s http://127.0.0.1:13133/` on Command Center returns healthy, and
   `ss -ltn | grep 4318` shows the receiver on the Tailscale IP (it waits for Tailscale after a reboot).
3. Confirm the port is reachable from KVM1 over Tailscale only, and not on the public interface.
4. Set `OTEL_EXPORTER_OTLP_ENDPOINT` for `omen_api` and `omen_cron` in
   `deploy/hostinger/.env.production`, redeploy.
5. Confirm spans land in `/var/lib/otelcol/traces.jsonl`, and inspect a few for privacy
   (route templates only, allowlisted attributes only).

Rollback: unset `OTEL_EXPORTER_OTLP_ENDPOINT` (or set `OTEL_ENABLED=false`) and redeploy.
