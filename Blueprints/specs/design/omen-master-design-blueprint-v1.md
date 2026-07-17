# Omen Master Design System Blueprint v1

**Status:** Proposed — becomes Active companion to `omen-ui-north-star-v1.md` upon Justin's approval
**Date:** 2026-07-16
**Author:** Claude (Creative Director pass), directed by Justin
**Scope:** Visual asset foundations — iconography (shield emblem, favicon, app icon), typography and video-caption collision system, background/environment engine, custom cursor system, and the asset-creation pipeline that must complete before any Remotion work resumes.
**Non-scope:** Component APIs (North Star §4 governs), page migrations, backend anything, colorway/theme-pack architecture (North Star §7 governs), and the actual authoring of SVG masters/scripts (that is Phase 2 of this rebuild — this document is the contract they are built against).
**Companion to:** `Brand/brand-system.md` (identity, voice, palette, logo doctrine)
**Defers to:** `Blueprints/specs/design/omen-ui-north-star-v1.md` on any conflict
**Amends (upon approval):** `Brand/brand-system.md` §8 typography stack; `Blueprints/specs/page-system.md` typography rows; closes the DM Mono reconciliation flag in `omen-ux-ui-design-system-v1.md`. See §6 Reconciliation Register.

---

## 0. Why this rebuild exists

All Remotion/video rendering work is halted as of 2026-07-16. The reason is not the video code — it is that the assets the videos consume were never built to a standard that survives close viewing:

1. **The shield emblem has no vector source.** Every mark in `logos/` is a raster PNG on solid black. There is no geometry to correct, no master to re-export, no way to build size-appropriate cuts. Every downstream flaw traces back to this.
2. **The videos render in Arial and Georgia.** `Brand/promos/omen-coming-soon/` loads no fonts at all; its `fontFamily: 'Alegreya Sans, Arial, sans-serif'` declarations silently fall back. Combined with 800–900 weights at ~0.98 line-height, captions read as heavy, colliding, and off-brand.
3. **Two background systems exist and neither is designed.** The app is a flat `#0A0A0B` fill; the videos are hand-rolled gradients plus flickering grid components, with their own duplicated `COLORS` object that can drift from the runtime tokens.
4. **The "cursor" in the videos is a CSS border-triangle.** It is the single cheapest-reading element in the renders.

