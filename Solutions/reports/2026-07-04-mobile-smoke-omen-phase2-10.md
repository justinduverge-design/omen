# Mobile Smoke - Phase 2.10 Trade Share Card

Date: 2026-07-04
Runner: Codex + Playwright
Target: local Vite dev server, mocked public API responses

## Scope

Checked the public Trade Share card and the mobile Trade Analyzer share flow. No production service, credentials, provider data, Supabase data, Redis data, or secrets were used.

## Viewports

| Scenario | Viewport | Result |
| --- | --- | --- |
| `/trade/share/:hash` light | 390x844 | Pass |
| `/trade/share/:hash` desktop light | 1440x1000 | Pass |
| `/trade/share/:hash` desktop dark | 1440x1000 | Pass |
| `/trade` compare/share flow light | 390x900 | Pass |

## Checks

- No horizontal overflow in any scenario.
- No console errors in the final run.
- Smallest visible interactive target was 44x44.
- Public share privacy copy rendered on the card.
- Mobile share flow generated the expected public link.

## Evidence

- `output/playwright/phase2-10-trade-share-card/qa-summary.json`
- `output/playwright/phase2-10-trade-share-card/share-mobile-light.png`
- `output/playwright/phase2-10-trade-share-card/trade-mobile-share-flow.png`

## Notes

The browser run mocked `/api/trade/share/:hash`, `/api/trade/compare`, `/api/trade/share`, and the shared chrome `/api/dashboard/summary` request so local QA would not depend on a backend server or Redis.
