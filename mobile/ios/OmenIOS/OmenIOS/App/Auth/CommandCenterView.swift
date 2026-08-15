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
    @ObservedObject var authViewModel: AuthViewModel
    @StateObject private var commandCenterViewModel: CommandCenterViewModel
    @State private var showAccountSheet: Bool = false
    @State private var selectedTab: CommandCenterTab = .command

    init(
        userID: String,
        sessionManager: SessionManager,
        authViewModel: AuthViewModel,
        dashboardRepository: DashboardRepository,
        leagueRepository: LeagueRepository
    ) {
        self.userID = userID
        self.sessionManager = sessionManager
        self.authViewModel = authViewModel
        _commandCenterViewModel = StateObject(wrappedValue: CommandCenterViewModel(
            repository: dashboardRepository,
            leagueRepository: leagueRepository,
            sessionManager: sessionManager
        ))
    }

    private var isDemo: Bool { userID == SessionManager.demoUserID }

    var body: some View {
        TabView(selection: $selectedTab) {
            Group {
                if let failure = commandCenterViewModel.failure {
                    // M5 slice B: an unreadable shell renders an explicit failure surface.
                    // It must NOT silently fall through to the disconnected fixture, which
                    // would state as fact that the user has no leagues.
                    VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                        OmenStateSurface(
                            kind: .error,
                            title: "Couldn't reach Omen",
                            message: commandCenterFailureMessage(failure)
                        )
                        OmenButton(
                            title: "Try again",
                            action: { Task { await commandCenterViewModel.load(userID: userID) } },
                            variant: .secondary,
                            size: .md
                        )
                    }
                    .padding(OmenSpacing.step24)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                    .background(OmenColor.bg)
                } else {
                    OmenCommandCenterScreen(
                        state: commandCenterViewModel.commandCenterState,
                        onOpenAccount: { showAccountSheet = true },
                        onOpenOmen: { selectedTab = .omen },
                        onOpenLedger: { _ in selectedTab = .omen },
                        onOpenLeague: { selectedTab = .league }
                    )
                }
            }
            .task { await commandCenterViewModel.load(userID: userID) }
            .tabItem { Label("Command", systemImage: "sparkles") }
            .tag(CommandCenterTab.command)

            OmenDecisionScreen(state: isDemo ? OmenDecisionFixtures.demo : OmenDecisionFixtures.realDisconnected)
            .tabItem { Label("Omen", systemImage: "bolt.fill") }
            .tag(CommandCenterTab.omen)

            OmenStateSurface(
                kind: .empty,
                title: "Trade is landing next",
                message: "Trade Analyzer arrives in the M4-Trade-Screen slice."
            )
            .padding(OmenSpacing.step24)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(OmenColor.bg)
            .tabItem { Label("Trade", systemImage: "arrow.left.arrow.right") }
            .tag(CommandCenterTab.trade)

            OmenStateSurface(
                kind: .empty,
                title: "League is landing next",
                message: "League roster/matchup/standings, plus seasonal Draft entry, arrive in the M4-League-Screen slice."
            )
            .padding(OmenSpacing.step24)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(OmenColor.bg)
            .tabItem { Label("League", systemImage: "person.3.fill") }
            .tag(CommandCenterTab.league)
        }
        .sheet(isPresented: $showAccountSheet) {
            NavigationStack {
                AccountView(userID: userID, sessionManager: sessionManager, authViewModel: authViewModel)
                    .navigationTitle("Account")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            OmenButton(title: "Done", action: { showAccountSheet = false }, variant: .link, size: .sm)
                        }
                    }
            }
        }
    }
}

private enum CommandCenterTab: Hashable { case command, omen, trade, league }

/// User-facing copy for a shell read failure. Deliberately says what the user can do and
/// never surfaces a token, URL, or provider identifier — `OmenApiError` carries only a
/// status code, so there is nothing sensitive to leak here by construction.
private func commandCenterFailureMessage(_ error: OmenApiError) -> String {
    switch error {
    case .network:
        return "We couldn't reach Omen. Check your connection and try again."
    case .unauthorized:
        return "Your session expired. Sign in again to see your leagues."
    case .server(let status):
        return "Omen had a problem on our side (error \(status)). Try again in a moment."
    case .decode:
        return "Omen sent something this version of the app couldn't read. Updating the app may fix it."
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
