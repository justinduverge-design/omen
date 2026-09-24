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
/// The server derives league, week, and provider from the authenticated session, so the client
/// passes no league facts it could get wrong. It explicitly opts into bounded private narration:
/// the server owns that request and returns the deterministic decision when narration is late.
protocol OmenDecisionRepository {
    func fetchDecision(accessToken: String) async -> Result<OmenDecisionEnvelope, OmenApiError>
}

struct ApiOmenDecisionRepository: OmenDecisionRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    func fetchDecision(accessToken: String) async -> Result<OmenDecisionEnvelope, OmenApiError> {
        await client.post(
            "api/omen/mvp-move",
            accessToken: accessToken,
            body: [
                "contract_version": "omen-decision-brief.v3",
                "include_signals": ["llm_reasoning": true],
            ],
            as: OmenDecisionEnvelope.self
        )
    }
}

struct StubOmenDecisionRepository: OmenDecisionRepository {
    let result: Result<OmenDecisionEnvelope, OmenApiError>

    func fetchDecision(accessToken: String) async -> Result<OmenDecisionEnvelope, OmenApiError> {
        result
    }
}

// MARK: - Shared Decision Capabilities v1 — Start/Sit transport seam

/// `GET /api/start-sit/detail?contract_version=start-sit-detail.v2`.
///
/// No screen is introduced here. This establishes the native data boundary before the
/// Start/Sit surface is built, so that surface cannot invent an alternate evidence model.
struct StartSitDetail: Decodable, Equatable {
    let contractVersion: String?
    let state: String
    let message: String?
    let platform: String?
    let leagueId: String?
    let leagueName: String?
    let teamName: String?
    let season: Int?
    let week: Int?
    let scoringFormat: String?
    let recommendation: Recommendation?
    let why: [String]
    let whatCouldChangeThis: [String]
    let evidence: [Evidence]
    let alternatives: [Alternative]
    let capabilities: [OmenDecisionCapability]

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version"
        case state, message, platform, season, week, recommendation, why, evidence, alternatives, capabilities
        case leagueId = "league_id"
        case leagueName = "league_name"
        case teamName = "team_name"
        case scoringFormat = "scoring_format"
        case whatCouldChangeThis = "what_could_change_this"
    }

    struct Recommendation: Decodable, Equatable {
        let slot: String?
        let start: Player?
        let over: Player?
        let pointsDelta: Double?
        let confidence: String?

        enum CodingKeys: String, CodingKey {
            case slot, start, over, confidence
            case pointsDelta = "points_delta"
        }
    }

    struct Player: Decodable, Equatable {
        let playerKey: String?
        let name: String?
        let position: String?
        let team: String?
        let projectedPoints: Double?
        let status: String?
        let kickoff: String?

        enum CodingKeys: String, CodingKey {
            case name, position, team, status, kickoff
            case playerKey = "player_key"
            case projectedPoints = "projected_points"
        }
    }

    struct Evidence: Decodable, Equatable {
        let category: String?
        let kind: String?
        let statement: String?
    }

    struct Alternative: Decodable, Equatable {
        let slot: String?
        let start: String?
        let over: String?
        let pointsDelta: Double?

        enum CodingKeys: String, CodingKey {
            case slot, start, over
            case pointsDelta = "points_delta"
        }
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        contractVersion = try c.decodeIfPresent(String.self, forKey: .contractVersion)
        state = try c.decodeIfPresent(String.self, forKey: .state) ?? "incomplete_data"
        message = try c.decodeIfPresent(String.self, forKey: .message)
        platform = try c.decodeIfPresent(String.self, forKey: .platform)
        leagueId = try c.decodeIfPresent(String.self, forKey: .leagueId)
        leagueName = try c.decodeIfPresent(String.self, forKey: .leagueName)
        teamName = try c.decodeIfPresent(String.self, forKey: .teamName)
        season = try c.decodeIfPresent(Int.self, forKey: .season)
        week = try c.decodeIfPresent(Int.self, forKey: .week)
        scoringFormat = try c.decodeIfPresent(String.self, forKey: .scoringFormat)
        recommendation = try c.decodeIfPresent(Recommendation.self, forKey: .recommendation)
        why = try c.decodeIfPresent([String].self, forKey: .why) ?? []
        whatCouldChangeThis = try c.decodeIfPresent([String].self, forKey: .whatCouldChangeThis) ?? []
        evidence = try c.decodeIfPresent([Evidence].self, forKey: .evidence) ?? []
        alternatives = try c.decodeIfPresent([Alternative].self, forKey: .alternatives) ?? []
        capabilities = try c.decodeIfPresent([OmenDecisionCapability].self, forKey: .capabilities) ?? []
    }
}

