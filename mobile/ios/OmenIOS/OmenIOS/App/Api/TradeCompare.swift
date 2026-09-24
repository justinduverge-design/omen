import Foundation

/// `POST /api/trade/compare` → `trade-compare.v2`.
///
/// v2 exists for exactly one reason: the shipped engine emits a three-value verdict
/// (`accept` / `decline` / `neutral`), and the approved vocabulary has **four** labels. The
/// fourth — `insufficient_data` — is reachable only through the server's `evaluability`
/// signal and **never by inference on the client**. This type therefore reads `verdict_state`
/// and never `verdict`.
struct TradeCompare: Decodable, Equatable {
    /// Visual briefs §9.2. Order is deliberate: it is the order the four states are described
    /// in the contract, not a severity ranking.
    enum VerdictState: String, Decodable {
        case favorsYou = "favors_you"
        case youGiveUpTooMuch = "you_give_up_too_much"
        case closeNeedsContext = "close_needs_context"
        case insufficientData = "insufficient_data"

        /// An unrecognized state degrades to the honest non-answer rather than to a verdict.
        /// Guessing here would be the client minting a verdict the server did not issue.
        init(from decoder: Decoder) throws {
            let raw = try decoder.singleValueContainer().decode(String.self)
            self = VerdictState(rawValue: raw) ?? .insufficientData
        }
    }

    /// "Can Omen responsibly evaluate this offer at all?" — §9.4: name incomplete input, do
    /// not force a verdict.
    struct Evaluability: Decodable, Equatable {
        let status: String
        let reason: String?
        // F-HOT-02. These were required on iOS and defaulted on Android, so a server release
        // that legitimately omitted one — additive by the server's own rules — broke iOS Trade
        // with a decode error while Android kept working.
        let missingProjectionCount: Int
        let totalPlayerCount: Int

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            status = try c.decodeIfPresent(String.self, forKey: .status) ?? ""
            reason = try c.decodeIfPresent(String.self, forKey: .reason)
            missingProjectionCount = try c.decodeIfPresent(Int.self, forKey: .missingProjectionCount) ?? 0
            totalPlayerCount = try c.decodeIfPresent(Int.self, forKey: .totalPlayerCount) ?? 0
        }

        enum CodingKeys: String, CodingKey {
            case status, reason
            case missingProjectionCount = "missing_projection_count"
            case totalPlayerCount = "total_player_count"
        }

        var isEvaluable: Bool { status == "evaluable" }
    }

    /// Whether the answer used the caller's real league, and what it applied. `mode` is the
    /// server's word for it — the client never decides it was personalized.
    struct AnalysisContext: Decodable, Equatable {
        let mode: String
        let platform: String?
        let leagueId: String?
        let leagueName: String?
        let applied: [String]
        let unavailableReason: String?

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            mode = try c.decodeIfPresent(String.self, forKey: .mode) ?? ""
            platform = try c.decodeIfPresent(String.self, forKey: .platform)
            leagueId = try c.decodeIfPresent(String.self, forKey: .leagueId)
            leagueName = try c.decodeIfPresent(String.self, forKey: .leagueName)
            applied = try c.decodeIfPresent([String].self, forKey: .applied) ?? []
            unavailableReason = try c.decodeIfPresent(String.self, forKey: .unavailableReason)
        }

        enum CodingKeys: String, CodingKey {
            case mode, platform, applied
            case leagueId = "league_id"
            case leagueName = "league_name"
            case unavailableReason = "unavailable_reason"
        }

        var isPersonalized: Bool { mode == "personalized" }
    }

    let contractVersion: String
    let verdictState: VerdictState
    let evaluability: Evaluability
    let analysisContext: AnalysisContext
    let netValue: Double?
    let explanation: String?
    /// Server-owned supporting coverage; never used to create a client-side verdict.
    let capabilities: [OmenDecisionCapability]?

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version"
        case verdictState = "verdict_state"
        case evaluability, explanation
        case analysisContext = "analysis_context"
        case netValue = "net_value"
        case capabilities
    }

    /// The headline the screen shows. Never derived from `netValue` — the server owns the
    /// verdict, and a client that recomputed it could disagree with the server on screen.
    var headline: String {
        switch verdictState {
        case .favorsYou: return "This favors you"
        case .youGiveUpTooMuch: return "You give up too much"
        case .closeNeedsContext: return "Close — needs context"
        case .insufficientData: return "Omen can't call this one"
        }
    }

    /// Why, in the honest case. `insufficient_data` is the state that most needs a reason,
    /// because it is the one where Omen is declining to answer.
    var subhead: String {
        switch verdictState {
        case .insufficientData:
            switch evaluability.reason {
            case "no_players":
                return "Add players to both sides and Omen will look at it."
            case "missing_projections":
                let n = evaluability.missingProjectionCount
                return n == 1
                    ? "Omen has no projection for 1 of these players, so it won't force a verdict."
                    : "Omen has no projection for \(n) of these players, so it won't force a verdict."
            default:
                return "Omen doesn't have enough to evaluate this offer."
            }
        case .closeNeedsContext:
            return "The value is close enough that your roster and league settings decide it."
        default:
            return analysisContext.isPersonalized
                ? "Based on your league's scoring and your roster."
                : "Based on standard scoring — not your league's settings."
        }
    }
}