The fix is sequenced, not simultaneous: **tokens → masters → exports → QA → only then video.** This document defines each stage precisely enough that the work can be judged mechanically (North Star §0's standard) instead of by vibe.

### Standing constraints this document operates inside

- **North Star §5–6:** premium means controlled; drama is rationed; subtle gradient lighting, soft edge glows, very-low-opacity texture, and metallic accent *moments* are allowed; constant animated backgrounds, neon-as-language, and contrast-reducing texture are banned. Reduced motion is always respected.
- **Brand §12:** the shield is its own frame — never inside a circle; the rounded-square container exists only for the OS app-icon slot; in-app marks render raw (no added glow, shadow, or container).
- **Brand §11 (AAA):** Accuracy + Accessibility + Aesthetic Integrity. Two of three is a fail.
- **Motion doctrine:** 150ms ease-in-out for UI state changes; no bouncy or game-like motion.
- **Token doctrine:** "Use the token, never the hex. A hex literal in JSX or CSS is a smell." Hexes in this document define tokens; they are never to be transcribed into code directly.
- **Product posture:** Omen is free indefinitely. "Premium" throughout this document means *craft quality*, never a paid tier. No copy or asset may imply one.

---

## 1. Iconography rebuild — the shield emblem

### 1.0 The root defect and the mandate

The emblem must be rebuilt **vector-first**: a single master SVG on a 1024-unit canvas, from which every raster (favicon set, app icon, OG image, video plates) is *exported by script*, never hand-resized. A PNG-only identity cannot be optically corrected, cannot ship size-appropriate detail tiers, and cannot be audited. This mandate is the whole ballgame; everything below is the geometry that master must satisfy.

### 1.1 Construction grid

- **Canvas:** 1024 × 1024 units. **Base module `m` = 64 units** (a 16 × 16 module grid). All major dimensions are whole or half multiples of `m`.
- **Fine grid:** 8 units (m/8) for detail work — lace bars, bevel offsets, wing feather cuts. Nothing is placed off the 8-unit grid. *Why:* the exported sizes (16/32/48/64/…) are all divisors or multiples of 8, so on-grid geometry lands on whole pixels at every export size instead of producing the soft, half-pixel edges that make small marks look blurry and amateur.
- **Radius scale:** a single scale `r = 8`, usable values `r, 2r, 4r, 8r` (8/16/32/64 units). Every rounded terminal — shield shoulders, wing tips, lace caps — draws from this scale. *Why:* mixed arbitrary radii are the most common tell of an unsystematic mark; a shared scale is what makes the shield, wings, and laces read as one object.

### 1.2 Optical centering — the math that fixes "it always looks off-center"

A shield is a bottom-tapering form: broad shoulders, converging apex. Its **visual mass sits above its bounding-box center**, so bounding-box centering inside a squircle always reads as "sagging low with a cramped apex." The fix is to center on the **silhouette centroid**, not the box:

1. **Define the optical center** as the area centroid of the filled silhouette (rasterize the silhouette at 1024px, threshold at 50% alpha, take the mean x/y of opaque pixels). This is scriptable — it becomes QA Gate G1 in §5, not a designer's eyeball call.
2. **Placement rule:** the centroid sits at **(50.0%, 48.5%)** of the squircle — dead-center horizontally, **1.5% above** geometric vertical center. *Why 48.5 and not 50:* aligning the centroid at exactly 50% still under-corrects, because the eye also weights the shield's hard top edge more than its soft tapered apex; nudging the whole mass ~15 units up on the 1024 canvas balances perceived weight. Tolerance: ±0.4% (±4 units at 1024). Beyond that, G1 fails the export.
3. **Apex breathing room (amended 2026-07-17, Stage 1 as-built):** apex clearance to the squircle bottom edge ≥ 1.5 m (96 units), with apex tip radius ≥ 1r. The rule's original ratio form (bottom gap ≥ 1.15 × top gap) was proven jointly infeasible with rule 2: it requires a silhouette centroid fraction ≥ 1/2.15 ≈ 0.465 of form height, and winged-shield silhouettes measure ≈ 0.42–0.44 — so the centroid rule wins and the apex is protected by an absolute floor instead. (Stage 1 master: clearance 192, passes.)
4. **Horizontal symmetry check:** the centroid x must sit within ±2 units of canvas center. If the wings are asymmetric (§1.4), this catches it mechanically.

**Container doctrine (restating Brand §12, which stays in force):** the squircle appears **only** in the OS app-icon/favicon slot. The squircle is the iOS-standard superellipse (corner radius ≈ 22.37% of side, continuous-curvature "squircle" corners, not a plain rounded rect). Everywhere else the shield floats raw.

**Presence inside the squircle (amended 2026-07-17, Stage 1 as-built):** the **full winged silhouette** spans **75% of the squircle width** (768 of 1024 units: shield proper 512, plus 32-unit gap and 96-unit wing per side), leaving 128 units — 4 lace-widths — of clearspace per side. The presence budget applies to the winged silhouette, not the shield alone; the original "shield = 76%" wording was arithmetically impossible with detached wings (778 + 2 × (32 + 96) > 1024). *Why 70–80% presence:* Apple's own icon grid puts primary forms at ~70–80% of tile; below 70% the mark looks timid at 60px on a home screen, above 80% it collides with the OS corner mask.

### 1.3 The laces (football element) — geometric rules

The laces are the emblem's one literal football signifier, so they must be unambiguous at every tier or dropped entirely — a mushy hint of laces is worse than none.

- **Count:** exactly **4 lace bars** crossing one spine. Fixed forever. *Why 4:* 3 reads as generic hatching, 5+ smears into texture below 64px; 4 is the minimum count that still scans as "laces."
- **Lace bar stroke weight `L`** = shield-proper width / 16 = **512 / 16 = 32 units** (grid-true; amended 2026-07-17 with the winged-silhouette presence budget above — the original 48 assumed a 778-unit shield). `L` is the emblem's **base unit of detail**: clearspace, minimum gaps, and cursor scale (§4) all derive from it, which is what keeps the system internally proportioned. Orientation as built: **4 vertical bars crossing 1 horizontal spine.**
- **Bar gap:** 1.25 × L. Below 1.2 × L the bars fuse at small sizes; above 1.4 × L they read as separate floating dashes.
- **Spine stroke:** 0.75 × L — visibly subordinate to the bars, so the bar rhythm dominates (that rhythm is what says "football").
- **Terminals:** all lace caps rounded at radius L/2 (i.e., stadium/pill caps) from the radius scale. No square caps anywhere in the mark.
- **Optical join correction:** where a bar crosses the spine, thicken the bar by +4% locally (2 units). Perpendicular strokes of equal weight create a perceived pinch at the crossing; the overshoot cancels it. This is classic type-design ink-trap logic applied in reverse.
- **Lace block placement:** the lace group's own centroid sits on the shield's vertical axis, its top edge at 38% (±2%) of shield height — upper-middle, where a football's laces actually sit, and clear of the apex taper. Within the ±2% band, grid quantization and optical placement win.

### 1.4 The side wings — symmetry rules

- **Mirror construction:** the left wing is authored; the right wing is a strict `scale(-1, 1)` mirror about the shield axis. Identical anchor count, identical handle lengths. Never two hand-drawn "matching" wings. *Why:* hand-matched near-symmetry is subliminally detectable and reads as sloppy; true mirroring costs nothing in SVG.
- **Wing chord angle:** the wing's leading edge runs parallel to the shield's shoulder tangent, within ±2°. *Why:* echoing the shield's own angles is what makes wings look grown from the shield instead of glued on.
- **Feather cuts:** 3 feather separations per wing, cut widths of 0.5 × L, terminal radii of r (8 units). Three is legible at 64px; more becomes noise.
- **Negative space:** minimum gap between wing inner edge and shield outer edge = 1 × L. Below that, the forms fuse into a blob at favicon sizes.
- **Wing mass budget:** each wing ≤ 18% of the shield's silhouette area. Wings are modifiers, not co-equal forms — and this cap is what keeps the centroid inside the §1.2 tolerance.
- **Wing tips:** tip terminal radius 2r; wing tips must not extend above the shield's top edge nor below 70% of shield height. They frame the shield's upper body; they do not race the apex.

### 1.5 Depth system — killing the flatness without breaking doctrine

Principle: **depth lives inside the silhouette.** Brand §12.2 bans outer glows, drop shadows, and containers on in-app marks — and that rule is correct; ambient haloes are how marks go mushy. All dimensionality below is internal rendering, fully compatible with §12.2.

**One light. Forever.** Key light from **top-left, 45° azimuth, ~60° elevation**, in every asset, every size, every video frame. A single committed light model is the difference between "rendered object" and "clip-art with gradients." Any asset whose highlights disagree with this light fails review.

Layered from back to front:

1. **Interior plate:** vertical linear gradient, Charcoal `#1C1C1E` (top) → Raven `#0A0A0B` (bottom). Subtle — the interior must stay near-black so the brass reads by contrast.
2. **Brass rim (the metal):** the shield border and wing/lace metalwork carry a 3-stop gradient along the light axis: `#C49035` (lit edge, = the existing accent-hover token) → `#A67C2E` Aged Brass (mid) → `#5A3A25` Umber (shadow side). *Why these three:* they are already the brand's sanctioned metal ramp (accent-hover / accent / umber), so the "new" depth introduces zero new hues — the emblem gets richer while the palette stays seven colors.
3. **Inner bevel (vector-only):** a 8-unit inner stroke pass — lightened edge (`#C49035` at 60% opacity) on light-facing edges, darkened (`#0A0A0B` at 50%) on shadow-facing edges. This is a *drawn* bevel: two offset paths, not a Photoshop layer style. Vector bevels export losslessly at every size and can be dropped per-tier; raster effects cannot.
4. **Specular sheen:** one static diagonal highlight sweep across the upper-left brass, white at ≤ 8% opacity, hard-masked to the metal. Static always — an animated sheen loop is exactly the "game menu" energy North Star §6 bans. Metallic *moment*, not metallic *loop*.
5. **Micro-grain:** SVG `feTurbulence` (fractalNoise, baseFrequency ≈ 0.9, single octave) masked to the metal only, ≤ 3% opacity, **applied only at export sizes ≥ 256px**. *Why the size gate:* below 256px grain aliases into dirt. Why at all: perfectly clean gradients read as plastic; 2–3% noise is the difference between "brass" and "beige gradient."

**Explicitly banned:** outer glow, long shadows, chrome/rainbow gradients, more than one light source, lens flares, animated sheen. Every one of these is a flatness *cover-up*; the layers above are flatness *removal*.

### 1.6 Size-tier matrix

One master, three cuts. Detail that cannot survive a size is removed at that size, never squeezed:

| Tier | Sizes | Geometry | Rendering |
|---|---|---|---|
| **Small cut** | 16, 32, 48 | Shield + spine only. **No lace bars, no feather cuts,** wings simplified to solid forms (or dropped at 16 if G4 legibility fails) | Flat 2-tone: Brass `#A67C2E` on Raven. No gradients, no bevel, no grain |
| **Mid cut** | 64, 180 | Full geometry, with the lace block re-proportioned and **pixel-locked to the 64px grid** (see "64-lock rule" below): bars 1.5 × L, gaps 1.0 × L, spine 1.0 × L; ink-trap correction dropped at this tier (sub-pixel at 2–3px strokes) | Rim gradient only; no inner bevel, no grain, no sheen |
| **Full cut** | 256, 512, 1024, video/OG | Full geometry as authored | All five depth layers |

**Stage 1 as-built record (2026-07-17).** The master (`Brand/masters/emblem-master.svg`) is authored with the whole emblem **one 16-unit step above the drafting-proposal position** (shield y 224 → 832, wings y 272 → 640): the pre-shift layout measured a silhouette centroid of (50.000%, 50.29%) and **failed Gate G1**; the shifted geometry measures **(50.000%, 48.713%)**, inside the 48.10–48.90% band (computed by Green's-theorem integration over the exact paths, `scripts/` QA tooling to reproduce in Stage 2). A −16 translation is the unique in-band option that preserves the 16-grid lock. All absolute coordinates below reflect the shifted position.

**The 64-lock rule (mid cut).** At 64px, one device pixel = 16 master units (1024 / 64), so a crisp export requires every **edge coordinate** of the lace block — not just stroke dimensions — to sit on multiples of 16. Dimensions that are multiples of 16 but *positioned* off the 16-grid still straddle pixels and blur. Consequences, worked for the Stage 1 drafting geometry (shield proper 512 wide, L = 32):

- **Bars: stroke 48 (3px), gaps 32 (2px), pitch 80 (5px)** — block x 368 → 656, every edge a multiple of 16. The full cut's bar/gap ratio inverts at this tier (bars heavier than gaps), which is correct small-size compensation: bold bars carry the lace rhythm at 64px.
- **Gap arithmetic constraint:** with four bars symmetric about the axis, the center gap straddles x = 512, so inner bar edges sit at 512 ± gap/2 — the gap must therefore be a multiple of 32 to land on the 16-grid. A 48-unit gap (1.5 L) was evaluated and rejected: it puts inner edges at 512 ± 24, a half-pixel at 64px, defeating the lock.
- **Spine: stroke 32 (2px)**, y 496 → 528, x 336 → 688 (symmetric, one gap of overshoot past the outer bars).
- **Bars vertical: y 464 → 560** (height 96 = 6px). Block top lands at 39.5% of shield height — inside the §1.3 ±2% band; quantization wins.
- **Wings at mid cut:** equal blade roots 112/112/112 with 16-unit cuts, wing y 272 → 640, putting every blade edge (384, 400, 512, 528, 640) on the 16-grid.
- **180px caveat:** 180 is non-dyadic (÷5.689) — no parameter choice can pixel-lock it, so the mid cut optimizes for 64 and relies on supersampled downscale for 180. The export script (§5 Stage 2) encodes these mid-cut overrides; the master's full-cut geometry is untouched, so Gate G1 (centroid) is unaffected — the lace block is interior detail, not silhouette.

The favicon HTML must be re-wired to reference the currently-orphaned 48/64 exports (they exist in `frontend/public/` but nothing links them). Also add an `SVG favicon` (`<link rel="icon" type="image/svg+xml">`) built from the small cut — modern browsers get vector crispness at every zoom, PNGs remain the fallback.

---

## 2. Typography & collision system

### 2.0 Decision: a new stack (supersedes Alegreya, pending ratification)

**Directed by Justin 2026-07-16:** the blueprint proposes a **new pairing**, superseding the Alegreya Sans / Alegreya stack. This amends `Brand/brand-system.md` §8 and the 2026-06 "active font stack" decision-log entry **upon Justin's approval of this document** — until then, no code changes, and the `assertFontImportBaseline()` CI gate stays untouched.

*Honesty note (Accuracy leg of AAA):* part of what reads as "heavy and colliding" today is execution, not family — the Remotion project loads **no** fonts (Arial/Georgia fallbacks), weights run 800–900 at ~0.98 line-height, and the Alegreya serif was specified but never loaded. The new stack fixes the identity problem *and* this spec fixes the execution problem; adopting new fonts without §2.4's loading discipline would reproduce the same failure in nicer clothes.

### 2.1 The stack and the why

Brief: dark, elite, analytical, highly polished — Linear-app utility × modern interactive-gaming aesthetics, with Omen's oracle warmth intact.

| Voice | Family | Weights | Role | Why |
|---|---|---|---|---|
| **Broadcast** (display) | **Archivo** (variable; width axis 110–125 "SemiExpanded–Expanded") | 600–700 | Page titles, hero headlines, video headline cards, DecisionBrief titles | Expanded grotesk = athletic, broadcast-scoreboard authority. Width does the work boldness was faking: Archivo 600 SemiExpanded has more presence than Alegreya Sans 800, at two full weight steps lighter — this is what un-heavies the system |
| **Console** (UI/body) | **Inter** (variable) | 400–600 | All UI text, body copy, forms, nav, video sub-lines and captions | The proven utility backbone of the Linear-class aesthetic: huge x-height, open apertures, screen-hinted, `tnum` tabular numerals. Disappears into legibility, which is precisely the job |
| **Ledger** (data) | **JetBrains Mono** | 400–600 | Stat cells, scores, tickers, confidence numerals, code-adjacent | Replaces DM Mono: DM Mono caps at 500 with no bold for emphasis-in-data; JetBrains Mono adds 600, clearer 0/O and 1/l/I disambiguation at small sizes, and tighter vertical rhythm in dense tables |
| **Oracle** (ritual accent) | **Fraunces** (variable, `opsz` + italic) | 400–500 italic | *Rationed:* Omen-reveal moment, one landing pull-quote, video prophecy lines. Never UI chrome, never body | The mythological warmth ("warm, not sterile" — North Star §5) the grotesks can't carry. Scarcity is the design: one serif whisper against a disciplined grotesk field reads as ritual; used widely it collapses into decoration |

All four are Google Fonts, variable-axis, self-hostable. **Hard bans:** weights ≥ 800 anywhere (the current videos' 800–900 usage is the single largest "amateur" signal — max-weight everything means nothing has weight); more than these four families; Fraunces in UI chrome; Cormorant Garamond and Cinzel remain banned (prior decisions stand).

### 2.2 Scale tables

Letter-spacing rule of thumb this system obeys: negative tracking at display sizes (large glyphs drift apart optically), zero at body, positive at small caps/labels (small glyphs crowd).

**App (product UI):**

| Token | Family / weight | Size / line-height | Tracking | Use |
|---|---|---|---|---|
| `display` | Archivo 700, width 120 | 48 / 1.05 | −0.02em | Marketing hero only |
| `h1` | Archivo 650, width 115 | 32 / 1.10 | −0.015em | Page titles |
| `h2` | Archivo 600, width 110 | 24 / 1.15 | −0.01em | Section heads |
| `h3` | Inter 600 | 20 / 1.25 | −0.005em | Card titles |
| `body` | Inter 400 | 16 / 1.50 | 0 | Reading copy |
| `body-sm` | Inter 400 | 14 / 1.45 | 0 | Secondary copy |
| `label` | Inter 600 | 12 / 1.20 | +0.06em, uppercase | Eyebrows, chips |
| `data` | JetBrains Mono 500 | 14 / 1.40 | 0, `tnum` | Stat cells, scores |
| `data-lg` | JetBrains Mono 600 | 24 / 1.20 | −0.01em | Confidence numerals |
| `oracle` | Fraunces 450 italic, opsz auto | 22 / 1.40 | 0 | Ritual moments only |

**Video overlays — 1920 × 1080 (horizontal):**

| Role | Family / weight | Size / line-height | Tracking | Limits |
|---|---|---|---|---|
| Headline | Archivo 700, width 120 | 92 / 1.04 | −0.02em | Max 2 lines, ≤ 18 chars/line |
| Sub-line | Inter 500 | 40 / 1.30 | 0 | Max 2 lines |
| Caption (lower-third) | Inter 500 | 44 / 1.25 | 0 | Max 2 lines, on plate (§2.3) |
| Ticker / stat | JetBrains Mono 500 | 28 / 1.20 | +0.04em, uppercase | Single line |
| Oracle line | Fraunces 450 italic | 54 / 1.30 | 0 | ≤ 1 per video |

**Video overlays — 1080 × 1920 (vertical):** headline 104/1.04 (≤ 12 chars/line), sub 44/1.30, caption 48/1.25, ticker 30, oracle 58. Sizes rise because vertical video is consumed at arm's length on phones with platform chrome overlaying the frame.

*Line-height floor:* nothing renders below 1.04 — the current ~0.98 practice causes literal ascender/descender collision between lines, which is a large part of the "collides with captions" complaint.

### 2.3 The collision system (video)

Text collisions are a **layout contract** problem, not a font problem. Three rules make collisions structurally impossible instead of case-by-case fixed:

1. **Safe-area maps (reserved zones, no exceptions):**
   - *1080 × 1920 vertical:* top 220px dead (platform UI: username, sound toggle); bottom 320px dead (captions bar, progress, CTA chrome); 64px side margins. Content lives in the middle 1380px.
   - *1920 × 1080 horizontal:* 5% dead margin all sides; lower-third caption zone is the band from 72%–90% of frame height; headlines live in 12%–60%.
2. **The caption plate:** captions never sit on raw footage or gradients. They sit on a plate: Raven at 82% opacity, 24px corner radius (2 × the app's card radius — video reads at distance), 32px padding, 1px `#3A3A3C` hairline. Contrast is measured **against the plate**, not the background: Bone-on-plate ≥ 7:1 always. *Why a plate:* it is the only caption treatment that survives arbitrary backgrounds — outlines and drop-shadowed text are the YouTube-thumbnail look this rebuild exists to escape.
3. **Z-contract (fixed layer order):** environment (§3) → screenshots/footage → emblem → plates → text → cursor (§4). Consequences: text never overlaps the emblem (if a layout wants both, the emblem yields position); one headline block per frame; sub-line enters only after (or clearly subordinate to) the headline; nothing enters the lower-third zone except captions/ticker.

### 2.4 Loading & migration guardrails (implementation phase, sequenced)

1. **App:** self-host WOFF2 subsets (latin) of all four families via `@font-face` in `frontend/src/index.css` with `font-display: swap`. Self-hosting beats Google's CDN for the CSP posture and removes a third-party request from first paint.
2. **CI gate amended, not deleted:** `assertFontImportBaseline()` currently fails on any `@font-face` — by design, so fonts can't land silently. Amend it to a **whitelist assertion**: exactly the four approved families, `@import` count 0, fail on anything else. The gate's job (no silent font drift) is preserved; only its baseline changes. This edit ships in the same PR as the font swap, never before.
3. **Remotion:** fonts load explicitly via `@remotion/google-fonts/*` imports (or bundled `@font-face` through `staticFile`). Add a render-time assertion that `document.fonts.check()` passes for each family before frame 0 — **a fallback render becomes a build failure, not a silent Arial video.**
4. **Docs:** decision-log entry superseding the Alegreya decision; `Brand/brand-system.md` §8 rewritten to the new stack; `page-system.md` typography rows flagged; `component-lock-v1.md`'s Cinzel/Inter scale formally retired (this section replaces it).

---

## 3. Background & environment engine

### 3.0 Design position

A flat fill is not "restraint" — it is absence. But the answer is not "add effects"; it is a **single layered environment model** shared by app and video, tokenized, with motion rationed by context. The metaphor is the brand's own: a **film-noir front office at night** — one desk lamp (radial light), the city grid faint through the window (depth grid), film stock (grain), walls falling to black (vignette). Every layer maps to that one picture, which is what makes the result cohesive instead of a pile of overlays.

### 3.1 The five layers (bottom → top)

| # | Layer | Spec | Proposed tokens | Why |
|---|---|---|---|---|
| 1 | **Base** | Solid `--color-bg` (Raven) | *(existing)* | Anchor; OLED-true black-adjacent |
| 2 | **Radial light field** | 1–2 large soft radial gradients, ellipse ≥ 120% of viewport width, center in the upper third. Hue is context-keyed: Verdigris on decision surfaces, Brass on brand/marketing moments, Crimson *only* for risk-critical ritual. Peak alpha ≤ 0.18, falling to 0 by 65% radius | `--env-light-1-color`, `--env-light-1-pos`, `--env-light-1-alpha` (& `-2`) | The "one desk lamp." Directional light creates space. Color-matching to the surface's accent makes environments feel *lit by the content*. Alpha cap keeps every text-contrast ratio intact (Accessibility leg) |
| 3 | **Depth grid** | 1px hairlines, 96px cell, `#3A3A3C` at ≤ 6% opacity, masked by a radial falloff so it only exists inside the light field. Video may run a second plane at 128px/3% for parallax; app gets one static plane | `--env-grid-size`, `--env-grid-opacity` | Says "analytical instrument" quietly. The falloff mask is the craft move — a uniform full-bleed grid is wallpaper; a grid revealed by light is an environment |
| 4 | **Film grain** | Tiled monochrome noise (SVG `feTurbulence` or 256px PNG tile), 2–3% opacity, `overlay` blend. **Never over dense reading text** — excluded from long-form copy containers | `--env-grain-opacity` | Kills gradient banding on dark radials (a real artifact killer, not just taste) and adds the film-stock unity that makes separately-made assets feel same-world |
| 5 | **Vignette** | Radial edge darkening, ~8% at corners, 0 by 70% from center | `--env-vignette-alpha` | Pulls the eye centerward; frames without a frame |

**Presets** (token bundles, the only sanctioned combinations):

- **`console`** (app default): light-1 Verdigris @ 0.10, grid 4%, grain 2%, vignette 6%. Static. Whisper-quiet.
- **`ritual`** (Omen reveal, post-win): light-1 Brass @ 0.18 + light-2 Verdigris @ 0.08, grid 6%, grain 3%, vignette 8%. Motion only as a *moment* (a single 400ms light swell on reveal), then static.
- **`broadcast`** (video): ritual values + sanctioned drift (below).

### 3.2 Motion policy

- **App:** environment layers are **static**. Motion happens only as moment-triggered transitions (reveal swell, post-win pulse) per North Star §6's allowed list; nothing loops. `prefers-reduced-motion` suppresses even the moments.
- **Video:** slow drift allowed — full-scene scale 1.00 → 1.04 across the entire scene duration, and parallax grid planes offset ≤ 12px. **No pulsing loops, no flicker.** The current `DataGrid`/`ScoreboardStrips` sine-flicker components are retired: rapid cyclic luminance is slot-machine grammar (banned: "sportsbook loud"). If a data-motif is wanted in video, it is the depth grid with a *single* slow illumination pass, once per scene.

### 3.3 One source of color truth

The Remotion project's private `COLORS` object is retired. New contract: **`Brand/tokens/omen-tokens.json`** — schema `{ color, env, type, motion }` — is the single machine-readable source; `frontend/src/index.css` custom properties and the Remotion project both consume it (build-time generation for CSS, direct import for Remotion). Until the generator exists, the JSON still ships and a CI check greps the Remotion source for hex literals — same "hex in code is a smell" doctrine, now enforced where it was drifting. *(Implementation is pipeline stage 0, §5.)*

---

## 4. Motion cursor & interactive paths

### 4.0 Scope decision

**Directed by Justin 2026-07-16:** the custom cursor applies to **video renders + marketing surfaces** (landing, `/about`, public share pages). Product tool routes (`/football`, `/omen`, `/trade`, `/draft`, account/connect flows) and **all form fields everywhere** keep native cursors. *Why the boundary:* dense tables and forms need OS-grade pointer precision, and a themed cursor in the workspace is "game menu" energy — the front office uses a real pen. On marketing surfaces, atmosphere is the job, so the cursor joins the brand. Zero accessibility cost where users do real work; full immersion where they browse.

### 4.1 The asset — "the Sight"

A pointer derived from the shield's own apex geometry — the emblem's tip, drawn as an instrument:

- **Form:** chevron-tipped pointer using the shield apex angle exactly; tail notched with a single feather cut (§1.4 grammar). It visibly belongs to the emblem without being a mini-logo.
- **Construction:** 32 × 32 SVG master, geometry on the same 8-unit fine grid (at 1/32 scale), tip occupying the top-left quadrant per the §1.5 light model.
- **Color:** Bone `#F5F0E8` fill, 1.5px Aged Brass `#A67C2E` edge, 1px Umber `#5A3A25` @ 30% offset (+1,+1) for separation from both dark and light plates. Bone-on-dark matches how the OS white pointer behaves — recognizably *a cursor*, distinctly *ours*.
- **Hotspot:** the exact apex tip at **(2, 2)**, declared in the `.cur`/CSS. A beautiful cursor that clicks 6px off its visual tip is worse than the default — hotspot accuracy is a hard QA gate.
- **Deliverables:** `cursor-default`, `cursor-hover`, `cursor-active`, `cursor-text` (I-beam: Bone bar with brass crossbars), `cursor-drag` (chevron with grip notch) — SVG masters + 32px/64px (2×) PNG + `.cur` exports.

### 4.2 Interactive states (marketing surfaces)

Implemented as **CSS-only cursor swaps** (`cursor: url(...) 2 2, auto` with state variants applied via selectors on interactive targets). **Explicitly banned: JS-follower cursors** — a div chasing the pointer with easing lag. That lag reads as jank, costs a compositing layer, and is the #1 "agency site 2019" cliché. The real pointer *is* the cursor.

| State | Trigger | Change | Why |
|---|---|---|---|
| Default | — | Base asset | — |
| Hover | over link/button/card | Swap to `cursor-hover`: edge brightens to `#C49035`, +15% scale (pre-rendered asset swap — cursors can't transition, so the two assets are drawn as keyframes of one motion) | Same brass-brightening grammar as button hover: one hover language everywhere |
| Active | mousedown | Swap to `cursor-active`: 90% scale, tip fills Verdigris | Verdigris = "signal registered" — the confirm color confirms the click |
| Click feedback | mousedown | A one-shot 150ms ease-in-out ring (24 → 40px, 1.5px Verdigris stroke, fade to 0) spawned **at the click point** — DOM element, not cursor asset | The one sanctioned flourish: single, quick, motion-doctrine-compliant. No ripple trains, no bounce |
| Text | over text inputs / selectable copy | Branded I-beam; **inputs may simply fall back to native** | Precision contexts get precision tools |

**Accessibility rules (hard):** `prefers-reduced-motion` disables the click ring (asset swaps remain — they're instant, not motion); `forced-colors: active` and `pointer: coarse` (touch) fall back to native cursors entirely; every state asset ships a light-theme variant (Charcoal fill, brass edge) since marketing pages support light mode.

### 4.3 Video path choreography (replacing the CSS triangle)

The `MouseCursor` border-triangle in the Remotion project is retired. Its replacement is the same §4.1 asset, driven by a choreography spec:

- **Easing:** `cubic-bezier(0.32, 0, 0.15, 1)` — decisive acceleration, soft landing, **no overshoot**. An overshooting cursor looks drunk; this curve looks like an operator who knows where the button is.
- **Speed floor:** ≥ 20 frames (30fps) per 800px of travel; never teleport, never cross most of the frame in under 12 frames.
- **Dwell:** ≥ 18 frames stationary on the target *before* the click fires — the viewer's eye needs to arrive and settle first; instant-click is why the current reels feel bot-driven.
- **Click:** the §4.2 active-state swap + Verdigris ring, held 8 frames before the UI responds. Cause, then effect, readable at a glance.
- **Path shape:** single gentle arc per movement (one quadratic control point, perpendicular offset ≤ 10% of travel distance). Straight lines read robotic; multi-curve wander reads aimless.
- **Scale:** cursor renders at 48px in 1080p frames, 64px in vertical 1920-height frames — larger than OS-real because video is watched at distance; the drop shadow doubles (2px @ 30%) for footage separation.

---

## 5. The asset-creation pipeline

The contract: **no Remotion work resumes until every gate below is green.** Each stage names its output and its exit gate. Rebuild order is dependency order — tokens before masters (masters consume token colors), masters before exports, exports before video.

### Stage 0 — Tokens (`Brand/tokens/omen-tokens.json`)
Output: the §3.3 JSON (color + env + type + motion values from this document). CSS/Remotion generator-consumption may land later, but the file is the reference from day one.
**Gate G0:** every hex in the JSON exists in the brand palette or runtime tokens (no new colors smuggled in); reviewed against `frontend/src/index.css`.

### Stage 1 — SVG masters (`Brand/masters/`)
Output: `emblem-master.svg` (full cut, 1024), `emblem-mid.svg`, `emblem-small.svg`, `wordmark-master.svg`, `cursor-{default,hover,active,text,drag}.svg` (+ light variants), `tile-grain.svg`, `tile-grid.svg`, `plate-og.svg` (1200×630 template), `plate-video-{title,end}.svg`.
**Gates:** **G1 optical center** — scripted centroid check per §1.2 (50% ± 0.4%, 48.5% ± 0.4%); **G2 geometry audit** — lace weights, wing mirror (path-data diff), radius-scale membership, on-grid anchors; **G3 light audit** — every gradient angle consistent with the one light (visual review against §1.5).

### Stage 2 — Scripted exports (`scripts/export-assets.mjs`, Node + `sharp`/`resvg-js`)
Output: full favicon set 16→512 (each from its correct §1.6 cut) + SVG favicon, `omen-favicon-app-icon.png` 1024 (squircle composite — the only containered render), OG image, cursor PNG/`.cur` set, video plates. Deterministic: same masters + same script = byte-identical output; **hand-exported assets are banned from the repo.**
**Gate G4 size-tier legibility:** contact sheet of every favicon at 100% (no zoom) — shield silhouette identifiable and laces either crisp or absent at every size; screenshot evidence attached to the PR.

### Stage 3 — Distribution
`logos/` (canonical) and `frontend/public/` (served mirror) updated **in the same commit** (Brand §12 rule); `index.html` re-wired to reference the 48/64 exports and the SVG favicon; manifest icons re-pointed.
**Gate G5:** contrast sweep passes; deploy verification (the existing bundle check for the transparent lockup) still green.

### Stage 4 — Typography landing
Per §2.4: WOFF2 subsets + `@font-face`, amended `assertFontImportBaseline()` whitelist in the same PR, scale tokens, doc reconciliation (brand §8, decision log).
**Gate G6:** gate green with new baseline; light+dark screenshots of every type token; zero non-whitelisted families reachable in the bundle.

### Stage 5 — Environment landing
`--env-*` tokens + the three presets in CSS; grain/grid tiles from Stage 1; reduced-motion verified.
**Gate G7:** contrast sweep on every text token *over the console preset* (not over flat Raven) — the environment may not cost a single AA ratio.

### Stage 6 — Cursor landing (marketing surfaces)
Assets + CSS swaps + click-ring; native fallbacks verified for touch/forced-colors/reduced-motion.
**Gate G8:** hotspot accuracy test (click targets at asset tip), state swap latency imperceptible, no JS follower anywhere.

### Stage 7 — Video system reboot (only now)
Remotion consumes: tokens JSON (no local `COLORS`), loaded fonts with the frame-0 assertion, environment `broadcast` preset, §2.2 video scales, §2.3 safe-area/plate/z-contract, §4.3 cursor choreography. The `DataGrid`/`ScoreboardStrips` flicker components and the CSS-triangle `MouseCursor` are deleted.
**Gate G9 (per render, the new video DoD):** fonts asserted ≥ frame 0; all text inside safe areas; captions on plates ≥ 7:1; one light direction; cursor obeys choreography spec; no banned effects (§1.5 list, §3.2 bans). A render failing any check does not ship.

### Naming & location conventions
Masters: `Brand/masters/` (new). Tokens: `Brand/tokens/` (new). Exports keep existing names/locations (`logos/` + `frontend/public/` mirror) so no reference re-plumbing beyond the favicon re-wiring. Export script + QA scripts live in `scripts/`. Every generated file carries a `<!-- generated from Brand/masters/… — do not hand-edit -->` comment where the format allows.

---

## 6. Reconciliation register

What this document changes in the doc corpus, effective **upon Justin's approval** (nothing moves before that):

| Document | Effect |
|---|---|
| `Brand/brand-system.md` §8 (type) | **Superseded on approval:** Alegreya Sans / Alegreya → Archivo / Inter / JetBrains Mono / Fraunces (rationed). Palette §8, voice, and logo doctrine §12 remain fully in force — this blueprint builds *on* §12, adding the internal-depth and optical-centering layer it lacked |
| Decision log entry "active font stack = Alegreya…" (2026-06) | Superseded by a new dated entry (recorded 2026-07-16 as *proposed*, ratified with this doc) |
| `omen-ux-ui-design-system-v1.md` DM Mono reconciliation flag | Closed — resolved by replacement (JetBrains Mono), not by back-porting DM Mono into brand-system §8 |
| `component-lock-v1.md` type scale (Cinzel/Inter) | Formally retired; §2.2 is the type scale of record. The component *API* content remains governed by North Star §4/§8 status (unchanged) |
| `page-system.md` typography rows | Stale pending migration; rows updated as each page migrates (North Star Phase 2 order) |
| `Brand/promos/omen-coming-soon/` | All compositions non-conforming; halted. Resume only through §5 Stage 7 / Gate G9 |
| `assertFontImportBaseline()` (contrast-sweep.mjs) | Amendment authorized (whitelist form, §2.4) — **only** in the same PR as the font swap |
| North Star, suppression banners, team-theme contract | **Untouched.** This document slots beneath the North Star as an asset-foundations companion and contradicts none of §5–§7 |

Open items ratification does *not* cover (each needs its own decision later): executing the font swap PR, authoring masters/scripts (Stages 0–6), wordmark redraw with a type designer (brand §12.3's standing note), and any change to the seven-color palette (none proposed — this blueprint deliberately adds zero new hues).

---

## 7. Plain-English summary

The emblem stops being a picture and becomes geometry: one vector master, one light source, math that keeps it centered because a script checks the centroid, and detail that steps down honestly at small sizes instead of smearing. Type stops shouting: width and structure replace 900-weight bolding, captions get a plate and a safe zone so collision is impossible by construction, and a render that falls back to Arial fails the build instead of shipping. The background becomes one lit room — lamp, grid, grain, vignette — whispering in the app, drifting slowly in video, identical in color because both read the same token file. The cursor becomes the shield's own tip, precise where users work and atmospheric where they browse. And none of it is re-improvised per asset again, because the pipeline runs tokens → masters → exports → gates, and video work only restarts when the gates are green.
