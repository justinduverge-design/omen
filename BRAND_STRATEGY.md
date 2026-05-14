# Slops Saloon — Brand Strategy
**Status: Living Document | Phase 0 → Phase 1**
**Last Updated: 2026-05-07**

---

> ⚠️ **PRODUCTION CAUTION**
> slopssaloon.com is live and production-facing even while work is in progress.
> Do not push unreviewed changes to the frontend, backend, deploy pipeline, DNS, SSL, Stripe, auth, or database without explicit approval.
> All new features must pass the AAA Framework (Accuracy + Accessibility + Aesthetic Integrity) before shipping.

---

## 1. Brand Identity

### Name
**Slops Saloon**

### Tagline (working)
*"Where the math meets the legend."*

### Tone
- Institutional but approachable
- Confident without being arrogant
- Mythological undertones — the saloon as a gathering place, a court, a hall of records
- Data-serious, not spreadsheet-cold

### Voice Principles
- Speak plainly. No jargon without explanation.
- Be precise. Vague language erodes trust.
- Be warm. The platform exists to bring people together through sports.
- Avoid hype. The product earns attention through quality, not marketing noise.

### Visual Identity (Proposed — No Final Logo Yet)
A final logo does not exist. The following is directional for the design phase:

- **Palette direction:** Deep, rich tones — slate, amber, and off-white. Evokes a high-end venue, not a neon sports bar.
- **Typography direction:** Serif for brand/headlines (authority, legibility), sans-serif for UI (clarity, speed).
- **Motif:** The saloon as a place of decision — a table, a hand of cards, a scoreboard on the wall. Data as the house rules.
- **Feel:** Apple-level clarity meets ESPN-level authority. No clutter.

> ⚠️ Do not use placeholder logos in production. Use text-based branding until a finalized mark is approved.

---

## 2. Product Pillars

These pillars govern every feature decision. If a feature does not serve at least one pillar, it does not belong.

| # | Pillar | What It Means |
|---|--------|---------------|
| 1 | **Decision Intelligence** | Every tool helps users make a better call — who to start, who to trade, who to pick up. Data-backed, not gut-feel. |
| 2 | **Engagement** | The platform must make the game more interesting, not more complicated. Entertainment is the primary driver. |
| 3 | **Trust** | No misleading outputs. No dark patterns. No data sharing without necessity. Privacy is non-negotiable. |
| 4 | **Accessibility** | Intuitive on first use. No learning curve for core features. Familiar to anyone who has used a modern consumer app. |

---

## 3. Sitemap

### Production Routes (Current + Near-Term)

```
slopssaloon.com/
├── /                        ← Brand landing page (new frontend — Phase 1)
│   ├── Hero / value prop
│   ├── Feature overview
│   ├── Pricing tier summary
│   └── Links: Discord*, Spotify*, Apple*, RSS* (TBD placeholders)
│
├── /football                ← Legacy SSFFMVP app (preserved as-is during transition)
│   ├── Trade Analyzer
│   ├── Start/Sit Tool
│   └── [existing legacy routes]
│
├── /login                   ← Auth entry point (The Gatehouse)
├── /dashboard               ← Protected user home (The Hall of Records)
└── /api/*                   ← Backend API (Node.js, not publicly browsable)
```

> Note: `/football` preserves the legacy app without rewriting it. The new brand site lives at `/`. These must coexist without breaking either.

> Discord, Spotify, Apple Podcasts, and RSS links are TBD. Use placeholder `#` links or omit entirely until accounts are confirmed.

---

## 4. Pricing Tier Reference

Pricing is not finalized. The following is the approved conceptual structure for planning purposes only.

| Tier | Name (Working) | Price | Key Limits |
|------|----------------|-------|------------|
| Free | Saddlebag | $0 | 10 trade comparisons/day per Yahoo-authenticated account |
| Paid | [TBD] | [TBD] | Expanded comparisons, priority data, additional tools |
| Pro/League | [TBD] | [TBD] | League hosting, advanced analytics, team management |

> ⚠️ Do not implement Stripe billing changes without explicit approval. The free tier rate limit (10/day, Yahoo-auth) is locked. Paid tier details are TBD.

