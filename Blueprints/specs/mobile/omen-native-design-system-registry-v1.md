# Omen Native Design-System Registry v1 (M0b)

**Status:** **Approved M0b contract** (Justin, 2026-07-19)
**Date:** 2026-07-19
**Owner:** Native mobile foundation
**Purpose:** The single reviewable registry of tokens, components, accessibility rules, theme packs, and platform-specific implementation rules for the native iPhone (SwiftUI) and Android (Kotlin/Compose) apps.
**Applies to:** SwiftUI iPhone app and Kotlin/Jetpack Compose Android app.
**Companions:** `omen-native-mobile-foundation-v1.md` (v1, 2026-07-19), `omen-native-design-house-v1.md` (v1, 2026-07-19), `omen-mobile-onboarding-connection-contract-v1.md` (**Approved**, 2026-07-19), `omen-native-agent-capabilities-canvas-v1.md` (v1, 2026-07-19).
**Grounded in existing web design authority:** `Blueprints/specs/design/component-lock-v1.md` (locked web component grammar), `Blueprints/specs/omen-ux-ui-design-system-v1.md` (base palette hexes + dark/light token names — the CSS in `frontend/src/index.css` is the source of truth), `Brand/brand-system.md`.

> **Figma reality (reconciled 2026-07-20, updated 2026-07-20 post-M1-P approval):** the official Design House (`mWjrAKPi4JSIP5lAmGAtB3`) contains governed foundation boards: `02 — Tokens & Themes` node `13:2`, `03 — Components` node `14:2`, iOS app-shell contract node `17:12`, and Android app-shell contract node `17:13`. The M1-P Figma screen-contract pass is now built and approved (Justin, 2026-07-20): the `01 — Principles & References` evidence board is node `23:2`; the three approved `03 — Components` proposals are `25:2` (Context Strip), `25:26` (Matchup Spine), and `25:50` (Evidence Disclosure) — see §3.2. Low-fi screen contracts, golden-screen pairs, and QA & evidence entries live on pages `04 — iOS Screens`, `05 — Android Screens`, and `06 — QA & Evidence`; see `Blueprints/handoffs/2026-07-20-m1p-figma-reference-and-proposals.md`. Markdown remains the behavioral/governance source of truth. See `m1-figma-screen-contract-pass-v1.md`.

---

## 0. Altitude — what M0b is and is not

- **M0b (this doc)** establishes the **inventory + token map + platform rules**: which tokens exist, what each component is, its variants/states, which tokens it reads, and how it maps to iOS/Android. It is a contract, not code.
- **M1** writes the per-component **build briefs** (anatomy, exact SwiftUI/Compose APIs, evidence) for the smallest foundation set.
- **M0c** owns the **auth/API/state** contract (deferred from M0a).

No SwiftUI or Compose component is built from this doc directly; M1 briefs are the build inputs.

## 1. Design principle (inherited, non-negotiable)

One Omen identity, two native expressions. Same tokens, hierarchy, state honesty, and accessibility bar; each platform renders with its own native controls (SwiftUI/HIG on iPhone, Compose/Material 3 on Android). Decision first, evidence second, status never hidden, **color is never the only carrier of meaning** (fan-experience data-legibility invariant).

---

## 2. Token registry

Tokens are **semantic names**, never raw colors in a screen. The native token names mirror the existing web `--color-*` contract so web, SwiftUI, and Compose stay one system. Each token must be expressed in three places: this Markdown (source of truth), a SwiftUI token file, and a Kotlin/Compose token file.

### 2.1 Layering model

| Layer | Meaning | May a theme pack change it? |
|---|---|---|
| **Core semantic** | stable role meaning (text, surface, border, focus, success, risk, disabled) | rarely — role meaning stays stable |
| **Brand expression** | Omen atmosphere (accent, glow, hero lighting, metallic highlight) | yes, by approved pack |
| **Component alias** | component role (decision-card surface, primary-button fill, connection panel) | controlled |
| **Data-semantic invariant** | risk, confidence, data-source, position, platform, demo | **never** |
| **Theme pack / campaign** | bounded visual mode (Core, Blackout, Whiteout, Playoff Gold) | yes, bounded/temporary |
| **Team identity** | future per-team skin | not in MVP; must never replace risk/status meaning |

