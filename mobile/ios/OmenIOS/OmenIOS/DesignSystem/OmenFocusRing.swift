import SwiftUI

/// Semantic focus/selection outline (registry §4; m1-focus-ring-build-brief-v1.md).
///
/// Draws a two-layer outline — a soft halo plus a crisp stroke — derived from `OmenColor`.
/// Applied via `.overlay`, so it never changes a component's measured size (brief §3, "Adds a
/// visible outline without changing layout size").
///
/// This modifier supplies the *visible outline* half of the non-color focus contract only.
/// Callers remain responsible for the other half: real SwiftUI focus state (`@FocusState`) or
/// accessibility-focus, and, for selected controls, an additional shape/weight/checkmark cue —
/// color and outline alone are never sufficient (registry §4, brief §2/§5).
struct OmenFocusRing: ViewModifier {
    let focused: Bool
    var color: Color = OmenColor.focusRing
    var haloColor: Color = OmenColor.focusRingHalo
    var cornerRadius: CGFloat = 8
    var strokeWidth: CGFloat = 2
    var haloWidth: CGFloat = 4

    func body(content: Content) -> some View {
        content.overlay(
            ZStack {
                if focused {
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .stroke(haloColor, lineWidth: haloWidth)
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .stroke(color, lineWidth: strokeWidth)
                }
            }
        )
    }
}

extension View {
    /// - Parameter isFocused: whether the owning control currently holds focus or accessibility
    ///   focus. Pass a `@FocusState` value or an equivalent native focus/selection source —
    ///   never a synthesized app-level focus model (brief §3).
    func omenFocusRing(
        isFocused: Bool,
        color: Color = OmenColor.focusRing,
        haloColor: Color = OmenColor.focusRingHalo,
        cornerRadius: CGFloat = 8
    ) -> some View {
        modifier(
            OmenFocusRing(
                focused: isFocused,
                color: color,
                haloColor: haloColor,
                cornerRadius: cornerRadius
            )
        )
    }
}
