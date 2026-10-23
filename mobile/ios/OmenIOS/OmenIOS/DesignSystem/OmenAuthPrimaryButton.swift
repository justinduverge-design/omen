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
enum OmenAuthButtonVariant { case primary, secondary }

struct OmenAuthPrimaryButton: View {
    let title: String
    var icon: Image? = nil
    let action: () -> Void
    var enabled = true
    var loading = false
    /// Tint the glyph with the button's own foreground instead of keeping the asset's colours.
    ///
    /// Off by default, because a multicolour brand mark (Google) must never be tinted. On for a
    /// **monochrome** one: `AuthApple` bakes in `#0A0A0B`, and this button's background is
    /// `textPrimary` — cream in dark, near-black in light. So the Apple glyph rendered
    /// near-black on near-black in light mode, i.e. invisible. Nobody had seen it because
    /// `SignInView` forced its own dark background until that literal was tokenised.
    var tintsIcon = false
    /// `SignIn.dc.html` draws all four provider buttons as equal `surface-1` rows with a centred
    /// label, not one cream primary over three icon-only tiles. `.secondary` is that treatment.
    ///
    /// Apple keeps `.primary`: Apple's own guidance asks for Sign in with Apple to be at least as
    /// prominent as the alternatives, which is an external constraint the artboard does not carry.
    /// That is the one deliberate departure, and it is a mix rather than a rejection.
    var variant: OmenAuthButtonVariant = .primary

    private var isInteractable: Bool { enabled && !loading }

    private var foreground: Color {
        guard isInteractable else { return OmenColor.textTertiary }
        return variant == .primary ? OmenColor.textOnAccent : OmenColor.textPrimary
    }

    private var background: Color {
        guard isInteractable else { return OmenColor.surface3 }
        return variant == .primary ? OmenColor.textPrimary : OmenColor.surface1
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: OmenSpacing.step8) {
                if loading {
                    ProgressView()
                        .tint(isInteractable ? OmenColor.textOnAccent : OmenColor.textTertiary)
                }
                if let icon, !loading {
                    icon
                        // Template when tinted, so the glyph inherits the HStack's
                        // `textOnAccent` foreground applied below rather than its own colours.
                        .renderingMode(tintsIcon ? .template : .original)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 19, height: 19)
                        .accessibilityHidden(true)
                }
                Text(title)
                    .omenTextStyle(OmenTypography.h3)
                    .fontWeight(.semibold)
            }
            .foregroundStyle(foreground)
            .frame(maxWidth: .infinity, minHeight: 54)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
        .disabled(!isInteractable)
        .accessibilityLabel(loading ? "\(title), loading" : title)
    }
}

