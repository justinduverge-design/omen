# App-Wide UX/UI Audit — Omen frontend

**Date:** 2026-07-10
**Author:** Cowork L0 (Justin, in-session)
**Purpose:** Ground-truth the state of the Omen frontend before locking a component system. Confirm or refute the hypothesis that the "everything is one color per skin" problem (Commanders drowning in burgundy, Dolphins washing everything teal) is a token-contract violation and not a base-component problem.
**Scope:** `frontend/` on `main` at commit `2641e4b`, browsed at `http://localhost:5173/` in Chrome. Prod (`https://slopssaloon.com/`) spot-checked on the Landing page only.
**Method:** Chrome walkthrough of every top-level route registered in `frontend/src/routes/AppRoutes.jsx`. Six-system drift checklist per page. Team-theme stress test by switching MODE and TEAM on `/account/appearance` and re-shooting the same product pages under each combination.
**Skinnage during walkthrough:** session cookie had TEAM mode + Miami Dolphins active. Baseline captures re-shot after switching to OMEN mode. Team stress test re-shot under Washington Commanders.

---

## TL;DR

1. **The single biggest problem is the team-theme override contract, not the components.** When TEAM mode is active, the team primary color is being applied to `--color-bg`, `--color-surface-1..3`, `--color-border-*`, AND `--color-accent` simultaneously. The user's "no white on the screen with Commanders" complaint is the accurate symptom of that contract. Same bug drives Dolphins washing every product page teal.
2. **MODE conflates two orthogonal concerns.** `System / Team / Omen` currently bundles *color-theme* and *light-vs-dark surface* into one switch. Omen mode = dark shell + brass accent. Team mode = light shell + team accent. These need to separate: light/dark is a shell decision, team-vs-Omen is an accent decision.
3. **There are two segmented-control patterns in production** (filled-pill on `/trade`, `/about`, `/draft`; underline-tab on `/football`), plus a third *card-radio* variant on `/account/appearance`. Nothing enforces one.
4. **The "canonical page hero" pattern (`SMALL-CAPS TEAL LABEL / BIG BLACK SERIF TITLE / GRAY SUBTITLE`) is used loosely on most product pages** and completely skipped on `/waiver`. That's the closest thing to a working design pattern and it should be lifted into the lock as canonical.
5. **The Landing hero on local is glitching** (letters missing mid-render). Prod is clean. Either a recent regression or a load-in animation that hasn't finished at 1s — either way it's a real UX concern.

Sections 3–7 back these claims with evidence.

---

## Environments and screenshots captured

| Env | URL | Skin | Pages captured |
|---|---|---|---|
| Local | `http://localhost:5173` | Dolphins (session default) | `/`, `/about`, `/login`→`/account`, `/demo`, `/omen`, `/trade`, `/draft`, `/football`, `/ledger`, `/standings`, `/waiver`, `/account/connect`, `/onboarding`, `/account/appearance` |
| Local | same | Omen mode (baseline) | `/account/appearance`, `/trade`, `/omen` |
| Local | same | Washington Commanders | `/account/appearance`, `/trade`, `/omen` |
| Prod | `https://slopssaloon.com` | (public, no skin) | `/` |

Screenshot IDs are recorded in the session log; images are not persisted to disk. Where a specific finding depends on a shot, the shot ID is inlined.

---

## Six-system drift matrix

Rows are pages, columns are the six systems the user wants to lock. Cell values name the *variant in use on that page*, so drift is visible at a glance.

