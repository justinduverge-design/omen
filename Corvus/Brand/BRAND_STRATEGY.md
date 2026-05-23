# Corvus — Brand Strategy
**Status: Living Document | Phase 0 → Phase 1**
**Last Updated: 2026-05-15**

---

> ⚠️ **PRODUCTION CAUTION**
> slopssaloon.com is live and production-facing even while work is in progress.
> Do not push unreviewed changes to the frontend, backend, deploy pipeline, DNS, SSL, Stripe, auth, or database without explicit approval.
> All new features must pass the AAA Framework (Accuracy + Accessibility + Aesthetic Integrity) before shipping.

---

## 1. Brand Identity

### Name
**Corvus**

Corvus is the first product inside the Slops Saloon ecosystem.

**Slops Saloon** is the parent company, mission, and long-term product studio. It is not a former name — it is the umbrella. `slopssaloon.com` is the parent domain and will eventually serve the Slops Saloon company landing page.

**Corvus** is the fantasy football intelligence product. It lives at `slopssaloon.com/corvus`. Future products (fantasy basketball, fantasy baseball, financial tools, mobile apps) will live under Slops Saloon alongside Corvus.

### Tagline

> Deus pascit corvos.

Do not rename routes, repos, packages, database fields, env vars, production domains, or deployment config until Justin approves a separate migration plan.

### Legacy Tagline
*"Where the math meets the legend."*

### Tone
- Institutional but approachable
- Confident without being arrogant
- Mythological undertones — raven, omen, oracle, high vantage point, judgment
- Data-serious, not spreadsheet-cold

### Voice Principles
- Speak plainly. No jargon without explanation.
- Be precise. Vague language erodes trust.
- Be warm. The platform exists to bring people together through sports.
- Avoid hype. The product earns attention through quality, not marketing noise.

### Visual Identity
Justin prefers the stronger local `client/` / `localhost:3000` visual direction over the current canonical `frontend/` landing page and the live site. Use that prototype as the reference for mood, scale, and first impression.

- **Palette direction:** Raven black, charcoal, bone white, antique gold, deep crimson, and electric violet. Premium sports intelligence, not a neon sports bar.
- **Typography direction:** Serif for brand/headlines (authority, legibility), sans-serif for UI (clarity, speed).
- **Motif:** Raven/oracle/omen, constellation intelligence, war-room judgment.
- **Feel:** Dark, strategic, observant, premium, and presentation-worthy. No clutter.

> ⚠️ Do not copy prototype claims that are not production-true. The visual language can move into `frontend/`, but claims about live agents, proven results, self-improving loops, or paid outcomes must remain accurate.

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

**Target architecture (not yet deployed):**

```
slopssaloon.com/
├── /                        ← Slops Saloon parent landing (company/mission/ecosystem)
│   └── Links out to Corvus and future products
│
├── /corvus                  ← Corvus product landing + app entry point
│   ├── Hero / coming-soon (current interim state)
│   ├── Trade Analyzer (free, no auth)
│   ├── /corvus/account      ← Platform connection management
│   └── /corvus/football     ← (future alias, or redirect from /football)
│
├── /football                ← Legacy route — preserved during transition; eventually redirects to /corvus
├── /login                   ← Auth entry point (The Gatehouse)
├── /dashboard               ← Protected user home (The Hall of Records)
└── /api/*                   ← Backend API (Node.js, not publicly browsable)
```

**Current interim state:** `/` currently serves the Corvus coming-soon page. This is acceptable as a short-term placeholder while the Slops Saloon parent landing page is designed. The target state is `/` = Slops Saloon, `/corvus` = Corvus product.

> Do not move `/football` to `/corvus` in production until the parent landing at `/` is ready. Both must coexist without breaking either.

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

Corvus is the first production module of Slops OS. The architecture must support future modules without requiring a rewrite.

```
Slops OS (Platform Layer)
└── Corvus (Module 1 — Fantasy Sports)
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
