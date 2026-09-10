import Foundation

/// M5-Native-API-Client slice B — the repository seam, mirroring `AccountRepository`.
///
/// The protocol exists so tests and previews can supply a summary without a network,
/// exactly as `FakeAuthRepository` does for auth.
protocol DashboardRepository {
    func fetchSummary(accessToken: String) async -> Result<DashboardSummary, OmenApiError>
}

/// Production implementation. Holds no state beyond the client.
struct ApiDashboardRepository: DashboardRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    func fetchSummary(accessToken: String) async -> Result<DashboardSummary, OmenApiError> {
        await client.get("api/dashboard/summary", accessToken: accessToken, as: DashboardSummary.self)
    }
}

/// Test/preview double. Not `#if DEBUG`-gated because `FakeAuthRepository` isn't either —
/// the app already ships its auth fake for the unconfigured-Supabase path, and matching
/// that convention keeps the two repository families symmetrical.
struct StubDashboardRepository: DashboardRepository {
    let result: Result<DashboardSummary, OmenApiError>

    func fetchSummary(accessToken: String) async -> Result<DashboardSummary, OmenApiError> {
        result
    }
}

// MARK: - Slice C — league standings

/// Separate from `DashboardRepository` on purpose: the two have different cost and failure
/// profiles. The dashboard reads our own rows; standings makes a live provider call. Keeping
/// them apart stops a slow or failing provider from being able to hold up the shell.
protocol LeagueRepository {
    func fetchStandings(accessToken: String) async -> Result<LeagueStandings, OmenApiError>

    /// `league-overview.v1`. Supersedes `fetchStandings` for callers that need the matchup and
    /// activity sections too. `fetchStandings` stays because the Command Center context strip
    /// consumes that narrower contract and must not be disturbed.
    ///
    /// `platform`/`leagueID` name ONE of the user's leagues. Both nil means "whichever league
    /// is active", which is every pre-existing caller. The league carousel names one per page,
    /// because a carousel that could only ever read the active league would show the same
    /// matchup on all of them.
    func fetchOverview(
        accessToken: String,
        platform: String?,
        leagueID: String?
    ) async -> Result<LeagueOverview, OmenApiError>
}

extension LeagueRepository {
    /// The active league. Keeps every existing call site unchanged.
    func fetchOverview(accessToken: String) async -> Result<LeagueOverview, OmenApiError> {
        await fetchOverview(accessToken: accessToken, platform: nil, leagueID: nil)
    }
}

struct ApiLeagueRepository: LeagueRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    func fetchStandings(accessToken: String) async -> Result<LeagueStandings, OmenApiError> {
        await client.get("api/league/standings", accessToken: accessToken, as: LeagueStandings.self)
    }

    func fetchOverview(
        accessToken: String,
        platform: String?,
        leagueID: String?
    ) async -> Result<LeagueOverview, OmenApiError> {
        // Both or neither. A league id without its platform makes the server search every
        // connected provider for it, which is a slower way to reach the same answer.
        //
        // Passed as `query`, never appended to the path: `appendingPathComponent` treats a
        // built query string as one path segment and percent-encodes the `?`. This shipped
        // wrong on 2026-09-04 and made every carousel page say "Omen couldn't read this
        // league's week" while the server answered 200 to the same request made correctly.
        var query: [String: String] = [:]
        if let platform, let leagueID {
            query["platform"] = platform
            query["leagueId"] = leagueID
        }
        return await client.get(
            "api/league/overview",
            accessToken: accessToken,
            query: query,
            as: LeagueOverview.self
        )
    }
}

struct StubLeagueRepository: LeagueRepository {
    let result: Result<LeagueStandings, OmenApiError>
    var overviewResult: Result<LeagueOverview, OmenApiError>?

    /// Per-league answers when a test supplies them, keyed `"platform:leagueID"`; otherwise
    /// the single `overviewResult`, which is what the active-league callers get.
    var overviewByLeague: [String: Result<LeagueOverview, OmenApiError>] = [:]

    func fetchOverview(
        accessToken: String,
        platform: String?,
        leagueID: String?
    ) async -> Result<LeagueOverview, OmenApiError> {
        if let platform, let leagueID, let keyed = overviewByLeague["\(platform):\(leagueID)"] {
            return keyed
        }
        return overviewResult ?? .failure(.network)
    }

    func fetchStandings(accessToken: String) async -> Result<LeagueStandings, OmenApiError> {
        result
    }
}

