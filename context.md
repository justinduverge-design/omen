# Omen Root Context

## Purpose

This is the product-layer context entry point for Omen.

Read it before opening app source, native code, backend routes, frontend files,
tests, SQL, deployment files, or product handoffs.

> **Rewritten 2026-08-05.** The previous version was a 2026-06-02 snapshot. It
> gave a `OneDrive\Desktop\...\corvus` path that no longer exists, cited PR #22
> as the resume point (main is at #272), reported 240/240 tests (now 506/506),
> and documented live Stripe pricing endpoints and "subscribed users" gating —
> all of which were removed from Omen on 2026-07-12. Any agent that read it got
> a materially false picture of the product.

## What Omen Is

**Omen is a mobile app** — iPhone (SwiftUI) and Android (Kotlin + Jetpack
Compose) — that also has a web app. The web app is secondary and is **not** the
beta surface. New web page migrations are paused under the native pivot override.

Omen is a fantasy football decision tool: Start/Sit, waiver, and trade
recommendations across Yahoo, Sleeper, and ESPN.

**Omen is free indefinitely.** There is no billing, subscription, or paywall.

## Canonical Path

```text
C:\Users\JDuve\dev\SLOPS\slops-saloon\omen
```

Layer 2 in DBS numbering; the third SLOPS layer in plain English. Parent layers:
`C:\Users\JDuve\dev\SLOPS` (L0) and `C:\Users\JDuve\dev\SLOPS\slops-saloon` (L1).

## Current Truth — 2026-08-05

- Native apps are the gating surface: **79 Swift files, 88 Kotlin files** —
  design systems, auth, session, and app shell on both platforms.
- Backend is deployed and healthy on **Hostinger KVM1** (`/opt/omen/deploy/hostinger`),
  containers `omen_api` and `omen_cron`. Health reports `service: omen-api`.
- **Backend tests: 506/506 green** (`npm test`, 2026-08-02). PRs gated by `pr-quality.yml`.
- `npm audit --omit=dev`: 0 production vulnerabilities.
- **Stripe is fully removed** — code, `/api/stripe/*` routes, `requireSubscription`
  middleware, `subscriptions` table, and `users.is_subscribed` column. Any doc
  describing Stripe endpoints or subscriber gating is historical.
- `POST /api/omen/mvp-move` is the only canonical recommendation route.
  `POST /api/optimizer/mvp-move` is retired.
- Yahoo, Sleeper, and ESPN adapters are live. **None are provider-proven** with
  real connected accounts yet — that is the top beta gate.
- Legal, privacy routes (`/api/user`), and in-app account deletion are shipped.
  Account deletion is an Apple App Store requirement, already satisfied.
- Supabase auth providers enabled: Email, Google, Apple, Discord, Passkeys.
- Tuesday scoring is on an explicit **safety hold** (`OMEN_CRON_SCORING_ENABLED=false`
  and `CORVUS_CRON_SCORING_ENABLED=false`, verified in the recreated `omen_cron`
  container 2026-08-26). The hold followed proof that live recommendation and
  feedback writes omitted the post-A6 contract marker and could grade Standard or
  Half-PPR leagues through the historical PPR fallback. Keep scoring disabled until
  the A6 persistence repair is merged/deployed and new production rows prove the
  marker/coverage fields; A4 also still owes O2's rollback exercise.

## Scope Decisions — 2026-08-05

- **Draft Assistant is cut from 1.0.** It ships 2027 on a Slops-built ADP.
  Remove it from store metadata, onboarding copy, and marketing claims. Docs
  that list it as a live launch feature are stale.
- **Both platforms ship the beta together.**
- Apple Developer Program is enrolled; the account transfer to Valor Ventures is
  in progress. Store provisioning is the current critical path.

## Where To Go Next

| You need | Read |
|---|---|
| Scope and sequence to launch | `Direction/omen-1.0-plan.md` |
| What is verified vs required | `Direction/release_readiness.md` |
| The active work queue | `Direction/current_sprint.md` |
| Standing constraints | `Direction/facts-of-record.md` |
| Native mobile specs | the native mobile read gate in `CLAUDE.md` |
| Navigation map | `DBS_INDEX.md` |

Runtime entry points: `CLAUDE.md` (Claude), `AGENT.md` (Codex), `AGENTS.md` (shared posture).

## Safety Boundary

Do not edit `.env`, secrets, keys, cookies, DNS, SSL, Nginx, Supabase migrations,
package files, Docker/deploy config, production infrastructure, `.git`, or
`node_modules` without explicit Justin approval.

Store items are founder-gated: Apple/Google accounts, signing, provisioning,
release configuration, and metadata submission. Provider client secrets stay in
Supabase Studio.
