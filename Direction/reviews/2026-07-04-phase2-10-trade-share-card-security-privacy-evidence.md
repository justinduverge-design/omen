# Phase 2.10 Trade Share Card - Security/Privacy Evidence

Date: 2026-07-04
Owner: Codex
Branch: `frontend/phase2-10-trade-share-card`
Status: Local, not pushed/merged/deployed

## Scope

Build the frontend/public share surface for the already-deployed `trade-share.v1` backend contract and add a server-side OG SVG endpoint for public share cards. This pass adds no Supabase table, SQL, migration, package, env value, secret, provider integration, Stripe path, telemetry path, or production config.

## Data Boundary

- `/trade` posts only the last successful analyzer payload to `POST /api/trade/share`.
- Backend share creation still validates 1-10 players per side, caps payloads at 16 KB, rejects credential-like keys, and recomputes the public result server-side.
- `/trade/share/:hash` calls only `GET /api/trade/share/:hash`.
- `GET /api/trade/share/:hash/og.svg` reads the same public snapshot store and does not call provider adapters, Supabase user data, auth-only routes, or LLM narration.
- Share snapshots remain `is_public: true`, `source: "trade_analyzer"`, and TTL-bound by the existing backend store.

## Secrets/PII Review

- No `.env`, secret, token, ESPN cookie, Yahoo OAuth token, Sleeper credential, Vault value, Supabase key, Stripe key, or production data was read or changed.
- UI copy explicitly states that public snapshots exclude connected-platform context, ESPN cookies, tokens, and private league data.
- Error copy is generic and does not display raw backend exceptions or storage internals.
- Share URLs contain only UUID v4 hashes.

## Rendering Boundary

- `src/services/tradeShareMeta.js` escapes HTML text and attributes before injecting OG/Twitter tags.
- `src/services/tradeShareOg.js` escapes XML text before rendering SVG.
- Server meta injection only applies to valid `/trade/share/:hash` UUID paths; invalid paths fall through to the normal SPA handler.
- The OG image endpoint returns `image/svg+xml; charset=utf-8` and cache headers for the public image artifact.

## Evidence

- Focused: `node --test test/tradeShareRoute.test.js test/tradeShareMeta.test.js test/tradeShareFrontend.test.mjs` -> 9/9.
- Full: `npm test` -> 414/414.
- Frontend build: `npm --prefix frontend run build` passed. Existing warnings remain: Vite chunk size, unsupported `NODE_ENV=production` in `.env`, and pre-existing duplicate `className` in `Header.jsx`.
- Audit: `npm audit --audit-level=moderate` -> 0 vulnerabilities.
- Diff check: `git diff --check` clean.
- Browser check: local Vite + Playwright with mocked public API responses. Final `qa-summary.json` reports zero console errors, no horizontal overflow, and no visible interactive target below 44px.
- Screenshots: `output/playwright/phase2-10-trade-share-card/`.

## Residual Risk

- Production write-smoke for `POST /api/trade/share` was not run because this branch was not deployed and production share creation writes a public snapshot.
- SVG OG cards are suitable for crawler previews that accept SVG; if a target crawler later requires PNG/JPEG, that should be a separate dependency/service decision.