// MARK: - Slice D — Omen decision

/// `POST /api/omen/mvp-move`. Kept separate from the dashboard for the same reason
/// standings is: this is the expensive call. It runs the live engine against a provider,
/// so it is slower and independently failable, and the Omen destination owns its own
/// loading state rather than blocking anything else.
///
/// Per the route contract the live UI sends `{}` — the server derives league, week, and
/// provider from the authenticated session. The client passes no context it could get wrong.
protocol OmenDecisionRepository {
    func fetchDecision(accessToken: String) async -> Result<OmenDecisionEnvelope, OmenApiError>
}

struct ApiOmenDecisionRepository: OmenDecisionRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    func fetchDecision(accessToken: String) async -> Result<OmenDecisionEnvelope, OmenApiError> {
        await client.post("api/omen/mvp-move", accessToken: accessToken, body: [:], as: OmenDecisionEnvelope.self)
    }
}

struct StubOmenDecisionRepository: OmenDecisionRepository {
    let result: Result<OmenDecisionEnvelope, OmenApiError>

    func fetchDecision(accessToken: String) async -> Result<OmenDecisionEnvelope, OmenApiError> {
        result
    }
}

// MARK: - Slice E — Ledger

/// `GET /api/moves`. Kept separate from the dashboard for consistency with the slices above,
/// though its cost profile is closer to the dashboard's than to standings': it reads our own
/// `moves` rows and makes no provider call. It is still independently failable, and the
/// Command Center must not lose its shell because the Ledger request did.
protocol MovesRepository {
    func fetchMoves(accessToken: String) async -> Result<MovesHistory, OmenApiError>
}

struct ApiMovesRepository: MovesRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    /// No query string. `season` defaults to the current NFL season server-side and `limit`
    /// defaults to 20 — the preview shows three. Sending our own season would mean the client
    /// deciding what "this season" is, which `getCurrentNflWeekContext()` already owns.
    func fetchMoves(accessToken: String) async -> Result<MovesHistory, OmenApiError> {
        await client.get("api/moves", accessToken: accessToken, as: MovesHistory.self)
    }
}

struct StubMovesRepository: MovesRepository {
    let result: Result<MovesHistory, OmenApiError>

    func fetchMoves(accessToken: String) async -> Result<MovesHistory, OmenApiError> {
        result
    }
}

/// `GET /api/waivers/analysis` -> `waiver-analysis.v1`.
///
/// Command Center uses this to turn the coarse dashboard waiver status into a real Waiver
/// Watch. The route is explicit about uncertainty, so the mapping keeps those states separate
/// instead of collapsing them into an empty list.
struct WaiverAnalysis: Decodable, Equatable {
    let contractVersion: String?
    let state: State
    let message: String?
    let deadline: String?
    let bestMove: BestMove?
    let alternatives: [Alternative]

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version"
        case state, message, deadline, alternatives
        case bestMove = "best_move"
    }

    enum State: String, Decodable {
        case confirmedOpportunity = "confirmed_opportunity"
        case availabilityUnknown = "availability_unknown"
        case noLowCostDrop = "no_low_cost_drop"
        case noCredibleMove = "no_credible_move"
        case engineLimitation = "engine_limitation"
        case offSeason = "off_season"
        case unknown

        init(from decoder: Decoder) throws {
            let raw = try decoder.singleValueContainer().decode(String.self)
            self = State(rawValue: raw) ?? .unknown
        }
    }

    struct BestMove: Decodable, Equatable {
        let add: Player?
        let drop: Player?
        let improvement: Double?
        let whyNow: String?
        let bid: Bid?

        enum CodingKeys: String, CodingKey {
            case add, drop, improvement, bid
            case whyNow = "why_now"
        }
    }

    struct Player: Decodable, Equatable {
        let name: String?
        let position: String?
        let team: String?
        let projectedPoints: Double?
        let status: String?

        enum CodingKeys: String, CodingKey {
            case name, position, team, status
            case projectedPoints = "projected_points"
        }
    }

    struct Bid: Decodable, Equatable {
        let amount: Double?
        let basis: String?
    }

    struct Alternative: Decodable, Equatable {
        let player: Player?
        let improvement: Double?
        let tradeoff: String?
    }
}

