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
        /// Demo has no real league to read. Not a failure: nothing was attempted.
        case demo
    }

    @Published private(set) var rosterBrowseState: RosterBrowseState = .idle

    /// The league (`platform:leagueId`) the held rosters were read for.

    private var rosterLoadedFor: String?
    private var rosterLoadedAt: Date?
    @Published private(set) var selectedPartnerTeamID: String?
    /// Provider-confirmed identity for the team the signed-in user manages in `offer.leagueContext`.
    /// Without it Omen cannot distinguish an opponent from the viewer and must offer no partner.
    @Published private(set) var viewerTeamID: String?
    /// Invalidates every asynchronous result whose meaning depends on the selected league.
    private var leagueGeneration = 0

    /// Loads every team's roster for the offer's connected league. `offer.leagueContext` is set
    /// from the SAME `league-overview.v1` read the League destination uses — this never
    /// discovers a league on its own, so it can never name a different league than the rest of
    /// the Trade destination.
    func loadRoster(userID: String, force: Bool = false) async {
        guard userID != SessionManager.demoUserID else {
            rosterBrowseState = .demo
            return
        }
        // No league named yet: the league overview is still loading. Waiting is the honest state; the builder retries
        // when the league arrives, and says so if the league read itself failed. It is not a network failure.
        guard let leagueContext = offer.leagueContext else {
            rosterBrowseState = .idle
            return
        }
        // Reuse the league's rosters already in hand. Re-reading every team's roster (and blanking
        // the screen to a spinner) on every visit to Build was the founder's "takes forever".
        let leagueKey = "\(leagueContext.platform):\(leagueContext.leagueId)"
        // Reused for five minutes, so a waiver add or accepted trade shows up on the next visit after that.
        if !force, rosterLoadedFor == leagueKey, let at = rosterLoadedAt, Date().timeIntervalSince(at) < 300,
           case .loaded = rosterBrowseState { return }
        let generation = leagueGeneration
        let accessToken: String?
        if case .token(let renewed) = await sessionManager.authorization() {
            accessToken = renewed
        } else {
            accessToken = nil
        }
        guard generation == leagueGeneration else { return }
        guard let accessToken else {
            rosterBrowseState = .failed(.unauthorized)
            return
        }

        rosterBrowseState = .loading
        selectedPartnerTeamID = nil
        let result = await repository.roster(
            platform: leagueContext.platform,
            leagueId: leagueContext.leagueId,
            teamId: nil,
            week: nil,
            accessToken: accessToken
        )
        guard generation == leagueGeneration else { return }
        switch result {
        case .success(let response):
            rosterBrowseState = .loaded(response)
            rosterLoadedFor = leagueKey
            rosterLoadedAt = Date()
            // Omen's own trade call names who it would deal with; open on that team, not the first one.
            let preferred = Self.partnerTeamID(in: response, for: prefill)
            selectedPartnerTeamID = rosterPartners.contains(where: { $0.id == preferred })
                ? preferred
                : rosterPartners.first?.id
        case .failure(let error):
            if error == .unauthorized { sessionManager.onRefreshFailed() }
            rosterBrowseState = .failed(error)
        }
    }

    func selectPartnerTeam(_ id: String) {
        selectedPartnerTeamID = id
    }

    // MARK: - Omen's trade call -> Trade (prefill)

    /// What the Trade screens know about the Omen call that put the offer here. Cleared the moment the offer is
    /// edited: after that it is the user's own offer, and the screen must stop calling it Omen's.
    struct Prefill: Equatable {
        let giveName: String
        let receiveName: String
        /// The team named in the call, when the server's sentence named one.
        let partnerName: String?
        /// The player you get; the team that holds him on the roster read is the partner.
        let receivePlayerKey: String?
        let platform: String?
        /// The provider's id for the partner team, when the server sent one.
        var partnerTeamID: String? = nil
    }

    @Published private(set) var prefill: Prefill?

    /// Replaces the offer with the one Omen's call made: the player you send, the player you get, in the league
    /// the call was made for. Everything built on the previous offer (a verdict, a roster browse, a three-team
    /// build) is dropped, because none of it is about this deal. Does nothing for a call that cannot be reviewed.
    ///
    /// A call with no known league is refused: its players would otherwise be compared in whatever league the
    /// Trade tab last held. Returns whether the offer was filled in.
    @discardableResult
    func applyPrefill(from call: OmenTradeCall) -> Bool {
        guard call.canReview, let scope = call.scope else { return false }
        searchTask?.cancel()
        invalidateCompare()
        offer.send = call.gives.map(\.tradePlayer)
        offer.receive = call.receives.map(\.tradePlayer)
        offer.leagueContext = .init(platform: scope.platform, leagueId: scope.leagueID)
        prefillScope = scope
        clearSuggestions()
        viewState = .idle
        rosterBrowseState = .idle
        rosterLoadedFor = nil
        selectedPartnerTeamID = nil
        thirdPartnerTeamID = nil
        threeTeamLegs = []
        threeTeamViewState = .idle
        threeTeamSubmissionDoneSteps = []
        thirdPartnerRemovalDisclosure = nil
        shareState = .idle
        prefill = Prefill(
            giveName: call.give.name,
            receiveName: call.receive.name,
            partnerName: call.partnerName,
            receivePlayerKey: call.receive.playerKey,
            platform: call.platform,
            partnerTeamID: call.partnerTeamID
        )
        return true
    }

    /// The league the prefilled offer was made for. While a prefill stands, the offer is only ever compared in it.
    private var prefillScope: OmenCallScope?

    /// Prefill, then ask the server. This is what "Review this trade" does. Returns false when the call was
    /// refused (no known league, or not reviewable), so the caller does not move the user anywhere.
    @discardableResult
    func review(_ call: OmenTradeCall, userID: String) async -> Bool {
        guard applyPrefill(from: call) else { return false }
        await compare(userID: userID)
        return true
    }

    /// Bumped by every edit and every compare. A compare whose token is no longer current belongs to an offer
    /// the user has since changed or replaced, and its answer is dropped.
    private var compareGeneration = 0

    private func invalidateCompare() {
        compareGeneration += 1
    }

    /// The partner on a roster read: the team that holds the player you get (the provider's own key, so no name
    /// has to match), else the team whose name the call gave. Nil when neither identifies one team, in which
    /// case nothing is preselected on the guess.
    static func partnerTeamID(in response: TradeRosterResponse, for prefill: Prefill?) -> String? {
        guard let prefill else { return nil }
        if let id = prefill.partnerTeamID, !id.isEmpty, response.teams.filter({ $0.id == id }).count == 1 { return id }
        if let key = prefill.receivePlayerKey, !key.isEmpty {
            let holders = response.teams.filter { team in team.players.contains { $0.playerKey == key } }
            if holders.count == 1 { return holders[0].id }
        }
        if let name = prefill.partnerName?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(), !name.isEmpty {
            let named = response.teams.filter {
                $0.teamName?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == name
            }
            if named.count == 1 { return named[0].id }
        }
        return nil
    }

    // MARK: - T5: three-team trade builder

    enum ThreeTeamViewState: Equatable {
        case idle
        case loading
        case loaded(TradeThreeTeamCompare)
        case failed(OmenApiError)
        case demo
    }

    @Published private(set) var thirdPartnerTeamID: String?
    @Published private(set) var threeTeamLegs: [TradeThreeTeamLeg] = []
    @Published private(set) var threeTeamViewState: ThreeTeamViewState = .idle
    /// Client-local only. Never sent to the server, never read back as proof a leg went through —
    /// `TradeBuildThreeTeam-v1.md`'s own rule.
    @Published private(set) var threeTeamSubmissionDoneSteps: Set<Int> = []
    /// "Removed Chubb Rock. Any legs with them were cleared too." Transient; the screen clears it
    /// on its own timetable (or the caller can via `dismissThirdPartnerRemovalDisclosure`).
    @Published private(set) var thirdPartnerRemovalDisclosure: String?

    /// The league's other teams, minus the viewer's own team and whichever partner(s) are
    /// already in the trade — `TradePartnerPicker-v1.md`'s governing rule, restated by
    /// `rosterPartners` already excluding "you" (it is built from opponent rosters only).
    var partnerPickerCandidates: [OmenTradePartner] {
        let excluded = Set([selectedPartnerTeamID, thirdPartnerTeamID].compactMap { $0 })
        return rosterPartners.filter { !excluded.contains($0.id) }
    }

    /// Commits a picked team as the third partner. Any prior three-team read goes stale — the
    /// same "any edit invalidates the standing verdict" rule `add(_:to:)` already applies to the
    /// two-team offer.
    func addThirdPartner(_ partner: OmenTradePartner) {
        thirdPartnerTeamID = partner.id
        thirdPartnerRemovalDisclosure = nil
        threeTeamViewState = .idle
    }

    /// Tapping the already-selected third-partner chip a second time — the toggle-a-chip removal
    /// idiom `.fc` filter chips already use. Discards every leg touching that team and returns to
    /// the existing 2-team state, per `TradeBuildThreeTeam-v1.md`'s own acceptance check: "never a
    /// silent partial state with orphaned legs."
    func removeThirdPartner() {
        guard let removedID = thirdPartnerTeamID else { return }
        let removedName = rosterPartners.first(where: { $0.id == removedID })?.name ?? "that team"
        threeTeamLegs.removeAll { $0.from == removedID || $0.to == removedID }
        thirdPartnerTeamID = nil
        threeTeamViewState = .idle
        threeTeamSubmissionDoneSteps = []
        thirdPartnerRemovalDisclosure = "Removed \(removedName). Any legs with them were cleared too."
    }

    func dismissThirdPartnerRemovalDisclosure() {
        thirdPartnerRemovalDisclosure = nil
    }

    /// A new main partner ends any three-team trade built around the old one: no team twice, no legs to
    /// a team that is no longer in the trade.
    private func clearThreeTeam() {
        thirdPartnerTeamID = nil
        threeTeamLegs = []
        threeTeamViewState = .idle
        threeTeamSubmissionDoneSteps = []
    }

    /// The three teams in a three-team trade, "you" first. Empty until a third team is added.
    var threeTeamTeams: [OmenTradePartner] {
        guard let thirdPartnerTeamID, let primary = selectedPartnerTeamID else { return [] }
        let byID = Dictionary(rosterPartners.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        return [OmenTradePartner(id: "you", crest: "You", name: "You")] + [primary, thirdPartnerTeamID].compactMap { byID[$0] }
    }

    /// Where a player on `teamID` is going in the three-team trade, or nil when he stays.
    func threeTeamDestination(playerKey: String, from teamID: String) -> String? {
        threeTeamLegs.first { $0.from == teamID && $0.players.contains { ($0.playerKey ?? $0.name) == playerKey } }?.to
    }

    /// Sends a player from any of the three teams to one of the other two. Choosing where he already
    /// goes takes him back out; choosing the other team moves him.
    func setThreeTeamDestination(_ player: TradeRosterResponse.Player, from teamID: String, to destination: String) {
        let key = player.playerKey ?? player.name
        let previous = threeTeamDestination(playerKey: key, from: teamID)
        for index in threeTeamLegs.indices where threeTeamLegs[index].from == teamID {
            threeTeamLegs[index].players.removeAll { ($0.playerKey ?? $0.name) == key }
        }
        threeTeamLegs.removeAll { $0.players.isEmpty }
        threeTeamViewState = .idle
        guard previous != destination, destination != teamID else { return }
        let name: (String) -> String? = { id in id == "you" ? nil : self.rosterPartners.first { $0.id == id }?.name }
        addThreeTeamLeg(from: teamID, fromName: name(teamID), to: destination, toName: name(destination),
                        player: TradePlayer(name: player.name, position: player.position, team: player.team, playerKey: player.playerKey))
    }

    /// One team's roster for the three-team picker; "you" is the viewer's own team.
    func threeTeamRoster(_ teamID: String) -> TradeRosterResponse.Team? {
        teamID == "you" ? viewerRoster : {
            guard case .loaded(let response) = rosterBrowseState else { return nil }
            return response.teams.first { $0.id == teamID }
        }()
    }

    private func addThreeTeamLeg(from: String, fromName: String?, to: String, toName: String?, player: TradePlayer) {
        if let index = threeTeamLegs.firstIndex(where: { $0.from == from && $0.to == to }) {
            threeTeamLegs[index].players.append(player)
        } else {
            threeTeamLegs.append(TradeThreeTeamLeg(from: from, fromName: fromName, to: to, toName: toName, players: [player]))
        }
        // Any edit invalidates the standing three-team read, same rule as the 2-team offer.
        threeTeamViewState = .idle
    }

    var threeTeamOffer: TradeThreeTeamOffer {
        TradeThreeTeamOffer(legs: threeTeamLegs, leagueContext: offer.leagueContext)
    }

    func compareThreeTeam(userID: String) async {
        guard userID != SessionManager.demoUserID else {
            threeTeamViewState = .demo
            return
        }
        guard threeTeamOffer.isThreeTeamShape, threeTeamLegs.count >= 2 else {
            threeTeamViewState = .idle
            return
        }
        let generation = leagueGeneration
        let accessToken: String?
        if case .token(let renewed) = await sessionManager.authorization() {
            accessToken = renewed
        } else {
            accessToken = nil
        }
        guard generation == leagueGeneration else { return }

        threeTeamViewState = .loading
        threeTeamSubmissionDoneSteps = []
        let result = await repository.compareThreeTeam(offer: threeTeamOffer, accessToken: accessToken)
        guard generation == leagueGeneration else { return }
        switch result {
        case .success(let result):
            threeTeamViewState = .loaded(result)
        case .failure(let error):
            if error == .unauthorized { sessionManager.onRefreshFailed() }
            threeTeamViewState = .failed(error)
        }
    }

    /// The per-step done toggle. Client-local only — see `OmenTradeSubmission.stepDone`'s doc
    /// comment for the full rule.
    func toggleThreeTeamSubmissionStep(_ index: Int) {
        if threeTeamSubmissionDoneSteps.contains(index) {
            threeTeamSubmissionDoneSteps.remove(index)
        } else {
            threeTeamSubmissionDoneSteps.insert(index)
        }
    }

    /// Copies only this leg's player names — never the whole three-leg block —
    /// `TradeBuildThreeTeam-v1.md`'s own rule for the per-step "Copy" action. Steps line up 1:1,
    /// in order, with the legs the client POSTed (T1 iterates `resolvedLegs.map` in that order).
    func copyTextForThreeTeamStep(_ index: Int) -> String? {
        guard threeTeamLegs.indices.contains(index) else { return nil }
        return threeTeamLegs[index].players.map(\.name).joined(separator: ", ")
    }

    func dismissThreeTeamVerdict() {
        threeTeamViewState = .idle
    }

    /// Picked off a real roster. Keeps position, team and the provider id — the same fields
    /// autocomplete already carries, and the same reason: a name-only player resolves to
    /// `position: "UNK"` on the server and drops out of scarcity and tier entirely.
    func addFromRoster(_ player: TradeRosterResponse.Player) {
        add(TradePlayer(name: player.name, position: player.position, team: player.team, playerKey: player.playerKey), to: .receive)
    }

    // MARK: - Trade builder (both rosters, one screen)

    /// The viewer's own team from the same roster read, so the builder can pick what you send from
    /// your real roster instead of a typed name (founder, 2026-10-21: "I don't think you can select
    /// from your own team").
    var viewerRoster: TradeRosterResponse.Team? {
        guard case .loaded(let response) = rosterBrowseState, response.isAvailable,
              let viewerTeamID, !viewerTeamID.isEmpty else { return nil }
        return response.teams.first { $0.id == viewerTeamID }
    }

    var partnerRoster: TradeRosterResponse.Team? {
        guard case .loaded(let response) = rosterBrowseState, response.isAvailable,
              let selectedPartnerTeamID else { return nil }
        return response.teams.first { $0.id == selectedPartnerTeamID }
    }

    /// Whether a roster player is already in the offer on that side. Keyed by provider id, then name.
    func isInOffer(_ player: TradeRosterResponse.Player, side: Side) -> Bool {
        (side == .send ? offer.send : offer.receive).contains { Self.same($0, player) }
    }

    func toggleFromRoster(_ player: TradeRosterResponse.Player, side: Side) {
        let list = side == .send ? offer.send : offer.receive
        if let index = list.firstIndex(where: { Self.same($0, player) }) {
            remove(at: index, from: side)
        } else {
            add(TradePlayer(name: player.name, position: player.position, team: player.team, playerKey: player.playerKey), to: side)
        }
    }

    /// Picking a different partner keeps what you send and drops what you asked for from the old one.
    func switchPartner(to id: String) {
        guard id != selectedPartnerTeamID else { return }
        clearThreeTeam()
        selectedPartnerTeamID = id
        if !offer.receive.isEmpty {
            offer.receive = []
            prefill = nil
            prefillScope = nil
            invalidateCompare()
            viewState = .idle
        }
    }

    /// Find a trade's "Open in builder": the partner and both players, ready to judge or adjust.
    func openInBuilder(_ candidate: TradeFindCandidate) {
        clearOffer()
        clearThreeTeam()
        if let partner = candidate.opponentTeamId, !partner.isEmpty { selectedPartnerTeamID = partner }
        add(TradePlayer(name: candidate.give.name, position: candidate.give.position, team: candidate.give.team, playerKey: candidate.give.playerKey), to: .send)
        add(TradePlayer(name: candidate.receive.name, position: candidate.receive.position, team: candidate.receive.team, playerKey: candidate.receive.playerKey), to: .receive)
    }

    func clearOffer() {
        offer.send = []
        offer.receive = []
        prefill = nil
        prefillScope = nil
        invalidateCompare()
        viewState = .idle
    }

    private static func same(_ offered: TradePlayer, _ player: TradeRosterResponse.Player) -> Bool {
        if let a = offered.playerKey, let b = player.playerKey, !a.isEmpty, !b.isEmpty { return a == b }
        return offered.name == player.name
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
        guard case .loaded(let response) = rosterBrowseState,
              response.isAvailable,
              let viewerTeamID,
              !viewerTeamID.isEmpty
        else { return [] }
        return response.teams.filter { $0.id != viewerTeamID }.map {
            OmenTradePartner(id: $0.id, crest: crest(for: $0.teamName), name: $0.teamName ?? "Team \($0.id)", need: nil)
        }
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
            primaryActionTitle: {
                switch shareState {
                case .sharing: return "Creating link…"
                case .shared: return "Share link"
                default: return "Get a share link"
                }
            }(),
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
        let generation = leagueGeneration
        let accessToken: String?
        if case .token(let renewed) = await sessionManager.authorization() {
            accessToken = renewed
        } else {
            accessToken = nil
        }
        guard generation == leagueGeneration else { return }
        let payloadOffer = shareIncludeNames ? offer : maskedForShare(offer)
        shareState = .sharing
        let result = await repository.share(offer: payloadOffer, accessToken: accessToken)
        guard generation == leagueGeneration else { return }
        switch result {
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

    func sharedURL(baseURL: URL) -> URL? {
        guard case .shared(let response) = shareState,
              !response.apiPath.isEmpty else { return nil }
        return URL(string: response.apiPath, relativeTo: baseURL)?.absoluteURL
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
        prefill = nil
        prefillScope = nil
        invalidateCompare()
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
        prefill = nil
        prefillScope = nil
        invalidateCompare()
        viewState = .idle
    }

    enum Side { case send, receive }

    /// The league to personalize against, when the caller has one. Set by the shell from the
    /// same `league-overview.v1` read the League destination uses — never guessed here.
    func useLeague(platform: String?, leagueId: String?, viewerTeamId: String? = nil) {
        let nextViewerTeamID = viewerTeamId.flatMap { $0.isEmpty ? nil : $0 }
        let next: TradeOffer.LeagueContext?
        if let platform, let leagueId, !platform.isEmpty, !leagueId.isEmpty {
            next = .init(platform: platform, leagueId: leagueId)
        } else {
            next = nil
        }
        let contextChanged = offer.leagueContext != next || viewerTeamID != nextViewerTeamID
        if contextChanged {
            invalidateLeagueDependentState()
        }
        viewerTeamID = nextViewerTeamID
        // A prefilled offer belongs to the league Omen's call was made for. The league sync must not point it
        // at another one: if it names the same league nothing changes; if it names a different one (or none),
        // the offer is no longer that call's, so it is dropped rather than compared in the wrong league.
        if let scope = prefillScope {
            if let next, scope.names(platform: next.platform, leagueID: next.leagueId) { return }
            prefillScope = nil
            prefill = nil
            invalidateCompare()
            offer.send = []
            offer.receive = []
            viewState = .idle
        }
        offer.leagueContext = next
    }

    /// A roster, verdict, share result, or three-team build is evidence about one league.
    /// Drop all of it as soon as that context starts changing (including loading/failure),
    /// before another league can inherit the previous league's teams on screen.
    private func invalidateLeagueDependentState() {
        leagueGeneration += 1
        invalidateCompare()
        viewState = .idle
        rosterBrowseState = .idle
        selectedPartnerTeamID = nil
        thirdPartnerTeamID = nil
        threeTeamLegs = []
        threeTeamViewState = .idle
        threeTeamSubmissionDoneSteps = []
        thirdPartnerRemovalDisclosure = nil
        shareState = .idle
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
        invalidateCompare()
        // A share link belongs to the read it was made from; a new read starts without one.
        shareState = .idle
        let token = compareGeneration

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

        // The offer may have been edited or replaced while the token was fetched.
        guard token == compareGeneration, offer.isComparable else { return }
        let sent = offer
        viewState = .loading
        let outcome = await repository.compare(offer: sent, accessToken: accessToken)
        // A late answer to an offer the user has since changed, or to an earlier review, is not shown.
        guard token == compareGeneration else { return }
        switch outcome {
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
        case .cancelled:
            return "That was interrupted. Try the search again."
        case .server(let status) where status == 429:
            return "Omen limits searches to protect the service. Wait about a minute, then try again."
        case .network:
            return "Omen couldn't reach the server. Check your connection, then try the search again."
        case .unauthorized:
            return "Omen couldn't authorize this search. Sign in again before choosing a player."
        case .server:
            return "Omen is having trouble on our side. Try the search again in a moment."
        case .decode:
            return "Omen sent player results this version of the app couldn't read. Updating the app may fix it."
        }
    }

    static func message(for error: OmenApiError) -> String {
        switch error {
        case .cancelled:
            return "That was interrupted. Try again."
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
