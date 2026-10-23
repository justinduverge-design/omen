import Foundation

// MARK: - T3, "reviewing what Omen found"
//
// `GET /api/trade/find` → `trade-find.v1`. Built against the documented shape read from
// `src/services/tradeFind.js` (`buildCandidateRecord` / `findLeagueTradeCandidates`) and
// `src/routes/trade.js`'s `/find` handler, on the open, unmerged `feat/t2-find-a-trade-generator`
// branch — read-only reference per this task's brief. The route is not on `main` yet; this is the
// same build-ahead-of-merge practice `ApiTradeRepository`/`TradeCompare.swift` already establish
// for `trade-compare.v2` and `trade-roster.v1`.
//
// Screen contract: `Blueprints/specs/design/screen-contracts/TradeFindReview-v1.md`.

/// One side of a candidate offer. Decoded defensively the same way `TradeRosterResponse.Player`
/// is: `team` and `projected_points` are not guaranteed present in every fixture
/// (`test/tradeFindRoute.test.js`'s own fixtures omit `team`), and an absence must render
/// honestly rather than as "undefined" or a fabricated number.
struct TradeFindPlayer: Decodable, Equatable {
    let name: String
    let position: String?
    let team: String?
    let playerKey: String?
    let projectedPoints: Double?
    /// Omen's read (wire key `sight`), attached by `sightEnrichment.js`. Lenient: a drifting
    /// block costs the read, never the candidate.
    let omenRead: OmenDecisionEnvelope.OmenRead?
    let stats: OmenPlayerStats?
    let rating: OmenPlayerRating?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Unknown"
        position = try c.decodeIfPresent(String.self, forKey: .position)
        team = try c.decodeIfPresent(String.self, forKey: .team)
        playerKey = try c.decodeIfPresent(String.self, forKey: .playerKey)
        projectedPoints = try c.decodeIfPresent(Double.self, forKey: .projectedPoints)
        omenRead = try? c.decodeIfPresent(OmenDecisionEnvelope.OmenRead.self, forKey: .omenRead)
        stats = try? c.decodeIfPresent(OmenPlayerStats.self, forKey: .stats)
        rating = try? c.decodeIfPresent(OmenPlayerRating.self, forKey: .rating)
    }

    /// "30.7 PPG, RB Omen Grade 73.5": what the player has done and how Omen grades him. Nil when
    /// the warehouse has neither for him.
    var numbersShort: String? {
        let parts = [
            stats?.pointsPerGame.map { String(format: "%.1f PPG", $0) },
            rating?.rating.map { "\(rating?.title ?? OmenPlayerRating.familyName) \(String(format: "%.1f", $0))" },
        ].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    /// "Omen 12.8", or nil when Omen has no read for this player.
    var omenPointsLabel: String? {
        omenRead?.points.map { "Omen \(String(format: "%.1f", $0))" }
    }

    enum CodingKeys: String, CodingKey {
        case name, position, team
        case playerKey = "player_key"
        case projectedPoints = "projected_points"
        case omenRead = "sight"
        case stats, rating
    }

    /// "WR · MIA", position alone, team alone, or "Unranked" — never "WR · undefined". Mirrors
    /// `TradeRosterResponse.Player.meta`.
    var meta: String {
        switch (position, team) {
        case let (.some(p), .some(t)) where !p.isEmpty && !t.isEmpty: return "\(p) · \(t)"
        case let (.some(p), _) where !p.isEmpty: return p
        case let (_, .some(t)) where !t.isEmpty: return t
        default: return "Unranked"
        }
    }

    /// "14.8 pts", or "—" where no projection exists — `TradeBuild.dc.html`'s own treatment for
    /// an unranked player, never a fabricated number.
    var pointsLabel: String {
        guard let projectedPoints, projectedPoints.isFinite else { return "—" }
        return String(format: "%.1f pts", projectedPoints)
    }
}

/// `needEvidenceFor`'s own four statuses (`hole` / `surplus` / `balanced` / `not_tracked`),
/// decoded verbatim and never re-derived on the client.
struct TradeFindNeed: Codable, Equatable {
    let status: String
    let have: Int?
    let required: Int?

    init(status: String, have: Int?, required: Int?) {
        self.status = status
        self.have = have
        self.required = required
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "not_tracked"
        have = try c.decodeIfPresent(Int.self, forKey: .have)
        required = try c.decodeIfPresent(Int.self, forKey: .required)
    }

    enum CodingKeys: String, CodingKey { case status, have, required }
}

struct TradeFindPositionNeed: Codable, Equatable {
    let position: String
    let need: TradeFindNeed

