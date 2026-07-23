import SwiftUI

/// Registry §3.2 ConfidenceBar. Renders a 0–100 confidence score as a gradient bar over
/// `confidence-floor → confidence-ceiling`, always paired with a redundant numeric label
/// (fan-experience data-legibility invariant: color is never the sole carrier).
///
/// Accepts scores outside 0..100 and clamps rather than trapping, so upstream data glitches
/// degrade to a visibly bounded bar instead of a crash.
struct OmenConfidenceBar: View {
    let score: Int
    let label: String?

    init(score: Int, label: String? = nil) {
        self.score = score
        self.label = label
    }

    init(score: Double, label: String? = nil) {
        self.init(score: Int(score.rounded()), label: label)
    }

    private var clamped: Int { min(max(score, 0), 100) }

    var body: some View {
        let scoreText = "\(clamped)"
        VStack(alignment: .leading, spacing: OmenSpacing.step4) {
            if let label {
                HStack {
                    Text(label)
                        .omenTextStyle(OmenTypography.eyebrow)
                        .foregroundStyle(OmenColor.textSecondary)
                    Spacer(minLength: OmenSpacing.step8)
                    Text(scoreText)
                        .omenTextStyle(OmenTypography.numeric)
                        .foregroundStyle(OmenColor.textPrimary)
                }
            }
            GeometryReader { proxy in
                let width = proxy.size.width
                let fill = width * CGFloat(clamped) / 100
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(OmenColor.surface3)
                        .frame(height: 8)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(
                            LinearGradient(
                                colors: [OmenColor.Data.confidenceFloor, OmenColor.Data.confidenceCeiling],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: fill, height: 8)
                }
            }
            .frame(height: 8)
            if label == nil {
                Text(scoreText)
                    .omenTextStyle(OmenTypography.numeric)
                    .foregroundStyle(OmenColor.textPrimary)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(label != nil ? "\(label!) \(clamped) out of 100" : "Confidence \(clamped) out of 100")
    }
}

#if DEBUG
#Preview {
    VStack(alignment: .leading, spacing: OmenSpacing.step16) {
        OmenConfidenceBar(score: 72, label: "Confidence")
        OmenConfidenceBar(score: 15)
        OmenConfidenceBar(score: 100, label: "Ceiling")
    }
    .padding(OmenSpacing.step16)
    .background(OmenColor.bg)
}
#endif
