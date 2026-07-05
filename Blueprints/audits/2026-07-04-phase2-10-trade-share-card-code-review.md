# Phase 2.10 Trade Share Card - Code Review

Date: 2026-07-04
Reviewer: Codex self-review
Verdict: Mergeable after normal human review

## Findings

No P0/P1 findings found.

## Review Notes

- `TradeAnalyzer.jsx` shares the last successful analyzer payload, not the current unsent form state.
- Share creation uses the existing public `POST /api/trade/share` contract and centralized `apiFetch` JSON handling.
- The public `/trade/share/:hash` route reads the public snapshot only; it does not invoke auth-only platform routes, Supabase user data, provider adapters, or LLM narration.
- `src/server.js` injects share meta only for valid UUID v4 public share paths, then falls through to the existing SPA handler for all other paths.
- `src/services/tradeShareMeta.js` escapes meta attribute/text values before injection.
- `src/services/tradeShareOg.js` escapes SVG text and renders from the sanitized public snapshot.
- `GET /api/trade/share/:hash/og.svg` reuses the same hash validation and storage read semantics as `GET /api/trade/share/:hash`.
- Frontend helper tests pin URL mapping, title/summary text, expiry formatting, confidence display mapping, and public-snapshot labeling.

## Non-Blocking Notes

- The confidence number on the public card is a display mapping from the backend label (`low`/`medium`/`high`), not a backend-provided scalar. This is documented in `Direction/decision_log.md`.
- `npm --prefix frontend run build` still reports pre-existing warnings: unsupported `NODE_ENV=production` in `.env`, duplicate `className` in `Header.jsx`, and chunk-size warning.
- Production write-smoke for `POST /api/trade/share` was not run; this branch did not deploy.

## Evidence

- RED: focused share tests initially failed on missing frontend helper, missing meta service, and missing OG route.
- GREEN focused: `node --test test/tradeShareRoute.test.js test/tradeShareMeta.test.js test/tradeShareFrontend.test.mjs` -> 9/9.
- Full: `npm test` -> 414/414.
- Build: `npm --prefix frontend run build` -> pass with existing warnings.
- Audit: `npm audit --audit-level=moderate` -> 0 vulnerabilities.
- Whitespace: `git diff --check` -> clean.
- Browser QA: local Vite + Playwright, screenshots and `qa-summary.json` under `output/playwright/phase2-10-trade-share-card/`.