protocol StartSitDetailRepository {
    func fetchDetail(accessToken: String, slot: String?) async -> Result<StartSitDetail, OmenApiError>
}

struct ApiStartSitDetailRepository: StartSitDetailRepository {
    private let client: OmenApiClient
    init(client: OmenApiClient) { self.client = client }

    func fetchDetail(accessToken: String, slot: String? = nil) async -> Result<StartSitDetail, OmenApiError> {
        var query = ["contract_version": "start-sit-detail.v2"]
        if let slot, !slot.isEmpty { query["slot"] = slot }
        return await client.get("api/start-sit/detail", accessToken: accessToken, query: query, as: StartSitDetail.self)
    }
}

struct StubStartSitDetailRepository: StartSitDetailRepository {
    let result: Result<StartSitDetail, OmenApiError>
    func fetchDetail(accessToken: String, slot: String?) async -> Result<StartSitDetail, OmenApiError> { result }
}

// MARK: - Slice E — Ledger

/// `GET /api/moves`. Kept separate from the dashboard for consistency with the slices above,
/// though its cost profile is closer to the dashboard's than to standings': it reads our own
/// `moves` rows and makes no provider call. It is still independently failable, and the
/// Command Center must not lose its shell because the Ledger request did.
protocol MovesRepository {
    func fetchMoves(accessToken: String, platform: String, leagueId: String) async -> Result<MovesHistory, OmenApiError>
    func fetchReceipt(accessToken: String, id: String) async -> Result<MoveReceipt, OmenApiError>
}

extension MovesRepository {
    func fetchReceipt(accessToken: String, id: String) async -> Result<MoveReceipt, OmenApiError> { .failure(.network) }
}

struct ApiMovesRepository: MovesRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    func fetchReceipt(accessToken: String, id: String) async -> Result<MoveReceipt, OmenApiError> {
        guard UUID(uuidString: id) != nil else { return .failure(.decode) }
        return await client.get("api/moves/\(id)", accessToken: accessToken, as: MoveReceipt.self)
    }

    /// Scope comes from `league-overview.v1`, the server-owned selected league. Season remains
    /// server-owned; the preview only limits its rendered rows.
    func fetchMoves(accessToken: String, platform: String, leagueId: String) async -> Result<MovesHistory, OmenApiError> {
        await client.get("api/moves", accessToken: accessToken,
                         query: ["contract_version": "moves-history.v2", "platform": platform, "league_id": leagueId],
                         as: MovesHistory.self)
    }
}

struct StubMovesRepository: MovesRepository {
    let result: Result<MovesHistory, OmenApiError>

    func fetchMoves(accessToken: String, platform: String, leagueId: String) async -> Result<MovesHistory, OmenApiError> {
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
    /// `waiver_system`. **Absent means not determined** — see `WaiverSystem.System`.
    ///
    /// Added for J5's `WaiverNotDetermined`, which cannot be rendered honestly without it: the
    /// screen's entire job is to say that the system is unknown, and before this field the client
    /// had no way to tell "unknown" from "FAAB with a budget we happen not to have".
    let waiverSystem: WaiverSystem?
    /// Waiver detail owns its decision rows; this is coverage only, when the server negotiates it.
    let capabilities: [OmenDecisionCapability]?

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version"
        case state, message, deadline, alternatives, capabilities
        case bestMove = "best_move"
        case waiverSystem = "waiver_system"
    }

    /// `waiver_system` — how this league decides who gets a claim.
    ///
    /// §6.2's gate. FAAB figures appear only for a positively-determined FAAB league; priority
    /// only for a determined priority league; **neither** for `not_determined`, which is what
    /// ESPN and Yahoo return today.
    struct WaiverSystem: Decodable, Equatable {
        enum System: String, Decodable {
            case faab
            case priority
            case notDetermined = "not_determined"

