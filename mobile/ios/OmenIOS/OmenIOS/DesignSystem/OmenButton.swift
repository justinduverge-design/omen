import SwiftUI

/// registry §3.1 Button row: primary/secondary/tertiary/danger/link.
enum OmenButtonVariant { case primary, secondary, tertiary, danger, link }

/// Which brand color drives Primary/Secondary/Tertiary — brass CTA vs verdigris AI-signal.
enum OmenButtonTone { case accent, omen }

enum OmenButtonSize { case sm, md, lg }

/// Foundation Button (registry §3.1).
///
/// States covered from the outset: default, focus (via `omenFocusRing`, driven by real
/// `@FocusState`), disabled (`.disabled(!isInteractable)`), and loading (spinner + an
/// accessibility label suffix so VoiceOver announces it; loading also disables interaction,
/// same as `enabled = false`, per registry §3.1's required-states list).
///
/// Danger and Link are fixed-color variants (crimson risk-high / accent-underline
/// respectively); `tone` only applies to Primary/Secondary/Tertiary, matching the registry's
/// separate "variants" vs "tones" axes.
///
/// Text uses the `label` type role (typography brief §5: "Button and IconButton: `label`").
/// **Typography is not visually final** — `OmenTypography`'s roles currently resolve to system
/// design fallbacks, not real Alegreya files (font-file acquisition is a separately approved,
/// not-yet-made decision; see `OmenTypography.swift`).
struct OmenButton: View {
    let title: String
    let action: () -> Void
    var variant: OmenButtonVariant = .primary
    var tone: OmenButtonTone = .accent
    var size: OmenButtonSize = .md
    var enabled: Bool = true
    var loading: Bool = false

    @FocusState private var isFocused: Bool

    private var isInteractable: Bool { enabled && !loading }

    private var toneColor: Color { tone == .accent ? OmenColor.accent : OmenColor.omen }

    private var contentColor: Color {
        switch variant {
        case .primary: return OmenColor.textOnAccent
        case .secondary, .tertiary, .link: return toneColor
        case .danger: return OmenColor.Data.riskHigh
        }
    }

    private var heightPt: CGFloat {
        switch size {
        case .sm: return 32
        case .md: return 40
        case .lg: return 44
        }
    }

    private var horizontalPadding: CGFloat {
        switch size {
        case .sm: return OmenSpacing.step12
        case .md: return OmenSpacing.step16
        case .lg: return OmenSpacing.step24
        }
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: OmenSpacing.step8) {
                if loading {
                    ProgressView()
                        .tint(isInteractable ? contentColor : OmenColor.textTertiary)
                }
                Text(title)
                    .omenTextStyle(OmenTypography.label)
                    .underline(variant == .link)
            }
            .foregroundStyle(isInteractable ? contentColor : OmenColor.textTertiary)
            .padding(.horizontal, horizontalPadding)
            .frame(minHeight: max(heightPt, OmenLayout.minTouchTarget))
            .background(backgroundView)
        }
        .buttonStyle(OmenPressableButtonStyle())
        .disabled(!isInteractable)
        .focused($isFocused)
        .omenFocusRing(isFocused: isFocused, cornerRadius: 8)
        .accessibilityLabel(loading ? "\(title), loading" : title)
    }

    @ViewBuilder
    private var backgroundView: some View {
        switch variant {
        case .primary:
            RoundedRectangle(cornerRadius: 8)
                .fill(isInteractable ? toneColor : OmenColor.surface3)
        case .secondary:
            RoundedRectangle(cornerRadius: 8)
                .stroke(isInteractable ? toneColor : OmenColor.border, lineWidth: 1)
        case .danger:
            RoundedRectangle(cornerRadius: 8)
                .stroke(isInteractable ? OmenColor.Data.riskHigh : OmenColor.border, lineWidth: 1)
        case .tertiary, .link:
            Color.clear
        }
    }
}

/// Keeps the control native and tactile without introducing a custom 3D treatment. The pressed
/// state is visible through a small opacity/scale response and respects Reduce Motion.
private struct OmenPressableButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.84 : 1)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.98 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: configuration.isPressed)
    }
}
