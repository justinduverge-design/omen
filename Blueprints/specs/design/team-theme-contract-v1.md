# Team Theme Contract v1 — Omen frontend

**Date:** 2026-07-10 (revised same day, pm session)
**Author:** Cowork L0 (Justin, in-session)
**Status:** Draft (pre-implementation). v1 morning draft was doctrinally out of alignment with L1 — revised in place to align with the L1 fan-experience doctrine per `Blueprints/audits/2026-07-10-frontend-doctrine-audit.md` §Conflict Resolution.
**Governs:** Which token variables may be overridden by a team skin; how deep team color goes per page family; how contrast and fallback are enforced.
**Companion:** `component-lock-v1.md` (defines the components that consume these tokens).
**Inherits from:** `slops-saloon/Direction/decisions/slops-saloon-fan-experience-doctrine-v1.md` (two-sided presence, three-room mapping, "phone puts on the uniform," data-legibility invariant) and `slops-saloon/Blueprints/specs/team-colorway-system-spec-v1.md` (per-team token contract). L1 wins on conflict.

---

## Changes from the morning draft (2026-07-10 am)

The morning draft treated team color as an accent layer only and forbade team from touching shell/surface tokens. That contradicted L1's "team color goes deep — surfaces, headers, panels take team color, not just accent lines." This revision:

- **Adopts L1's token names.** Renames `--color-team-tertiary` → `--color-team-accent`. Adds `--color-team-surface` and `--color-team-surface-card` as first-class tokens (from L1 `team-colorway-system-spec-v1.md` §2.1).
- **Moves surface tokens from deny to constrained-allow.** Team may tint `--color-bg`, `--color-surface-*`, and `--color-border-*` per the three-room depth ladder below, subject to contrast checks. Text and role tokens stay in the deny list (never overridden by team).
- **Adopts L1's three-room graduated depth model.** Owner Suite (Omen — whisper), GM Suite (Trade Analyzer — moderate), Locker Room (everything else — deepest). Same team, three different visual intensities depending on which page family the fan is on.
- **Adds a 3:1 card-vs-shell contrast requirement.** The Commanders "no white on screen" complaint is the failure of card-vs-shell differentiation, not the failure of team color at all. This rule fixes that directly.
- **Revises the fallback cascade.** Team primary → team secondary → white/black (whichever passes) → color-wheel-derived color that mathematically satisfies contrast → Omen brass as last resort.
- **Adds a per-team authored surface-mode default + a user override switch.** Each team ships with an authored light-or-dark shell default (Steelers → dark, Dolphins → light, etc.); the user can override on `/account/appearance`. Team/Omen accent stays a separate switch from light/dark.

---

## The problem in one sentence

Team-theme in the current app is overriding shell + accent tokens at the same time with just the team's primary color and no contrast guards, which is why any team with a saturated dark primary (Commanders) drowns the shell — every card and border becomes the same burgundy as the background, so the eye has no rest.

## The contract in one sentence

**Team color IS the shell in Team mode — but the shell, cards, and borders must always be visibly differentiated from each other, and text and role colors are never team-tinted.** L1 doctrine is the source of truth on team-color depth; this contract implements the legibility guards L1's corollary calls for.

---

## Terminology

- **Shell tokens** — background/surface/border tokens that define the "app chrome" a fan always sees behind content. **May be team-tinted** subject to room-mode depth + card-vs-shell contrast.
- **Accent tokens** — the tokens that drive primary buttons, selected states, focus rings, link color, small-caps eyebrow color. Aliased to team via the fallback cascade.
- **Role tokens** — semantically-loaded (risk, success, AI-signal Verdigris, data-quality). **Never team-tinted** — they must mean the same thing under every skin.
- **Team tokens** — dedicated tokens carrying the team's actual colors: `--color-team-primary`, `--color-team-secondary`, `--color-team-accent`, `--color-team-surface`, `--color-team-surface-card`. Sourced from L1 `team-colorway-system-spec-v1.md`.
- **Cultural-moment tokens** — special-variant palettes (CALLE OCHO, GO-GO BURGUNDY, HERE WE GO). Drive the same team tokens above.

