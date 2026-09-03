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
    @StateObject private var omenDecisionViewModel: OmenDecisionViewModel
    @StateObject private var leagueSwitcherViewModel: LeagueSwitcherViewModel
    private let connectRepository: ConnectRepository
    /// Held as well as consumed into `leagueSwitcherViewModel`: Account's connected-leagues
    /// section needs the same seam, and it owns its own view model rather than sharing the
    /// switcher's — the two read the same route for different reasons and fail independently.
    private let leagueDirectoryRepository: LeagueDirectoryRepository
    @State private var showAccountSheet: Bool = false
    @State private var showConnectSheet: Bool = false
    @State private var showSwitcherSheet: Bool = false
    @State private var selectedTab: CommandCenterTab = .command
    @StateObject private var leagueViewModel: LeagueViewModel
    @StateObject private var tradeViewModel: TradeViewModel

    init(
        userID: String,
        sessionManager: SessionManager,
        authViewModel: AuthViewModel,
        dashboardRepository: DashboardRepository,
        leagueRepository: LeagueRepository,
        movesRepository: MovesRepository,
        omenDecisionRepository: OmenDecisionRepository,
        connectRepository: ConnectRepository,
        leagueDirectoryRepository: LeagueDirectoryRepository,
        tradeRepository: TradeRepository,
        playerSearchRepository: PlayerSearchRepository
    ) {
        self.connectRepository = connectRepository
        self.userID = userID
        self.sessionManager = sessionManager
        self.authViewModel = authViewModel
        _commandCenterViewModel = StateObject(wrappedValue: CommandCenterViewModel(
            repository: dashboardRepository,
            leagueRepository: leagueRepository,
            movesRepository: movesRepository,
            sessionManager: sessionManager
        ))
        _omenDecisionViewModel = StateObject(wrappedValue: OmenDecisionViewModel(
            repository: omenDecisionRepository,
            sessionManager: sessionManager
        ))
        _tradeViewModel = StateObject(wrappedValue: TradeViewModel(
            repository: tradeRepository,
            playerSearch: playerSearchRepository,
            sessionManager: sessionManager
        ))
        _leagueViewModel = StateObject(wrappedValue: LeagueViewModel(
            repository: leagueRepository,
            sessionManager: sessionManager
        ))
        _leagueSwitcherViewModel = StateObject(wrappedValue: LeagueSwitcherViewModel(
            repository: leagueDirectoryRepository,
            sessionManager: sessionManager
        ))
        self.leagueDirectoryRepository = leagueDirectoryRepository
    }

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
                        // Passing this is what makes the strip's "Switch" control render
                        // at all — `OmenContextStrip` hides it when `onSwitch` is nil,
                        // which is why a user with a connected league previously had no
                        // way to choose it.
                        onSwitchContext: { showSwitcherSheet = true },
                        onOpenAccount: { showAccountSheet = true },
                        onConnect: { showConnectSheet = true },
                        onOpenOmen: { selectedTab = .omen },
                        onOpenLedger: { _ in selectedTab = .omen },
                        onOpenLeague: { selectedTab = .league }
                    )
                }
            }
            .task { await commandCenterViewModel.load(userID: userID) }
            .tabItem { CommandCenterTab.command.label }
            .tag(CommandCenterTab.command)

            // M5 slice D: the Omen destination now renders the live engine's answer.
            // Previously this picked a fixture — `realDisconnected` for every real
            // signed-in user, regardless of their actual leagues.
            OmenDecisionScreen(state: omenDecisionViewModel.briefState)
            .task {
                omenDecisionViewModel.onConnect = { showConnectSheet = true }
                await omenDecisionViewModel.load(userID: userID)
            }
            .tabItem { CommandCenterTab.omen.label }
            .tag(CommandCenterTab.omen)

            // M5 slice G: the Trade destination now renders `trade-compare.v2`.
            OmenTradeScreen(
                state: tradeViewModel.viewState,
                offer: tradeViewModel.offer,
                searchState: tradeViewModel.searchState,
                searchingSide: tradeViewModel.searchingSide,
                onQueryChanged: { query, side in tradeViewModel.search(query, side: side) },
                onAdd: { name, side in tradeViewModel.add(name, to: side) },
                onAddResult: { player, side in tradeViewModel.add(player, to: side) },
                onRemove: { index, side in tradeViewModel.remove(at: index, from: side) },
                onCompare: { Task { await tradeViewModel.compare(userID: userID) } }
            )
            // The league to personalize against comes from the SAME `league-overview.v1` read
            // the League destination uses. Trade never discovers a league on its own, so the
            // two screens can never disagree about which league the user is in.
            .onChange(of: leagueViewModel.viewState) { _, newValue in
                guard case .loaded(let overview) = newValue else { return }
                tradeViewModel.useLeague(platform: overview.platform, leagueId: overview.leagueId)
            }
            .tabItem { CommandCenterTab.trade.label }
            .tag(CommandCenterTab.trade)

            // M5 slice F: the League destination now renders `league-overview.v1`. It
            // replaced an honest "landing next" placeholder, which was correct while the
            // screen contract was unratified and is no longer.
            OmenLeagueScreen(
                state: leagueViewModel.viewState,
                onRetry: { Task { await leagueViewModel.reload() } },
                onConnect: { showConnectSheet = true }
            )
            .task { await leagueViewModel.load(userID: userID) }
            .tabItem { CommandCenterTab.league.label }
            .tag(CommandCenterTab.league)
        }
        // The selected tab rendered in iOS system blue while every other element on the same
        // screen used the Omen accent — found on device 2026-09-01. Android's NavigationBar
        // already tinted correctly; only iOS had drifted.
        .tint(OmenColor.accent)
        .sheet(isPresented: $showSwitcherSheet) {
            OmenLeagueSwitcherSheet(
                viewModel: leagueSwitcherViewModel,
                userID: userID,
                onSelected: { _ in
                    // §10.3: apply the new context atomically across the personalized
                    // surfaces. The server names them in `refresh`; the shell reload is
                    // what actually re-reads them, so the sheet closes only after the
                    // switch succeeded — a failed switch leaves it open with its reason.
                    showSwitcherSheet = false
                    Task {
                        await commandCenterViewModel.load(userID: userID)
                        await omenDecisionViewModel.load(userID: userID)
                        await leagueViewModel.load(userID: userID)
                    }
                },
                onConnectAnother: {
                    showSwitcherSheet = false
                    showConnectSheet = true
                },
                onManageConnections: {
                    showSwitcherSheet = false
                    showAccountSheet = true
                },
                onDismiss: { showSwitcherSheet = false }
            )
        }
        .sheet(isPresented: $showConnectSheet) {
            NavigationStack {
                ConnectView(
                    repository: connectRepository,
                    sessionManager: sessionManager,
                    onConnected: {
                        showConnectSheet = false
                        // Re-read the shell so the new connection is reflected immediately
                        // rather than waiting for the next cold launch.
                        Task { await commandCenterViewModel.load(userID: userID) }
                    },
                    onDismiss: { showConnectSheet = false }
                )
                .navigationTitle("Connect")
                .navigationBarTitleDisplayMode(.inline)
                // M6-ContextualHelp on the toolbar rather than inside `providerPicker`, so it
                // is still reachable from the error, on-hold, and ESPN-unsupported states —
                // which is exactly where "why can't I connect this?" gets asked.
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        OmenContextualHelpButton(
                            topic: OmenContextualHelpContent.topic(for: .connect),
                            size: .sm
                        )
                    }
                }
            }
        }
        .sheet(isPresented: $showAccountSheet) {
            NavigationStack {
                AccountView(
                    userID: userID,
                    sessionManager: sessionManager,
                    authViewModel: authViewModel,
                    leagueDirectoryRepository: leagueDirectoryRepository
                )
                    .navigationTitle("Account")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            OmenContextualHelpButton(
                                topic: OmenContextualHelpContent.topic(for: .account),
                                size: .sm
                            )
                        }
                        ToolbarItem(placement: .topBarTrailing) {
                            OmenButton(title: "Done", action: { showAccountSheet = false }, variant: .link, size: .sm)
                        }
                    }
            }
        }
    }
}

