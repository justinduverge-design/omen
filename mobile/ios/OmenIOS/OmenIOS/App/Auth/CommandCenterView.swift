import SwiftUI

/// Signed-in tab shell. v1.1 corrective: four permanent tabs per M0c §12.5 approved
/// navigation contract — Command · Omen · Trade · League. Draft is a seasonal
/// destination reached through League and promoted from Command Center during
/// draft-relevant periods; it is NOT a permanent tab. Account is contextual, reached via
/// the Command Center header profile control, NOT a permanent tab.
///
/// The Command tab renders the real signed-in state (never `demoConnected`) unless the
/// user is signed in via `Try Demo`. Screenshot mode is handled by
/// `OmenIOSApp` gating on the launch argument — the shell here is production only.
struct CommandCenterView: View {
    let userID: String
    @ObservedObject var sessionManager: SessionManager
    @State private var showAccountSheet: Bool = false

    private var isDemo: Bool { userID == SessionManager.demoUserID }

    var body: some View {
        TabView {
            OmenCommandCenterScreen(
                state: isDemo
                    ? OmenCommandCenterFixtures.demoConnected
                    : OmenCommandCenterFixtures.realDisconnected,
                onOpenAccount: { showAccountSheet = true }
            )
            .tabItem { Label("Command", systemImage: "sparkles") }

            OmenDecisionScreen(state: isDemo ? OmenDecisionFixtures.demo : OmenDecisionFixtures.realDisconnected)
            .tabItem { Label("Omen", systemImage: "bolt.fill") }

            OmenStateSurface(
                kind: .empty,
                title: "Trade is landing next",
                message: "Trade Analyzer arrives in the M4-Trade-Screen slice."
            )
            .padding(OmenSpacing.step24)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(OmenColor.bg)
            .tabItem { Label("Trade", systemImage: "arrow.left.arrow.right") }

            OmenStateSurface(
                kind: .empty,
                title: "League is landing next",
                message: "League roster/matchup/standings, plus seasonal Draft entry, arrive in the M4-League-Screen slice."
            )
            .padding(OmenSpacing.step24)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(OmenColor.bg)
            .tabItem { Label("League", systemImage: "person.3.fill") }
        }
        .sheet(isPresented: $showAccountSheet) {
            NavigationStack {
                AccountView(userID: userID, sessionManager: sessionManager)
                    .navigationTitle("Account")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button("Done") { showAccountSheet = false }
                        }
                    }
            }
        }
    }
}

/// M4 Omen destination assembly. State selection stays here; DecisionBrief owns its states.
struct OmenDecisionScreen: View {
    let state: OmenDecisionBriefState

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                Text("Omen").omenTextStyle(OmenTypography.h1).foregroundStyle(OmenColor.textPrimary)
                OmenDecisionBrief(state: state)
            }
            .padding(OmenSpacing.step24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(OmenColor.bg)
    }
}

enum OmenDecisionFixtures {
    static let demo: OmenDecisionBriefState = .mock(OmenDecisionBriefPayload(
        verdict: "Start Christian McCaffrey", move: "Bench Ken Walker for the RB1 slot.",
        impact: "+4.1 projected over your bench.", confidence: 72, risk: .low,
        riskReasons: ["Full practice Friday."], explanation: ["The matchup and usage signals favor McCaffrey this week."],
        metrics: [OmenMetricItem(label: "Projected", value: "22.4", delta: "+4.1", deltaDirection: .positive)],
        signals: [OmenSignalItem(label: "Demo roster snapshot", source: .mock)],
        alternatives: [OmenDecisionBriefAlternative(name: "Ken Walker III", position: .rb, team: "SEA", meta: "Limited practice")]
    ))
    static let realDisconnected: OmenDecisionBriefState = .disconnected(connect: nil)
}