### 2.2 Core semantic tokens (concrete values from `index.css`)

| Token | Role | Dark (default) | Light / system |
|---|---|---|---|
| `bg` | app background (Raven Black) | `#0A0A0B` | `#FAFAF9` |
| `surface-1` | card/panel (Charcoal) | `#1C1C1E` | `#FFFFFF` |
| `surface-2` | elevated surface | `#2C2C2E` | `#F5F5F4` |
| `surface-3` | inset / hover | `#3A3A3C` | `#EBEBEA` |
| `border` | standard border | `#3A3A3C` | `#E5E5E3` |
| `border-subtle` | hairline border | `#2C2C2E` | `#F0F0EE` |
| `text-primary` | primary text (Bone White) | `#F5F0E8` | `#1C1C1E` |
| `text-secondary` | secondary text | `#AEAEB2` | `#6B7280` |
| `text-tertiary` | muted / placeholder | `#6D6D72` | `#9CA3AF` |
| `accent` | brand CTA (Aged Brass) | `#A67C2E` | `#7A5C1E` |
| `accent-hover` | accent pressed/hover | `#C49035` | `#A67C2E` |
| `accent-muted` | low-emphasis accent fill | `#3A2A0A` | `#FEF3C7` |
| `text-on-accent` | foreground on accent surfaces | `#0A0A0B` | `#FAFAF9` |
| `omen` | AI-signal accent (Verdigris) | `#2F7D5B` | `#1A5C3E` |
| `umber` | brown-metal depth | `#5A3A25` | `#5A3A25` |
| `focus-ring` | focus indicator (accent @ 40%) | derived from `accent` | derived from `accent` |

*(`--color-focus-ring` is referenced by the web component lock but absent from `index.css` tokens (Jules Button note). The registry names it as a **semantic** token — `focus-ring`, not "gold outline" — so each platform expresses focus appropriately. M1 must add it with an AA-visible value in both themes. **Non-color requirement (Justin, 2026-07-19):** focus/selection must be conveyed by a **visible outline plus platform-native focus/selection behavior**, never by the brass color alone — so it works for low-vision users. See §4.)*

**Semantic color meaning (stable across MVP, Justin 2026-07-19):** brass (`accent`) = attention/CTA; verdigris (`omen`) = ready / healthy / active signal; crimson (`risk-high`) = risk / recovery. These meanings stay fixed; team skins are a **future customization layer, not a foundation**, and may never repurpose these three roles.

### 2.3 Data-semantic invariant tokens (never theme-overridden)

| Family | Tokens | Note |
|---|---|---|
| Risk | `risk-low #34C759`, `risk-medium #FF9F0A`, `risk-high #7E1717` (light: `#16A34A / #D97706 / #7E1717`) | always paired with a text label |
| Data source | `data-live #34C759`, `data-stub #FF9F0A`, `data-mock #636366`, `data-unavailable #3A3A3C` | drives Live/Stub/Mock/Unavailable labels |
| Confidence gradient | `confidence-floor #701020` → `confidence-ceiling #206F3A` | score always printed as redundant text |
| Position chips | `pos-rb/#34D399 wr/#60A5FA qb/#FB923C te/#C084FC def/#F472B6 k/#A3A3A3` | colorblind-validated |
| Platform brand | `platform-sleeper #1FA3E8`, `platform-yahoo #410093`, `platform-espn #C81E2C`; chip legibility overrides `platform-sleeper-chip #0F70B0`, `platform-yahoo-chip #410093`, `platform-espn-chip #B21826`; `on-platform-sleeper/yahoo/espn #FFFFFF` | never on button chrome; lives on PlatformBadge; chip fills tuned for WCAG AA (>=4.5:1) against white |
| Demo accent | `demo-text #7DD3FC`, `demo-text-secondary rgba(186,230,253,.8)` | demo fixtures only; mock/live badge required |

**Rule:** team theming, moment overlays, and theme packs run in surfaces, accents, chip fills, and chant frames — never in this data-semantic layer.

