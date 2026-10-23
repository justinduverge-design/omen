import SwiftUI

/// Everything `GET /api/trade/find` needs that the Trade tab does not already hold: which team in
/// the selected league is the user's. The league itself comes from the same `league-overview.v1`
/// read the rest of Trade uses; the team comes from the league directory (`GET /api/leagues`),
/// which names the user's own team in every league they play in, for all three providers.
@MainActor
final class TradeFindLauncher: ObservableObject {
    enum State: Equatable {
        case resolving
        case ready(platform: String, leagueId: String, teamId: String)
        /// The league is known but Omen could not tell which team is the user's. Never guessed:
        /// a search against the wrong team would propose trades for somebody else's roster.
        case teamUnknown
        /// Leagues exist, but neither the caller nor the directory named the active one. This
        /// is a selection/context problem, not evidence that the user needs to connect again.
        case leagueUnknown
        case noLeague
        case demo
        case failed(OmenApiError)
    }

    @Published private(set) var state: State = .resolving

    private let directoryRepository: LeagueDirectoryRepository
    private let sessionManager: SessionManager

    init(directoryRepository: LeagueDirectoryRepository, sessionManager: SessionManager) {
        self.directoryRepository = directoryRepository
        self.sessionManager = sessionManager
    }

    /// The user's own team id for `(platform, leagueID)` in a directory read, or nil when the
    /// directory does not name one. Platform compares case-insensitively; league ids exactly.
    static func teamID(in directory: LeagueDirectory, platform: String, leagueID: String) -> String? {
        for group in directory.platforms where group.platform.lowercased() == platform.lowercased() {
            if let league = group.leagues.first(where: { $0.leagueID == leagueID }),
               let team = league.teamID, !team.isEmpty {
                return team
            }
        }
        return nil
    }

    func resolve(userID: String, platform: String?, leagueId: String?, fallbackTeamId: String?) async {
        state = .resolving
        guard userID != SessionManager.demoUserID else {
            state = .demo
            return
        }
        guard case .token(let accessToken) = await sessionManager.authorization() else {
            state = .failed(.unauthorized)
            return
        }
        switch await directoryRepository.fetchDirectory(accessToken: accessToken) {
        case .success(let directory):
            let requestedPlatform = platform.flatMap { $0.isEmpty ? nil : $0 }
            let requestedLeagueID = leagueId.flatMap { $0.isEmpty ? nil : $0 }
            let resolvedPlatform = requestedPlatform ?? directory.active?.platform
            let resolvedLeagueID = requestedLeagueID ?? directory.active?.leagueID

            guard let resolvedPlatform, let resolvedLeagueID else {
                let hasAnyLeague = directory.platforms.contains { !$0.leagues.isEmpty }
                state = hasAnyLeague ? .leagueUnknown : .noLeague
                return
            }

            if let team = Self.teamID(in: directory, platform: resolvedPlatform, leagueID: resolvedLeagueID) {
                state = .ready(platform: resolvedPlatform, leagueId: resolvedLeagueID, teamId: team)
            } else if let fallbackTeamId, !fallbackTeamId.isEmpty {
                // The league overview's own "you" side, for a directory that left the team blank.
                state = .ready(platform: resolvedPlatform, leagueId: resolvedLeagueID, teamId: fallbackTeamId)
            } else {
                state = .teamUnknown
            }
        case .failure(let error):
            if error == .unauthorized { sessionManager.onRefreshFailed() }
            state = .failed(error)
        }
    }
}

/// Find a trade, pushed on the Trade tab. Resolves the user's team, then runs `trade-find.v1` and draws
/// `OmenFindTradeScreen`. "Open in builder" hands the swap to the builder; nothing is sent.
struct TradeFindFlowView: View {
    @StateObject private var launcher: TradeFindLauncher
    @StateObject private var viewModel: TradeFindReviewViewModel
    let userID: String
    let platform: String?
    let leagueId: String?
    let fallbackTeamId: String?
    var onConnectLeague: (() -> Void)?
    var onOpenInBuilder: (TradeFindCandidate) -> Void
    var onOpenPlayer: (String) -> Void
    var onDismiss: () -> Void

