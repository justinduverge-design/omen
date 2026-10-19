import SwiftUI

/// Registry §3.1 Card / Surface variants. Cards are display containers by default.
enum OmenCardVariant { case solid, outlined, empty, error, preview }

enum OmenCardTone { case neutral, omen, risk }

/// Token-backed SwiftUI surface for Omen compositions. Interactive behavior belongs to the
/// approved component that composes this display container, not to Card itself.
struct OmenCard<Content: View>: View {
    var variant: OmenCardVariant = .solid
    var tone: OmenCardTone = .neutral
    var contentPadding: CGFloat = OmenSpacing.cardInterior
    @ViewBuilder let content: Content

    init(
        variant: OmenCardVariant = .solid,
        tone: OmenCardTone = .neutral,
        contentPadding: CGFloat = OmenSpacing.cardInterior,
        @ViewBuilder content: () -> Content
    ) {
        self.variant = variant
        self.tone = tone
        self.contentPadding = contentPadding
        self.content = content()
    }

    private var background: Color { variant == .preview ? OmenColor.surface2 : OmenColor.surface1 }

    private var border: Color {
        if variant == .error { return OmenColor.Data.riskHigh }
        switch tone {
        case .neutral: return variant == .outlined ? OmenColor.border : OmenColor.borderSubtle
        case .omen: return OmenColor.omen
        case .risk: return OmenColor.Data.riskHigh
        }
    }

    var body: some View {
        content
            .padding(contentPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(border, style: StrokeStyle(lineWidth: 1, dash: variant == .empty ? [4, 4] : []))
            )
            .accessibilityValue(variant == .error ? "Error" : "")
    }
}

/// A card that is one tap target as a whole: the whole-app canvas's preview cards (the Desk's
/// "This week's move" opens Omen). It composes `OmenCard` rather than making Card itself
/// interactive, and presses with the house `OmenPressableButtonStyle`.
struct OmenTappableCard<Content: View>: View {
    var contentPadding: CGFloat = OmenSpacing.cardInterior
    var accessibilityHint: String?
    let action: () -> Void
    @ViewBuilder let content: () -> Content

    var body: some View {
        Button(action: action) {
            OmenCard(contentPadding: contentPadding) {
                content().frame(maxWidth: .infinity, alignment: .leading)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(OmenPressableButtonStyle())
        .accessibilityHint(accessibilityHint ?? "")
    }
}
