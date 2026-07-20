import SwiftUI

/// Registry §3.1 IconButton: an icon-only native control with a required accessibility label.
enum OmenIconButtonTone { case accent, neutral, danger }

enum OmenIconButtonSize { case sm, md, lg }

/// The accessible iOS counterpart to the Compose `OmenIconButton`.
///
/// `contentDescription` is deliberately required. The visual icon is marked decorative so
/// VoiceOver announces the action once, along with its loading state when applicable.
struct OmenIconButton: View {
    let contentDescription: String
    let icon: Image
    let action: () -> Void
    var tone: OmenIconButtonTone = .neutral
    var size: OmenIconButtonSize = .md
    var enabled: Bool = true
    var loading: Bool = false

    @FocusState private var isFocused: Bool

    private var isInteractable: Bool { enabled && !loading }

    private var tint: Color {
        switch tone {
        case .accent: return OmenColor.accent
        case .neutral: return OmenColor.textPrimary
        case .danger: return OmenColor.Data.riskHigh
        }
    }

    private var visualSize: CGFloat {
        switch size {
        case .sm: return 32
        case .md: return 40
        case .lg: return 44
        }
    }

    private var glyphSize: CGFloat {
        switch size {
        case .sm: return 16
        case .md: return 20
        case .lg: return 24
        }
    }

    var body: some View {
        Button(action: action) {
            Group {
                if loading {
                    ProgressView()
                        .tint(isInteractable ? tint : OmenColor.textTertiary)
                } else {
                    icon
                        .resizable()
                        .scaledToFit()
                        .accessibilityHidden(true)
                }
            }
            .frame(width: glyphSize, height: glyphSize)
            .foregroundStyle(isInteractable ? tint : OmenColor.textTertiary)
            .frame(
                width: max(visualSize, OmenLayout.minTouchTarget),
                height: max(visualSize, OmenLayout.minTouchTarget)
            )
        }
        .buttonStyle(OmenIconButtonPressableStyle())
        .disabled(!isInteractable)
        .focused($isFocused)
        .omenFocusRing(isFocused: isFocused, cornerRadius: OmenLayout.minTouchTarget / 2)
        .accessibilityLabel(contentDescription)
        .accessibilityValue(loading ? "Loading" : "")
    }
}

private struct OmenIconButtonPressableStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.84 : 1)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.94 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: configuration.isPressed)
    }
}