/// The offer being compared. Names only: the client never sends roster, scoring rules, or
/// settings, and `league_context` is a *request* for personalization rather than the data —
/// the server reads that from the user's own stored connection.
/// One side of an offer.
///
/// **This was `[String]`, and that was a beta-blocking defect.** `POST /api/trade/compare`
/// validates `each player must be an object` and rejects a bare string with a 400, so every
/// Compare from either native client failed — and failed as "Omen couldn't compare this", an
/// error surface, rather than as the honest `insufficient_data` answer the contract defines.
///
/// Nobody found it because nobody could reach it: the Trade screen had no working way to add a
/// player (`F-DEV-03`), so Compare was never pressed against the live API with a real offer.
/// Two defects in one screen, the first one hiding the second.
///
/// `position` and `team` are carried because the server scores on them — a name-only player
/// resolves to `position: "UNK"` and drops out of scarcity and tier calculation entirely. The
/// autocomplete already returns both and the client was discarding them.
struct TradePlayer: Equatable {
    let name: String
    var position: String?
    var team: String?
    /// The provider's own id (`"sleeper:6794"`), passed through untouched so the server can
    /// resolve a projection by key rather than by fuzzy name match.
    var playerKey: String?

    init(name: String, position: String? = nil, team: String? = nil, playerKey: String? = nil) {
        self.name = name
        self.position = position
        self.team = team
        self.playerKey = playerKey
    }

    /// A name typed by hand carries no position. That is honest and still comparable — the
    /// server answers with lower confidence rather than refusing.
    init(_ result: PlayerSearchResult) {
        self.init(name: result.name, position: result.position, team: result.team, playerKey: result.id)
    }

    var payload: [String: Any] {
        var out: [String: Any] = ["name": name]
        if let position, !position.isEmpty { out["position"] = position }
        if let team, !team.isEmpty { out["team"] = team }
        if let playerKey, !playerKey.isEmpty { out["player_key"] = playerKey }
        return out
    }
}

struct TradeOffer: Equatable {
    var send: [TradePlayer] = []
    var receive: [TradePlayer] = []
    var leagueContext: LeagueContext?

    struct LeagueContext: Equatable {
        let platform: String
        let leagueId: String
    }

    var isComparable: Bool { !send.isEmpty && !receive.isEmpty }

    var requestBody: [String: Any] {
        var body: [String: Any] = [
            "send": send.map(\.payload),
            "receive": receive.map(\.payload),
        ]
        if let leagueContext {
            body["league_context"] = [
                "platform": leagueContext.platform,
                "league_id": leagueContext.leagueId,
            ]
        }
        return body
    }
}

// MARK: - Trade roster read (J4: TradeBuild, TradeRoster)

