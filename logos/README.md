# Omen SVG Logo Assets

**Status:** Production vector masters authored from the Figma logo reference.
**Figma source:** `Logo Master — GPT vector v1` in the Omen Figma file.

These SVGs are hand-built geometric masters, not raw exports from the original traced Figma frame. The original Figma canvas contained duplicated trace frames; this set keeps the Omen shape language while reducing the logo to cleaner, smaller, more maintainable vector geometry.

## Files

- `omen-primary-emblem.svg` — full-detail transparent primary shield emblem.
- `omen-primary-emblem-simple.svg` — simplified transparent emblem for small UI slots.
- `omen-favicon-source.svg` — simplified favicon source; use when generating 16/32/48/64 PNG favicons.
- `omen-app-icon.svg` — rounded-square OS/PWA app-icon source only.

Build-served copies also live in `frontend/public/` because Vite serves runtime assets from `public/`.

## Usage rules

- In-app identity slots use raw logo assets. Do not wrap the shield in circles, borders, glows, or extra containers.
- The rounded-square container appears only in `omen-app-icon.svg`, because OS/PWA install icons require an app-icon frame.
- Use `omen-primary-emblem.svg` for large transparent emblem use.
- Use `omen-primary-emblem-simple.svg` when the emblem is small enough that weathering becomes visual noise.
- Use `omen-favicon-source.svg` to regenerate raster favicon PNGs.
- Do not use the original trace frame as the production source unless intentionally doing a new trace cleanup pass.

## Palette

- Raven Black: `#0A0A0B`
- Bone White: `#F5F0E8`
- Aged Brass: `#A67C2E`
- Verdigris Green: `#2F7D5B`
- Deep Crimson: `#7E1717`
- Weathered Umber: `#5A3A25`
