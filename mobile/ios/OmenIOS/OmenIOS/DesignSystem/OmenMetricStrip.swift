import SwiftUI

/// Sign of the delta drives which invariant token colors the delta text.
enum OmenMetricDelta { case none, positive, negative }

/// One metric row inside a MetricStrip. `confidence` is optional 0..100 for a subline bar.
struct OmenMetricItem: Identifiable {
    let id = UUID()
    let label: String
    let value: String
    let delta: String?
    let deltaDirection: OmenMetricDelta
    let confidence: Int?

    init(
        label: String,
        value: String,
        delta: String? = nil,
        deltaDirection: OmenMetricDelta = .none,
        confidence: Int? = nil
    ) {
        self.label = label
        self.value = value
        self.delta = delta
        self.deltaDirection = deltaDirection
        self.confidence = confidence
    }
}

/// Registry §3.2 MetricStrip. Labeled metric row(s) with numeric value, optional signed
/// delta, optional confidence subline. Delta color is drawn from the risk invariant family
/// so a positive delta reads as success (risk-low green) and a negative delta as risk
/// (risk-high). Delta always includes a plus/minus glyph in the caller's string so meaning
/// survives grayscale.
struct OmenMetricStrip: View {
    let items: [OmenMetricItem]

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            ForEach(items) { item in
                VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                    HStack {
                        Text(item.label)
                            .omenTextStyle(OmenTypography.label)
                            .foregroundStyle(OmenColor.textSecondary)
                        Spacer(minLength: OmenSpacing.step8)
                        HStack(spacing: OmenSpacing.step8) {
                            Text(item.value)
                                .omenTextStyle(OmenTypography.numeric)
                                .foregroundStyle(OmenColor.textPrimary)
                            if let delta = item.delta {
                                Text(delta)
                                    .omenTextStyle(OmenTypography.numeric)
                                    .foregroundStyle(deltaColor(item.deltaDirection))
                            }
                        }
                    }
                    if let confidence = item.confidence {
                        OmenConfidenceBar(score: confidence)
                    }
                }
            }
        }
    }

    private func deltaColor(_ direction: OmenMetricDelta) -> Color {
        switch direction {
        case .none: return OmenColor.textSecondary
        case .positive: return OmenColor.Data.riskLow
        case .negative: return OmenColor.Data.riskHigh
        }
    }
}

#if DEBUG
#Preview {
    OmenMetricStrip(items: [
        OmenMetricItem(label: "Projected", value: "142.6", delta: "+4.1", deltaDirection: .positive, confidence: 72),
        OmenMetricItem(label: "Opponent", value: "128.4", delta: "−2.3", deltaDirection: .negative),
        OmenMetricItem(label: "Ceiling", value: "168.2"),
    ])
    .padding(OmenSpacing.step16)
    .background(OmenColor.bg)
}
#endif