    init(
        directoryRepository: LeagueDirectoryRepository,
        sessionManager: SessionManager,
        findRepository: TradeFindRepository,
        userID: String,
        platform: String?,
        leagueId: String?,
        fallbackTeamId: String?,
        onConnectLeague: (() -> Void)? = nil,
        onOpenInBuilder: @escaping (TradeFindCandidate) -> Void,
        onOpenPlayer: @escaping (String) -> Void,
        onDismiss: @escaping () -> Void
    ) {
        _launcher = StateObject(wrappedValue: TradeFindLauncher(directoryRepository: directoryRepository, sessionManager: sessionManager))
        _viewModel = StateObject(wrappedValue: TradeFindReviewViewModel(repository: findRepository, sessionManager: sessionManager))
        self.userID = userID
        self.platform = platform
        self.leagueId = leagueId
        self.fallbackTeamId = fallbackTeamId
        self.onConnectLeague = onConnectLeague
        self.onOpenInBuilder = onOpenInBuilder
        self.onOpenPlayer = onOpenPlayer
        self.onDismiss = onDismiss
    }

    var body: some View {
        OmenFindTradeScreen(
            state: state,
            onOpenInBuilder: { if let candidate = viewModel.currentCandidate { onOpenInBuilder(candidate) } },
            onNext: { viewModel.pass() },
            onRetry: { Task { await retry() } },
            onOpenPlayer: onOpenPlayer,
            onBack: onDismiss
        )
        // The selected league is loaded asynchronously by the shell; re-resolve when that scope lands.
        .task(id: resolutionKey) { await resolve() }
    }

    private var provider: String {
        if case .ready(let platform, _, _) = launcher.state { return TradeFindReviewViewModel.providerName(platform) }
        return "your provider"
    }

    var state: OmenFindTradeState {
        switch launcher.state {
        case .resolving:
            return OmenFindTradeState(phase: .loading)
        case .teamUnknown:
            return OmenFindTradeState(phase: .unavailable(title: "Omen doesn\u{2019}t know which team is yours", message: "This league didn\u{2019}t say which team you manage, and a search for the wrong team would be worse than none. Reconnect the league from Account.", retry: false))
        case .leagueUnknown:
            return OmenFindTradeState(phase: .unavailable(title: "Pick a team first", message: "Go back to Trade and choose your team at the top.", retry: false))
        case .noLeague:
            return OmenFindTradeState(phase: .unavailable(title: "Connect a league first", message: "Find a trade reads every team in your league. Connect ESPN, Yahoo or Sleeper to use it.", retry: false))
        case .demo:
            return OmenFindTradeState(phase: .empty(title: "Sign in to search a real league", message: "Demo mode never invents trades."))
        case .failed(let error):
            return OmenFindTradeState(phase: .failed(OmenFindTradeState.message(for: error)))
        case .ready(let platform, _, _):
            let teams = viewModel.response?.totalOtherTeams
            switch viewModel.viewState {
            case .loading:
                return OmenFindTradeState(phase: .loading, teamsRead: nil)
            case .reviewing:
                guard let candidate = viewModel.currentCandidate else { return OmenFindTradeState(phase: .loading) }
                return OmenFindTradeState(
                    phase: .reviewing(.init(candidate, providerName: provider), index: viewModel.currentIndex, total: viewModel.candidates.count),
                    teamsRead: teams
                )
            case .batchExhausted:
                return OmenFindTradeState(phase: .empty(title: "That\u{2019}s everyone this week", message: "Come back once your league\u{2019}s rosters move."), teamsRead: teams)
            case .zeroCandidates:
                let copy = OmenFindTradeState.emptyCopy(reason: viewModel.response?.emptyReason, teams: viewModel.response?.teamsConsidered ?? 0)
                return OmenFindTradeState(phase: .empty(title: copy.title, message: copy.message), teamsRead: teams)
            case .routeElsewhere(let reason):
                let copy = OmenFindTradeState.unavailableCopy(reason: reason, platform: platform)
                return OmenFindTradeState(phase: .unavailable(title: copy.title, message: copy.message, retry: reason == "own_roster_unavailable"))
            case .failed(let error):
                return OmenFindTradeState(phase: .failed(OmenFindTradeState.message(for: error)))
            }
        }
    }

    private var resolutionKey: String {
        [platform ?? "", leagueId ?? "", fallbackTeamId ?? ""].joined(separator: "|")
    }

    private func retry() async {
        if case .ready = launcher.state { await viewModel.reload() } else { await resolve() }
    }

    private func resolve() async {
        await launcher.resolve(userID: userID, platform: platform, leagueId: leagueId, fallbackTeamId: fallbackTeamId)
        if case .ready(let platform, let leagueId, let teamId) = launcher.state {
            await viewModel.load(platform: platform, leagueId: leagueId, teamId: teamId, week: nil)
        }
    }
}