---

## The three switches

Three orthogonal user-visible controls on `/account/appearance`:

### Switch A — Accent source

- `omen` — accents come from Omen's brass gold. Base brand.
- `team` — accents come from the team's palette via the fallback cascade below.

### Switch B — Surface mode

- `dark` — Omen graphite shell (raven black + charcoal ramp).
- `light` — Omen warm cream shell.
- `auto` (default) — uses the currently-selected team's **authored surface default**. Each team ships with a designer-authored light-or-dark default in team data (Steelers → dark, Dolphins → light, Commanders → dark, Packers → dark, Chiefs → light or dark per author). If Switch A is `omen`, `auto` resolves to `dark` (base Omen).

### Switch C — Team

The 32 NFL teams + Omen (which appears as `none` when Switch A is `omen`). Selecting a team populates the team tokens; the depth at which those tokens paint the shell is determined by which page family the fan is currently on (Room Mode below).

Result: nine primary combinations (three surface modes × three accent-source states — team, Omen, or team-with-omen-mode-override), all legible, none of them look like the morning draft's "wash everything one color."

---

## Room Mode — the graduated depth ladder

Per L1 `fan-experience-doctrine-v1.md` three-room mapping and `team-colorway-system-spec-v1.md` §depth-by-room, team color intensity varies per page family:

### Owner Suite (deepest signal moments — team color used sparingly)

- **Pages:** `/omen`, Omen of the Week, any future paid-recommendation surface.
- **Depth:** whisper. `--color-team-surface` remains near `--color-bg` with a whisper of tint (roughly ≤5% team-primary alpha over base). Team accent marks moments of high signal only — recommendation stripe, confidence spine, CTA. Deep charcoal (or cream, per Switch B) dominates everything else.
- **Feel:** the signet ring, not the whole suit.

### GM Suite (working surfaces — moderate team-color presence)

- **Pages:** `/trade`, `/about` (public Trade Analyzer sample), any tool-shaped page where the fan is actively transacting.
- **Depth:** medium. `--color-team-surface` gets a modest team-tint (roughly ~14% alpha). Team color appears on inputs, tabs, chip selections, active-state panel headers — present in working surfaces without swallowing them.
- **Feel:** the team's meeting room, papers on the desk are still readable.

### Locker Room (dashboard + all other pages — deepest team wash)

- **Pages:** `/football`, `/draft`, `/waiver`, `/standings`, `/ledger`, `/account/*`, `/onboarding`, `/demo`, Landing (`/`) when a team is selected.
- **Depth:** deep. `--color-team-surface` takes team color at **25–40% alpha over `--color-bg`** (L1 range confirmed 2026-07-10 pm — see verification report). Chiefs War Room ships at 25%, Eagles at 32%, Chiefs Color Rush at 35%, extreme cases up to 40%. Card fills use `--color-team-surface-card` (see contrast rule below). Header washes, chip fills, and chant frames all use team color. This is where "phone puts on the uniform" most literally applies.
- **Feel:** you are inside the room.

Alpha values above are L1 spec (`team-colorway-system-spec-v1.md` §2.3 + §7 worked examples), verified by contrast math — see `Blueprints/audits/2026-07-10-team-theme-contract-verification.md` for the per-team pass/fail table.

---

## Token allow list (team-theme MAY drive)

Team skin populates these tokens. What they resolve to at runtime depends on Switch A + B + C + Room Mode:

