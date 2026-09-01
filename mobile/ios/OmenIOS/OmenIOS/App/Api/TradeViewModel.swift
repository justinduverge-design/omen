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

    /// The six honest content states, applied to autocomplete.
    ///
    /// `F-BAR-34`: this used to be a bare `[PlayerSearchResult]`, and **every** failure —
    /// 429, offline, decode — collapsed into the empty array. On screen that is indistinguishable
    /// from "this player does not exist", which is a claim the client had no basis to make.
    /// The `/api/players/search` route shares a 30-request-per-minute-per-IP bucket with
    /// `/api/trade`, `/api/demo` and `/api/draft-assistant`, so a normal typing session can and
    /// does hit it. Silence about a failure is not neutral — it is a false answer.
    enum SearchState: Equatable {
        /// Query too short to search. No surface at all.
        case idle
        case searching
        case results([PlayerSearchResult])
        /// The server answered, and genuinely knows no such player.
        case empty(query: String)
        case failed(OmenApiError)
    }

    @Published private(set) var searchState: SearchState = .idle
    @Published private(set) var searchingSide: Side?

    /// Rows only when the server actually returned names. Derived so no caller can mistake a
    /// failure for an empty result — the two are different cases of `searchState`.
    var suggestions: [PlayerSearchResult] {
        if case .results(let rows) = searchState { return rows }
        return []
    }

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
            searchState = .idle
            searchingSide = nil
            return
        }
        searchingSide = side
        searchState = .searching
        searchTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 250_000_000)
            guard !Task.isCancelled, let self else { return }
            let outcome = await self.playerSearch.search(query: trimmed)
            guard !Task.isCancelled else { return }
            switch outcome {
            case .success(let rows):
                // Zero rows is a real answer and gets its own state. It is never used to
                // stand in for a failure.
                self.searchState = rows.isEmpty ? .empty(query: trimmed) : .results(rows)
            case .failure(let error):
                // A failed lookup still leaves the field usable — the user can type a name and
                // press Add — but the screen says so instead of implying the player is unknown.
                self.searchState = .failed(error)
            }
        }
    }

    func clearSuggestions() {
        searchTask?.cancel()
        searchState = .idle
        searchingSide = nil
    }

    /// Typed by hand. Carries a name and nothing else, which the server accepts at lower
    /// confidence — it does not refuse.
    func add(_ name: String, to side: Side) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        add(TradePlayer(name: trimmed), to: side)
    }

    /// Picked from autocomplete. Keeps position, team and the provider id, all of which the
    /// server scores on — a name-only player resolves to `position: "UNK"` and falls out of
    /// scarcity and tier entirely. The rows already carried this and the client threw it away.
    func add(_ result: PlayerSearchResult, to side: Side) {
        add(TradePlayer(result), to: side)
    }

    private func add(_ player: TradePlayer, to side: Side) {
        switch side {
        case .send: offer.send.append(player)
        case .receive: offer.receive.append(player)
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
        // A signed-in user still gets a renewed token: a stale bearer would silently
        // downgrade their verdict to the anonymous one.
        let accessToken: String?
        if case .token(let renewed) = await sessionManager.authorization() {
            accessToken = renewed
        } else {
            accessToken = nil
        }

        viewState = .loading
        switch await repository.compare(offer: offer, accessToken: accessToken) {
        case .success(let result):
            viewState = .loaded(result)
        case .failure(let error):
            if error == .unauthorized { sessionManager.onRefreshFailed() }
            viewState = .failed(error)
        }
    }

    /// Autocomplete-specific copy. Deliberately separate from `message(for:)`: a failed
    /// *search* must never read like a failed *verdict*, and the rate-limit case is the one
    /// users actually hit, so it gets named at full volume rather than folded into "server".
    static func searchTitle(for error: OmenApiError) -> String {
        if case .server(let status) = error, status == 429 {
            return "Too many searches"
        }
        return "Search unavailable"
    }

    static func searchMessage(for error: OmenApiError) -> String {
        switch error {
        case .server(let status) where status == 429:
            return "Omen limits searches to protect the service. Wait about a minute, "
                + "or type the full name and press Add."
        case .network:
            return "Omen couldn't reach the server. Check your connection, "
                + "or type the full name and press Add."
        case .unauthorized:
            return "Omen couldn't authorize this search. Type the full name and press Add."
        case .server:
            return "Omen is having trouble on our side. Type the full name and press Add."
        case .decode:
            return "Omen sent something this version of the app couldn't read. "
                + "Type the full name and press Add."
        }
    }

    static func message(for error: OmenApiError) -> String {
        switch error {
        case .network:
            return "Omen couldn't reach the server. Check your connection and try again."
        case .unauthorized:
            return "Your session expired. Sign in again to compare with your league's settings."
        case .server(let status) where status == 422:
            return "Omen couldn't verify one or more players. Remove them and choose from search suggestions."
        case .server:
            return "Omen is having trouble on our side. Try again in a moment."
        case .decode:
            return "Omen sent something this version of the app couldn't read."
        }
    }
}
