# Engineering Decisions

## Purpose

Shared frontend/backend engineering decisions for the active Corvus product repo.

Company-level decisions belong in the SLOPS OS layer. Division decisions belong one layer up in `..\Direction`. Corvus product decisions belong under `Direction\` unless they directly affect app contracts.

## Active Decisions

- `Blueprints\handoffs\frontend-to-backend.md` is the canonical place for Claude/frontend requests to Codex/backend.
- `Blueprints\handoffs\backend-to-frontend.md` is the canonical place for Codex/backend contract responses to Claude/frontend.
- `Blueprints\handoffs\decisions.md` is the canonical shared engineering decision log for active app coordination.
- The canonical Corvus repo path is `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`.
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

## Open Decisions

- Whether recovery analytics ship before or after the first paid launch gate.

## Closed Decisions

- Account page ESPN recovery handling — Account.jsx now reads `?recovery=<state>` via `useSearchParams` and passes `recoveryState` to `PlatformConnections`. ESPN CTA in Omen uses safe query params (`platform=espn&recovery=<state>`). `VITE_ESPN_ENABLED` gate is bypassed when arriving from an ESPN recovery state. Closed 2026-05-23.
- Apple sign-in permanently disabled — Apple Developer account costs money. Button removed from Login.jsx. Will not return unless Justin explicitly approves purchasing an Apple Developer account. Closed 2026-05-28.
- Google OAuth provider configured — Supabase Site URL set to `https://slopssaloon.com`; `https://xyudxfhqejbwvjngiwhw.supabase.co/auth/v1/callback` added to Google Cloud Console Authorized redirect URIs. Closed 2026-05-28.
- Discord OAuth provider configured — `https://xyudxfhqejbwvjngiwhw.supabase.co/auth/v1/callback` added to Discord Developer Portal; credentials entered in Supabase Auth dashboard. Closed 2026-05-28.
- Post-login default destination changed to `/account` — `nextUrl.js` `consumeNextUrl()` default was `'/'`; changed to `'/account'`. `/account` also added to ALLOWED_DESTINATIONS. Prevents login appearing to "just refresh" when no `next` param is set. Closed 2026-05-28.
- UX/UI audit gating rule — `/ui-ux-pro-max-skill` must be run on any page before new feature code is written for that page. Rule is in effect as of 2026-05-28. Seven audit gaps documented at `slops-saloon/Blueprints/handoffs/corvus-features-ux-roadmap.md`. Fixes require Justin approval before application.
