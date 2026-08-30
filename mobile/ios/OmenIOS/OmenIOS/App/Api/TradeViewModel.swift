import Foundation

/// M5 slice G — drives the Trade destination from `trade-compare.v2`.
@MainActor
final class TradeViewModel: ObservableObject {
    enum ViewState: Equatable {
        /// Nothing asked yet. Distinct from `.loading` and from an empty result: the screen
        /// must not show a verdict surface before the user has offered anything.
        case idle
        case loading
        case loaded(TradeCompare)
        case failed(OmenApiError)
        case demo
    }

    @Published private(set) var viewState: ViewState = .idle
    @Published var offer = TradeOffer()

    /// Autocomplete results for whichever side is being typed into. Empty is the resting
    /// state — the picker only appears when the server actually returned names.
    @Published private(set) var suggestions: [PlayerSearchResult] = []
    @Published private(set) var searchingSide: Side?

    private let repository: TradeRepository
    private let playerSearch: PlayerSearchRepository
    private let sessionManager: SessionManager
    private var searchTask: Task<Void, Never>?

    init(
        repository: TradeRepository,
        playerSearch: PlayerSearchRepository,
        sessionManager: SessionManager
    ) {
        self.repository = repository
        self.playerSearch = playerSearch
        self.sessionManager = sessionManager
    }

    /// Debounced so a fast typist does not fire a request per keystroke against a
    /// 30-per-minute-per-IP rate limit.
    func search(_ query: String, side: Side) {
        searchTask?.cancel()
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2 else {
            suggestions = []
            searchingSide = nil
            return
        }
        searchingSide = side
        searchTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 250_000_000)
            guard !Task.isCancelled, let self else { return }
            if case .success(let rows) = await self.playerSearch.search(query: trimmed) {
                guard !Task.isCancelled else { return }
                self.suggestions = rows
            } else {
                // A failed lookup leaves the field usable: the user can still type a name and
                // press Add. Autocomplete is an accelerator, never a gate.
                self.suggestions = []
            }
        }
    }

    func clearSuggestions() {
        searchTask?.cancel()
        suggestions = []
        searchingSide = nil
    }

    func add(_ name: String, to side: Side) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        switch side {
        case .send: offer.send.append(trimmed)
        case .receive: offer.receive.append(trimmed)
        }
        clearSuggestions()
        // Any edit invalidates the standing verdict. Leaving it on screen beside a changed
        // offer would show an answer to a question the user is no longer asking.
        viewState = .idle
    }

    func remove(at index: Int, from side: Side) {
        switch side {
        case .send where offer.send.indices.contains(index): offer.send.remove(at: index)
        case .receive where offer.receive.indices.contains(index): offer.receive.remove(at: index)
        default: return
        }
        viewState = .idle
    }

    enum Side { case send, receive }

    /// The league to personalize against, when the caller has one. Set by the shell from the
    /// same `league-overview.v1` read the League destination uses — never guessed here.
    func useLeague(platform: String?, leagueId: String?) {
        guard let platform, let leagueId, !platform.isEmpty, !leagueId.isEmpty else {
            offer.leagueContext = nil
            return
        }
        offer.leagueContext = .init(platform: platform, leagueId: leagueId)
    }

    func compare(userID: String) async {
        guard userID != SessionManager.demoUserID else {
            viewState = .demo
            return
        }
        guard offer.isComparable else {
            viewState = .idle
            return
        }

        // `/compare` degrades an unauthenticated caller to a 200 neutral answer rather than a
        // 401, so a missing token is not a failure here — it just means no personalization.
        let accessToken = sessionManager.currentSession?.accessToken

        viewState = .loading
        switch await repository.compare(offer: offer, accessToken: accessToken) {
        case .success(let result):
            viewState = .loaded(result)
        case .failure(let error):
            if error == .unauthorized { sessionManager.onRefreshFailed() }
            viewState = .failed(error)
        }
    }

    static func message(for error: OmenApiError) -> String {
        switch error {
        case .network:
            return "Omen couldn't reach the server. Check your connection and try again."
        case .unauthorized:
            return "Your session expired. Sign in again to compare with your league's settings."
        case .server:
            return "Omen is having trouble on our side. Try again in a moment."
        case .decode:
            return "Omen sent something this version of the app couldn't read."
        }
    }
}
