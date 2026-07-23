import SwiftUI

/// Registry §3.2 approved **screen assembly** (feature layer) — not a design-system
/// component. Composes approved primitives (Card/Badge/Button/StateSurface/typography +
/// spacing tokens) and P3 compositions (PlatformConnectionCard, ConnectionStatusBadge,
/// PlatformBadge, DecisionBrief) into the signed-in Command Center landing surface. Lives
/// in `App/CommandCenter/` so the DesignSystem module stays product-agnostic.
///
/// V1 renders fixture data with visible mock labels; live wiring
/// (dashboard-summary polling + POST /api/omen/mvp-move) is a separate task. Every state
/// path (all six OmenConnectionStatus values × all eight OmenDecisionBriefState surfaces)
/// can be exercised by swapping the fixture payload — the screen has no data-fetching
/// branches of its own.
struct OmenCommandCenterScreen: View {
    let state: OmenCommandCenterState

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.sectionStack) {
                header
                platformsSection
                omenSection
            }
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.vertical, OmenSpacing.step24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(OmenColor.bg.ignoresSafeArea())
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step4) {
            Text("Command Center")
                .omenTextStyle(OmenTypography.eyebrow)
                .foregroundStyle(OmenColor.textSecondary)
            Text(state.greeting)
                .omenTextStyle(OmenTypography.h1)
                .foregroundStyle(OmenColor.textPrimary)
            if let leagueScope = state.leagueScope {
                Text(leagueScope)
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textSecondary)
            }
        }
    }

    private var platformsSection: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            sectionLabel("Your platforms")
            ForEach(state.platforms) { platform in
                OmenPlatformConnectionCard(
                    platform: platform.platform,
                    status: platform.status,
                    description: platform.description,
                    actionLabel: platform.actionLabel,
                    onAction: platform.onAction
                )
            }
        }
    }

    private var omenSection: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            sectionLabel("This week's Omen")
            OmenDecisionBrief(state: state.decision)
        }
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .omenTextStyle(OmenTypography.label)
            .foregroundStyle(OmenColor.textSecondary)
    }
}

/// Immutable view state for `OmenCommandCenterScreen`. Feature callers build one of
/// these from whatever data source is authoritative (fixture, dashboard-summary
/// response, demo mode). The screen renders honestly for every combination without
/// inspecting the source.
struct OmenCommandCenterState {
    let greeting: String
    let leagueScope: String?
    let platforms: [OmenCommandCenterPlatform]
    let decision: OmenDecisionBriefState
}

struct OmenCommandCenterPlatform: Identifiable {
    let id = UUID()
    let platform: OmenPlatform
    let status: OmenConnectionStatus
    let description: String?
    let actionLabel: String?
    let onAction: (() -> Void)?

    init(
        platform: OmenPlatform,
        status: OmenConnectionStatus,
        description: String? = nil,
        actionLabel: String? = nil,
        onAction: (() -> Void)? = nil
    ) {
        self.platform = platform
        self.status = status
        self.description = description
        self.actionLabel = actionLabel
        self.onAction = onAction
    }
}

/// Static demo fixtures for gallery, previews, and until the live wiring lands. Every
/// state here is visibly labeled (Mock DecisionBrief variant, mock connection copy) so
/// nothing can be mistaken for a live recommendation. Fixture strings are scaffold copy
/// — real product copy lands in the live-wiring pass with a proper `slops-ux-copy`
/// review.
enum OmenCommandCenterFixtures {
    private static let samplePayload = OmenDecisionBriefPayload(
        verdict: "Start Christian McCaffrey",
        move: "Bench Ken Walker for the RB1 slot.",
        impact: "+4.1 projected over your bench.",
        confidence: 72,
        risk: .low,
        riskReasons: ["McCaffrey full-practice Fri.", "Weather stable in SF."],
        explanation: [
            "49ers implied 27 against a bottom-5 rush defense.",
            "Ken Walker limited practice with an ankle.",
        ],
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

    static let demoConnected = OmenCommandCenterState(
        greeting: "This week's move is ready.",
        leagueScope: "Sunday Slate · Sleeper · 12 teams",
        platforms: [
            OmenCommandCenterPlatform(
                platform: .sleeper, status: .connected,
                description: "Last synced 4 minutes ago.",
                actionLabel: "Manage league", onAction: {}
            ),
            OmenCommandCenterPlatform(
                platform: .yahoo, status: .disconnected,
                description: "Connect Yahoo to blend the two rosters.",
                actionLabel: "Connect Yahoo", onAction: {}
            ),
        ],
        decision: .mock(samplePayload)
    )

    static let demoDisconnected = OmenCommandCenterState(
        greeting: "Connect a league to see your Omen.",
        leagueScope: nil,
        platforms: [
            OmenCommandCenterPlatform(
                platform: .sleeper, status: .disconnected,
                description: "Fastest way in — Sleeper username only.",
                actionLabel: "Connect Sleeper", onAction: {}
            ),
            OmenCommandCenterPlatform(
                platform: .yahoo, status: .disconnected,
                description: "Official OAuth in your system browser.",
                actionLabel: "Connect Yahoo", onAction: {}
            ),
        ],
        decision: .disconnected(connect: {})
    )

    static let demoReauth = OmenCommandCenterState(
        greeting: "Sunday Slate needs a reconnect.",
        leagueScope: "Sunday Slate · Yahoo · 12 teams",
        platforms: [
            OmenCommandCenterPlatform(
                platform: .yahoo, status: .needsReauth,
                description: "Reconnect to restore this week's roster.",
                actionLabel: "Reconnect Yahoo", onAction: {}
            ),
        ],
        decision: .error("Yahoo session expired before we could read your roster.", retry: {})
    )

    static let demoLoading = OmenCommandCenterState(
        greeting: "Working on this week's move…",
        leagueScope: "Sunday Slate · Sleeper · 12 teams",
        platforms: [
            OmenCommandCenterPlatform(
                platform: .sleeper, status: .connected,
                description: "Last synced 4 minutes ago."
            ),
        ],
        decision: .loading
    )

    static let demoOffSeason = OmenCommandCenterState(
        greeting: "Season's between reps.",
        leagueScope: "Sunday Slate · Sleeper · 12 teams",
        platforms: [
            OmenCommandCenterPlatform(
                platform: .sleeper, status: .connected,
                description: "Ready for Week 1."
            ),
        ],
        decision: .offSeason
    )
}

#if DEBUG
#Preview("Connected + Mock Omen") {
    OmenCommandCenterScreen(state: OmenCommandCenterFixtures.demoConnected)
}

#Preview("Disconnected") {
    OmenCommandCenterScreen(state: OmenCommandCenterFixtures.demoDisconnected)
}

#Preview("Needs reauth + error") {
    OmenCommandCenterScreen(state: OmenCommandCenterFixtures.demoReauth)
}
#endif