| Page | Button | Input | Segmented | Card | Type | Spacing |
|---|---|---|---|---|---|---|
| `/` (Landing, dark) | (a) gold filled pill · (b) gold outline pill · (c) bordered "Sign in →" text pseudo-button · (d) plain small-caps text nav | one email textbox, translucent | radio-as-pills (ESPN / Yahoo / Sleeper / Not sure yet) | dark charcoal Trade Analyzer preview + inner three-up split card | display serif (glitching) + sans body + small-caps eyebrow | tight vertical rhythm, hero + card two-column |
| `/about` (Trade Analyzer public) | teal filled "Compare Trade" | text field for player name | filled-pill (PPR / Half PPR / Standard) + filled-pill (Two-team / Multi-team) | cream card `Send` + cream card `Receive` with inner Position/Name grid, position chips colored per position | small-caps teal label + BIG SERIF headline (still glitching) + gray sub | wider column rhythm than `/`, footer separator |
| `/login`→`/account` | (a) purple filled `Connect Yahoo` (b) blue filled `Connect Sleeper` (c) red filled `Connect ESPN` — one per platform brand · (d) outlined pill `Customize Team Colors ›` | none visible | none | 3-row "Platform Connections" list card + APPEARANCE section card | canonical hero (SMALL-CAPS TEAL / SERIF `Account` / gray sub) | canonical |
| `/demo` | teal filled `Connect a league` + outlined `Back to home` | none | none | (a) info card `DEMO MODE` (subtle border, faded fill) · (b) error card `Demo Mode is temporarily unavailable` (pink fill) — with a disabled/gray retry button · (c) CTA card `READY FOR THE REAL CALL?` | canonical hero | canonical |
| `/omen` (Omen of the Week) | error-card `Try again` (looks disabled/faded pink) | none | none | error card (pink fill) with same disabled retry treatment as `/demo` | canonical hero + additional chant chip `FINS UP` under label | canonical |
| `/trade` (protected Trade Analyzer) | (a) teal filled `Compare Trade` (smaller than `/about`) · (b) outlined `Add` in card headers · (c) icon `×` remove | text fields for player names | filled-pill (PPR / Half PPR / Standard) + filled-pill (Two-team / Multi-team) — **matches `/about` visually but wrapped in a bordered card group** | (a) SCORING/DEAL SHAPE card (outer chrome) · (b) Send/Receive with inner Position picker · (c) sidebar `OMEN · STRATEGY / Trade Room` bullet card · (d) sidebar `MOCK · BUY LOW / Targets` list card | no page hero (headerless layout) | canonical |
| `/draft` (Draft Assistant) | teal filled `Get Recommendation` | two number inputs `Draft Position 1-12`, `Current Round 1-15` | (a) filled-pill (PPR / Half PPR / Standard) — **but pills here have visible outlines when unselected**, unlike `/trade` and `/about` · (b) position chips w/ uniform outline (all same width, no per-position colored fill — differs from `/trade`) | one big form card | canonical hero + additional chant chip · **preview-mode gold pill banner at top** | canonical |
| `/football` (Hall of Records) | error-card `Try again →` link + `Add` outline | none | (a) **underline tab nav** `Trade Analyzer / Omen of the Week / Draft Assistant / History` — DIFFERENT PATTERN from filled-pill · (b) filled-pill PPR/HP/Std below that | (a) collapsed section header card `LEAGUE STANDINGS` with chevron · (b) error content · (c) embedded Trade Analyzer card · (d) sidebar cards | canonical hero + extra outlined chip `THE 305` next to label | canonical |
| `/ledger` | teal text-link `Try again →` | none | none | **dashed-outline empty-state card** (new variant) | canonical hero, no chant chip | canonical |
| `/standings` | teal text-link `Try again →` | none | none | dashed-outline empty-state card (matches `/ledger`) | canonical hero + italic chant text `305 never sleeps.` inline in the sub | canonical |
| `/waiver` | teal filled `Get Picks` | one number input `Current` (Week) | none | none | **no page hero at all** — just a floating field + button | broken rhythm — no title, no context, no chrome |
| `/account/connect` | (a) muted blue disabled `Find My Leagues` · (b) purple `Connect Yahoo` · (c) filled teal `Chrome or Edge`, outline `Firefox`, outline `Safari` inside a nested card | Sleeper username textbox | filled-pill (Chrome or Edge / Firefox / Safari) — a fourth appearance of the filled-pill pattern | Sleeper/Yahoo/ESPN cards, plus nested "HOW TO FIND YOUR ESPN COOKIES" card | canonical hero (`STEP 2 OF 2 / Connect Your League`) | canonical |
| `/onboarding` | duplicates `/football` visually (rendered dashboard) | — | — | — | — | — |
| `/account/appearance` | (a) **card-radio** mode selector (System / Team / Omen — a third segmented pattern) · (b) `Show all 32 teams →` text-link · (c) filled-pill `OFFICIAL / CALLE OCHO` variant toggle — a fourth segmented pattern | none | three coexisting patterns on one page: card-radio (MODE), color-tile grid (TEAM), filled-pill (VARIANT) | LIVE PREVIEW card w/ preview label chip, subtle border, big serif title, body, CTA | canonical hero | canonical |

