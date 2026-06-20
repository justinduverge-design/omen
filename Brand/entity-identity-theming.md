# Entity Identity Theming — Methodology

**Status:** v1, authored 2026-06-20 alongside Corvus Phase 1.5e
**Author:** Claude, prompted by Justin's directive: *"we need to add this type of clarification to our template so that when we make the next app we have a head start at desining"*
**Worked example:** [Blueprints/audits/2026-06-20-phase1-5e-32-team-identity-audit.md](../Blueprints/audits/2026-06-20-phase1-5e-32-team-identity-audit.md)
**Promotion candidate:** This doc is currently L2 (Corvus) but its content is product-agnostic. Surface for promotion to L0 (slops-os) or L1 (slops-saloon) when a second product adopts entity-affinity theming, so it becomes the inherited starting point.

---

## When this methodology applies

Any product where the **user self-identifies with an entity**, and that entity has **fan-perceived visual identity** (colors fans actually associate with it — often different from the entity's official brand book).

Examples that qualify:

- Sports teams (Corvus — NFL)
- Music artists / albums (a fan-listening app where users pick a favorite act)
- Anime franchises, character rosters
- Game franchises, esports orgs
- Universities, fraternities, political affiliations
- Car brands, motorcycle brands, watch brands — anything with a partisan fan base

Examples that **don't** qualify:

- B2B SaaS where users have no emotional tie to a tracked entity
- Generic consumer apps where colors are purely functional (a calendar, a notes app)
- Products where the "entity" is the user themselves (a personal-customization color picker isn't this methodology — it's just preferences)

---

## The core insight

**Fan identity ≠ official brand book.** Fans see the entity through their lived experience — what shows up in the stands, on streetwear, in hip-hop lyrics, in 1980s TV intros. Pulling colors straight from the official primary/secondary fields usually misses what the fan actually feels.

The Dallas Cowboys' official primary is `#003594` (royal blue) and they have a silver/white secondary, but every Cowboys fan sees **silver helmet on white pants with a star**. Forcing them into a dark-navy app fights the identity. The Phoenix-area Cardinals' official red is `#97233F` on a charcoal helmet, but the **Jordan 6 "Toro Bravo"** colorway — red leather on white sole — captures the fan-perceived energy better than the helmet does.

The methodology's job is to **surface that fan-perceived identity systematically**, so when a new product launches with N entities, the team doesn't ship N generic accents pulled from N style guides.

---

## The six principles

### 1. Entity identity is found, not derived

Don't compute identity from `(primary, secondary)`. **Find it** — what does this entity *feel* like to a fan? Read fan forums, listen to game broadcasts, look at fan-art, check what streetwear collabs the entity has done. The output is a **fan-identity sentence**:

> "Royal blue + red, Buffalo wing sauce, Zubaz pants, snow stadium" (BUF Bills)
> "Miami Vice aqua + coral + sun-bleached pastel" (MIA Dolphins)
> "Pure black + silver, outlaw 'Black Hole' aesthetic" (LV Raiders)

If you can't write a fan-identity sentence for an entity, you haven't researched it yet.

### 2. Three palette decisions per entity, in this order

For each entity, decide:

**a. Surface axis — light or dark?**
The entity's lived visual identity is either inherently light (beach, sun, white-helmet, pastel-era TV) or inherently dark (night-stadium, gothic, industrial, forest, pirate). **This is a per-entity decision, not a per-user preference.** Forcing a beach team into a dark-stadium aesthetic is the same mistake as putting a gothic-rock entity on a sun-bleached canvas.

**b. Accent identity color.**
The color a fan would draw if asked "this entity is ____ colors." Often **not** the official primary. The Steelers' official primary is near-black `#101820` — the identity color is gold `#FFB612` (their secondary). The Eagles' identity is midnight green `#004C54` even though they have black + silver in the palette.

**c. Cultural reference (when needed).**
If the official palette is flat, generic, or doesn't carry the fan-perceived identity, **anchor to a specific named cultural object**: a sneaker colorway, a film, a music album, a regional reference, a historical event. Cite it. Pull a specific hex from it.

> ARI Cardinals → **Jordan 6 "Toro Bravo"** (2014, red leather + white sole, `#97233F`)
> MIA Dolphins → **Miami Vice (TV 1984–89)** (aqua + coral + cream pastel)
> BAL Ravens → **Edgar Allan Poe's "The Raven" (1845, Baltimore)** (gothic violet + jet black + parchment)

This citation matters because the **next designer who reads the doc** can verify the source and adjust the palette themselves. "Because I felt it" is not a transferable design decision; "because of Toro Bravo" is.

### 3. The `textSafe` trap

Most theming systems lift dark accents toward the contrast range by raising HSL lightness. This works for most colors. It breaks for **near-neutral accents** (silver, near-black, near-white).

Why: HSL lift preserves hue mathematically. But for a near-neutral color like silver `#A5ACAF`, the dominant RGB component is whichever is slightly higher than the others (here, B). Lifting saturation-preservingly pushes that component up faster than the others, so silver becomes **cool-blue** at L=58. The fan sees blue, not silver.

**Detection rule:** if accent's HSL saturation < 10%, **clamp the hue-shift** — lift lightness only, keep saturation pinned. Or hand-pick the lifted hex from the cultural anchor (Air Max 97 "Silver Bullet" is `#C0C0C0` lifted, not `#8ab7ca`).

### 4. Special-case templates beat universal recipes

Plan for ~10–20% of entities needing per-entity special cases. Examples from Corvus 1.5e:

- **Falcons "Bred" template** — pure black surface, no team-hue derivation, primary-color CTA (Jordan 1 Bred homage)
- **Saints flip** — primary is gold, secondary is black, so derive surface from secondary instead of primary
- **TB pewter** — surface should be pewter (helmet) not bloody-red (jersey)

A theming system built only around universal recipes will fight you on these. Build the special-case mechanism in from day one as a `getTemplate(abbr)` switch, not as an afterthought.

### 5. Hue-collision check at the end

Once you've lifted every entity's accent through `textSafe`, run a pairwise comparison on the final set. If two entities end up with accents within ΔE < 8 of each other, the user can't tell them apart at runtime — they're effectively the same color in the UI.

Corvus 1.5e found three teams (HOU, NYG, ATL) collapsing to identical lifted accent `#e3455e` because all three had curated `accent: '#A71930'` (Texans Battle Red, Giants secondary red, Falcons varsity red). The fix at the audit level was: flip NYG to royal-blue primary (resolves the collision and aligns with "Big Blue" fan identity); fix Bred to bypass `textSafe` (preserves Falcons varsity red); deepen HOU lift.

Run the hue-collision check **before** declaring the system done, not after.

### 6. The methodology is a doctrine, not a tool

The specific recipes (L=8 for dark surfaces, sat × 0.5 multiplier, L=92 for light surfaces) will change as the design language evolves. The **principles** persist — find fan identity, axis is per-entity, cite cultural anchors, watch for the textSafe trap, plan for specials, check for collisions.

When a new SLOPS product adopts this methodology, it imports:

- This doc (the principles)
- A worked example (Corvus 1.5e audit)
- The audit template format (table shape, cultural-anchor index, defect catalog)

Then it does its own entity research. The new product's recipes will probably be different. That's fine.

---

## The audit process

For a new product with N entities, run this sequence:

### Step 1 — Inventory

List every entity the product needs to theme. For each, capture from the official source:

- Display name
- Division / category / group (used for grouping in pickers)
- Official primary color (hex)
- Official secondary color (hex)
- Any official tertiary / alternate colors

### Step 2 — Fan-identity sentence per entity

For each entity, write 1–2 phrases capturing the fan-perceived identity. Use fan forums, broadcast graphics, streetwear, music, film — whatever sources actually exist for this domain.

### Step 3 — Per-entity axis decision

For each entity, decide: light or dark surface? Use the fan-identity sentence as evidence. Default is dark unless the identity is inherently light (beach, sun, white-canvas, pastel-era).

Expected distribution: ~80% dark, ~20% light. If you end up 50/50, you're probably overusing light — most fan identities are night-stadium / forest / industrial / gothic.

### Step 4 — Per-entity accent decision

For each entity, decide: which color does the fan see as the entity's color?

- **If the official primary carries identity:** use it.
- **If the official secondary carries identity better:** use it (mark as `scheme: 'secondary'`).
- **If neither official color carries identity:** find a cultural anchor (sneaker, film, music, region, era) and cite a specific hex from it. Mark as `scheme: 'cultural'` with a `culturalAnchor` field naming the source.

### Step 5 — Cultural-anchor citation table

For every entity using `scheme: 'cultural'`, add a row to a Cultural Anchor Index:

| Entity | Anchor | Year | Hex source | Why |
|---|---|---|---|---|

This is the single source of truth for future designers to verify and adjust.

### Step 6 — `textSafe` lift + saturation clamp

Run each accent through `textSafe()` (lift to AA contrast on the entity's chosen axis). For near-neutral accents (sat < 10%), **clamp the hue-shift** — lift L only, keep S pinned.

### Step 7 — Special-case templates

Identify any entity whose surface needs a per-entity recipe (Falcons Bred, Saints flip, etc.). Build the special case explicitly. Document why.

### Step 8 — Hue-collision check

Compute ΔE between every pair of entities' final lifted accents. Flag any pair with ΔE < 8. Resolve via accent re-choice (flip primary↔secondary, swap to cultural anchor, etc.).

### Step 9 — Two-axis WCAG sweep

For each entity, verify lifted accent clears WCAG AA on **both** light surface and dark surface (in case the entity supports both, or in case you want to allow user override). Document in a contrast table.

### Step 10 — Write the audit doc

Format: per-entity table with columns for fan-identity sentence, cultural anchor, today's rendering, recommended axis, recommended accent, verdict. Plus a Cultural Anchor Index, a Defect Catalog, and a Phase-N+1 scope for fixes.

This audit doc becomes the **handoff to engineering** for the runtime implementation.

---

## Anti-patterns

### Anti-pattern 1: "Use the brand book"

Pulling colors straight from the entity's official brand book misses fan-perceived identity by default. The brand book is what the entity *says* it is; the fan identity is what the fans *feel* it is. They diverge.

### Anti-pattern 2: "Let the user pick light or dark"

For fan-affinity theming, the axis is a **per-entity** fact, not a user preference. If a user picks "Miami Dolphins" as their team, they get the Vice-aqua-on-cream palette — not a choice between "Vice-aqua-on-cream" and "Vice-aqua-on-black." The entity's identity is what it is.

If your product also has a "neutral product mode" (e.g., Corvus's `corvus` mode), that mode can respect user light/dark preference. But entity mode is entity-determined.

### Anti-pattern 3: "Compute everything from `(primary, secondary)`"

The Steelers' primary is black. Computing every Steelers surface element from `#101820` gives you a near-monochrome page that loses the gold-and-black identity. Identity colors need to enter the system as **named choices**, not as derivations from the brand book.

### Anti-pattern 4: "Skip the cultural-anchor citations because they're not in the runtime"

The citations look like dead weight when the runtime just consumes hex values. They aren't. **The next designer who has to maintain or extend the palette** needs to know *why* each color was chosen. "Toro Bravo Jordan 6" is a citation they can verify; "the red I felt was right" is not.

### Anti-pattern 5: "Ship the recipes, skip the methodology"

Recipes are product-specific. The Corvus 1.5e recipe (L=8 dark surface, L=94 light surface, sat × 0.5 multiplier) is specific to Corvus. The **methodology** — find identity, decide axis, choose accent, cite cultural anchors, watch the textSafe trap, plan for specials, check collisions — is portable. Ship the methodology to the next product. Let it derive its own recipes.

### Anti-pattern 6: "Audit once, never revisit"

Fan-perceived identity drifts. A team's hot decade fades; a sneaker collab opens new associations; a film reboot resets a cultural anchor. Plan to revisit per-entity identity **annually or per-product-cycle**. The methodology stays; the cultural anchors evolve.

---

## How to adopt this in a new product

When the next SLOPS product needs entity-affinity theming:

1. **Copy this doc to the new product's `Brand/` (or equivalent design-system folder).** It's product-agnostic; the principles transfer.
2. **Read the Corvus 1.5e audit as the worked example.** See how table shape, cultural-anchor index, defect catalog, and per-entity verdicts compose.
3. **Run Steps 1–10 of the audit process** for the new product's entities.
4. **Implement the runtime support** (theme-aware template resolver, two-axis surface recipes, `textSafe` with sat-clamp, special-case templates, `--color-text-on-accent` token).
5. **Ship the audit doc + the runtime in the same phase.** The audit is the source-of-truth design contract; the runtime implements it.

If the new product is the second adopter, **propose promoting this doc to L0 or L1** (slops-os Blueprints or slops-saloon Blueprints) so it lives at the layer that serves all SLOPS products. A second adoption is the trigger for promotion.

---

## Open work items (kept current with Corvus 1.5e)

This section is a living TODO carried forward as the methodology evolves. Update when Corvus 1.5f ships, or when a second product adopts.

- [ ] Promote this doc to L1 (`slops-saloon/Blueprints/patterns/`) when a second product adopts.
- [ ] Promote to L0 (`slops-os/Blueprints/patterns/`) when promoted patterns prove durable across two products.
- [ ] Add a **Cultural Anchor Index template** (CSV or YAML schema) at the methodology level so new products start with a structured citation format.
- [ ] Capture **anti-pattern 6 enforcement** — a calendar reminder per product cycle to revisit fan-perceived identity.
- [ ] Consider exposing **cultural-anchor citation in product UI** (e.g., a one-line attribution under each entity in the entity-picker: "Pine Green — Jordan 1 colorway"). This is a fan-engagement signal AND a transparency signal. Open Justin decision flagged in Corvus 1.5e.