    init(position: String, need: TradeFindNeed) {
        self.position = position
        self.need = need
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        position = try c.decodeIfPresent(String.self, forKey: .position) ?? "UNK"
        need = try c.decodeIfPresent(TradeFindNeed.self, forKey: .need)
            ?? TradeFindNeed(status: "not_tracked", have: nil, required: nil)
    }

    enum CodingKeys: String, CodingKey { case position, need }
}

/// One candidate's full reasoning, decoded and re-encoded **verbatim**. This file never computes
/// a new value from it — only reads it for display and forwards it unchanged to the save
/// interface — per the contract's data-binding note that `reasoning` is passed "byte-for-byte
/// from the T2 response — never regenerated client-side" and T4's own rule that reasoning is
/// "retained verbatim... not regenerated at read time."
struct TradeFindReasoning: Codable, Equatable {
    let fillsNeedFor: [String]
    let userReceives: TradeFindPositionNeed
    let opponentReceives: TradeFindPositionNeed
    let evidence: [String]

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        fillsNeedFor = try c.decodeIfPresent([String].self, forKey: .fillsNeedFor) ?? []
        userReceives = try c.decodeIfPresent(TradeFindPositionNeed.self, forKey: .userReceives)
            ?? TradeFindPositionNeed(position: "UNK", need: TradeFindNeed(status: "not_tracked", have: nil, required: nil))
        opponentReceives = try c.decodeIfPresent(TradeFindPositionNeed.self, forKey: .opponentReceives)
            ?? TradeFindPositionNeed(position: "UNK", need: TradeFindNeed(status: "not_tracked", have: nil, required: nil))
        evidence = try c.decodeIfPresent([String].self, forKey: .evidence) ?? []
    }

    enum CodingKeys: String, CodingKey {
        case fillsNeedFor = "fills_need_for"
        case userReceives = "user_receives"
        case opponentReceives = "opponent_receives"
        case evidence
    }
}

/// One trade candidate — `buildCandidateRecord`'s own shape.
struct TradeFindCandidate: Decodable, Equatable, Identifiable {
    struct Catch: Decodable, Equatable {
        let status: String
        let code: String?
        let statement: String?
    }
    let id: String
    let opponentTeamId: String?
    let opponentTeamName: String?
    let give: TradeFindPlayer
    let receive: TradeFindPlayer
    let userLineupDelta: Double?
    let opponentLineupDelta: Double?
    let reasoning: TradeFindReasoning
    let theCatch: Catch?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        opponentTeamId = try c.decodeIfPresent(String.self, forKey: .opponentTeamId)
        opponentTeamName = try c.decodeIfPresent(String.self, forKey: .opponentTeamName)
        give = try c.decode(TradeFindPlayer.self, forKey: .give)
        receive = try c.decode(TradeFindPlayer.self, forKey: .receive)
        userLineupDelta = try c.decodeIfPresent(Double.self, forKey: .userLineupDelta)
        opponentLineupDelta = try c.decodeIfPresent(Double.self, forKey: .opponentLineupDelta)
        reasoning = try c.decode(TradeFindReasoning.self, forKey: .reasoning)
        theCatch = try c.decodeIfPresent(Catch.self, forKey: .theCatch)
    }

    enum CodingKeys: String, CodingKey {
        case id
        case opponentTeamId = "opponent_team_id"
        case opponentTeamName = "opponent_team_name"
        case give, receive
        case userLineupDelta = "user_lineup_delta"
        case opponentLineupDelta = "opponent_lineup_delta"
        case reasoning
        case theCatch = "the_catch"
    }

    /// "vs Davante's Inferno", or the honest fallback the data-binding notes call for —
    /// `buildCandidateRecord` allows `opponent_team_name` to be `null`.
    var opponentDisplayName: String {
        let trimmed = opponentTeamName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? "another team in your league" : trimmed
    }
}

struct TradeFindDegradedTeam: Decodable, Equatable {
    let teamId: String?
    let teamName: String?
    let reason: String?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        teamId = try c.decodeIfPresent(String.self, forKey: .teamId)
        teamName = try c.decodeIfPresent(String.self, forKey: .teamName)
        reason = try c.decodeIfPresent(String.self, forKey: .reason)
    }

    enum CodingKeys: String, CodingKey {
        case teamId = "team_id", teamName = "team_name", reason
    }
}

