import SwiftUI

/// The six honest registry §3.1 content states. Never substitute one state for another.
enum OmenStateSurfaceKind { case empty, loading, error, disconnected, stale, mock }

/// Token-backed, non-interactive content state. Supply contextual loading copy rather than a
/// generic "Loading…" label. `reduceMotion` replaces the spinner with a static state.
struct OmenStateSurface: View {
    let kind: OmenStateSurfaceKind
    let title: String
    let message: String
    var reduceMotion = false

    private var cardVariant: OmenCardVariant {
        switch kind {
        case .empty: .empty
        case .error: .error
        default: .outlined
        }
    }

    private var stateLabel: String {
        switch kind {
        case .empty: "Empty"
        case .loading: "Loading"
        case .error: "Error"
        case .disconnected: "Disconnected"
        case .stale: "Stale"
        case .mock: "Mock"
        }
    }

    var body: some View {
        OmenCard(variant: cardVariant, tone: kind == .error ? .risk : .neutral) {
            VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                if kind == .loading && !reduceMotion {
                    ProgressView().tint(OmenColor.accent)
                }
                Text(title).omenTextStyle(OmenTypography.h2).foregroundStyle(OmenColor.textPrimary)
                Text(message).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityValue(stateLabel)
    }
}
