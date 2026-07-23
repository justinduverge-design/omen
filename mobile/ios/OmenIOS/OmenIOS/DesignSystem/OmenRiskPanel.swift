import SwiftUI

/// Registry §2.3 risk families — badge + text label together always (color is never alone).
enum OmenRiskLevel { case low, medium, high }

/// Registry §3.2 RiskPanel. A risk badge with plain-English reasons underneath. Badge label
/// is the readable name of the level so screen readers and low-vision users get the meaning
/// even without color. Empty `reasons` renders the badge alone.
struct OmenRiskPanel: View {
    let level: OmenRiskLevel
    let reasons: [String]

    private var badgeTone: OmenBadgeTone {
        switch level {
        case .low: return .success
        case .medium: return .neutral
        case .high: return .risk
        }
    }

    private var badgeLabel: String {
        switch level {
        case .low: return "Low risk"
        case .medium: return "Medium risk"
        case .high: return "High risk"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            OmenBadge(label: badgeLabel, tone: badgeTone)
            ForEach(Array(reasons.enumerated()), id: \.offset) { _, reason in
                HStack(alignment: .top, spacing: OmenSpacing.step8) {
                    Text("•")
                        .omenTextStyle(OmenTypography.body)
                        .foregroundStyle(OmenColor.textTertiary)
                    Text(reason)
                        .omenTextStyle(OmenTypography.body)
                        .foregroundStyle(OmenColor.textPrimary)
                }
            }
        }
    }
}

#if DEBUG
#Preview {
    VStack(alignment: .leading, spacing: OmenSpacing.step16) {
        OmenRiskPanel(level: .low, reasons: ["Bench depth is strong.", "Weather stable."])
        OmenRiskPanel(level: .medium, reasons: ["Backup RB questionable.", "Weather uncertain."])
        OmenRiskPanel(level: .high, reasons: ["Starter ruled out.", "Kicker on the road in wind."])
    }
    .padding(OmenSpacing.step16)
    .background(OmenColor.bg)
}
#endif
