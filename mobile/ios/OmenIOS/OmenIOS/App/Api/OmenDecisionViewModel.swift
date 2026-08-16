import Foundation

/// M5-Native-API-Client slice D — drives the Omen destination from the live engine.
///
/// Replaces `OmenDecisionFixtures.demo` / `.realDisconnected`, which every real signed-in
/// user saw regardless of their actual leagues. Mirrors `CommandCenterViewModel`: demo is
/// not a load state and never touches the network, failure is rendered honestly, and no
/// path falls back to a fixture (facts-of-record #7).
@MainActor
final class OmenDecisionViewModel: ObservableObject {
    enum ViewState: Equatable {
        case idle
        case loading
        case loaded(OmenDecisionEnvelope)
        case failed(OmenApiError)
        case demo
    }

    @Published private(set) var viewState: ViewState = .idle

    private let repository: OmenDecisionRepository
    private let sessionManager: SessionManager

    /// Injected so the brief's Connect affordance reaches the same connect flow the rest of
    /// the app uses, rather than this screen minting a second entry point.
    var onConnect: (() -> Void)?

    init(repository: OmenDecisionRepository, sessionManager: SessionManager) {
        self.repository = repository
        self.sessionManager = sessionManager
    }

    /// The state the Omen destination renders.
    ///
    /// `idle` and `loading` are the same surface on purpose — before the first request
    /// resolves there is nothing truthful to show but a spinner, and an "idle" empty state
    /// would read as "Omen has no move for you", which is a claim we have not earned yet.
    var briefState: OmenDecisionBriefState {
        switch viewState {
        case .idle, .loading:
            return .loading
        case .demo:
            return OmenDecisionFixtures.demo
        case .loaded(let envelope):
            return envelope.briefState(
                onRetry: { [weak self] in Task { await self?.reload() } },
                onConnect: onConnect
            )
        case .failed(let error):
            return .error(Self.message(for: error), retry: { [weak self] in Task { await self?.reload() } })
        }
    }

    func load(userID: String) async {
        guard userID != SessionManager.demoUserID else {
            viewState = .demo
            return
        }
        await reload()
    }

    private func reload() async {
        guard let accessToken = sessionManager.currentSession?.accessToken else {
            viewState = .failed(.unauthorized)
            return
        }

        viewState = .loading
        switch await repository.fetchDecision(accessToken: accessToken) {
        case .success(let envelope):
            viewState = .loaded(envelope)
        case .failure(let error):
            if error == .unauthorized { sessionManager.onRefreshFailed() }
            viewState = .failed(error)
        }
    }

    /// Transport failures only. Contract states carry the server's own recovery sentence and
    /// are mapped in `OmenDecisionEnvelope.briefState` — this covers the cases where no
    /// envelope arrived at all, so there is no server message to defer to.
    private static func message(for error: OmenApiError) -> String {
        switch error {
        case .network:
            return "Omen couldn't reach the server. Check your connection and try again."
        case .unauthorized:
            return "Your session expired. Sign in again to see this week's move."
        case .server:
            // The status code is deliberately not shown. It tells a user nothing they can
            // act on, and `OmenApiError` carries it for logs rather than for display.
            return "Omen is having trouble on our side. Try again in a moment."
        case .decode:
            return "Omen sent something this version of the app couldn't read. Updating the app may fix it."
        }
    }
}