**Reading the matrix:** the closest thing to a canonical pattern is the *product page hero* (small-caps eyebrow + big black serif + gray sub) plus the *filled-pill segmented control* — but neither is enforced. Buttons alone have at least seven distinct treatments across pages. Cards have at least six variants. Segmented controls have four different patterns coexisting.

---

## Team-theme diagnosis (the token contract bug)

### What the code intends

`Blueprints/specs/omen-ux-ui-design-system-v1.md` (v2-reconciled) defines dark-mode tokens including:

```
--color-bg              #0A0A0B  raven black
--color-surface-1..3    charcoal ramp
--color-border          neutral gray ramp
--color-text-primary    #F5F0E8  bone white
--color-accent          #A67C2E  aged brass
--color-omen            #2F7D5B  verdigris (AI signal)
```

The intent is that team-theming acts as an accent layer over a neutral shell. The words "team-theme" appear as a Phase 1.x addition indexed inline.

### What the code actually does (observed)

Switching MODE to `Team` on `/account/appearance` and selecting Washington Commanders produces this state on `/trade` and `/omen`:

- `--color-bg` → dark burgundy (Commanders primary)
- `--color-surface-1..3` → burgundy ramp
- `--color-border-*` → burgundy variants
- `--color-accent` → Commanders gold (secondary)
- `--color-text-primary` → bone/cream (unchanged, still legible against burgundy)
- Position chips (RB / WR / TE / QB / FLEX / K / DEF) → **unchanged** — they read position-brand tokens that team-theme is not touching. This is the exact right behavior. Position chips are the reference implementation for what accent should do.

Result on screen: **there is not a single neutral surface anywhere on the app.** Every card, every input background, every panel is burgundy. The gold accent has good contrast against burgundy so buttons are still readable, but the app has no visual rest — every pixel that isn't a position chip is either burgundy or gold.

Switching MODE to `Omen` on the same session flips the same tokens back to their canonical values. Same code paths, same components — the difference is entirely token override. **This proves the drift is in the token contract, not in the components.**

### The three failure modes exposed by the stress-test set

| Team | Palette | Failure mode |
|---|---|---|
| Washington Commanders | dark burgundy + gold | **Shell drowning**: primary is dark and matte, applied to bg/surface/border it creates a lightless single-color environment. Accent (gold) survives because it's high-luminance against burgundy but everything else is drowning. Reported by user. Reproduced. |
| Miami Dolphins | aqua + orange | **Accent hijack**: primary is bright teal, applied to `--color-accent` it collides with `--color-omen` (Verdigris, the AI-signal token). Every selected pill, every CTA looks like an AI-signal state. The user can't tell "this is my team color" from "this is Omen saying something." |
| Green Bay Packers | dark green + gold | **Brand-identity collapse** (predicted, not shot): Packers primary is near-identical hue to Omen's `--color-omen` Verdigris + Aged Brass accent. Team skin becomes indistinguishable from base Omen brand. Failure is subtler than Commanders but real — the whole point of team-theming is that the team feels present. |
| Kansas City Chiefs | bright red + gold | **Risk-color collision** (predicted): primary (`#E31837`) collides with `--color-risk-high` (`#7E1717` Deep Crimson). Selected states, CTAs, and "this is your team" chrome all become the same color the app uses to signal *risk*. Users conflate "your team" with "danger." |
| Pittsburgh Steelers | black + yellow | **Neutral-collapse** (predicted): primary is nearly the same as `--color-bg`. Shell doesn't visibly change from Omen default. Team feels absent — no visible presence at all. Opposite failure of Commanders — user picked their team, sees nothing. |

Every failure mode above traces to the same root: **team-theme is allowed to override tokens it should not be allowed to override.**

### What the contract needs to enforce

Two rules, in order of importance:

