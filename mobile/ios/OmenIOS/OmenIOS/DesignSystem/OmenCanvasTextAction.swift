import SwiftUI

/// A flat, text-only tappable action — "Use a different email", "Resend the code", "Skip".
///
/// Lives here rather than in `App/` because it is a primitive: it composes raw SwiftUI so
/// feature code does not have to. `PrimitiveEnforcementTests` bans `Button(` under `App/`
/// for exactly that reason, and `DesignSystem/` is the layer allowed to do it.
///
/// **This type existed twice, privately, in SignInView.swift and ConnectView.swift — and the
/// two copies had already drifted.** Sign-in's took `color`, `weight` and `height`;
/// Connect's had hardcoded them and rendered its disabled state differently
/// (`textTertiary` where sign-in used `textTertiary` against a caller-supplied colour).
/// Neither author could have known, because `private` made each invisible to the other.
/// That divergence is the whole argument for this file: one definition cannot disagree
/// with itself.
///
/// The parameters are sign-in's, because they are the superset. The defaults reproduce
/// Connect's hardcoded values exactly, so its call sites are unchanged in appearance.
struct OmenCanvasTextAction: View {
    let title: String
    let action: () -> Void
    var color: Color = OmenColor.textTertiary
    var weight: Font.Weight = .semibold
    var height: CGFloat = 48
    var enabled = true

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 15, weight: weight))
                .foregroundStyle(enabled ? color : OmenColor.textTertiary)
                .frame(maxWidth: .infinity, minHeight: height, alignment: .center)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
    }
}
