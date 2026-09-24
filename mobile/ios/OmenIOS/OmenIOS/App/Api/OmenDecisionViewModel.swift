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

    /// `start-sit-detail.v2`. Populated only when the live envelope's own call names a
    /// start/sit recommendation (`recommendation.type == "start_sit"`) — a trade or waiver
    /// call has no start/sit detail to read, and this stays `nil` for them. `nil` also while
    /// the detail read is in flight, so the Omen destination keeps rendering the brief's own
    /// `.success` composition until there is a genuine, richer answer to swap in — never
    /// blocking or regressing what the brief already has.
    @Published private(set) var startSitDetail: StartSitDetail?

    private let repository: OmenDecisionRepository
    private let startSitRepository: StartSitDetailRepository
    private let sessionManager: SessionManager

    /// Injected so the brief's Connect affordance reaches the same connect flow the rest of
    /// the app uses, rather than this screen minting a second entry point.
    var onConnect: (() -> Void)?

    init(
        repository: OmenDecisionRepository,
        startSitRepository: StartSitDetailRepository = StubStartSitDetailRepository(result: .failure(.network)),
        sessionManager: SessionManager
    ) {
        self.repository = repository
        self.startSitRepository = startSitRepository
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
        viewState = .loading
        startSitDetail = nil
        switch await sessionManager.authorized({ await repository.fetchDecision(accessToken: $0) }) {
        case .success(let envelope):
            viewState = .loaded(envelope)
            // Only a live `start_sit` call has a start/sit detail to read — a trade or
            // waiver recommendation would just make this an extra round trip to a route
            // that has nothing for it. Reuses the token `authorized` just proved good
            // rather than renewing again, same reasoning as `CommandCenterViewModel`.
            guard envelope.recommendation?.type == "start_sit",
                  case .token(let accessToken) = await sessionManager.authorization()
            else { return }
            switch await startSitRepository.fetchDetail(accessToken: accessToken, slot: nil) {
            case .success(let detail):
                startSitDetail = detail
            case .failure:
                // The brief's own `.success` composition remains visible. A transport
                // failure on this richer read must not block or replace an answer the
                // envelope already gave honestly.
                break
            }
        case .failure(let error):
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
