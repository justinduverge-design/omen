# Chant Graffiti Textures

**Purpose:** SVG mask assets for chant rendering per `slops-saloon/Blueprints/specs/chant-and-fan-copy-spec-v1.md` §5.2.

**Status:** folder prepared 2026-07-03. No assets authored yet.

---

## What goes here

- **Brick masks** — graffiti-on-brick chant rendering for Color Rush skin.
- **Concrete masks** — graffiti-on-concrete rendering.
- **Metal masks** — graffiti-on-signal-box / graffiti-on-transit-metal rendering.
- **Paint-drip / spray-edge SVG overlays** — applied to chant letterforms in the graffiti rendering.
- **Curated-art frames** — mounted-plaque / engraved-slab / brass-rule SVGs for War Room chant rendering per chant spec §5.1.

## What does NOT go here

- **Primary logos** — those live at `slops-saloon/omen/logos/` (emblem, wordmark, horizontal lockup, favicon set, app icon, brand board, preview sheet).
- **Team-specific texture overrides** — those live per-team in `slops-saloon/Blueprints/specs/teams/[team-slug]-colorway.md` as file references. This folder holds *shared* textures used across teams.
- **Photography / hero images** — different asset track entirely, no location yet defined.

---

## File naming

`chant-[medium]-[surface]-[variant].svg`

Examples:

- `chant-graffiti-brick-01.svg`
- `chant-graffiti-brick-02.svg`
- `chant-graffiti-concrete-01.svg`
- `chant-graffiti-metal-01.svg`
- `chant-graffiti-spray-edge-01.svg` (letterform overlay, not surface)
- `chant-plaque-brass-01.svg` (War Room curated-art)
- `chant-plaque-engraved-slab-01.svg`

Number suffix increments as multiple variants exist for the same medium+surface pairing.

---

## Authoring

Invoke the `slops-image-prompt` skill to draft AI-gen prompts for each mask asset. Rules:

- **Authoring color:** black-on-transparent SVG for compositing safety. The consuming component tints via CSS.
- **Resolution:** vector (SVG), not raster. Rasters can't retint reliably.
- **Bounding box:** preserve an even aspect ratio (square or 4:3) so masks can rotate / mirror without distortion.
- **Naming discipline:** file name matches its role, not its source. Even if the AI-gen prompt described "Philly SEPTA brick wall," the file name is `chant-graffiti-brick-01.svg`, not `chant-septa-brick.svg` — the mask is reusable across teams and locations.

---

## Build-serve

Any texture used at runtime must be copied to `omen/frontend/public/textures/` alongside its canonical location here. Same rule as `omen/logos/` per `brand-system.md` §12.4 — canonical at `logos/`, build-served at `frontend/public/`.

When adding a texture:

1. Author or generate SVG at `slops-saloon/omen/logos/textures/chant-*.svg`.
2. Copy to `slops-saloon/omen/frontend/public/textures/chant-*.svg`.
3. Reference in `frontend/src/index.css` via CSS variable per chant spec §9:
   ```css
   --chant-graffiti-texture-brick: url('/textures/chant-graffiti-brick-01.svg');
   --chant-graffiti-texture-concrete: url('/textures/chant-graffiti-concrete-01.svg');
   /* ... */
   ```
4. Consume in `frontend/src/lib/teamChant.js` and `<ChantEyebrow>` per chant spec §9 Implementation notes.

---

## Blocked-on

- `slops-image-prompt` invocation to author the initial mask set — not yet done.
- `frontend/src/lib/teamChant.js` — not yet built. See chant spec §9 for Codex prompt scaffold.
- `frontend/src/components/chant/ChantEyebrow.jsx` — not yet built. See chant spec §3.1.
- `VITE_FEATURE_TEAM_CHANTS` feature flag — not yet added.

Nothing here ships until the above lands, so this folder stays empty pending the chant-rendering implementation pass.