### 2.4 Typography tokens

Live font stack (source of truth `index.css`): **Alegreya Sans** (headings, UI, buttons, labels), **Alegreya** (body/long reading), **DM Mono** (numeric/score/table). Cormorant Garamond is retired; the Cinzel/Inter names in `component-lock-v1.md` §5 are superseded by the live Alegreya stack (PageHero build confirmed this). M1 uses the live stack.

| Role | Font | Size / Line | Weight | Use |
|---|---|---|---|---|
| `display` | Alegreya Sans | 48/56 | 700 | Marketing hero only, one per screen |
| `h1` | Alegreya Sans | 32/40 | 700 | Product screen hero title |
| `h2` | Alegreya Sans | 20/28 | 600 | Card titles |
| `h3` | Alegreya Sans | 16/24 | 600 | Sub-section headers |
| `body` | Alegreya | 15/24 | 400 | Body copy |
| `body-sm` | Alegreya | 13/20 | 400 | Meta / secondary |
| `label` | Alegreya Sans | 12/16 | 500 (+0.05em) | Form labels |
| `eyebrow` | DM Mono | 12/16 | 500 (+0.12em, upper) | Eyebrow above hero |
| `chip` | DM Mono | 11/14 | 500 (+0.10em, upper) | Chip/badge text |
| `numeric` | DM Mono | contextual | 500 | Scores, cell values |

**Role split (locked, Justin 2026-07-19):** Alegreya Sans = UI, headings, controls; Alegreya = longer reading copy; DM Mono = scores, numeric data, code-like values. On native, **preserve this hierarchy even when platform font-fallback is needed for accessibility** (e.g., Dynamic Type / large-text substitution) — the role relationship must survive substitution. All type roles must scale with Dynamic Type (iOS) / font scale (Android); no fixed-pt text that ignores the accessibility scale. Cinzel/Inter must not be revived.

