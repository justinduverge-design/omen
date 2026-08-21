import SwiftUI

/// Registry §3.2 DecisionBrief shell state, per
/// `Blueprints/specs/mobile/m1-p-p3-decision-brief-shell-brief-v1.md`. One enum for all 8
/// required state surfaces so callers cannot mix a Success render with a preview badge — the
/// shell decides which surface renders.
enum OmenDecisionBriefState {
    case success(OmenDecisionBriefPayload)
    case empty(String)
    case loading
    case error(String, retry: (() -> Void)?)
    case disconnected(connect: (() -> Void)?)
    case stale(OmenDecisionBriefPayload, lastSynced: String)
    case mock(OmenDecisionBriefPayload)
    case demo(OmenDecisionBriefPayload)
    case offSeason
}

/// DecisionBrief payload per shell brief §2 field set. Any field may be absent.
struct OmenDecisionBriefPayload {
    let verdict: String
    let move: String
    let impact: String?
    let confidence: Int
    let risk: OmenRiskLevel
    let riskReasons: [String]
    let explanation: [String]
    let metrics: [OmenMetricItem]
    let signals: [OmenSignalItem]
    let alternatives: [OmenDecisionBriefAlternative]

    init(
        verdict: String,
        move: String,
        impact: String? = nil,
        confidence: Int,
        risk: OmenRiskLevel,
        riskReasons: [String] = [],
        explanation: [String] = [],
        metrics: [OmenMetricItem] = [],
        signals: [OmenSignalItem] = [],
        alternatives: [OmenDecisionBriefAlternative] = []
    ) {
        self.verdict = verdict
        self.move = move
        self.impact = impact
        self.confidence = confidence
        self.risk = risk
        self.riskReasons = riskReasons
        self.explanation = explanation
        self.metrics = metrics
        self.signals = signals
        self.alternatives = alternatives
    }
}

/// One "considered but not recommended" player row under the primary recommendation.
struct OmenDecisionBriefAlternative: Identifiable {
    let id = UUID()
    let name: String
    let position: OmenPosition
    let team: String?
    let meta: String?

    init(name: String, position: OmenPosition, team: String? = nil, meta: String? = nil) {
        self.name = name
        self.position = position
        self.team = team
        self.meta = meta
    }
}

/// Registry §3.2 DecisionBrief shell. The single Omen recommendation surface Command
/// Center, Omen, and Trade all render. `feedbackSlot` is a slot rather than structured
/// props (see brief §10) — the consuming feature decides its own feedback UI.
struct OmenDecisionBrief<Feedback: View>: View {
    let state: OmenDecisionBriefState
    let feedback: Feedback

    init(state: OmenDecisionBriefState, @ViewBuilder feedback: () -> Feedback) {
        self.state = state
        self.feedback = feedback()
    }

