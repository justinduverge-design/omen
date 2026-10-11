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

    /// The league the current `viewState` was requested for. `nil` means the request named no league and the
    /// server used the account's selected one.
    @Published private(set) var requestedScope: OmenCallScope?

    /// Bumped by every load. A response that comes back after a newer load started belongs to a league the
    /// user has already left and is dropped, so a slow answer can never repaint the previous league's call.
    private var generation = 0

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
            if Self.answeredForADifferentLeague(envelope, than: requestedScope) {
                return .error(Self.wrongLeagueMessage, retry: { [weak self] in Task { await self?.reload() } })
            }
            return envelope.briefState(
                onRetry: { [weak self] in Task { await self?.reload() } },
                onConnect: onConnect
            )
        case .failed(let error):
            return .error(Self.message(for: error), retry: { [weak self] in Task { await self?.reload() } })
        }
    }

    /// What the Omen tab should draw while the picker says `visibleScope` is the league on screen.
    ///
    /// The picker can move before a reload has started, and a call for the league the user just left must not
    /// be on screen even for that moment. If what is held was requested for, or answered for, any other league,
    /// it is not shown: the tab reads as loading until the right call arrives.
    func briefState(visibleScope: OmenCallScope?) -> OmenDecisionBriefState {
        guard let visibleScope else { return briefState }
        if case .loaded(let envelope) = viewState,
           requestedScope != visibleScope || Self.answeredForADifferentLeague(envelope, than: visibleScope) {
            return .loading
        }
        if case .failed = viewState, requestedScope != visibleScope { return .loading }
        return briefState
    }

    func load(userID: String, scope: OmenCallScope? = nil) async {
        guard userID != SessionManager.demoUserID else {
            viewState = .demo
            return
        }
        requestedScope = scope
        await reload()
    }

    /// Reloads only when the picked league is not the one the held call was requested for or answered for.
    /// The league-switch path and the picker's own change both land here without issuing two requests.
    func loadIfLeagueChanged(userID: String, scope: OmenCallScope?) async {
        guard userID != SessionManager.demoUserID, let scope, scope != requestedScope else { return }
        if case .loaded(let envelope) = viewState,
           let answered = envelope.answeredFor, answered.matched != false,
           answered.platform == scope.platform, answered.leagueID == scope.leagueID {
            requestedScope = scope
            return
        }
        await load(userID: userID, scope: scope)
    }

    /// True when the server said which league it answered for and it is not the one asked for. Absent facts
    /// are not a mismatch: an older server sends no `answered_for`, and then the request is all we know.
    static func answeredForADifferentLeague(_ envelope: OmenDecisionEnvelope, than scope: OmenCallScope?) -> Bool {
        guard let scope, let answered = envelope.answeredFor,
              let platform = answered.platform, let leagueID = answered.leagueID else { return false }
        return platform != scope.platform || leagueID != scope.leagueID
    }

    private static let wrongLeagueMessage =
        "Omen answered for a different league than the one you picked, so this call is not shown. Try again."

    private func reload(attempt: Int = 0) async {
        let scope = requestedScope
        generation += 1
        let mine = generation
        viewState = .loading
        startSitDetail = nil
        let result = await sessionManager.authorized({ await repository.fetchDecision(accessToken: $0, scope: scope) })
        guard mine == generation else { return }
        switch result {
        case .success(let envelope):
            // One honest refetch if the server answered for another league; then show it as an error rather
            // than as this league's call.
            if Self.answeredForADifferentLeague(envelope, than: scope), attempt == 0 {
                await reload(attempt: 1)
                return
            }
            viewState = .loaded(envelope)
            if Self.answeredForADifferentLeague(envelope, than: scope) { return }
            // Only a live `start_sit` call has a start/sit detail to read — a trade or
            // waiver recommendation would just make this an extra round trip to a route
            // that has nothing for it. Reuses the token `authorized` just proved good
            // rather than renewing again, same reasoning as `CommandCenterViewModel`.
            guard envelope.recommendation?.type == "start_sit",
                  case .token(let accessToken) = await sessionManager.authorization()
            else { return }
            let detailResult = await startSitRepository.fetchDetail(accessToken: accessToken, slot: nil)
            guard mine == generation else { return }
            switch detailResult {
            case .success(let detail):
                // The start/sit detail route reads the account's selected league and takes no league. When the
                // picked league is a different one, its detail would describe another team under this call.
                if let expected = scope ?? envelope.answeredFor?.scope,
                   let platform = detail.platform, let leagueId = detail.leagueId,
                   platform != expected.platform || leagueId != expected.leagueID {
                    break
                }
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
            let base = "Omen sent something this version of the app couldn't read. Updating the app may fix it."
            guard let detail = OmenDecodeDiagnostics.lastFailure else { return base }
            return "\(base) (Detail: \(detail))"
        }
    }
}
