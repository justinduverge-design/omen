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

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Unknown"
        position = try c.decodeIfPresent(String.self, forKey: .position)
        team = try c.decodeIfPresent(String.self, forKey: .team)
        playerKey = try c.decodeIfPresent(String.self, forKey: .playerKey)
        projectedPoints = try c.decodeIfPresent(Double.self, forKey: .projectedPoints)
    }

    enum CodingKeys: String, CodingKey {
        case name, position, team
        case playerKey = "player_key"
        case projectedPoints = "projected_points"
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
    let id: String
    let opponentTeamId: String?
    let opponentTeamName: String?
    let give: TradeFindPlayer
    let receive: TradeFindPlayer
    let userLineupDelta: Double?
    let opponentLineupDelta: Double?
    let reasoning: TradeFindReasoning

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
    }

    enum CodingKeys: String, CodingKey {
        case id
        case opponentTeamId = "opponent_team_id"
        case opponentTeamName = "opponent_team_name"
        case give, receive
        case userLineupDelta = "user_lineup_delta"
        case opponentLineupDelta = "opponent_lineup_delta"
        case reasoning
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

// MARK: - Save action (T4 does not exist yet)

/// The interface this screen calls, per the contract's "Save action interface":
/// `save_action(candidate_id, reasoning) -> { status: "saved" | "error" }`.
///
/// TODO(T4): wire to a real save/persist endpoint once `T4-SavedTradeQueue` builds one. This
/// screen's own "do not touch" line is explicit — it must not build a save/persist mechanism
/// itself — so the only conformance shipped here is a local stub with no network call.
protocol TradeFindSaveAction {
    func save(candidateId: String, reasoning: TradeFindReasoning) async -> TradeFindSaveOutcome
}

enum TradeFindSaveOutcome: Equatable { case saved, error }

/// TODO(T4): replace with a real repository call once the save/queue endpoint exists. Always
/// answers `outcome` locally — no network call, nothing persisted, nothing to roll back.
struct StubTradeFindSaveAction: TradeFindSaveAction {
    var outcome: TradeFindSaveOutcome = .saved

    func save(candidateId: String, reasoning: TradeFindReasoning) async -> TradeFindSaveOutcome {
        outcome
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
