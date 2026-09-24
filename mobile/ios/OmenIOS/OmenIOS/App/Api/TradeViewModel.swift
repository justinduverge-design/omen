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
    @Published private(set) var capabilities: TradeCapabilities?

    func loadCapabilities() async {
        capabilities = try? await repository.capabilities().get()
    }

    // MARK: - J4: TradeBuild / TradeRoster — a real opponent roster

    /// `GET /api/trade/roster`. `TradeRoster.dc.html`'s own rule stands: no spinner modeled in
    /// the screen state itself and no retry for a permanent provider limit — `.loading` and
    /// `.failed` are handled by the flow that hosts these screens, not by the screens.
    enum RosterBrowseState: Equatable {
        case idle
        case loading
        case loaded(TradeRosterResponse)
        case failed(OmenApiError)
    }

    @Published private(set) var rosterBrowseState: RosterBrowseState = .idle
    @Published private(set) var selectedPartnerTeamID: String?

    /// Loads every team's roster for the offer's connected league. `offer.leagueContext` is set
    /// from the SAME `league-overview.v1` read the League destination uses — this never
    /// discovers a league on its own, so it can never name a different league than the rest of
    /// the Trade destination.
    func loadRoster(userID: String) async {
        guard userID != SessionManager.demoUserID else {
            rosterBrowseState = .failed(.network)
            return
        }
        guard let leagueContext = offer.leagueContext else {
            rosterBrowseState = .failed(.network)
            return
        }
        let accessToken: String?
        if case .token(let renewed) = await sessionManager.authorization() {
            accessToken = renewed
        } else {
            accessToken = nil
        }
        guard let accessToken else {
            rosterBrowseState = .failed(.unauthorized)
            return
        }

        rosterBrowseState = .loading
        selectedPartnerTeamID = nil
        switch await repository.roster(
            platform: leagueContext.platform,
            leagueId: leagueContext.leagueId,
            teamId: nil,
            week: nil,
            accessToken: accessToken
        ) {
        case .success(let response):
            rosterBrowseState = .loaded(response)
            selectedPartnerTeamID = response.teams.first?.id
        case .failure(let error):
            if error == .unauthorized { sessionManager.onRefreshFailed() }
            rosterBrowseState = .failed(error)
        }
    }

    func selectPartnerTeam(_ id: String) {
        selectedPartnerTeamID = id
    }

    /// Picked off a real roster. Keeps position, team and the provider id — the same fields
    /// autocomplete already carries, and the same reason: a name-only player resolves to
    /// `position: "UNK"` on the server and drops out of scarcity and tier entirely.
    func addFromRoster(_ player: TradeRosterResponse.Player) {
        add(TradePlayer(name: player.name, position: player.position, team: player.team, playerKey: player.playerKey), to: .receive)
    }

    func dismissRosterBrowse() {
        rosterBrowseState = .idle
        selectedPartnerTeamID = nil
    }

    /// `crest` initials — the chip has no room for a full name and no photo to fall back to.
    private func crest(for name: String?) -> String {
        guard let name, !name.isEmpty else { return "FT" }
        let letters = name.split(separator: " ").prefix(2).compactMap { $0.first }
        return letters.isEmpty ? "FT" : String(letters).uppercased()
    }

    var rosterCapability: OmenTradeCapability? {
        guard let capabilities else { return nil }
        return OmenTradeCapability(
            maxTeams: capabilities.maxTeams,
            threeTeamSupported: capabilities.threeTeam.supported,
            threeTeamReason: capabilities.threeTeam.reason
        )
    }

    var rosterPartners: [OmenTradePartner] {
        guard case .loaded(let response) = rosterBrowseState, response.isAvailable else { return [] }
        return response.teams.map {
            OmenTradePartner(id: $0.id, crest: crest(for: $0.teamName), name: $0.teamName ?? "Team \($0.id)", need: nil)
        }
    }

    /// `TradeBuild` — a real partner directory plus the offer built so far. Always constructible
    /// once a league is connected, whether or not the roster read has landed yet.
    var rosterBuildState: OmenTradeBuildState {
        let partners = rosterPartners
        let selectedID = selectedPartnerTeamID ?? partners.first?.id
        let primaryTitle: String
        switch rosterBrowseState {
        case .loading: primaryTitle = "Loading your league's teams…"
        case .loaded(let response) where !response.isAvailable: primaryTitle = "See why rosters aren't available"
        case .loaded where selectedID != nil: primaryTitle = "View their roster"
        default: primaryTitle = "Load your league's teams"
        }
        return OmenTradeBuildState(
            kicker: "Two teams",
            title: "Trade with a real team",
            tabTitles: [],
            selectedTabIndex: 0,
            partners: partners,
            selectedPartnerID: selectedID,
            filters: [],
            selectedFilterID: nil,
            capability: rosterCapability,
            sides: OmenTradeAnswer.sides(of: offer),
            read: nil,
            submission: nil,
            primaryActionTitle: primaryTitle
        )
    }

    /// `TradeRoster` — the selected partner's real roster, or the honest reason it can't be
    /// read. `nil` only while the read is in flight or has not started; the hosting flow shows
    /// its own loading/error surface for those, per this screen's own no-spinner rule.
    var rosterScreenState: OmenTradeRosterState? {
        guard case .loaded(let response) = rosterBrowseState else { return nil }
        let partners = rosterPartners
        let selectedID = selectedPartnerTeamID ?? partners.first?.id

        let rosters: OmenTradeRosterState.Rosters
        var note: String?

        if !response.isAvailable {
            rosters = .permanentlyUnavailable(capability: "Opponent rosters", sentence: response.unavailableSentence)
        } else if let selectedID, let team = response.teams.first(where: { $0.id == selectedID }) {
            let rows: [OmenTradeRosterState.Row] = team.players.map { player in
                let alreadyAdded = player.playerKey != nil
                    && offer.receive.contains { $0.playerKey == player.playerKey }
                return OmenTradeRosterState.Row(
                    id: player.id,
                    name: player.name,
                    meta: player.meta,
                    availability: alreadyAdded ? .added : .available
                )
            }
            rosters = .read(
                teamName: team.teamName ?? "This team",
                playerCount: rows.count,
                rows: rows,
                freshness: "Rosters read live from \(response.platform.capitalized) just now"
            )
            if rows.isEmpty {
                note = "Omen didn't find any rostered players for this team."
            }
        } else {
            rosters = .permanentlyUnavailable(capability: "Opponent rosters", sentence: "Pick a team to see their roster.")
        }

        return OmenTradeRosterState(
            kicker: "Two teams",
            title: "Their roster",
            tabTitles: [],
            selectedTabIndex: 0,
            partners: partners,
            selectedPartnerID: selectedID,
            filters: [],
            selectedFilterID: nil,
            capability: rosterCapability,
            rosters: rosters,
            note: note
        )
    }

    // MARK: - J4: TradeShare

    enum ShareState: Equatable {
        case idle
        case sharing
        case shared(TradeShareResponse)
        case failed(OmenApiError)
    }

    @Published private(set) var shareState: ShareState = .idle
    /// `trade-share.v1`: names off by default. This is the one inclusion toggle the payload
    /// actually supports — flipping it changes what is sent, not just what is displayed.
    @Published private(set) var shareIncludeNames: Bool = false

    func toggleShareInclusion(_ id: String) {
        guard id == "names" else { return }
        shareIncludeNames.toggle()
    }

    /// Card content always comes from the ALREADY-DISPLAYED `trade-compare.v2` read
    /// (`viewState`), never from the share response — `POST /api/trade/share` returns the raw
    /// `compareTrade()` shape (`trade.send/receive`, `result`), not `verdict_state` or
    /// `explanation`. The response only mints the public hash and its expiry.
    var shareScreenState: OmenTradeShareState? {
        guard case .loaded(let compare) = viewState else { return nil }
        let read = OmenTradeRead.from(compare)

        let card = OmenTradeShareState.Card(
            eyebrow: "Omen's read",
            headline: read.headline,
            reasoning: read.reasoning,
            caveat: read.caveat,
            footer: "Shared from Omen. Not financial advice."
        )
        let inclusions = [
            OmenTradeShareState.Inclusion(
                id: "names",
                title: "Player names",
                detail: shareIncludeNames
                    ? "Real player names are shown on the card."
                    : "Positions only — names are off by default.",
                isOn: shareIncludeNames
            ),
        ]

        let failure: String?
        if case .failed(let error) = shareState {
            failure = Self.shareFailureMessage(for: error)
        } else {
            failure = nil
        }

        return OmenTradeShareState(
            kicker: "Two teams",
            title: "Share this read",
            card: card,
            inclusions: inclusions,
            note: "This link is public for 30 days. Anyone with it can see the card above — nothing else about your league.",
            primaryActionTitle: shareState == .sharing ? "Sharing…" : "Get a share link",
            secondaryActionTitle: "Copy as text",
            failure: failure
        )
    }

    /// Replaces each player's name with its position (or "Player") when names are off — the
    /// masking is applied to what is actually POSTed, not just to what the card displays.
    private func maskedForShare(_ offer: TradeOffer) -> TradeOffer {
        var masked = offer
        masked.send = offer.send.map { TradePlayer(name: $0.position ?? "Player", position: $0.position, team: $0.team, playerKey: $0.playerKey) }
        masked.receive = offer.receive.map { TradePlayer(name: $0.position ?? "Player", position: $0.position, team: $0.team, playerKey: $0.playerKey) }
        return masked
    }

    func share(userID: String) async {
        guard offer.isComparable else { return }
        let accessToken: String?
        if case .token(let renewed) = await sessionManager.authorization() {
            accessToken = renewed
        } else {
            accessToken = nil
        }
        let payloadOffer = shareIncludeNames ? offer : maskedForShare(offer)
        shareState = .sharing
        switch await repository.share(offer: payloadOffer, accessToken: accessToken) {
        case .success(let response):
            shareState = .shared(response)
        case .failure(let error):
            shareState = .failed(error)
        }
    }

    func copyShareText() -> String? {
        guard case .loaded(let compare) = viewState else { return nil }
        let read = OmenTradeRead.from(compare)
        return "\(read.headline)\n\(read.reasoning)\n\(read.caveat)\n— via Omen"
    }

    func dismissShare() {
        shareState = .idle
    }

    static func shareFailureMessage(for error: OmenApiError) -> String {
        switch error {
        case .server(let status) where status == 503:
            return "Omen couldn't create a share link right now. Try again in a moment."
        case .server(let status) where status == 413:
            return "This offer is too large to share."
        case .network:
            return "Omen couldn't reach the server. Check your connection and try again."
        default:
            return "Omen couldn't create a share link. Try again."
        }
    }

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

    /// Back to the offer builder, keeping the offer itself.
    ///
    /// The J4 answer screens replace the builder while a verdict is on screen, so there has to be
    /// a way back. `.idle` rather than clearing `offer` is the point: a user who reads "you give
    /// up too much" wants to change one player, not retype the deal.
    func dismissVerdict() {
        viewState = .idle
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