/// `GET /api/trade/roster` → `trade-roster.v1`.
///
/// Sleeper, ESPN and Yahoo all resolve a real opponent roster today. `status` still carries
/// `"unavailable"` as the exception path — no connection, a stale ESPN/Yahoo session, or a
/// league that has not drafted — and the screen renders that honestly rather than treating a
/// thin payload as an empty roster.
struct TradeRosterResponse: Decodable, Equatable {
    struct Team: Decodable, Equatable, Identifiable {
        let teamId: String
        let teamName: String?
        let players: [Player]

        var id: String { teamId }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            teamId = try c.decodeIfPresent(String.self, forKey: .teamId) ?? ""
            teamName = try c.decodeIfPresent(String.self, forKey: .teamName)
            players = try c.decodeIfPresent([Player].self, forKey: .players) ?? []
        }

        enum CodingKeys: String, CodingKey {
            case teamId = "team_id", teamName = "team_name", players
        }
    }

    struct Player: Decodable, Equatable, Identifiable {
        let playerKey: String?
        let name: String
        let position: String?
        let team: String?
        let projectedPoints: Double?

        var id: String { playerKey ?? name }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            playerKey = try c.decodeIfPresent(String.self, forKey: .playerKey)
            name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Unknown"
            position = try c.decodeIfPresent(String.self, forKey: .position)
            team = try c.decodeIfPresent(String.self, forKey: .team)
            projectedPoints = try c.decodeIfPresent(Double.self, forKey: .projectedPoints)
        }

        enum CodingKeys: String, CodingKey {
            case playerKey = "player_key", name, position, team
            case projectedPoints = "projected_points"
        }

        /// "RB · IND", or just the position, or just the team — never a fabricated rank.
        var meta: String {
            switch (position, team) {
            case let (.some(p), .some(t)) where !p.isEmpty && !t.isEmpty: return "\(p) · \(t)"
            case let (.some(p), _) where !p.isEmpty: return p
            case let (_, .some(t)) where !t.isEmpty: return t
            default: return "Unranked"
            }
        }
    }

    let contractVersion: String
    let status: String
    let platform: String
    let reason: String?
    let week: Int?
    let teams: [Team]

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        contractVersion = try c.decodeIfPresent(String.self, forKey: .contractVersion) ?? ""
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "unavailable"
        platform = try c.decodeIfPresent(String.self, forKey: .platform) ?? ""
        reason = try c.decodeIfPresent(String.self, forKey: .reason)
        week = try c.decodeIfPresent(Int.self, forKey: .week)
        teams = try c.decodeIfPresent([Team].self, forKey: .teams) ?? []
    }

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version", status, platform, reason, week, teams
    }

    var isAvailable: Bool { status == "ok" }

    /// The server's reason code, said in the product's voice. `CONTRACTS.md`'s `LeagueNoRosters`
    /// rule: no retry — a permanent provider limit for this league is not an outage.
    var unavailableSentence: String {
        switch reason {
        case "provider_unsupported":
            return "Omen can't read the other teams' rosters for this provider yet."
        case "provider_reauth_required":
            return "Omen's connection to your league needs to be reconnected before it can read the other teams' rosters."
        case "league_not_active":
            return "This league hasn't drafted yet, so there are no rosters to read."
        default:
            return "Omen can't read the other teams' rosters for this league right now."
        }
    }
}

// MARK: - Trade share (J4: TradeShare)

/// `POST /api/trade/share` → `trade-share.v1`. Free, public, no auth required: a 30-day
/// hash with no provider data and names off by default.
struct TradeShareResponse: Decodable, Equatable {
    let contractVersion: String
    let hash: String
    let apiPath: String
    let expiresAt: String

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        contractVersion = try c.decodeIfPresent(String.self, forKey: .contractVersion) ?? ""
        hash = try c.decodeIfPresent(String.self, forKey: .hash) ?? ""
        apiPath = try c.decodeIfPresent(String.self, forKey: .apiPath) ?? ""
        expiresAt = try c.decodeIfPresent(String.self, forKey: .expiresAt) ?? ""
    }

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version", hash
        case apiPath = "api_path", expiresAt = "expires_at"
    }
}
