# Design Done (cross-cutting)

Apply to any change touching user-visible UI.

## Gates

1. Typography per `corvus-ux-ui-design-system-v1.md` §Typography (Alegreya Sans for headings/UI, Alegreya for body text)
2. **Color tokens used — no raw hex literals in JSX/CSS** (a hex in code is a review block)
3. **Both light and dark modes verified** (screenshots linked in PR)
4. `Blueprints/specs/page-system.md` row for the route is satisfied (or spec updated)
5. Team accent (where accent-active) consumes `--color-team-accent`, not a hardcoded team color
6. Reads stay neutral — accent never on body text, mock labels, or error states
7. `slops-ui-ux-audit` returns no P0
8. Animation timing 150ms ease-in-out for state changes — no bouncy / springy / game-like motion
9. `prefers-reduced-motion` honored
10. Focus rings visible, gold accent, consistent across modes

## AAA mapping

- **Accessibility:** 3, 9, 10
- **Aesthetic:** 1, 2, 4, 5, 6, 7, 8
