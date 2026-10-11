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
        guard let platform, let leagueId, !platform.isEmpty, !leagueId.isEmpty else {
            state = .noLeague
            return
        }
        guard case .token(let accessToken) = await sessionManager.authorization() else {
            state = .failed(.unauthorized)
            return
        }
        switch await directoryRepository.fetchDirectory(accessToken: accessToken) {
        case .success(let directory):
            if let team = Self.teamID(in: directory, platform: platform, leagueID: leagueId) {
                state = .ready(platform: platform, leagueId: leagueId, teamId: team)
            } else if let fallbackTeamId, !fallbackTeamId.isEmpty {
                // The league overview's own "you" side, for a directory that left the team blank.
                state = .ready(platform: platform, leagueId: leagueId, teamId: fallbackTeamId)
            } else {
                state = .teamUnknown
            }
        case .failure(let error):
            if error == .unauthorized { sessionManager.onRefreshFailed() }
            state = .failed(error)
        }
    }
}

/// Find a trade, presented from the Trade tab. Resolves the user's team, then hands off to
/// `OmenTradeFindReviewScreen` (the swipe review) against the real `trade-find.v1` route and the
/// real `POST /api/trade/saved`.
struct TradeFindFlowView: View {
    @StateObject private var launcher: TradeFindLauncher
    let userID: String
    let platform: String?
    let leagueId: String?
    let fallbackTeamId: String?
    let apiBaseURL: URL
    let sessionManager: SessionManager
    var onOpenAccount: (() -> Void)?
    var onDismiss: () -> Void

    init(
        directoryRepository: LeagueDirectoryRepository,
        sessionManager: SessionManager,
        apiBaseURL: URL,
        userID: String,
        platform: String?,
        leagueId: String?,
        fallbackTeamId: String?,
        onOpenAccount: (() -> Void)? = nil,
        onDismiss: @escaping () -> Void
    ) {
        _launcher = StateObject(wrappedValue: TradeFindLauncher(
            directoryRepository: directoryRepository,
            sessionManager: sessionManager
        ))
        self.userID = userID
        self.platform = platform
        self.leagueId = leagueId
        self.fallbackTeamId = fallbackTeamId
        self.apiBaseURL = apiBaseURL
        self.sessionManager = sessionManager
        self.onOpenAccount = onOpenAccount
        self.onDismiss = onDismiss
    }

    var body: some View {
        Group {
            switch launcher.state {
            case .resolving:
                VStack(spacing: OmenSpacing.step16) {
                    ProgressView().tint(OmenColor.accent)
                    Text("Finding your team…")
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(OmenColor.bg)

            case .ready(let platform, let leagueId, let teamId):
                TradeFindReviewHost(
                    apiBaseURL: apiBaseURL,
                    sessionManager: sessionManager,
                    platform: platform,
                    leagueId: leagueId,
                    teamId: teamId,
                    onOpenAccount: onOpenAccount,
                    onExit: onDismiss
                )

            case .teamUnknown:
                message(
                    kind: .disconnected,
                    title: "Omen doesn't know which team is yours",
                    body: "This league didn't tell Omen which team you manage, and a search against the wrong team would be worse than none. Reconnect the league from Account, then try again.",
                    retry: false
                )

            case .noLeague:
                message(
                    kind: .empty,
                    title: "Connect a league first",
                    body: "Find a trade reads every team in your league. Connect ESPN, Yahoo or Sleeper to use it.",
                    retry: false
                )

            case .demo:
                message(
                    kind: .mock,
                    title: "Demo mode",
                    body: "Sign in to search a real league. Demo mode never invents trades.",
                    retry: false
                )

            case .failed(let error):
                message(
                    kind: .error,
                    title: "Omen couldn't load your leagues",
                    body: OmenTradeFindReviewScreen.message(for: error),
                    retry: error != .unauthorized
                )
            }
        }
        .task { await resolve() }
    }

    private func resolve() async {
        await launcher.resolve(userID: userID, platform: platform, leagueId: leagueId, fallbackTeamId: fallbackTeamId)
    }

    private func message(kind: OmenStateSurfaceKind, title: String, body: String, retry: Bool) -> some View {
        VStack(spacing: OmenSpacing.step12) {
            OmenStateSurface(kind: kind, title: title, message: body)
            if retry {
                OmenButton(title: "Try again", action: { Task { await resolve() } }, variant: .primary, size: .lg)
            }
            OmenButton(title: "Back to Trade", action: onDismiss, variant: .secondary, size: .lg)
        }
        .padding(OmenSpacing.step16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(OmenColor.bg)
    }
}

/// Owns the review view model so it survives re-renders of the sheet, wired to the real routes.
private struct TradeFindReviewHost: View {
    @StateObject private var viewModel: TradeFindReviewViewModel
    let platform: String
    let leagueId: String
    let teamId: String
    var onOpenAccount: (() -> Void)?
    var onExit: () -> Void

    init(
        apiBaseURL: URL,
        sessionManager: SessionManager,
        platform: String,
        leagueId: String,
        teamId: String,
        onOpenAccount: (() -> Void)?,
        onExit: @escaping () -> Void
    ) {
        let client = OmenApiClient(baseURL: apiBaseURL)
        _viewModel = StateObject(wrappedValue: TradeFindReviewViewModel(
            repository: ApiTradeFindRepository(client: client),
            saveAction: ApiTradeFindSaveAction(client: client, sessionManager: sessionManager),
            sessionManager: sessionManager
        ))
        self.platform = platform
        self.leagueId = leagueId
        self.teamId = teamId
        self.onOpenAccount = onOpenAccount
        self.onExit = onExit
    }

    var body: some View {
        OmenTradeFindReviewScreen(
            viewModel: viewModel,
            platform: platform,
            leagueId: leagueId,
            teamId: teamId,
            onOpenAccount: onOpenAccount,
            onExit: onExit
        )
    }
}
