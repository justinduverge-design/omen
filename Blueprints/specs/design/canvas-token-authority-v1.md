# Canvas token authority v1

**Status:** Stage C authority reconciliation. **Scope:** web component tokens, native tokens, and the 2026-09-13 visual-lock canvas.

## Authority order

| Surface | Canonical authority | Implementation expression | What is not authority |
|---|---|---|---|
| Native spacing | `omen-native-design-system-registry-v1.md` §2.5 | `OmenSpacing.swift` and `OmenSpacing.kt` must expose the same 15 steps and rhythm aliases | CSS pixels in an artboard do not become native constants |
| Native typography | Registry §2.4 | Wix Madefor Display/Text role twins in SwiftUI and Compose | Canvas declarations are render evidence, not permission for raw native font calls |
| Canvas | `_shared.css` plus each `.dc.html` composition | Canvas pixels preserve the approved 390 x 844 reference and fold/overflow evidence | A web component scale does not authorize blind replacement in the canvas |
| Web components | `component-lock-v1.md` and web tokens | Web CSS/component implementation | Web spacing does not supersede the native registry |

## Reconciled spacing decision

The native scale is exactly `2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 64, 96`. The same keys and values are required on iOS and Android.

Canvas literals `7`, `9`, `11`, and `13` are approved optical evidence in existing artboards, not additional native tokens. Canvas-to-code translation snaps them to `8`, `10`, `12`, and `14` respectively, then measures the named screen's fold and overflow contract. It must not perform a global CSS replacement.

The shared canvas also contains `1`, `5`, `15`, and `18` spacing declarations. These are bounded composition/optical values in the reference renderer (`1` hairlines/offsets, `5` compact symbol/annotation gaps, `15` one overlay offset, `18` an auth-label compensation). Negative `-1` and `-15` values are optical positioning. They do not expand the native scale. Any new off-scale canvas spacing value fails the Stage C checker until this authority file is deliberately reviewed.

## Typography decision

Product canvas type uses only Wix Madefor Display and Wix Madefor Text, at the registry ramp values. `inherit` is allowed because it resolves through those roots. The only monospace declaration belongs to the annotation overlay and is not product UI. A new product font family or an off-ramp `font-size` fails the checker.

## Accessibility and overflow authority

`canvas-contract-requirements-v1.json` is the machine-readable acceptance layer. It records every artboard's family, journey, state classes, API contracts, scroll rule, 44pt/48dp target floors, Dynamic Type/font-scale behavior, long-content behavior, and horizontal-overflow prohibition. The screen Markdown remains the human build contract; the JSON is lint input, not a second source of product behavior.
