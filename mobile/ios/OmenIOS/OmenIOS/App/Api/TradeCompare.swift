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

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version"
        case verdictState = "verdict_state"
        case evaluability, explanation
        case analysisContext = "analysis_context"
        case netValue = "net_value"
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
struct TradeOffer: Equatable {
    var send: [String] = []
    var receive: [String] = []
    var leagueContext: LeagueContext?

    struct LeagueContext: Equatable {
        let platform: String
        let leagueId: String
    }

    var isComparable: Bool { !send.isEmpty && !receive.isEmpty }

    var requestBody: [String: Any] {
        var body: [String: Any] = ["send": send, "receive": receive]
        if let leagueContext {
            body["league_context"] = [
                "platform": leagueContext.platform,
                "league_id": leagueContext.leagueId,
            ]
        }
        return body
    }
}