> Rate limiting for the free tier must be enforced server-side, tied to Yahoo OAuth identity, not just session or IP.

---

## 5. Module Architecture Concept

Slops Saloon is the first production module of Slops OS. The architecture must support future modules without requiring a rewrite.

```
Slops OS (Platform Layer)
└── Slops Saloon (Module 1 — Fantasy Sports)
    ├── Decision Engine
    │   ├── Trade Analyzer (VORP-based)
    │   ├── Start/Sit Optimizer
    │   └── Waiver Wire Intelligence
    ├── Data Layer
    │   ├── Yahoo Sports API (OAuth-authenticated)
    │   ├── Sleeper API (future — in-season pricing, with manual override fallback)
    │   └── Manual config override (for offseason / API unavailability)
    ├── Frontend (new)
    │   ├── Vite + React + Tailwind + React Router v6
    │   └── Mounted at / (brand shell) + /football (legacy)
    └── Backend (existing Node.js, Dockerized)
        ├── Auth (Yahoo OAuth)
        ├── Rate limiting (per authenticated user)
        └── Supabase database

Future Modules (Phase 3+, not in scope now):
├── Slops Finance (personal finance tools)
└── Slops Academy (family sports + academics)
```

**Clean Slate Protocol (Active):**
- Do not patch legacy code. Extract logic only. Rebuild as modular services.
- All new services must be independently deployable.

---

## 6. Roadmap

### Phase 0 — Foundation (Current)
- [x] AI Operating System artifacts created
- [x] Codex skills created and validated
- [x] Legacy PM/QA agent package removed
- [ ] BRAND_STRATEGY.md (this file) ← **in progress**
- [ ] Audit legacy SSFFMVP for reusable logic vs rebuild candidates
- [x] Retire legacy PM/QA issue cleanup path

### Phase 1 — Frontend Foundation
- [ ] Scaffold `frontend/` with Vite + React + Tailwind + React Router v6
- [ ] Brand landing page at `/` (hero, value prop, feature overview, pricing summary)
- [ ] Wire `/football` to serve legacy app without breaking it
- [ ] Auth entry point (`/login`) — no changes to existing auth logic yet
- [ ] AAA review before any page goes live

### Phase 2 — Core Engine
- [ ] Yahoo roster aggregation layer
- [ ] VORP-based player valuation system
- [ ] MVP decision engine (Start/Sit/Waiver)
- [ ] Rate limiting enforcement (10/day free tier, Yahoo-auth identity)
- [ ] Sleeper API integration (in-season pricing only, with manual override)

### Phase 3 — Production Hardening
- [ ] Replace test keys with live environment variables
- [ ] Winston/Morgan logging
- [ ] Zero Trust security review
- [ ] Paid tier Stripe integration (explicit approval required before touching)

### Phase 4+ — Platform Expansion
- [ ] League hosting features
- [ ] Personal finance module (Slops Finance)
- [ ] Family development module (Slops Academy)

---

## 7. AAA Framework Reminder

Every feature must pass all three before shipping:

| Check | Question | Fail Condition |
|-------|----------|----------------|
| **A1 — Accuracy** | Is the data correct and the output defensible? | Guessy, unvalidated, or misleading outputs |
| **A2 — Accessibility** | Is it intuitive without instruction? | User has to "figure it out" |
| **A3 — Aesthetic Integrity** | Does it feel high-end and intentional? | Rushed, cluttered, or unfinished appearance |

All three must be true. Two out of three is a fail.

---

## 8. Non-Negotiables (from Manifesto)

- No paid dependencies without CEO approval
- No placeholder features in production (hide incomplete features, never display them)
- No unnecessary data collection
- No sharing user data without explicit necessity
- No compromise on system quality
- Choose the harder right over the easier wrong

Use Claude when the task starts with:

- “Turn my thoughts into doctrine...”
- “Update the OS docs...”
- “Create an ADR...”
- “Challenge this decision...”
- “Define the product boundary...”
- “Help me decide what belongs in launch...”
- “Review this for founder drift...”

Use Codex when the task starts with:

- “Apply these documentation updates...”
- “Create these files...”
- “Run the tests...”
- “Fix the audit issue...”
- “Update the adapter...”
- “Verify the build...”