            /// An unrecognised value degrades to `notDetermined`, never to `faab`. Assuming a
            /// budget league is the one wrong guess that produces a bid figure out of nothing.
            init(from decoder: Decoder) throws {
                let raw = try decoder.singleValueContainer().decode(String.self)
                self = System(rawValue: raw) ?? .notDetermined
            }
        }

        let system: System
        /// "Your budget $63 of $100". Composed server-side, because the client does not know
        /// whether a zero balance means spent or unread.
        let budgetText: String?
        /// "Claim order 7 of 12".
        let orderText: String?

        enum CodingKeys: String, CodingKey {
            case system
            case budgetText = "budget_text"
            case orderText = "order_text"
        }
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
    func capabilities() async -> Result<TradeCapabilities, OmenApiError>
    /// `GET /api/trade/roster`. Requires a real access token — unlike `compare`, this reads the
    /// caller's own connected league and cannot degrade to an anonymous answer.
    func roster(
        platform: String,
        leagueId: String,
        teamId: String?,
        week: Int?,
        accessToken: String
    ) async -> Result<TradeRosterResponse, OmenApiError>
    /// `POST /api/trade/share`. Free and public, like `compare` — an unauthenticated caller
    /// still gets a working share link.
    func share(offer: TradeOffer, accessToken: String?) async -> Result<TradeShareResponse, OmenApiError>
}

struct TradeCapabilities: Decodable, Equatable {
    let contractVersion: String
    let maxTeams: Int
    let submission: String
    let threeTeam: ThreeTeam
    struct ThreeTeam: Decodable, Equatable { let supported: Bool; let reason: String? }
    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version", maxTeams = "max_teams", submission, threeTeam = "three_team"
    }
}

extension TradeRepository {
    func capabilities() async -> Result<TradeCapabilities, OmenApiError> { .failure(.network) }
    func roster(
        platform: String,
        leagueId: String,
        teamId: String?,
        week: Int?,
        accessToken: String
    ) async -> Result<TradeRosterResponse, OmenApiError> { .failure(.network) }
    func share(offer: TradeOffer, accessToken: String?) async -> Result<TradeShareResponse, OmenApiError> { .failure(.network) }
}

struct ApiTradeRepository: TradeRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    func capabilities() async -> Result<TradeCapabilities, OmenApiError> {
        await client.get("api/trade/capabilities", optionalAccessToken: nil, as: TradeCapabilities.self)
    }

    func compare(offer: TradeOffer, accessToken: String?) async -> Result<TradeCompare, OmenApiError> {
        await client.post(
            "api/trade/compare",
            optionalAccessToken: accessToken,
            body: offer.requestBody,
            as: TradeCompare.self
        )
    }

    func roster(
        platform: String,
        leagueId: String,
        teamId: String?,
        week: Int?,
        accessToken: String
    ) async -> Result<TradeRosterResponse, OmenApiError> {
        var query: [String: String] = ["platform": platform, "league_id": leagueId]
        if let teamId, !teamId.isEmpty { query["team_id"] = teamId }
        if let week { query["week"] = String(week) }
        return await client.get("api/trade/roster", accessToken: accessToken, query: query, as: TradeRosterResponse.self)
    }

    func share(offer: TradeOffer, accessToken: String?) async -> Result<TradeShareResponse, OmenApiError> {
        let body: [String: Any] = [
            "send": offer.send.map(\.payload),
            "receive": offer.receive.map(\.payload),
        ]
        return await client.post("api/trade/share", optionalAccessToken: accessToken, body: body, as: TradeShareResponse.self)
    }
}

struct StubTradeRepository: TradeRepository {
    let result: Result<TradeCompare, OmenApiError>
    var rosterResult: Result<TradeRosterResponse, OmenApiError> = .failure(.network)
    var shareResult: Result<TradeShareResponse, OmenApiError> = .failure(.network)

    func compare(offer: TradeOffer, accessToken: String?) async -> Result<TradeCompare, OmenApiError> {
        result
    }

    func roster(
        platform: String,
        leagueId: String,
        teamId: String?,
        week: Int?,
        accessToken: String
    ) async -> Result<TradeRosterResponse, OmenApiError> {
        rosterResult
    }

    func share(offer: TradeOffer, accessToken: String?) async -> Result<TradeShareResponse, OmenApiError> {
        shareResult
    }
}
