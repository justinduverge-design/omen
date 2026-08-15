import Foundation

/// M5-Native-API-Client slice B — drives the Command Center from real shell truth.
///
/// Demo is not a load state and never touches the network: `SessionManager.demoUserID`
/// short-circuits straight to the labeled demo fixture, preserving facts-of-record #7
/// (mock data is always labeled, never silently mixed with live).
@MainActor
final class CommandCenterViewModel: ObservableObject {
    enum ViewState: Equatable {
        case loading
        case loaded(DashboardSummary)
        /// Honest failure. `OmenStateSurface` renders this; it never falls back to a fixture,
        /// because showing demo content to a real user during an outage is the exact
        /// mock/live mixing the doctrine forbids.
        case failed(OmenApiError)
        case demo
    }

    @Published private(set) var viewState: ViewState = .loading

    private let repository: DashboardRepository
    private let sessionManager: SessionManager

    init(repository: DashboardRepository, sessionManager: SessionManager) {
        self.repository = repository
        self.sessionManager = sessionManager
    }

    /// The Command Center state to render, derived from `viewState`.
    var commandCenterState: OmenCommandCenterState {
        switch viewState {
        case .loading:
            return OmenCommandCenterFixtures.realLoading
        case .demo:
            return OmenCommandCenterFixtures.demoConnected
        case .loaded(let summary):
            return .from(summary: summary)
        case .failed:
            return OmenCommandCenterFixtures.realDisconnected
        }
    }

    /// True when the shell could not be read. The view renders an explicit failure surface
    /// rather than letting `realDisconnected` masquerade as a confirmed "no leagues" answer.
    var failure: OmenApiError? {
        guard case .failed(let error) = viewState else { return nil }
        return error
    }

    func load(userID: String) async {
        guard userID != SessionManager.demoUserID else {
            viewState = .demo
            return
        }

        guard let accessToken = sessionManager.currentSession?.accessToken else {
            viewState = .failed(.unauthorized)
            return
        }

        viewState = .loading
        switch await repository.fetchSummary(accessToken: accessToken) {
        case .success(let summary):
            viewState = .loaded(summary)
        case .failure(let error):
            if error == .unauthorized { sessionManager.onRefreshFailed() }
            viewState = .failed(error)
        }
    }
}