```
--color-team-primary                team primary hex from team data
--color-team-secondary              team secondary hex from team data
--color-team-accent                 detail-moment color (chant plaque frame, focus rings, active states);
                                    author-chosen per team from primary or secondary
--color-team-surface                room background — value = team-primary * α(room)
                                    α = ~5% Owner Suite / ~14% GM Suite / ~30–40% Locker Room
--color-team-surface-card           card fill — must pass 3:1 vs. --color-team-surface (see Contrast rule 3)
--color-bg                          ALIAS → --color-team-surface  when Switch A = team
--color-surface-1                   ALIAS → --color-team-surface-card  when Switch A = team
--color-surface-2, --color-surface-3   computed lifts of --color-surface-1 preserving the 3:1 gap
--color-border                      computed team-tinted border (typically team-primary at 60% alpha, adjusted for contrast)
--color-border-subtle               computed subtler team-tinted border
--color-accent                      via fallback cascade (see below)
--color-accent-hover                computed from --color-accent
--color-accent-muted                computed from --color-accent
--color-text-on-accent              computed to guarantee 4.5:1 against --color-accent
--color-focus-ring                  ALIAS → --color-accent
```

Cultural-moment variants (CALLE OCHO, GO-GO BURGUNDY, etc.) populate the same team tokens above from a variant palette instead of the OFFICIAL palette. Everything downstream resolves identically.

## Token deny list (team-theme MUST NEVER drive)

**Text tokens — never** (legibility floor is inviolable):
```
--color-text-primary                bone/cream body text
--color-text-secondary              muted labels
--color-text-tertiary               deep-muted meta
```

**Role tokens — never** (semantic meanings must stay stable across every skin):
```
--color-risk-low                    green
--color-risk-medium                 amber
--color-risk-high                   Deep Crimson
--color-omen                        Verdigris (AI-signal)
--color-data-live                   data status: live
--color-data-stub                   data status: stub
--color-data-mock                   data status: mock
--color-data-unavailable            data status: unavailable
--color-umber                       weathered brown-metal accent
```

**Position-brand tokens — never** (QB/RB/WR/TE/FLEX/K/DEF position chips read their own palette):
```
--color-position-qb, -rb, -wr, -te, -flex, -k, -def
```

**Platform-brand tokens — never** (Yahoo purple, Sleeper blue, ESPN red on `<PlatformBadge>` are the platform's identity, not the team's):
```
--color-platform-yahoo, -sleeper, -espn
```

---

## Contrast enforcement — three hard rules

Every team's tokens must satisfy these before being applied. The check runs at theme-resolution time (before paint), not per-frame. Fallback decisions are logged so a team's chain is auditable.

**Rule 1 — Text on shell (WCAG AA text).** `--color-text-primary` against `--color-team-surface` ≥ 4.5:1 at the room mode's target α. If the team's primary can't reach that at any α ≤ target, the team primary is **not allowed** to become `--color-team-surface`; the surface falls back (see Fallback cascade below).

**Rule 2 — Accent on shell (WCAG AA non-text UI).** `--color-accent` against `--color-team-surface` ≥ 3:1. Buttons and selected states need to be findable.