/// The permanent 4-tab navigation contract.
///
/// **Title and icon live here and nowhere else.** They used to be written twice — once in this
/// file and once in `ScreenshotScenarios.FauxShell` — which is how the screenshot harness came
/// to advertise Trade and League as "landing next" for a day after the real screens shipped
/// (`F-VET-B01`). Two copies of a list drift; one copy cannot.
enum CommandCenterTab: String, Hashable, CaseIterable {
    case command, omen, trade, league

    var title: String {
        switch self {
        case .command: return "Command"
        case .omen: return "Omen"
        case .trade: return "Trade"
        case .league: return "League"
        }
    }

    var systemImage: String {
        switch self {
        case .command: return "sparkles"
        case .omen: return "bolt.fill"
        case .trade: return "arrow.left.arrow.right"
        case .league: return "person.3.fill"
        }
    }

    var label: some View { Label(title, systemImage: systemImage) }
}

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
                HStack(alignment: .firstTextBaseline) {
                    Text("Omen").omenTextStyle(OmenTypography.h1).foregroundStyle(OmenColor.textPrimary)
                    Spacer(minLength: OmenSpacing.step8)
                    // M6-ContextualHelp: confidence, risk, and "why is this empty?" are the
                    // three things people ask here, so help sits with the title.
                    OmenContextualHelpButton(topic: OmenContextualHelpContent.topic(for: .omen))
                }
                OmenDecisionBrief(state: state)
            }
            .padding(OmenSpacing.step24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(OmenColor.bg)
    }
}

/// Demo fixtures use deliberately generic player names. `omen-store-review-notes-v1.md` tells App
/// Review that "Player names are generic ('Sample QB Starter') specifically so that demo output can
/// never be mistaken for real fantasy advice" — until 2026-09-01 that claim was false on this very
/// fixture, which shipped Christian McCaffrey and Ken Walker III. Do not reintroduce real player
/// names or NFL team abbreviations here: the reviewer notes are a statement to Apple, and this
/// fixture is the thing that has to make it true.
enum OmenDecisionFixtures {
    static let demo: OmenDecisionBriefState = .demo(OmenDecisionBriefPayload(
        verdict: "Start Sample RB1", move: "Bench Sample RB2 for the RB1 slot.",
        impact: "+4.1 projected over your bench.", confidence: 72, risk: .low,
        riskReasons: ["Full practice Friday."], explanation: ["The matchup and usage signals favor Sample RB1 this week."],
        metrics: [OmenMetricItem(label: "Projected", value: "22.4", delta: "+4.1", deltaDirection: .positive)],
        signals: [OmenSignalItem(label: "Demo roster snapshot", source: .mock)],
        alternatives: [OmenDecisionBriefAlternative(name: "Sample RB2", position: .rb, team: "Demo", meta: "Limited practice")]
    ))
    static let realDisconnected: OmenDecisionBriefState = .disconnected(connect: nil)
}
