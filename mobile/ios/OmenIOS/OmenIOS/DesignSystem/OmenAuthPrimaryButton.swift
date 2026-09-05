import SwiftUI

/// The full-width primary action on the auth and connect canvases: "Continue",
/// "Sign in with Apple", "Send me a code".
///
/// Moved out of `SignInView.swift`, unchanged. It was a `private struct` there, which made it
/// a primitive that only one file could use — so the next screen needing this shape would have
/// copied it, which is exactly how `OmenCanvasTextAction` ended up existing twice and drifting.
///
/// Distinct from `OmenButton`: this carries a leading provider glyph and an inline loading
/// state that replaces the glyph rather than sitting beside it. Folding it into `OmenButton`
/// would mean adding both to a primitive used on every other screen, which is a wider change
/// than this move and should be its own decision.
struct OmenAuthPrimaryButton: View {
    let title: String
    var icon: Image? = nil
    let action: () -> Void
    var enabled = true
    var loading = false

    private var isInteractable: Bool { enabled && !loading }

    var body: some View {
        Button(action: action) {
            HStack(spacing: OmenSpacing.step8) {
                if loading {
                    ProgressView()
                        .tint(isInteractable ? OmenColor.textOnAccent : OmenColor.textTertiary)
                }
                if let icon, !loading {
                    icon
                        .renderingMode(.original)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 19, height: 19)
                        .accessibilityHidden(true)
                }
                Text(title)
                    .omenTextStyle(OmenTypography.h3)
                    .fontWeight(.semibold)
            }
            .foregroundStyle(isInteractable ? OmenColor.textOnAccent : OmenColor.textTertiary)
            .frame(maxWidth: .infinity, minHeight: 54)
            .background(isInteractable ? OmenColor.textPrimary : OmenColor.surface3)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
        .disabled(!isInteractable)
        .accessibilityLabel(loading ? "\(title), loading" : title)
    }
}

/// The square, icon-only sibling of `OmenAuthPrimaryButton` — the row of provider tiles under
/// the primary action. Moved out of `SignInView.swift`, unchanged.
struct OmenAuthIconTile: View {
    let contentDescription: String
    let icon: Image
    let action: () -> Void
    var enabled = true
    var loading = false

    private var isInteractable: Bool { enabled && !loading }

    var body: some View {
        Button(action: action) {
            Group {
                if loading {
                    ProgressView().tint(isInteractable ? OmenColor.textPrimary : OmenColor.textTertiary)
                } else {
                    icon
                        .renderingMode(.original)
                        .resizable()
                        .scaledToFit()
                        .accessibilityHidden(true)
                }
            }
            .frame(width: 22, height: 22)
            .opacity(isInteractable ? 1 : 0.45)
            .frame(maxWidth: .infinity, minHeight: 54)
            .background(OmenColor.surface1)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(OmenColor.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .disabled(!isInteractable)
        .accessibilityLabel(contentDescription)
        .accessibilityValue(loading ? "Loading" : "")
    }
}