**Rule 3 — Card vs. shell (the Commanders fix).** The card must be *visibly distinct* from the shell. **Any one of three** conditions satisfies this:
- **(3a) Luminance contrast** — `--color-team-surface-card` against `--color-team-surface` ≥ 3:1, OR
- **(3b) Perceptual color distance** — CIELAB ΔE ≥ 15 between card and shell (hue does the work when luminance can't), OR
- **(3c) Visible border** — `--color-border` (or team-derived border) satisfies ≥ 3:1 against BOTH the shell AND the card fill.

Verified against L1's own worked examples (2026-07-10 pm): L1's stated 3:1 rule fails in Eagles (1.15), Cowboys (1.07), and Chiefs (1.55) examples when the card is neutral `#1C1C1E` charcoal. Hue distance (3b) rescues Cowboys (ΔE 40.8), Chiefs (ΔE 59.9), Commanders (ΔE 22.7), Dolphins (ΔE 31.9). **Packers (ΔE 7.3) and Steelers (ΔE 6.1) and Eagles (ΔE 14.6) fail all three** — those teams' `--color-team-surface-card` must be *lifted* off neutral charcoal (e.g., `#2A2A2C` or a subtle team tint) to satisfy 3a OR 3b. Contract requires at implementation time: verify all 32 teams pass at least one of 3a/3b/3c at their room-mode α; author lifted card fills for the teams that fail all three at neutral charcoal.

**Rule 4 — Role-collision (my rule; L1 corollary supports it).** `--color-accent` distance from `--color-omen` and `--color-risk-high` in Lab space ≥ 20 ΔE. If team accent is that close to a role token, users conflate meanings — the accent falls back.

---

## Fallback cascade for `--color-accent`

When the team's primary can't cleanly become `--color-accent` (fails Rule 2 or Rule 4), walk the ladder:

1. **Team primary** — pass Rules 2 + 4 → use it.
2. **Team secondary** — pass Rules 2 + 4 → use it.
3. **White (`--color-text-primary` bone/cream) or Black (`--color-bg` raven)** — whichever passes Rule 2 against the shell → use it. Not a "fallback color" — these are **real team colors** for many NFL palettes. Packers officially use white (home jersey numbers, wordmark), Steelers and Raiders officially use black (uniform trim, wordmark), Cowboys use white extensively, etc. When the cascade lands on white or black for these teams, it's authentic to their brand, not invented. **Black used sparingly** — reserved for cases where a light-tinted shell (light mode + team) makes black the natural high-contrast option, or where a team's identity is genuinely near-black (Steelers, Raiders).
4. **Color-wheel-derived color.** Compute a legible accent from color theory:
   - Take the shell hue in HSL.
   - Rotate 180° (complementary) as first guess.
   - Adjust lightness/saturation to force Rule 2 (≥ 3:1 vs. shell) and Rule 4 (≥ 20 ΔE from `--color-omen` and `--color-risk-high`).
   - If complementary can't reach both rules, try triadic (120° / 240° rotations) with the same lightness/saturation adjustment.
   - Return the resulting color. May not match any team palette. That's the intended cost — legibility wins.
5. **Omen brass (`#A67C2E`)** — absolute last resort if steps 1–4 all fail. Silent fallback to base Omen.

Fallback for `--color-team-surface` (used when Rule 1 fails) mirrors this ladder but with the target being "readable-against-text-primary" instead of "findable-against-shell." Typically only steps 1–3 are needed; step 4 rarely fires for surfaces.

The team's primary/secondary/accent/surface tokens still populate for use by team-decorative components (motif overlay, chant chip, team badge, hero flourish) even when accent has fallen back. Team is still visible in decoration; only the accent-alias falls back.

---

## Where team color IS allowed to show up

Team tokens are consumed by these components/patterns, always — regardless of accent fallback state — so long as each individual usage satisfies its local contrast constraint:

- **Team badge chip** (`<TeamBadge team="WAS" />`) — colored square, team abbrev, subtle bottom stripe. Uses `--color-team-primary` / `--color-team-secondary` directly.
- **Chant chip** (`<Chip variant="chant">HAIL VICTORY</Chip>`) — uses `--color-team-primary` for text, subtle team-tinted background.
- **Hero flourish** — a single decorative motif in `<PageHero>` (a stripe, a corner mark, or a background swash) tinted with `--color-team-primary`. Optional per-page.
- **Card accent stripe** — cards may opt-in to a 3px top or left stripe in `--color-team-primary`.
- **Motif overlay layer** (existing Phase 1.x subsystem) — SVG watermarks, patterns.
- **Shell + card fills** — via `--color-team-surface` and `--color-team-surface-card`, at the room mode's α.
- **Anywhere reading `--color-accent`** — via the cascade above.

Anything else that changes color based on team is a bug.

---

## The five stress-test teams — expected behavior under v1 (revised)

Each team should exit the contract with the same story: shell IS the team (per Room Mode depth), cards and borders stay differentiated (per Rule 3), text stays legible (per Rule 1), roles stay semantically stable, and the accent is either team-derived or a legible fallback.

**Verified 2026-07-10 pm** against real team hex values and L1 α ranges — see `Blueprints/audits/2026-07-10-team-theme-contract-verification.md` for the full math. Key deltas from the initial verdicts below:
- **Dolphins accent falls to white** at Locker Room α ≥ 0.32 (aqua and coral both fail 3:1 vs the deep aqua-tinted shell). Owner Suite / GM Suite still allow aqua.
- **Packers and Steelers cards must be lifted off neutral charcoal** (`#1C1C1E`) — their team primaries are too dark and too neutral for either luminance or hue to differentiate. Recommend `#2A2A2C` card fill or a subtle team-tinted card.
- **Chiefs accent = gold at Locker Room α** (red primary fails 3:1 vs deep-red shell; gold secondary passes 5.4:1).
- **Commanders passes cleanly at all room modes** — the "no white on screen" fix works: shell is deep burgundy, card is charcoal, ΔE 22.7 passes hue-distance, accent is Commanders gold at 9.7:1.

### Washington Commanders (dark burgundy `#5A1414` primary + gold `#FFB612` secondary)

- Authored surface default: `dark`.
- Locker Room shell: dark graphite base + burgundy at ~35% alpha → deep-burgundy shell that still lets bone-white text pass 4.5:1.
- `--color-team-surface-card`: lightened burgundy chosen to pass 3:1 vs. the shell. **The Commanders "no white on screen" complaint is fixed here** — the card sits visibly on top of the shell.
- Accent cascade: burgundy vs. shell → Rule 2 marginal, likely fails findability → fall to team secondary gold `#FFB612` → passes Rules 2 + 4 → accent = gold.
- Team badge WAS: burgundy square, gold text, tan stripe.
- Chant chip `HAIL VICTORY`: burgundy text on subtle burgundy-tinted bg.
- Verdict: **passes.** Shell IS Commanders. Cards are visible. Accent is Commanders gold (their real second color). No wash-out.

### Miami Dolphins (aqua `#008E97` primary + coral orange `#FC4C02` secondary)

- Authored surface default: `light` (the Miami sun logic).
- Locker Room shell: warm cream base + aqua at ~30% alpha → light aqua-tinted shell.
- `--color-team-surface-card`: lighter aqua chosen to pass 3:1 vs. shell.
- Accent cascade: aqua vs. cream shell → Rule 2 passes → Rule 4 (aqua vs. Verdigris) marginal → likely allowed with the additional rule "AI-signal moments must include the icon + text label, not color alone." Fall to coral orange if the collision is too close.
- Team badge MIA: aqua square, orange stripe.
- Chant chips `FINS UP` / `THE 305`: aqua on aqua-tinted bg.
- CALLE OCHO variant: coral orange drives team-primary; whole shell warms to a coral-tinted cream.
- Verdict: **passes with the AI-signal-label rule.**

### Green Bay Packers (dark green `#203731` primary + yellow gold `#FFB612` secondary)

- Authored surface default: `dark`.
- Locker Room shell: dark graphite + Packers green at ~35% alpha → deep-forest shell.
- Accent cascade: Packers green vs. shell → Rule 2 low (dark on dark) → fall to team secondary gold → passes Rule 2 → Rule 4: Packers gold vs. Omen brass (identical hue, near-identical lightness) → **collision**, likely fails ≥ 20 ΔE → fall to white as accent (Rule 3 fallback tier) → passes.
- Team identity carried by shell tint (deep forest) + team badge + hero flourish. Accent is white/monochrome, which reads sharp on green.
- Verdict: **passes.** Distinct from base Omen even though secondary collides — the shell tint plus white accent creates a distinct feel.

### Kansas City Chiefs (bright red `#E31837` primary + gold `#FFB81C` secondary)

- Authored surface default: `light` (or `dark` — designer call; Chiefs work in both).
- Assume `light` for this analysis. Locker Room shell: warm cream + red at ~30% alpha → warm red-tinted shell.
- `--color-team-surface-card`: lighter red chosen to pass 3:1 vs. shell.
- Accent cascade: bright red vs. cream shell → Rule 2 passes easily → Rule 4: bright red vs. Deep Crimson (risk-high) → distance ~22 ΔE at the boundary → allowed with additional rule "risk indicators must co-render with warning icon + text so brand doesn't collapse into meaning."
- Team badge KC: red square, gold stripe.
- Chant chip: red text on tinted bg.
- Verdict: **passes with the risk-label rule.**

### Pittsburgh Steelers (near-black `#101820` primary + yellow gold `#FFB612` secondary)

- Authored surface default: `dark`.
- Locker Room shell: dark graphite + Steelers black at any α → nearly indistinguishable from base `--color-bg`. Shell is intentionally near-monochrome.
- `--color-team-surface-card`: authored slightly lifted (e.g., `#1A2028`) to pass 3:1 vs. shell — cards visible, shell stays "Steelers."
- Accent cascade: Steelers black vs. shell → Rule 2 fails (black on black) → fall to team secondary gold → same collision with Omen brass as Packers → fall to white → passes.
- Team identity carried by shell tint + Steelers hypocycloids motif overlay + chant chip `HERE WE GO`.
- Verdict: **passes.** Intentional near-monochrome team lands as intended.

---

## What `frontend/src/index.css` needs to change (Codex prompt guidance)

At implementation time:

1. **Introduce the new tokens.** `--color-team-primary`, `--color-team-secondary`, `--color-team-accent`, `--color-team-surface`, `--color-team-surface-card`, `--color-text-on-accent`, `--color-focus-ring`. Retire `--color-team-tertiary` if it exists.
2. **Refactor the team-theme override block** to only touch allow-list tokens, and to route surface aliasing through the room-mode depth ladder. Delete anywhere text, role, position, or platform tokens are being reassigned in team CSS.
3. **Move light/dark surface tokens** under `[data-surface="light"]` / `[data-surface="dark"]` attribute selectors, distinct from any team selector. Team selection changes team tokens and (via alias) shell tokens, but doesn't decide light/dark by itself.
4. **Move accent alias** under a `[data-accent-source="team"]` / `[data-accent-source="omen"]` selector.
5. **Add the per-team `authored-surface-default`** field to `frontend/src/data/nflTeams.js` (or wherever team data lives) — one of `dark` / `light` per team.
6. **Add the room-mode class or attribute** to `<AppLayout>` / page shells: `[data-room="owner"]` / `[data-room="gm"]` / `[data-room="locker"]`. Each page declares its room mode; the CSS uses it to pick the target α for `--color-team-surface`.
7. **Add the contrast + collision check as a JS pass at theme-resolution time.** Import a small color utility (chroma-js is 30KB, or hand-roll the WCAG contrast + Lab ΔE math). Log every fallback decision.
8. **Rewrite `/account/appearance` MODE selector as three RadioCardGroups** (Switch A + B + C) rather than one three-way selector. UI copy needs matching.

Codex prompt in Phase 3 will spell this out step-by-step.

---

## Out of scope for this doc

- The specific hex values for all 32 teams — those live in `Brand/entity-identity-theming.md` and L1 `team-colorway-system-spec-v1.md`.
- The exact α values per room mode — L1 spec should own the final numbers; the ranges here are targets.
- Motif overlay geometry — separate spec, referenced here only for its color-source rule.
- Chant copy content — L1 `chant-and-fan-copy-spec-v1.md`.
- Sports/NFL trademark posture — `Blueprints/audits/2026-06-22-phase1-5g-trademark-review.md`.
