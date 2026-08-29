import Foundation

/// M5 slice F — drives the League destination from `league-overview.v1`.
///
/// Mirrors `OmenDecisionViewModel`: demo is not a load state and never touches the network,
/// failure is rendered honestly, and no path falls back to a fixture (facts-of-record #7).
@MainActor
final class LeagueViewModel: ObservableObject {
    enum ViewState: Equatable {
        case idle
        case loading
        case loaded(LeagueOverview)
        case failed(OmenApiError)
        case demo
    }

    @Published private(set) var viewState: ViewState = .idle

    private let repository: LeagueRepository
    private let sessionManager: SessionManager

    /// Injected so the empty-state Connect affordance reaches the same connect flow the rest
    /// of the app uses, rather than this screen minting a second entry point.
    var onConnect: (() -> Void)?

    init(repository: LeagueRepository, sessionManager: SessionManager) {
        self.repository = repository
        self.sessionManager = sessionManager
    }

    func load(userID: String) async {
        guard userID != SessionManager.demoUserID else {
            viewState = .demo
            return
        }
        await reload()
    }

    func reload() async {
        guard let accessToken = sessionManager.currentSession?.accessToken else {
            viewState = .failed(.unauthorized)
            return
        }

        viewState = .loading
        switch await repository.fetchOverview(accessToken: accessToken) {
        case .success(let overview):
            viewState = .loaded(overview)
        case .failure(let error):
            if error == .unauthorized { sessionManager.onRefreshFailed() }
            viewState = .failed(error)
        }
    }

    /// Transport failures only. The contract's own section states carry everything else, and
    /// they are rendered per section rather than as a whole-screen error.
    static func message(for error: OmenApiError) -> String {
        switch error {
        case .network:
            return "Omen couldn't reach the server. Check your connection and try again."
        case .unauthorized:
            return "Your session expired. Sign in again to see your league."
        case .server:
            // The status code is deliberately not shown; it tells a user nothing actionable.
            return "Omen is having trouble on our side. Try again in a moment."
        case .decode:
            return "Your league came back in a format this version of the app couldn't read."
        }
    }
}