extension WaiverAnalysis {
    var waiverWatchState: OmenWaiverWatchState {
        switch state {
        case .confirmedOpportunity:
            guard let bestMove, let opportunity = OmenWaiverOpportunity(bestMove: bestMove) else {
                return .availabilityUnknown
            }
            return .urgent(
                deadlineText: deadline.map { "Deadline \($0)" } ?? "Availability confirmed",
                bestMove: opportunity,
                longHorizonMoves: alternatives.compactMap(OmenWaiverOpportunity.init(alternative:)).prefixArray(3)
            )
        case .availabilityUnknown:
            return .availabilityUnknown
        case .noLowCostDrop:
            return .processed
        case .noCredibleMove:
            return .noCredibleMove
        case .engineLimitation, .unknown:
            return .availabilityUnknown
        case .offSeason:
            return .offSeason
        }
    }
}

private extension OmenWaiverOpportunity {
    init?(bestMove: WaiverAnalysis.BestMove) {
        guard let add = bestMove.add, let name = add.name?.trimmed, !name.isEmpty else { return nil }
        let projected = bestMove.improvement.map { "Projects +\(Self.pointsText($0)) vs current slot" }
        let bid = bestMove.bid?.amount.map { "Suggested bid \(Self.pointsText($0))" }
        self.init(
            playerName: name,
            position: add.position?.trimmed.nonEmpty ?? "Player",
            team: add.team?.trimmed.nonEmpty ?? "Available player",
            availability: [projected, bid].compactMap { $0 }.joined(separator: " · ").nonEmpty ?? "Available in this league",
            reason: bestMove.whyNow?.trimmed.nonEmpty ?? "Omen found this as the strongest available roster move."
        )
    }

    init?(alternative: WaiverAnalysis.Alternative) {
        guard let player = alternative.player, let name = player.name?.trimmed, !name.isEmpty else { return nil }
        self.init(
            playerName: name,
            position: player.position?.trimmed.nonEmpty ?? "Player",
            team: player.team?.trimmed.nonEmpty ?? "Available player",
            availability: alternative.improvement.map { "Projects +\(Self.pointsText($0))" } ?? "Available in this league",
            reason: alternative.tradeoff?.trimmed.nonEmpty ?? "Alternative waiver option."
        )
    }

    static func pointsText(_ value: Double) -> String {
        let rounded = (value * 10).rounded() / 10
        return rounded == floor(rounded) ? String(Int(rounded)) : String(rounded)
    }
}

private extension Array {
    func prefixArray(_ maxLength: Int) -> [Element] { Array(prefix(maxLength)) }
}

private extension String {
    var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
    var nonEmpty: String? { isEmpty ? nil : self }
}

// MARK: - Waiver Watch

/// `GET /api/waivers/analysis`. Separate from the dashboard summary because it can make
/// provider-specific reads and returns an in-band decision state rather than a shell gate.
protocol WaiverAnalysisRepository {
    func fetchWaiverAnalysis(accessToken: String) async -> Result<WaiverAnalysis, OmenApiError>
}

struct ApiWaiverAnalysisRepository: WaiverAnalysisRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    func fetchWaiverAnalysis(accessToken: String) async -> Result<WaiverAnalysis, OmenApiError> {
        await client.get("api/waivers/analysis", accessToken: accessToken, as: WaiverAnalysis.self)
    }
}

struct StubWaiverAnalysisRepository: WaiverAnalysisRepository {
    let result: Result<WaiverAnalysis, OmenApiError>

    func fetchWaiverAnalysis(accessToken: String) async -> Result<WaiverAnalysis, OmenApiError> {
        result
    }
}

// MARK: - Slice G — trade compare

/// `POST /api/trade/compare`. Separate from the league repositories because this route is
/// **free and public** — it has a different auth posture from everything else here, and a
/// signed-out caller still gets a real (neutral) answer.
protocol TradeRepository {
    func compare(offer: TradeOffer, accessToken: String?) async -> Result<TradeCompare, OmenApiError>
}

struct ApiTradeRepository: TradeRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    func compare(offer: TradeOffer, accessToken: String?) async -> Result<TradeCompare, OmenApiError> {
        await client.post(
            "api/trade/compare",
            optionalAccessToken: accessToken,
            body: offer.requestBody,
            as: TradeCompare.self
        )
    }
}

struct StubTradeRepository: TradeRepository {
    let result: Result<TradeCompare, OmenApiError>

    func compare(offer: TradeOffer, accessToken: String?) async -> Result<TradeCompare, OmenApiError> {
        result
    }
}