    var body: some View {
        switch state {
        case let .success(payload):
            OmenCard {
                successBody(payload)
            }
        case let .stale(payload, lastSynced):
            OmenCard {
                VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                    staleBanner(lastSynced: lastSynced)
                    successBody(payload)
                }
            }
        case let .mock(payload):
            OmenCard(variant: .preview) {
                VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                    mockBanner
                    successBody(payload)
                }
            }
        case let .demo(payload):
            OmenCard(variant: .preview) {
                VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                    demoBanner
                    successBody(payload)
                }
            }
        case let .empty(message):
            OmenStateSurface(
                kind: .empty,
                title: "Nothing to recommend right now",
                message: message
            )
        case .loading:
            OmenStateSurface(
                kind: .loading,
                title: "Analyzing your matchup…",
                message: "Checking the latest roster and schedule signals."
            )
        case let .error(message, retry):
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                OmenStateSurface(
                    kind: .error,
                    title: "Unable to build this recommendation",
                    message: message
                )
                if let retry {
                    OmenButton(title: "Try again", action: retry, size: .md)
                }
            }
        case let .disconnected(connect):
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                OmenStateSurface(
                    kind: .disconnected,
                    title: "Connect a league",
                    message: "Connect Sleeper, Yahoo, or ESPN so Omen can read your roster and matchup."
                )
                if let connect {
                    OmenButton(title: "Connect a league", action: connect, size: .md)
                }
            }
        case .offSeason:
            OmenStateSurface(
                kind: .empty,
                title: "Omen is off this week",
                message: "The regular season isn't running. Omen will be back when Week 1 kicks off."
            )
        }
    }

    private var mockBanner: some View {
        HStack(spacing: OmenSpacing.step8) {
            OmenBadge(label: "Mock", tone: .mock)
            Text("Fixture data — not live advice.")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
        }
    }

    private var demoBanner: some View {
        HStack(spacing: OmenSpacing.step8) {
            OmenBadge(label: "Demo", tone: .mock)
            Text("Sample data — not live advice.")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
        }
    }

    private func staleBanner(lastSynced: String) -> some View {
        HStack(spacing: OmenSpacing.step8) {
            OmenBadge(label: "Stale", tone: .stub)
            Text("Showing your last sync · \(lastSynced)")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
        }
    }

    @ViewBuilder
    private func successBody(_ payload: OmenDecisionBriefPayload) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text(payload.verdict)
                    .omenTextStyle(OmenTypography.h2)
                    .foregroundStyle(OmenColor.textPrimary)
                Text(payload.move)
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textPrimary)
                if let impact = payload.impact {
                    Text(impact)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textSecondary)
                }
            }
            if !payload.metrics.isEmpty {
                OmenMetricStrip(items: payload.metrics)
            }
            OmenConfidenceBar(score: payload.confidence, label: "Confidence")
            OmenRiskPanel(level: payload.risk, reasons: payload.riskReasons)
            ForEach(Array(payload.explanation.enumerated()), id: \.offset) { _, paragraph in
                Text(paragraph)
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textPrimary)
            }
            if !payload.signals.isEmpty {
                OmenSignalList(signals: payload.signals)
            }
            if !payload.alternatives.isEmpty {
                VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                    Text("Also considered")
                        .omenTextStyle(OmenTypography.label)
                        .foregroundStyle(OmenColor.textSecondary)
                    ForEach(payload.alternatives) { alt in
                        OmenPlayerRow(name: alt.name, position: alt.position, team: alt.team, meta: alt.meta)
                    }
                }
            }
            feedback
        }
    }
}

extension OmenDecisionBrief where Feedback == EmptyView {
    init(state: OmenDecisionBriefState) {
        self.init(state: state, feedback: EmptyView.init)
    }
}

#if DEBUG
private let previewPayload = OmenDecisionBriefPayload(
    verdict: "Start Christian McCaffrey",
    move: "Bench Ken Walker for the RB1 slot.",
    impact: "+4.1 projected over your bench.",
    confidence: 72,
    risk: .low,
    riskReasons: ["McCaffrey full-practice Fri.", "Weather stable in SF."],
    explanation: ["49ers implied 27 points against a bottom-5 rush defense.", "Ken Walker limited practice with an ankle."],
    metrics: [
        OmenMetricItem(label: "Projected", value: "22.4", delta: "+4.1", deltaDirection: .positive),
        OmenMetricItem(label: "Ceiling", value: "31.8"),
    ],
    signals: [
        OmenSignalItem(label: "Yahoo roster snapshot", source: .live, detail: "Refreshed 4 minutes ago."),
        OmenSignalItem(label: "Opponent defense grade", source: .stub),
    ],
    alternatives: [
        OmenDecisionBriefAlternative(name: "Ken Walker III", position: .rb, team: "SEA", meta: "Limited practice"),
    ]
)

#Preview("DecisionBrief — success") {
    OmenDecisionBrief(state: .success(previewPayload))
        .padding(OmenSpacing.step16)
        .background(OmenColor.bg)
}
#endif