1. **The shell stays neutral.** `--color-bg`, `--color-surface-1..3`, `--color-border`, `--color-border-subtle`, `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary` are OFF-LIMITS to team-theme. Ever. These come from the Omen shell (dark or light — see rule below).
2. **Team color is an accent-layer only, and lives in dedicated team tokens.** New tokens: `--color-team-primary`, `--color-team-secondary`. These drive team chrome (badge stripes, chant chips, hero-flourish, motif overlays). `--color-accent` optionally *aliases* to `--color-team-primary` when TEAM mode is on, but only after a contrast check against `--color-bg`; if contrast fails, alias to `--color-team-secondary` instead. If both fail, fall back to Omen brass.

The MODE selector also needs to separate: **light/dark is orthogonal to team/Omen accent.** Right now they ride the same switch. The doctrine should separate them.

---

## Regressions and other bugs found

1. **Landing hero glitching on local, clean on prod.** Local hero renders as "So......ll / before......n" at 1s after nav — clearly the letters "See the result / before it happens." with several glyphs unrendered. Prod renders the full string cleanly. Either (a) a load-in animation with per-letter reveal that is too slow to have finished at 1s (a real UX concern — perceived load) or (b) a font-loading regression introduced on `main` since the last prod deploy. Needs isolation before ship.
2. **Multiple recovery-affordance treatments.** `Try again` appears as (a) faded pink pill button inside error card on `/omen` and `/demo`, (b) teal text-link on `/football`, `/ledger`, `/standings`. Users get a different mental model of "is this a button I press or a link I click" depending on which page.
3. **Empty state and error state don't share chrome.** `/ledger` and `/standings` use a *dashed-outline neutral card*. `/omen` and `/demo` use a *pink/red error card*. Both are conceptually "we can't show you data right now" but they use disjoint visual grammars. Compound the recovery-affordance drift above and users have no consistent read on "loading failed here."
4. **`/waiver` has no page hero.** No small-caps eyebrow, no serif title, no sub. Compare to every other product page which follows the canonical hero pattern. Blank slate that shouldn't be.
5. **Header treatments split three ways.** Landing shows the OMEN wordmark + text nav (`JOIN WAITLIST` / `SIGN IN →`). `/about` shows wordmark + a `← SLOPS SALOON` back link. Product pages show hamburger + shield-only, no wordmark. Three different top chromes for a single-brand product.
6. **Duplicate 500 error banners.** `/login`→`/account` shows "Request failed: 500" against the `Platform Connections` card. `/omen` shows "Failed to load Omen of the Week / Request failed: 500". `/demo` shows "Demo Mode is temporarily unavailable / Request Failed: 500". Multiple backend endpoints are 500ing locally right now — unrelated to the design audit but worth flagging.
7. **`/onboarding` visually equals `/football`.** Route protection or completion state is bouncing `/onboarding` to the dashboard for the current session. Not a design drift per se but suggests the onboarding UX itself is unreachable to me here.

---

## Env delta (local vs prod)

Only Landing (`/`) was captured on both env because everything else is protected. Findings:

- **Prod Landing** renders the hero string cleanly: `See the result / before it happens.`
- **Local Landing** renders the same hero as garbled (`So......ll / before......n`) at 1s post-navigation. Both shots taken same viewport, same wait.
- All other visual elements match between prod and local — same buttons, same segmented pill, same card treatment, same nav.

Conclusion: prod is representative of the shipped baseline. The hero glitch is either a work-in-progress regression on `main` or an animation-timing issue introduced very recently. Not tested against staging (no staging URL provided).

---

## What this audit unblocks

The two specs that come next resolve everything documented here:

- `Blueprints/specs/design/component-lock-v1.md` — locks Button, Input, SegmentedControl (picks *one* of the four coexisting patterns), Card (locks the four canonical variants: solid, outlined, empty-state, error), Text/type scale, spacing. Every drift row in the matrix above resolves to a lock-doc reference.
- `Blueprints/specs/design/team-theme-contract-v1.md` — defines which tokens team-theme may override (allow list) and which it may never touch (deny list). Splits MODE into two orthogonal switches (light/dark, team/Omen). Encodes the contrast checks for the five stress-test teams.

The old `omen-ux-ui-design-system-v1.md` v2 gets a `SUPERSEDED BY` banner pointing at those two files.
