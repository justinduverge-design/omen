# Engineering Decisions

## Purpose

Shared frontend/backend engineering decisions for the active Corvus product repo.

Company-level decisions belong in the SLOPS OS layer. Division decisions belong one layer up in `..\Direction`. Corvus product decisions belong under `Direction\` unless they directly affect app contracts.

## Active Decisions

- `Blueprints\handoffs\frontend-to-backend.md` is the canonical place for Claude/frontend requests to Codex/backend.
- `Blueprints\handoffs\backend-to-frontend.md` is the canonical place for Codex/backend contract responses to Claude/frontend.
- `Blueprints\handoffs\decisions.md` is the canonical shared engineering decision log for active app coordination.
- The canonical Corvus repo path is `<active-git-root>/slops-saloon/corvus/`.
- The nested `Corvus/` folder is retired and must not be recreated.
- Corvus is the active Fantasy Football MVP product.
- Trade Analyzer is the front door.
- Draft Assistant is the preparation and seasonal tool.
- Omen of the Week / MVP Move is the main event.
- Start/Sit and waiver logic live inside Omen / MVP Move unless Justin separates them later.
- Yahoo, Sleeper, and ESPN all matter.
- ESPN is essential but risky and needs recovery playbooks.
- ESPN recovery routes through `/account` with safe state/query context only.
- ESPN league selection belongs in a full Account section for MVP, not a modal.
- Omen may preserve safe request context after ESPN recovery, but the user must click to rerun.
- `espn_import_blocked` remains the MVP user-facing state; safe backend `reason_code` values may be added later.
- Security and privacy decisions are tracked in `Blueprints\security-privacy.md`; compliance evidence is tracked in `probo.yaml`.
- Users need plain-English reasoning, not heavy math.
- Trade Analyzer Phase 1 does not ask users for Projection or Status. Corvus should infer, enrich, or label those signals during analysis rather than requiring user-entered projections/statuses.
- Tier 2 frontend default placement: Hall of Records/Move History and League Standings should start on `/football` unless Justin or Claude explicitly moves them.

## Strategic Notes

- Corvus as app template — everything built in Corvus (AppLayout, CSS token system, TeamThemeProvider, ProtectedRoute, auth flow, PlayerRow autocomplete, component library, handoff structure) is the intended template for every future SLOPS OS product. When the next product starts, Corvus is the scaffold. Do not treat Corvus patterns as one-offs — treat them as the division standard. Logged 2026-05-30.
- `/corvus` route is now the frictionless tool entry point — public, no auth, Trade Analyzer live. This is the conversion path from `slopssaloon.com` traffic. `/` is the Corvus marketing/waitlist page until a Slops Saloon division landing is built to replace it. Logged 2026-05-30.

## Open Decisions

- Whether recovery analytics ship before or after the first paid launch gate.

## Closed Decisions

- Font system locked — Alegreya Sans (`font-display` + headings/UI) + Alegreya (`font-serif` + body text) + DM Mono (`font-mono`, data/numbers). Cormorant Garamond is rejected and must not be used. Supersedes the 2026-06-02 Cormorant/Alegreya Sans pairing. Closed 2026-06-15.
- CSS token sweep complete — All hardcoded `amber-*` and `slate-*` Tailwind classes replaced with `var(--color-*)` CSS custom properties across TradeAnalyzer.jsx, DraftAssistant.jsx, Account.jsx, Football.jsx. Tokens: `--color-accent`, `--color-accent-hover`, `--color-bg`, `--color-surface-1/2/3`, `--color-border`, `--color-text-primary/secondary/tertiary`. Team theme now applies universally to all pages. Closed 2026-05-30.
- Team identity schema locked — Four atomic fields per NFL team in nflTeams.js: `cultureTag` (pill, e.g. "Chiefs Kingdom"), `cry` (chant, 65% opacity, e.g. "Never a Doubt"), `wardRoom` (statement, full weight, e.g. "Kingdom don't fold."), `lore` (optional deep-cut, 45% opacity, 5 teams only: PIT, NYG, GB, ATL, LAR). Fields intentionally split so they can be used independently across different UI contexts. Closed 2026-05-30.
- UX/UI audit pass completed — All Corvus pages audited via `/ui-ux-pro-max`. All five audit findings converted to Tracks A, B, C and shipped (commits `31a308e`, `385dbb4`, `d16c48b`). No pages have outstanding audit-flagged issues from this pass. Closed 2026-05-30.
- Trade Analyzer form rework approved — Position-first row layout + player name autocomplete using `searchPlayers(position, query)` from `nflPlayers.js`. Phase 1 is frontend-only, no backend dependency. User-facing row fields are Position and Name only, plus icon-only remove; Projection and Status are intentionally Corvus-owned analysis/enrichment signals rather than user input. Closed 2026-06-01.

- Account page ESPN recovery handling — Account.jsx now reads `?recovery=<state>` via `useSearchParams` and passes `recoveryState` to `PlatformConnections`. ESPN CTA in Omen uses safe query params (`platform=espn&recovery=<state>`). `VITE_ESPN_ENABLED` gate is bypassed when arriving from an ESPN recovery state. Closed 2026-05-23.
- Apple sign-in permanently disabled — Apple Developer account costs money. Button removed from Login.jsx. Will not return unless Justin explicitly approves purchasing an Apple Developer account. Closed 2026-05-28.
- Google OAuth provider configured — Supabase Site URL set to `https://slopssaloon.com`; `https://xyudxfhqejbwvjngiwhw.supabase.co/auth/v1/callback` added to Google Cloud Console Authorized redirect URIs. Closed 2026-05-28.
- Discord OAuth provider configured — `https://xyudxfhqejbwvjngiwhw.supabase.co/auth/v1/callback` added to Discord Developer Portal; credentials entered in Supabase Auth dashboard. Closed 2026-05-28.
- Post-login default destination changed to `/account` — `nextUrl.js` `consumeNextUrl()` default was `'/'`; changed to `'/account'`. `/account` also added to ALLOWED_DESTINATIONS. Prevents login appearing to "just refresh" when no `next` param is set. Closed 2026-05-28.
- UX/UI audit gating rule — `/ui-ux-pro-max-skill` must be run on any page before new feature code is written for that page. Rule is in effect as of 2026-05-28. Seven audit gaps documented at `slops-saloon/Blueprints/handoffs/corvus-features-ux-roadmap.md`. Fixes require Justin approval before application.
- Tier 2 frontend complete — All five Tier 2 features built and deployed in PR #22 (run `26833528435`): `Account.jsx` calls `GET /api/stripe/prices` for live pricing; `OmenFeedback.jsx` calls real `POST /api/omen/feedback`; `App.jsx` hydrates team theme from `summary.user.favorite_team` on sign-in; `MoveHistory.jsx` wired to `GET /api/moves` on Football "History" tab; `LeagueStandings.jsx` wired to `GET /api/league/standings` above the tab bar. Closed 2026-06-02.