/// `GET /api/trade/find` → `trade-find.v1`.
struct TradeFindResponse: Decodable, Equatable {
    let contractVersion: String
    /// `"ok"` | `"degraded"` | `"unavailable"`.
    let status: String
    let platform: String
    let leagueId: String?
    let teamId: String?
    let week: Int?
    /// Present only when `status == "unavailable"` — `own_roster_unavailable`,
    /// `provider_unsupported`, `league_not_active`, etc.
    let reason: String?
    let teamsConsidered: Int
    let teamsSkippedForCap: [TradeFindDegradedTeam]
    let degradedTeams: [TradeFindDegradedTeam]
    let budgetExceeded: Bool
    let candidates: [TradeFindCandidate]
    /// Why a finished search returned nothing: `no_fair_trade`, `no_trade_helps_both_lineups`,
    /// `no_tradeable_players`, `no_readable_opponents`, `search_budget_exceeded`. Nil when there are
    /// candidates or the server predates the field.
    let emptyReason: String?
    /// `search_funnel`: how far the search narrowed. Nil from servers that predate it.
    let searchFunnel: SearchFunnel?

    struct SearchFunnel: Decodable, Equatable {
        let pairsEvaluated: Int?
        let mutualGain: Int?
        let passedFairness: Int?

        enum CodingKeys: String, CodingKey {
            case pairsEvaluated = "pairs_evaluated"
            case mutualGain = "mutual_gain"
            case passedFairness = "passed_fairness"
        }
    }

    /// "Read 11 rosters · 340 pairs checked · 2 fair for both sides" (whole-app canvas, `TradeFind`).
    var funnelLabel: String? {
        guard let funnel = searchFunnel, let pairs = funnel.pairsEvaluated else { return nil }
        var parts = ["Read \(teamsConsidered) rosters", "\(pairs) pairs checked"]
        if let fair = funnel.passedFairness { parts.append("\(fair) fair for both sides") }
        return parts.joined(separator: " \u{00B7} ")
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        contractVersion = try c.decodeIfPresent(String.self, forKey: .contractVersion) ?? ""
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "unavailable"
        platform = try c.decodeIfPresent(String.self, forKey: .platform) ?? ""
        leagueId = try c.decodeIfPresent(String.self, forKey: .leagueId)
        teamId = try c.decodeIfPresent(String.self, forKey: .teamId)
        week = try c.decodeIfPresent(Int.self, forKey: .week)
        reason = try c.decodeIfPresent(String.self, forKey: .reason)
        degradedTeams = try c.decodeIfPresent([TradeFindDegradedTeam].self, forKey: .degradedTeams) ?? []
        budgetExceeded = try c.decodeIfPresent(Bool.self, forKey: .budgetExceeded) ?? false
        candidates = try c.decodeIfPresent([TradeFindCandidate].self, forKey: .candidates) ?? []
        emptyReason = try c.decodeIfPresent(String.self, forKey: .emptyReason)
        searchFunnel = try? c.decodeIfPresent(SearchFunnel.self, forKey: .searchFunnel)

        if let bounds = try c.decodeIfPresent(Bounds.self, forKey: .bounds) {
            teamsConsidered = bounds.teamsConsidered
            teamsSkippedForCap = bounds.teamsSkippedForCap
        } else {
            teamsConsidered = 0
            teamsSkippedForCap = []
        }
    }

    private struct Bounds: Decodable {
        let teamsConsidered: Int
        let teamsSkippedForCap: [TradeFindDegradedTeam]

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            teamsConsidered = try c.decodeIfPresent(Int.self, forKey: .teamsConsidered) ?? 0
            teamsSkippedForCap = try c.decodeIfPresent([TradeFindDegradedTeam].self, forKey: .teamsSkippedForCap) ?? []
        }

        enum CodingKeys: String, CodingKey {
            case teamsConsidered = "teams_considered"
            case teamsSkippedForCap = "teams_skipped_for_cap"
        }
    }

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version", status, platform
        case leagueId = "league_id", teamId = "team_id", week, reason
        case bounds
        case degradedTeams = "degraded_teams"
        case budgetExceeded = "budget_exceeded"
        case emptyReason = "empty_reason"
        case searchFunnel = "search_funnel"
        case candidates
    }

    /// Acceptance check: "the degraded banner renders if and only if
    /// `degraded_teams.length > 0 || bounds.teams_skipped_for_cap.length > 0 ||
    /// budget_exceeded === true`".
    var showsDegradedBanner: Bool {
        !degradedTeams.isEmpty || !teamsSkippedForCap.isEmpty || budgetExceeded
    }

    /// The reconstructed total of every OTHER team Omen categorized this scan — scanned, capped,
    /// or degraded — for "5 of 6 teams scanned". Not a server field on its own: `teams_considered`
    /// and the two skip/degrade counts are, and their sum is the honest total the data-binding
    /// notes ask for ("the league's real team count minus one").
    var totalOtherTeams: Int {
        teamsConsidered + teamsSkippedForCap.count + degradedTeams.count
    }
}

