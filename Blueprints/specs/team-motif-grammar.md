---
valid-as-of: 2026-06-22
status: v1 — Phase 1.5g.0 (doc-only); pending 1.5g.1 implementation
owner: Claude (Frontend) + Justin (approval)
depends-on:
  - Brand/brand-system.md
  - Brand/entity-identity-theming.md
  - Blueprints/specs/page-system.md (Phase 1.5h)
  - Blueprints/specs/corvus-ux-ui-design-system-v1.md
  - Blueprints/audits/2026-06-20-phase1-5e-32-team-identity-audit.md
  - Blueprints/audits/2026-06-21-phase1-5h-multi-color-wcag-sweep.md
---

# Corvus Team Motif Grammar

## Purpose

Phase 1.5g extends the Phase 1.5h palette system with three orthogonal, optional layers — `motifs`, `typeFlourishes`, `culturalMoments` — each independently typed, independently rendered, independently reviewable. The grammar exists so per-team identity can deepen past raw color (PIT hairline, NO Mardi Gras eyebrow, DET Thanksgiving Classic) without breaking the AAA framework, the typography lock, the mock/live discipline, or the accent fallthrough that makes NYG/HOU/PHI/SF/TB/ATL render correctly today. Every field defaults to `null` or `[]`; an unflourished team renders byte-identically to its Phase 1.5h baseline.

## Doctrine recap

