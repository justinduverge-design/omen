import SwiftUI

/// Data-source honesty categories the SignalList exposes (registry §2.3 data-* family).
/// The badge label mirrors this so the meaning survives grayscale — never a badge without
/// its label.
enum OmenSignalSource { case live, stub, mock, unavailable }

/// Evidence role is independent of availability. A live projection is still a projection,
/// and an unavailable verified source is still a limitation for this decision.
enum OmenEvidenceKind: String { case verified, projection, model, inference, limitation }

/// The transport-neutral native binding for `decision-capabilities.v1`.
///
/// This lives beside the evidence presentation primitives so Omen, Command, League,
/// Start/Sit, Trade, and Ledger use the same semantic vocabulary without sharing a layout.
/// Unknown wire values remain strings: callers must fail safe rather than promote a future
/// server state into a live or verified claim.
struct OmenDecisionCapability: Decodable, Equatable {
    let name: String?
    let state: String?
    let used: Bool?
    let kind: String?
    let source: String?
    let statement: String?
    let observedAt: String?
    let freshUntil: String?
    let reasonCode: String?
    let coverageState: String?
    let reconciliationState: String?

    enum CodingKeys: String, CodingKey {
        case name, state, used, kind, source, statement
        case observedAt = "observed_at"
        case freshUntil = "fresh_until"
        case reasonCode = "reason_code"
        case coverageState = "coverage_state"
        case reconciliationState = "reconciliation_state"
    }
}

/// One row in a SignalList. `detail` is optional secondary text under the label.
struct OmenSignalItem: Identifiable {
    let id = UUID()
    let label: String
    let source: OmenSignalSource
    let detail: String?
    let kind: OmenEvidenceKind?
    /// **Did this input change the answer?** A separate question from whether it could be read,
    /// and the client dropped it until 2026-09-17 — so "we used this" and "we have it and it did
    /// not matter here" were indistinguishable on screen.
    ///
    /// `shared-decision-context.v1` is explicit that *"a resolved source is not described as
    /// decision-making evidence until an engine marks it used"*, and
    /// `capability-expression-v1.md` needs this axis to tell two of its four presentation classes
    /// apart. `nil` means the server did not say, which is not the same as `false`.
    let used: Bool?

    init(
        label: String,
        source: OmenSignalSource,
        detail: String? = nil,
        kind: OmenEvidenceKind? = nil,
        used: Bool? = nil
    ) {
        self.label = label
        self.source = source
        self.detail = detail
        self.kind = kind
        self.used = used
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

    /// One input, rendered in exactly one of the presentation classes from
    /// `capability-expression-v1.md`. There is no fifth, and `not_requested` never arrives here —
    /// it is filtered before mapping, because a source Omen never asked for is not a source it
    /// failed to read.
    ///
    /// **Used and read-but-unused must not look alike.** Until 2026-09-18 every row rendered the
    /// same badge at the same prominence, so "this moved the call" and "we read it and it changed
    /// nothing" were indistinguishable to a reader — even after `used` was carried all the way
    /// through the transport and three tests proved it arrived. The data was right and the screen
    /// still overclaimed. A degraded capture caught it; no unit test could have.
    ///
    /// The difference is carried by **form, not hue** (D7): an unused input loses its badge and
    /// drops to tertiary ink. It is still named — dropping it would read as a factor that did not
    /// exist, rather than one that did not matter.
    private func signalRow(_ signal: OmenSignalItem) -> some View {
        let (tone, label): (OmenBadgeTone, String)
        switch signal.source {
        case .live: (tone, label) = (.live, "Live")
        case .stub: (tone, label) = (.stub, "Stub")
        case .mock: (tone, label) = (.mock, "Mock")
        case .unavailable: (tone, label) = (.unavailable, "Unavailable")
        }

        // `used == false` is a statement; `nil` is the server declining to say, and silence is
        // not demotion. Only an explicit false demotes the row.
        let readButUnused = signal.source == .live && signal.used == false

        return HStack(alignment: .top, spacing: OmenSpacing.step12) {
            if readButUnused {
                // No badge. A badge is the evidence affordance, and this input is not evidence.
                Text("Not used")
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
                    .frame(width: 58, alignment: .leading)
            } else {
                OmenBadge(label: label, tone: tone)
            }
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text(signal.label)
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(readButUnused ? OmenColor.textTertiary : OmenColor.textPrimary)
                if let detail = signal.detail {
                    Text(detail)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(readButUnused ? OmenColor.textTertiary : OmenColor.textSecondary)
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            [readButUnused ? "Read, not used" : label,
             signal.kind?.rawValue,
             signal.label,
             signal.detail]
                .compactMap { $0 }
                .joined(separator: ". ")
        )
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
