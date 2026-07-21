import SwiftUI

enum OmenBadgeTone { case success, neutral, risk, live, stub, mock, unavailable }

/// Registry §3.1 semantic status/data-source label. The label always accompanies its color.
struct OmenBadge: View {
    let label: String
    let tone: OmenBadgeTone

    private var foreground: Color {
        switch tone {
        case .success: return OmenColor.Data.riskLow
        case .neutral: return OmenColor.textSecondary
        case .risk: return OmenColor.Data.riskHigh
        case .live: return OmenColor.Data.dataLive
        case .stub: return OmenColor.Data.dataStub
        case .mock: return OmenColor.Data.dataMock
        case .unavailable: return OmenColor.Data.dataUnavailable
        }
    }

    var body: some View {
        Text(label)
            .omenTextStyle(OmenTypography.chip)
            .foregroundStyle(foreground)
            .padding(.horizontal, OmenSpacing.step8)
            .padding(.vertical, OmenSpacing.step4)
            .background(tone == .neutral ? OmenColor.surface3 : foreground.opacity(0.15))
            .clipShape(Capsule())
    }
}