### 2.5 Spacing scale

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`. No ad-hoc values. Rhythm: card interior 24; header→body 16; body→footer 24; section stack 48; hero→first section 32; field→field 16; label→input 8; input→hint 4. iOS expresses as spacing constants; Android as `dp` spacing tokens.

### 2.6 Cross-platform token expression rule

Every token above exists as: (a) this Markdown row, (b) a SwiftUI definition (e.g. `OmenColor.surface1`), (c) a Compose definition (e.g. `OmenTheme.color.surface1`). Feature modules read tokens only — no raw hex, no shadow tokens, no local primitive copies (foundation §9).

---

## 3. Component registry

Two levels: **Foundation** (generic primitives) and **Omen composition** (product components). Each row names variants, required states, key token aliases, and the native control each platform maps to. Per-component anatomy/APIs are M1 build briefs.

### 3.1 Foundation components

| Component | Variants | Required states | Key tokens | iOS (SwiftUI) | Android (Compose) |
|---|---|---|---|---|---|
| **Button** | primary, secondary, tertiary, danger, link; sizes sm/md/lg; tones accent/omen | default, hover/press, focus, disabled, loading | `accent`, `accent-hover`, `text-on-accent`, `omen`, `risk-high`, `border`, `focus-ring` | `Button` + role styling; `.borderedProminent`/`.bordered`/`.plain` | `Button`/`FilledTonalButton`/`OutlinedButton`/`TextButton` |
| **IconButton** | accent, neutral, danger; sm/md/lg | default, press, focus, disabled | `accent`, `text-primary`, `focus-ring` | `Button` w/ `Label` icon-only + a11y label | `IconButton` + `contentDescription` |
| **TextField** | text/email/number/password; sizes sm/md/lg; state default/error/success | default, focus, error, success, disabled | `surface-1`, `border`, `border-hover`, `text-primary`, `text-tertiary`, `risk-high`, `focus-ring` | `TextField`/`SecureField` | `OutlinedTextField` |
| **Textarea** | sizes | same as TextField | same as TextField | `TextField(axis:.vertical)` | multi-line `OutlinedTextField` |
| **Picker/Select** | inline, menu | default, disabled, error | `surface-1`, `border`, `text-primary` | `Picker`/`Menu` | `ExposedDropdownMenuBox` |
| **FormField** | label+hint+error wrapper | default, error, success | `text-secondary`, `risk-high` | composed | composed |
| **Card / Surface** | solid, outlined, empty, error, preview; tones neutral/omen/risk | n/a (container) | `surface-1`, `border`, `border-subtle`, `risk-high` | container view + material | `Card`/`Surface`/`OutlinedCard` |
| **Alert** | info, success, warning, error | n/a | tone tokens | inline banner view | Material banner/`Card` |
| **Badge** | success, neutral, risk, data-* tones | n/a | `data-*`, `risk-*` (15% opacity fills for AA) | `Text` capsule | `Badge`/`AssistChip` (display) |
| **Chip** | position, brand, mode; interactive/display | default, selected, disabled | `chip` type, position/platform tokens | capsule `Label` | `FilterChip`/`AssistChip` |
| **SegmentedControl** | sizes sm/md/lg | default, selected, disabled | `accent`, `text-on-accent`, `surface-1`, `border` | `Picker(.segmented)` | `SegmentedButton` (M3) |
| **TabNav** | underline | default, active | `accent`, `text-primary` | `TabView`/custom underline | `TabRow` |
| **RadioCardGroup** | title+description cards | default, selected, disabled | `surface-1`, `accent`, `border` | selectable cards | `Card` + `selectable` |
| **Modal / Sheet** | sheet, full-screen, drawer | present, dismiss | `surface-1`, `bg` | `.sheet`/`.fullScreenCover` | `ModalBottomSheet`/dialog |
| **ConfirmationDialog** | default, destructive | present, dismiss | `risk-high` for destructive | `.confirmationDialog` | `AlertDialog` |
| **Tooltip / Help** | hover/press, keyboard | show/hide | `surface-2`, `text-primary` | `.popover`/help affordance | `PlainTooltip`/`RichTooltip` |
| **ListRow** | default, interactive, leading/trailing | default, press, disabled | `surface-1`, `border-subtle`, `text-primary` | `List` row | `ListItem` |
| **Meter** | linear | value, empty | value tokens | `Gauge`/`ProgressView` | `LinearProgressIndicator`/custom |
| **Stepper** | numeric | value, min, max, disabled | `surface-1`, `accent` | `Stepper` | custom stepper |
| **State surfaces** | Empty, Loading, Error, Disconnected, Stale, Mock | the state itself | `border` (dashed empty), `risk-high` (error), `data-mock`/`data-stub` (mock/stale) | composed views + `ProgressView` | composed + `CircularProgressIndicator` |

**State surface rule:** Empty ≠ Error ≠ Loading ≠ Disconnected ≠ Stale ≠ Mock — six distinct treatments, each with honest copy (never "Loading…", never a dead dashboard). Loading uses contextual copy ("Analyzing your matchup…"). Reduced-motion swaps spinners for a static state.

### 3.2 Omen compositions (product components)

| Composition | Purpose | Key data fields | Required states | Built from |
|---|---|---|---|---|
| **DecisionBrief** | the core recommendation surface: verdict, recommendation, confidence, risk, impact, reasoning, input honesty, alternatives, feedback slot | verdict, move, impact, confidence, risk, explanation, signals, alternatives | success, empty, loading, error, disconnected, stale, mock, off-season | Card, MetricStrip, ConfidenceBar, RiskPanel, SignalList, Button |
| **OmenRecommendationCard** | single-move card inside DecisionBrief / lists | title, move, confidence, risk | success, mock | Card, Badge, ConfidenceBar |
| **TradeResultCard** | trade verdict output | sides, verdict, delta, confidence | success, empty, error, mock | Card, MetricStrip, PlayerRow |
| **ShareResultPanel** | shareable trade/verdict summary | safe summary only | default | Card (no cookie/PII in payload) |
| **PlayerRow / PlayerChip** | player identity in rows/inline | name, team, position, meta | default, selected, disabled | ListRow/Chip, position tokens |
| **PlayerCompareCard** | side-by-side player compare | two players, metrics | default, empty | Card, MetricStrip |
| **MetricStrip** | labeled metric row w/ deltas | metrics, delta, confidence | default, empty | Text, ConfidenceBar, Tooltip |
| **ConfidenceBar** | 0–100 score as bar + text | score, label | default | Meter + confidence gradient + label |
| **RiskPanel** | risk level + reasons | level, reasons[] | default | Badge (risk) + reason text |
| **SignalList** | data-source honesty list | signals[] w/ live/stub/mock | default, mock | Badge (data-*) rows |
| **PlatformBadge** | provider identity | platform | default | Badge + platform tokens |
| **ConnectionStatusBadge** | connection state | connected/disconnected/reauth/recovery | all connection states | Badge + status tokens |
| **PlatformConnectionCard** | provider connect/recover card | platform, status, action | connected, disconnected, error, pending, recovery | Card, PlatformBadge, ConnectionStatusBadge, Button |
| **StepGuide** | guided connection steps | steps[] | default, active-step | ListRow, Badge |
| **MarketingHero** | public/onboarding hero | promise, CTAs | default | display type, CTAGroup |
| **CTAGroup** | grouped calls to action | actions[] | default | Button set |
| **Context Strip** | persistent selected team/league/platform strip + switcher entry point | team, league, platform, switch control | connected, recovery/reconnect-required, empty, multi-team-in-league | ListRow-style container + `.sheet` (iOS) / `ModalBottomSheet` (Android) |
| **Matchup Spine** | Omen-owned vertical head-to-head layout for the Matchup Hero | selected team, opponent, scores/records, one What to Watch signal | before games, live, final, no matchup/off-season (+ narrow-width rail collapse) | Card + numeric (DM Mono) type role |
| **Evidence Disclosure** | collapsed answer-first recommendation that expands to categorized evidence on demand | verdict/move, compact comparison rows, categorized evidence (league fact, player/game fact, current status, Omen inference, limitation) | clear decision, close decision, player unavailable, incomplete data, games started, off-season | Card + inline/`.sheet` (iOS) or inline/`ModalBottomSheet` (Android) expansion |

**Context Strip, Matchup Spine, and Evidence Disclosure approved 2026-07-20 (Justin)** via the M1-P Figma screen-contract pass proposals (Figma `03 — Components`, nodes `25:2`/`25:26`/`25:50` in `mWjrAKPi4JSIP5lAmGAtB3`). Full anatomy, variants/states, tokens, accessibility, and iOS/Android expression are documented on those Figma boards and in `Blueprints/handoffs/2026-07-20-m1p-figma-reference-and-proposals.md`; this table row is the registry pointer, not a restatement.

**Canonical product promise wired into MarketingHero / Welcome:** "See the move before the league does." (Justin, 2026-07-19.)

New composition patterns must be proposed on Figma `03 — Components` before appearing in an iOS/Android screen (capability canvas §6).

---

## 4. Accessibility rules (apply to every component)

- **Contrast:** text and essential UI meet WCAG **AA**. Color is expressive, never the sole carrier — risk/status/data always carry a text label or icon too.
- **Touch targets:** minimum **44pt** (iOS) / **48dp** (Android). Button `lg` = 44px is the hero/primary size on mobile.
- **Focus & selection (non-color):** every focusable/selectable element shows a **visible outline plus native focus/selection behavior** (iOS focus engine / accessibility focus, Android focus + state layers). Focus must never be signaled by the brass `focus-ring` color alone — it must remain perceivable for low-vision and high-contrast users. Selected state carries a shape/weight/checkmark change in addition to color.
- **Dynamic Type / font scale:** all type roles scale; layouts reflow, no clipped text.
- **VoiceOver / TalkBack:** every interactive element has a label and correct role; logical focus order; state (selected/disabled/loading) is announced.
- **Reduce motion:** honor Reduce Motion / animator-duration-scale; spinners and transitions have static equivalents.
- **Reduce transparency (iOS):** Liquid Glass surfaces fall back to opaque system material.
- **Errors:** honest, actionable, and programmatically associated with their field.

---

## 5. Theme packs

- **Shipped in MVP:** Core Omen **dark** (default) and Core Omen **light/system**. Both must pass AA and cross-platform parity before anything else.
- **Architected, not yet built:** Blackout, Whiteout, Playoff Gold, Rivalry Crimson, Draft Night — bounded, temporary, may alter only brand-expression + controlled component-alias tokens.
- **Team skins:** out of MVP; a separate future decision. A theme pack may never override the data-semantic invariant layer (§2.3).
- Do not build any pack beyond the two core modes until core screens pass accessibility and parity (foundation §4, design-house §5).

---

## 6. Platform-specific implementation rules

### 6.1 iPhone — Apple-native
- SwiftUI navigation stacks, sheets, confirmation dialogs, pickers, lists; prefer system components over hand-built clones.
- **Sign in with Apple** first; required whenever a third-party login is also offered (App Store 4.8) — per approved M0a.
- **Liquid Glass** only at system-chrome/control boundaries (tab bars, navigation/toolbars, compact action groups, search, transient sheets). Never under dense DecisionBrief content, provider data, errors, or recovery. Honor Reduce Transparency with an opaque fallback.
- Respect safe areas, Dynamic Type, VoiceOver, reduce motion, and iOS back/swipe.

### 6.2 Android — Google-native
- Jetpack Compose + Material 3 as the behavioral baseline; Android back behavior, adaptive navigation, system bars, TalkBack.
- **Credential Manager (Sign in with Google)**; legacy Google Sign-In SDK banned — per approved M0a.
- **Dynamic color is not auto-adopted** where it would weaken Omen brand/status meaning; Omen tokens and hierarchy win.
- Bottom navigation for stable top-level destinations; rail/large-screen adaptation when justified.

### 6.3 Navigation (shared map, native expression)
Top-level: **Command Center, Omen, Trade, League**. Draft is a strong **seasonal** destination reached through League and promoted from Command Center when relevant; it is not a permanent tab. Account is reached through a contextual profile/avatar control, not top-level navigation. Provider connection, player detail, confirmation, filtering, and recovery are nested flows or sheets. iOS = tab bar + stacks + sheets; Android = bottom navigation + Compose navigation + platform back. M0c and `omen-mobile-visual-briefs-v1.md` are authoritative for this map.

---

## 7. Reconciliations — RESOLVED (Justin, 2026-07-19)

1. **`focus-ring` token:** ✅ approved. Add as a **semantic** token in M1 with a **non-color requirement** — visible outline + native focus/selection behavior, never brass-alone (see §2.2 note, §4 Focus & selection).
2. **Font stack:** ✅ locked to **Alegreya Sans (UI/headings/controls) / Alegreya (reading) / DM Mono (numeric)**; hierarchy preserved through accessibility fallback; Cinzel/Inter must not be revived (§2.4).
3. **Team tokens:** ✅ **omitted** from the phone MVP. Semantic colors stay stable — brass = attention, verdigris = ready/healthy, crimson = risk/recovery. Team skins are a future customization layer (§2.2 semantic-meaning note, §5).
4. **Registry scope:** ✅ M0b answers *what components exist, what states they have, and how iOS/Android differ*; M1 creates the small SwiftUI/Compose build briefs.

## 8. What M0b does NOT cover

- Per-component anatomy, exact SwiftUI/Compose APIs, and evidence → **M1**.
- Auth/session/provider-state API and deep links → **M0c**.
- Motion/animation spec beyond reduce-motion rule → later.
- Additional Figma reference annotations, component proposals, and screen contracts → `m1-figma-screen-contract-pass-v1.md`; no unapproved component pattern may bypass that pass.

## 9. Evidence

- Grounded in: `component-lock-v1.md`, `omen-ux-ui-design-system-v1.md` (palette/type/tokens), `Brand/brand-system.md`, foundation §4–5, design-house §5/§8, and the approved M0a contract.
- Token values transcribed from the `index.css` dark/light blocks documented in `omen-ux-ui-design-system-v1.md` (CSS is source of truth; M1 verifies against live CSS).
- Figma access confirmed (`whoami`); Design House currently a stub (`00 — Start Here`).
- No app code, deploy, secret, schema, Figma permission, or provider behavior touched.