- Color: `Brand/brand-system.md` §3.
- Typography lock (Alegreya / Alegreya Sans only): `Brand/brand-system.md:140-146`.
- AAA framework (Accuracy + Accessibility + Aesthetic Integrity, 2-of-3 = fail): `Brand/brand-system.md:192`.
- Entity-identity methodology (find, don't derive; cite the anchor; mind trademark): `Brand/entity-identity-theming.md`.
- Page System per-route accent rules: `Blueprints/specs/page-system.md`.

## Field shapes

### Motif

A motif is a static, palette-sourced ornament — hairline, divider, corner ornament, or watermark — that paints on declared chrome surfaces. Motifs never animate in v1. Motifs never paint on the Omen card. Motifs are scoped via an explicit `appliesTo` allow-list.

```ts
type Motif = {
  id: string;                                    // 'pit-gold-hairline'
  kind: 'hairline' | 'divider' | 'corner-ornament' | 'watermark';
  shape: 'solid' | 'dashed' | 'dotted' | 'double';
  ornamentSvgPath?: string;                      // absolute path under frontend/public/motifs/
  thicknessPx: 1 | 2 | 3;                        // ≤3px to stay under aesthetic-integrity budget
  colorRole: 'primary' | 'secondary' | 'tertiary' | 'neutral' | 'mute' | 'accent-pop';
  opacity: { dark: number; light: number };      // 0..1, per surface polarity
  appliesTo: Array<'page-edge' | 'card' | 'section-divider' | 'eyebrow'>;
  excludesOmenCard: true;                        // hard-typed literal — the Omen card is never a motif target
  reducedMotionFallback: 'identical';            // v1 motifs are static; field is forward-compat
  trademarkReview: 'pending' | 'counsel-approved' | 'self-assessed';
} | null;
```

Example (PIT, official):

```js
motifs: [
  {
    id: 'pit-gold-hairline',
    kind: 'hairline',
    shape: 'solid',
    thicknessPx: 1,
    colorRole: 'secondary',                      // Steeler Gold #FFB612
    opacity: { dark: 1.0, light: 1.0 },
    appliesTo: ['page-edge', 'section-divider'],
    excludesOmenCard: true,
    reducedMotionFallback: 'identical',
    trademarkReview: 'self-assessed'             // pure-geometry hairline, no mark reproduction
  }
]
```

Notes:
- `colorRole` resolves to a hex via `byRole[colorRole]` from the active palette. If the role is absent on the active variant, the motif is suppressed (graceful no-op).
- `ornamentSvgPath` is an absolute path under `frontend/public/motifs/` (a real file, never an inline data URI in `nflTeams.js`). Designers can edit; reviewers can diff.
- `trademarkReview` gates render polarity — see §Trademark review process below.

### TypeFlourish

A typeFlourish manipulates already-loaded Alegreya / Alegreya Sans weights, styles, and OpenType features. It never introduces a new typeface. It never touches body copy or Omen recommendation titles (the Trust pillar requires the recommendation to read identically across teams).

```ts
type TypeFlourish = {
  id: string;
  scope: 'eyebrow' | 'page-title' | 'section-header';   // never 'omen-card-title', never 'body'
  family: 'Alegreya Sans' | 'Alegreya';                  // hard locked
  weight?: 400 | 500 | 600 | 700;                        // only weights loaded in index.css
  style?: 'normal' | 'italic';                           // italic loaded 400-600 only
  variantCaps?: 'normal' | 'small-caps' | 'all-small-caps';
  tracking?: '-0.02em' | '0' | '0.02em' | '0.04em' | '0.08em' | '0.12em';
  fontFeatures?: '"dlig" 1' | '"hlig" 1' | '"smcp" 1' | '"dlig" 1, "hlig" 1';
  enabledInVariant: Array<'official' | 'special'>;
  reducedMotion: 'no-change';                            // type never animates in v1
} | null;
```

Example (NE, both variants):

```js
typeFlourishes: [
  {
    id: 'ne-engraved-eyebrow',
    scope: 'eyebrow',
    family: 'Alegreya Sans',
    weight: 600,
    style: 'normal',
    variantCaps: 'small-caps',
    tracking: '0.12em',
    fontFeatures: '"smcp" 1',
    enabledInVariant: ['official', 'special'],
    reducedMotion: 'no-change'
  }
]
```

Font-loading constraint: the existing Google Fonts `@import` at `frontend/src/index.css:1` covers `Alegreya:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600` and an identical range for `Alegreya Sans`. **Italic at 700 is not loaded — schema disallows.** `assertCategoryShape()` throws in dev with a literal example: `if (flourish.style === 'italic' && flourish.weight === 700) throw new Error('italic-700 not loaded — extend @import or downgrade weight')`. If a future flourish needs italic-700, expand the `@import` in a separate PR with a payload-cost note.

OpenType feature retention from the Google Fonts CSS2 endpoint is unverified at the served-CSS level. Phase 1.5g.2 done-when requires a font-feature spike against the served font (rendered `font-feature-settings: "smcp" 1` produces visibly different glyphs from a `text-transform: uppercase` fallback) BEFORE the NE typeFlourish merges. If retention fails, self-host Alegreya Sans under `frontend/public/fonts/` in a separate PR.

### CulturalMoment

A culturalMoment paints chrome — eyebrow text + optional surface tint + optional citation — for a bounded calendar window. Moments render only on accent-active chrome routes, never on the Omen card, never on recommendation rows, never against live data without a visible mock badge.

```ts
type CulturalMoment = {
  id: string;
  label: string;                                 // 'Mardi Gras Week'
  kind: 'calendar' | 'rivalry-week' | 'milestone';
  activation:
    | { rule: 'date-range'; startMonthDay: string; endMonthDay: string }
    | { rule: 'date-list'; dates: string[] /* 'YYYY-MM-DD' */ }
    | { rule: 'manual-flag'; storageKey: string /* 'corvus.theme.moments' map key */ };
  overlay: {
    eyebrow: string;                             // brand-voice copy, slops-ux-copy reviewed
    eyebrowColorRole: 'primary' | 'secondary' | 'tertiary' | 'neutral' | 'mute' | 'accent-pop';
    surfaceTintRole?: 'primary' | 'secondary' | 'tertiary' | 'neutral' | 'mute' | 'accent-pop' | null;
    surfaceTintAlpha?: number;                   // ≤ 0.18, AAA-swept
    citation?: string;                           // appended to footer cultural-anchor, never replaces
  };
  scope: Array<'app' | 'account' | 'ledger' | 'standings' | 'football' | 'draft'>;  // never 'omen', never 'trade'
  mockBadge: { required: true; copy: string };   // hard-typed literal
  reducedMotion: 'static-only';                  // hard-typed literal
} | null;
```

Example (NO, Mardi Gras):

```js
culturalMoments: [
  {
    id: 'no-mardi-gras',
    label: 'Mardi Gras Week',
    kind: 'calendar',
    activation: { rule: 'date-range', startMonthDay: '02-08', endMonthDay: '02-25' },
    overlay: {
      eyebrow: 'Mardi Gras week.',
      eyebrowColorRole: 'secondary',
      surfaceTintRole: 'tertiary',
      surfaceTintAlpha: 0.12,
      citation: 'Painted for Mardi Gras week.'
    },
    scope: ['app', 'account'],
    mockBadge: { required: true, copy: 'Mardi Gras chrome — chrome only, recommendations unchanged.' },
    reducedMotion: 'static-only'
  }
]
```

Hard rules:
- Eyebrow color is palette-sourced (a role), never a literal hex, never a non-team neutral. The "league-event neutrals whitelist" question is closed — palette-sourced or omit.
- Surface tint alpha is capped at 0.18 to preserve body-text AA contrast on the team surface. Phase 1.5g.3 done-when requires a post-tint sweep.
- `scope` never includes `'omen'` or `'trade'`. The Omen card and Trade Analyzer result are recommendation surfaces that must read identically across teams (Trust pillar, `Brand/brand-system.md:178-180`).
- `mockBadge.required: true` is a literal type. `applyMomentOverlay` reads `window.__corvusDataMode` (a route-level mock/live indicator to be built as a 1.5g.3 prerequisite; see §CulturalMoment fallback below) and renders the moment + the badge in mock mode; in live mode the moment is suppressed entirely. No silent paint over live data.

#### CulturalMoment fallback contract

If `window.__corvusDataMode` is `undefined` at `applyMomentOverlay()` call time, treat as live and **suppress the moment entirely**. Failing closed protects the mock/live discipline. The badge is never shown alone — moment chrome and badge appear together or not at all.

## Integration points

### `frontend/src/data/nflTeams.js`

Add three optional arrays at the team root (not on palette entries — keeps the data palette-decoupled and survives variant swap):

```js
{
  abbr: 'NO', city: 'New Orleans', name: 'Saints', div: 'NFC South',
  palettes: [ /* unchanged Phase 1.5h shape */ ],
  cultureTag: 'Who Dat',
  cry: '...',
  wardRoom: '...',
  motifs: [],                  // Motif[]
  typeFlourishes: [],          // TypeFlourish[]
  culturalMoments: []          // CulturalMoment[]
}
```

Default empty arrays everywhere. Retired-fields list (`primary`, `secondary`, `accent`, `scheme`, `template`, `surfaceAxis`, `surfaceFrom`, `accentLifted`, `colorRush`, `note`, `SURFACE_RECIPES`, `textSafe`) stays retired.

### `frontend/src/lib/teamTemplate.js`

Extend `getTeamTemplate()` return additively:

```js
{
  /* ...all existing 1.5h fields unchanged... */
  motifs: resolveMotifs(team, variant, surfaceIsDark),               // { active: Motif[] } — colorRole resolved to hex
  typeFlourishes: resolveTypeFlourishes(team, variant),              // { active: TypeFlourish[] }
  activeMoments: resolveActiveMoments(team, nowIso, dataMode)        // CulturalMoment[]
}
```

- Accent fallthrough (NYG primary-royal, GB/PIT/BAL primary-on-primary, TB pewter surface, ATL Bred bypass) is **untouched**.
- `identityPrimary` / `identitySecondary` are **untouched**.
- `textOnSurface` polarity rule is **untouched**.
- Each resolver lives in its own file: `lib/motifs.js`, `lib/typeFlourishes.js`, `lib/culturalMoments.js`. `slops-code-review` can audit each category in isolation.

### `frontend/src/lib/themeMode.js`

`applyTeamTokens()` gains three sibling calls **after** the existing `setRoleTokens` + core-token overrides:

```js
applyTeamTokens(root, template) {
  /* ...existing 1.5h calls... */
  applyMotifTokens(root, template.motifs);                  // writes --motif-*
  applyTypeFlourishTokens(root, template.typeFlourishes);   // writes --type-flourish-*
  applyMomentOverlay(root, template.activeMoments);         // writes --moment-*
}
```

Each is a no-op when its input is empty. `clearTeamTokens()` extends three new var arrays:

```js
const MOTIF_VARS = ['--motif-shape', '--motif-color', '--motif-thickness', '--motif-opacity', '--motif-svg-url'];
const TYPE_FLOURISH_VARS = ['--type-flourish-family', '--type-flourish-weight', '--type-flourish-style',
                            '--type-flourish-caps', '--type-flourish-tracking', '--type-flourish-features'];
const MOMENT_VARS = ['--moment-eyebrow', '--moment-eyebrow-color', '--moment-surface-tint',
                     '--moment-surface-tint-alpha', '--moment-citation'];
```

Defense-in-depth: `applyMomentOverlay` consults `window.matchMedia('(prefers-reduced-motion: reduce)')` even though v1 moments are static-only.

`resolveDataTheme()` is unchanged.

`assertCategoryShape(team)` lives at `frontend/src/lib/assertCategoryShape.js` and is imported by `frontend/src/data/nflTeams.js` at module-evaluation time. In dev it throws on any malformed motif / typeFlourish / culturalMoment; in production builds it is stripped by Vite's `import.meta.env.DEV` gate.

### `frontend/src/index.css`

New CSS vars on `:root` (defaults unset so existing pages render identically):

| Var | Type | Notes |
|---|---|---|
| `--motif-shape` | enum string | consumed via `[data-motif-shape="solid"]`-style attribute selectors |
| `--motif-color` | hex | resolved by themeMode from palette role |
| `--motif-thickness` | length | 1px–3px |
| `--motif-opacity` | number | per surface polarity |
| `--motif-svg-url` | url() | `url('/motifs/pit-three-diamond.svg')` for corner-ornament/watermark |
| `--type-flourish-family` | font family | `'Alegreya Sans'` or `'Alegreya'` |
| `--type-flourish-weight` | number | 400/500/600/700 |
| `--type-flourish-style` | keyword | `normal` / `italic` |
| `--type-flourish-caps` | keyword | `normal` / `small-caps` / `all-small-caps` |
| `--type-flourish-tracking` | length | em |
| `--type-flourish-features` | string | `font-feature-settings` value |
| `--moment-eyebrow` | string | CSS quoted string, used via `content: var(--moment-eyebrow)` |
| `--moment-eyebrow-color` | hex | palette-resolved |
| `--moment-surface-tint` | hex | palette-resolved |
| `--moment-surface-tint-alpha` | number | ≤0.18 |
| `--moment-citation` | string | CSS quoted string |

Consumption pattern (motif on cards):

```css
[data-motif-target='card'][data-motif-shape='solid'] {
  border: var(--motif-thickness, 1px) solid var(--motif-color, transparent);
  opacity: var(--motif-opacity, 1);
}
```

Surface tint (moment on page surface):

```css
[data-moment-target='page-surface'] {
  background-color: color-mix(in srgb,
    var(--color-team-surface),
    var(--moment-surface-tint) calc(var(--moment-surface-tint-alpha) * 100%));
}
```

`color-mix(in srgb, ..., var(--moment-surface-tint) calc(var(--moment-surface-tint-alpha) * 100%))` is the v1 render path. Phase 1.5g.3 done-when requires a Safari smoke (Safari 16/17/18) on the surface-tint pattern. If a regression appears, fall back to a pre-resolved hex computed in `applyMomentOverlay` and write a flat `--color-team-surface-with-moment` token instead.

### `Blueprints/specs/page-system.md`

Add a sixth column to the Page System Table: **Motif / Moment posture**. Canonical posture per route:

| Route | Motif / Moment posture |
|---|---|
| `/` | inert (no team context) |
| `/corvus` | inert |
| `/login` | inert |
| `/account/connect` | inert |
| `/onboarding` (Pick your look) | inert — picker shows 32 tiles; motifs preview only after selection on `/account/appearance` (motif preview would render 32 motifs simultaneously, breaking the per-team identity-budget rule) |
| `/onboarding` (other steps) | inert |
| `/account` | motif: `page-edge` + `section-divider`; moment: eyebrow + tint |
| `/account/appearance` | motif: `page-edge` + `card`; moment: eyebrow only (preview surfaces stay neutral) |
| `/football` | motif: `section-divider`; moment: eyebrow + tint |
| `/omen` | motif: `page-edge` only (Omen card excluded by schema); moment: **never** |
| `/ledger` | motif: `section-divider`; moment: eyebrow + tint |
| `/standings` | motif: `section-divider`; moment: eyebrow only |
| `/trade` | motif: none; moment: **never** (trade result is a recommendation surface) |
| `/draft` | motif: `card`; moment: eyebrow only |
| `*` | inert |

## v1 team assignments

Bound v1 to 6 teams. No trademark-adjacent shapes ship in 1.5g.1 — only hairlines, dividers, and palette-sourced eyebrows.

| Team | Category fields in v1 | Shape idea | Trademark posture |
|---|---|---|---|
| PIT | motif | Gold hairline (`secondary`), `page-edge` + `section-divider`, 1px solid | `self-assessed` (pure geometry, no three-diamond) |
| GB | motif + culturalMoment | Tundra hairline section-divider (`secondary` gold, 1px); Lambeau Tundra moment (`manual-flag`, `corvus.theme.moments['gb-lambeau-tundra']`); eyebrow string TBD — working draft: "Lambeau, manually painted." (no weather claim), subject to `slops-ux-copy` review in 1.5g.3 | `self-assessed`; moment is manual-only, no automated weather claim |
| DET | culturalMoment | Thanksgiving Classic moment (`date-list`, 4th Thursday of Nov 2026 and 2027 hand-curated), eyebrow "Thanksgiving Classic.", scope: `['app','account','ledger','standings','football']` | n/a |
| NO | motif + culturalMoment | Hairline `page-edge` in `tertiary` (purple) 1px; Mardi Gras moment (`date-range` 02-08 → 02-25), eyebrow "Mardi Gras week." scope: `['app','account']` only, tint at `surfaceTintAlpha: 0.12` from `tertiary` | `self-assessed`; eyebrow color is palette-sourced; tint only paints on chrome routes |
| MIA | motif | Triple-line hairline `page-edge` (`secondary` aqua, 1px), opacity `{ dark: 0.6, light: 0.45 }` | `self-assessed`; light-axis motif test |
| NE | typeFlourish | Small-caps eyebrow on Alegreya Sans 600, tracking 0.12em, `["official","special"]` | n/a |

Deferred from runner-up proposals (do not ship in 1.5g): PIT three-diamond corner ornament, IND horseshoe, KC arrowhead, MIN star/Skol pattern, LAR Hollywood star, BAL Poe italic ligatures on the Omen card, ATL "F.I.L.A." eyebrow, MIN "Paisley Park" eyebrow, TB Gasparilla "Hoist the colors", BAL/CIN dropCap on Omen card, season-week activation, Salute to Service. Most fail brand-voice (theatrical chrome on recommendation surfaces) or carry trademark risk that cannot be self-certified.

## Activation rules

Cultural moments activate from data the app already has. Do **not** introduce a server-trusted "current NFL week" clock in v1.

| Rule | Source of truth | Backend required? |
|---|---|---|
| `date-range` | JS `new Date()` in user's local timezone, compared against `MM-DD` strings annually | No |
| `date-list` | JS `new Date()`, compared against `'YYYY-MM-DD'` ISO strings hand-curated per season in `frontend/src/data/nflCalendar.js` | No — calendar JSON is hand-maintained, audited annually per `entity-identity-theming.md:201-203` |
| `manual-flag` | `localStorage['corvus.theme.moments']` — a single JSON object map keyed by moment `id` to boolean | No |

Sleeper draft state is **not** used as a moment activation source in v1. If a future moment needs draft-week activation, it reads from the existing Sleeper draft hook (`useSleeperDraft`) which is already in the app. Flag as a Phase 1.5g.4 backend dependency only if the calendar JSON is not enough.

Midnight rollover: cultural moments are evaluated when `applyThemeMode()` runs (mount, theme change, variant change). A long-lived tab crossing midnight will not see a moment activate until the next theme event. Documented as a known v1 limitation; revisit in 1.5g.4 with a single `setTimeout` to the next moment boundary.

QA override (dev only): `?moment=<id>` URL query forces a moment active, gated behind `import.meta.env.DEV`.

## Trademark review process

`trademarkReview` is a three-state field on every motif:

- **`self-assessed`** — Justin reviewed the shape and accepted that it is pure geometry or palette tint with no trademark mark reproduced. v1 baseline for all 1.5g.1 hairlines (PIT, GB, NO, MIA).
- **`counsel-approved`** — A memo lives in `Blueprints/audits/2026-06-22-phase1-5g-trademark-review.md` citing counsel's email or DocuSign confirmation. Required for any shape that reproduces or evokes a trademarked mark (PIT three-diamond, KC arrowhead, IND horseshoe, NO Mardi Gras chevrons, etc.).
- **`pending`** — Shape exists in `nflTeams.js` but render is suppressed in production until the state is flipped.

Production renders **`self-assessed` AND `counsel-approved`**. `pending` is suppressed in production (allowed in dev so designers can iterate without counsel turnaround). State flips are commits to `nflTeams.js` with the audit memo updated in the same PR.

## Reduced-motion + AAA guardrails

- Every motif: `reducedMotionFallback: 'identical'` (v1 motifs are static SVG/CSS only).
- Every typeFlourish: `reducedMotion: 'no-change'` (type never animates).
- Every culturalMoment: `reducedMotion: 'static-only'` (eyebrow + tint + citation, no transitions, no shimmer).
- `applyMomentOverlay` consults `window.matchMedia('(prefers-reduced-motion: reduce)')` as defense-in-depth.
- Animated motifs (`kind: 'shimmer' | 'parallax'`) are explicitly **not** part of v1 grammar — additions in 1.5g.4+ must re-enter the schema and re-pass review.

AAA framework gates:

| Pillar | Gate | Tool |
|---|---|---|
| Accuracy | Trademark review three-state — production renders `self-assessed` AND `counsel-approved`; `pending` suppressed | `nflTeams.js` field + PR memo |
| Accuracy | Moment eyebrow strings reviewed by `slops-ux-copy` | PR comment |
| Accuracy | Counsel-approval evidence cited inline in `Blueprints/audits/2026-06-22-phase1-5g-trademark-review.md` | Audit memo |
| Accessibility | Motif color × surface ≥ 3.0 (decorative threshold) in both modes | Extend `frontend/scripts/contrast-sweep.mjs` |
| Accessibility | Post-tint body-text × surface ≥ AA-normal (4.5) or AA-large (3.0) per existing marginals list | Extend `frontend/scripts/contrast-sweep.mjs` |
| Accessibility | Eyebrow color × surface ≥ AA | Extend `frontend/scripts/contrast-sweep.mjs` |
| Accessibility | typeFlourish family ∈ {Alegreya Sans, Alegreya}; weight ∈ {400,500,600,700}; italic weight ≤ 600 | `assertCategoryShape()` |
| Accessibility | No new `@font-face` or Google Fonts `@import` lines | Fold the check into `frontend/scripts/contrast-sweep.mjs` as a pre-flight grep assertion on `frontend/src/index.css` |
| Aesthetic Integrity | Motif `excludesOmenCard: true` is the only allowed value (schema-enforced literal) | TS-like literal |
| Aesthetic Integrity | Moment `scope` excludes `'omen'` and `'trade'` (schema-enforced) | `assertCategoryShape()` |
| Aesthetic Integrity | No depth/sheen language (bevel, glow, drop-shadow) on motif shapes — flat ornament only | Reviewer |

## Sprint split

| Phase | Ships | Done when |
|---|---|---|
| **1.5g.0** | This spec doc + page-system addendum + sprint split + decision log + inbox update | Justin approves spec; `Blueprints/specs/team-motif-grammar.md` + page-system addendum on disk; sprint rows split; decision log entry recorded |
| **1.5g.1** | Motif schema, `motifs: []` arrays for PIT + MIA + NO + GB (hairline only). `lib/motifs.js` resolver. `applyMotifTokens()` in `themeMode.js`. `MOTIF_VARS`. New `:root` vars + `[data-motif-target]` selectors. `frontend/src/lib/assertCategoryShape.js` boot-time validator. Contrast-sweep extension for motif color × surface ≥ 3.0. Trademark-review memo at `Blueprints/audits/2026-06-22-phase1-5g-trademark-review.md`. | 4 teams render hairlines in both modes; sweep passes; NYG/HOU/PHI/SF/TB/ATL accent fallthrough unchanged (Vitest pin); `excludesOmenCard` enforced; trademark memo committed; all four motifs ship as `self-assessed` |
| **1.5g.2** | TypeFlourish schema, `typeFlourishes: []` for NE. `lib/typeFlourishes.js` resolver. `applyTypeFlourishTokens()`. `TYPE_FLOURISH_VARS`. CSS consumes vars on `.type-flourish-eyebrow` utility. Font-feature spike (rendered `"smcp" 1` vs `text-transform: uppercase` fallback must be visually distinct). Folded grep gate in `contrast-sweep.mjs` for no new `@import`. | NE eyebrow renders Alegreya Sans 600 small-caps tracking 0.12em on `/account` + `/account/appearance` Official + Special; `assertCategoryShape()` rejects italic-700; font-feature spike documented; Vitest pins typography lock |
| **1.5g.3** | CulturalMoment schema, `culturalMoments: []` for DET (Thanksgiving Classic) + NO (Mardi Gras) + GB (Lambeau Tundra manual). `lib/culturalMoments.js` resolver. `frontend/src/data/nflCalendar.js`. `applyMomentOverlay()`. `MOMENT_VARS`. `<MomentChrome>` as sibling of `<main>`. Mock badge enforcement. `?moment=<id>` dev override. Safari smoke on `color-mix` surface tint. **Prerequisite inside this phase:** route-level `window.__corvusDataMode` mock/live indicator must exist; if it does not, build it inside this phase. | Mardi Gras activates 02-08 → 02-25 on `['app','account']` in mock mode only; Thanksgiving Classic activates 4th Thursday of Nov 2026 on DET on `['app','account','ledger','standings','football']`; Lambeau Tundra requires localStorage flag; Footer renders both anchor citation and moment citation; post-tint contrast sweep passes; live-mode pages render zero moment chrome; Safari 16/17/18 smoke confirms `color-mix` render |

## Open questions / deferred

- Animated motifs (`kind: 'shimmer' | 'parallax'`): explicitly out of v1; revisit 1.5g.4 with new schema fields + reduced-motion default flip.
- Per-mode motif color override: defer to 1.5g.4 if the sweep flags a light-vs-dark marginal we cannot fix via `opacity: { dark, light }`.
- Cross-tab sync for `corvus.theme.moments` flags: storage event listener deferred to 1.5g.4. Documented as known limitation.
- Animated moment overlays (shimmer, parallax): out of v1, see schema constraint `reducedMotion: 'static-only'`.
- Multi-window moments (Mardi Gras week + Mardi Gras Day with different eyebrows): out of v1; ship as separate moment ids if needed.
- Light-axis surface tint inversion (MIA/IND/LAC/DAL/CAR/ARI): no inversion in v1 — tint role is palette-relative; sweep is the gate.
- Self-hosted Alegreya: deferred to Phase 2 backlog. Today's Google Fonts `@import` covers v1 weights and OT features (pending the 1.5g.2 font-feature spike).
- CLE and LAR Specials: out of grammar scope; tracked under `Direction/release_readiness.md`.
- WAS Mardi-style alternate surface: closed — Saints celebration belongs on NO, not WAS.
- ATL Bred motif: out of v1; Bred stays pure-black with primary-color CTA only.
- **Audio cues, scroll-linked motion, and time-of-day surface shifts are explicitly out of Phase 1.5g grammar.** Any future addition re-enters via a new category-axis array (e.g., `audioCues[]`, `scrollMotions[]`), not as a field on `motif` / `typeFlourish` / `culturalMoment`.
- Haptic feedback on mobile: out of v1; `mobile-first-qa-playbook` has no haptic chapter today.
- Localization of cultural moment eyebrows (e.g., NO French / Cajun overlay): out of v1; English-only baseline.
- Per-user moment opt-out (a Saints fan who dislikes Mardi Gras chrome): out of v1; `localStorage['corvus.theme.moments']['no-mardi-gras']` flipped to `false` already suppresses manual-flag moments, but `date-range` moments have no per-user kill-switch in v1.
- `nflCalendar.js` annual audit owner: Justin. Cadence: pre-season (August). Skill: `slops-context-markdown` for the audit memo. Doctrine: `entity-identity-theming.md:201-203` covers the why.

## Cross-references

- `Brand/brand-system.md` (Pillars, AAA, voice, typography lock).
- `Brand/entity-identity-theming.md` (find-don't-derive methodology, cultural-anchor citations).
- `Blueprints/specs/page-system.md` (Phase 1.5h palette doctrine; Motif/Moment posture column added per this spec).
- `Blueprints/specs/corvus-ux-ui-design-system-v1.md` (tokens, components).
- `Blueprints/audits/2026-06-20-phase1-5e-32-team-identity-audit.md` (cultural anchors per team).
- `Blueprints/audits/2026-06-21-phase1-5f-two-axis-wcag-sweep.md` (axis decisions, known marginals — superseded in code by 1.5h).
- `Blueprints/audits/2026-06-21-phase1-5h-multi-color-wcag-sweep.md` (62-palette sweep baseline).
- `Blueprints/audits/2026-06-22-phase1-5g-trademark-review.md` (to be created in 1.5g.1).
