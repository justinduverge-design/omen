import SwiftUI

/// Data-source honesty categories the SignalList exposes (registry §2.3 data-* family).
/// The badge label mirrors this so the meaning survives grayscale — never a badge without
/// its label.
enum OmenSignalSource { case live, stub, mock, unavailable }

/// One row in a SignalList. `detail` is optional secondary text under the label.
struct OmenSignalItem: Identifiable {
    let id = UUID()
    let label: String
    let source: OmenSignalSource
    let detail: String?

    init(label: String, source: OmenSignalSource, detail: String? = nil) {
        self.label = label
        self.source = source
        self.detail = detail
    }
}

/// Registry §3.2 SignalList. Renders a list of data-source signals as badge + text rows so
/// a user can see, at a glance, which parts of a recommendation come from live vs stubbed
/// vs mock data. Empty list renders nothing (upstream decides whether to hide or replace
/// with a state surface).
struct OmenSignalList: View {
    let signals: [OmenSignalItem]

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            ForEach(signals) { signal in
                signalRow(signal)
            }
        }
    }

    private func signalRow(_ signal: OmenSignalItem) -> some View {
        let (tone, label): (OmenBadgeTone, String)
        switch signal.source {
        case .live: (tone, label) = (.live, "Live")
        case .stub: (tone, label) = (.stub, "Stub")
        case .mock: (tone, label) = (.mock, "Mock")
        case .unavailable: (tone, label) = (.unavailable, "Unavailable")
        }
        return HStack(alignment: .top, spacing: OmenSpacing.step12) {
            OmenBadge(label: label, tone: tone)
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text(signal.label)
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textPrimary)
                if let detail = signal.detail {
                    Text(detail)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textSecondary)
                }
            }
        }
    }
}

#if DEBUG
#Preview {
    OmenSignalList(signals: [
        OmenSignalItem(label: "Yahoo roster snapshot", source: .live, detail: "Refreshed 4 minutes ago."),
        OmenSignalItem(label: "Opponent projections", source: .stub, detail: "Backfilled from last week."),
        OmenSignalItem(label: "Weather forecast", source: .mock, detail: "Demo fixture."),
        OmenSignalItem(label: "Vegas totals", source: .unavailable, detail: "Provider silent this window."),
    ])
    .padding(OmenSpacing.step16)
    .background(OmenColor.bg)
}
#endif