// MARK: - Repository

/// Deliberately its own protocol rather than an addition to `TradeRepository`
/// (`DashboardRepository.swift`) — `/find` is a new, unmerged route with its own contract
/// version, and this keeps T3 from touching a file the rest of the Trade destination shares.
protocol TradeFindRepository {
    func find(
        platform: String,
        leagueId: String,
        teamId: String,
        week: Int?,
        accessToken: String
    ) async -> Result<TradeFindResponse, OmenApiError>
}

struct ApiTradeFindRepository: TradeFindRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    func find(
        platform: String,
        leagueId: String,
        teamId: String,
        week: Int?,
        accessToken: String
    ) async -> Result<TradeFindResponse, OmenApiError> {
        var query: [String: String] = ["platform": platform, "league_id": leagueId, "team_id": teamId]
        if let week { query["week"] = String(week) }
        return await client.get("api/trade/find", accessToken: accessToken, query: query, as: TradeFindResponse.self)
    }
}

struct StubTradeFindRepository: TradeFindRepository {
    let result: Result<TradeFindResponse, OmenApiError>

    func find(
        platform: String,
        leagueId: String,
        teamId: String,
        week: Int?,
        accessToken: String
    ) async -> Result<TradeFindResponse, OmenApiError> {
        result
    }
}

// MARK: - League: trade targets

/// The League destination's "Trade targets" section, read from the same `GET /api/trade/find` scan
/// the Trade tab uses, so the two screens cannot disagree about who a good partner is.
///
/// This section used to be a constant "Omen has not read the other managers' rosters" because nothing
/// ever made the read. That is a missing call, not a provider limit, so it now reads.
@MainActor
final class LeagueTradeTargetsViewModel: ObservableObject {
    /// One best trade per other team, ranked by the route. Empty until read.
    @Published private(set) var candidates: [TradeFindCandidate] = []
    /// Why there are no targets, when Omen couldn't look. Nil while reading or when it read.
    @Published private(set) var note: String?

    private let repository: TradeFindRepository
    private let sessionManager: SessionManager
    private var loadedKey: String?
    private var inFlightKey: String?

    init(repository: TradeFindRepository, sessionManager: SessionManager) {
        self.repository = repository
        self.sessionManager = sessionManager
    }

    /// Reads once per (league, team, week); a changed league resets the section first so one league's
    /// opponents never sit under another's name.
    func load(platform: String, leagueId: String, teamId: String, week: Int?) async {
        let key = [platform, leagueId, teamId, week.map(String.init) ?? ""].joined(separator: "|")
        guard key != loadedKey, key != inFlightKey else { return }
        if loadedKey != nil { candidates = []; note = nil }
        inFlightKey = key
        defer { if inFlightKey == key { inFlightKey = nil } }

        guard case .token(let accessToken) = await sessionManager.authorization() else { return }
        let result = await repository.find(
            platform: platform, leagueId: leagueId, teamId: teamId, week: week, accessToken: accessToken
        )
        guard inFlightKey == key else { return } // a newer league was requested meanwhile
        switch result {
        case .success(let response):
            (candidates, note) = Self.targets(from: response)
            loadedKey = key
        case .failure(let error):
            if error == .unauthorized { sessionManager.onRefreshFailed() }
            candidates = []
            note = "Omen couldn\u{2019}t read the other rosters just now."
        }
    }

    /// One target per opponent, best candidate first (the route already ranks them).
    static func targets(from response: TradeFindResponse) -> (candidates: [TradeFindCandidate], note: String?) {
        if response.status == "unavailable" {
            return ([], unavailableSentence(reason: response.reason))
        }
        var seen = Set<String>()
        let firstPerTeam = response.candidates.filter { seen.insert($0.opponentTeamId ?? $0.opponentDisplayName).inserted }
        return (firstPerTeam, firstPerTeam.isEmpty ? "No trade helps both sides this week." : nil)
    }

    static func crest(for name: String) -> String {
        let initials = name.split(separator: " ").compactMap { $0.first.map { String($0).uppercased() } }
        let joined = initials.prefix(3).joined()
        return joined.isEmpty ? "?" : joined
    }

    private static func unavailableSentence(reason: String?) -> String {
        switch reason {
        case "own_roster_unavailable":
            return "Omen could not read your own roster for this league, so it names no trade targets."
        case "league_not_active":
            return "This league has not started its season yet, so there are no trade targets."
        case "projections_unavailable":
            return "This league has no usable projections yet, so Omen will not rank trade targets."
        default:
            return "Omen could not read the other managers\u{2019} rosters for this league, so it names no trade targets."
        }
    }
}
