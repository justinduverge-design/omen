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
    var headline: String { Self.headline(for: verdictState) }

    /// T5: hoisted out of the instance property so `TradeThreeTeamCompare` — which carries the
    /// same `verdict_state` vocabulary for its "your own" headline but is a distinct decodable
    /// type (the three-team response has no `net_value`/`explanation` at the top level) — reads
    /// the identical switch rather than a second copy of it.
    static func headline(for state: VerdictState) -> String {
        switch state {
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
            return "This league has no rosters to read yet."
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

// MARK: - T5: three-team trade builder (J4: TradeBuild → TradeBuildThreeTeam, TradePartnerPicker)

/// One player transfer between two named teams — the unit a three-team trade is built from.
/// Mirrors T1's `legs[]` request shape exactly (`omen-t1-three-team-capability`,
/// `src/routes/trade.js`, `validateLeg`). Built locally by the picker/roster-chooser flow, never
/// reassembled from a server response — the client is the one that knows `to`/`toName` for each
/// leg, because it is the one that asked the user who a player should go to.
struct TradeThreeTeamLeg: Equatable, Identifiable {
    let id = UUID()
    var from: String
    var fromName: String?
    var to: String
    var toName: String?
    var players: [TradePlayer]

    var payload: [String: Any] {
        var out: [String: Any] = ["from": from, "to": to, "players": players.map(\.payload)]
        if let fromName, !fromName.isEmpty { out["from_name"] = fromName }
        if let toName, !toName.isEmpty { out["to_name"] = toName }
        return out
    }
}

/// The three-team offer under construction. `legs` is intentionally not `send`/`receive` —
/// T1's contract is legs between named teams, not a two-sided offer.
struct TradeThreeTeamOffer: Equatable {
    var legs: [TradeThreeTeamLeg] = []
    var leagueContext: TradeOffer.LeagueContext?

    /// Every team id touched, in the order first seen. T1's own `uniqueTeamIdsFromLegs` — kept
    /// here so the client can refuse to submit a shape the server would reject anyway (its own
    /// bookkeeping, not a replacement for the server's backstop).
    var teamIDs: [String] {
        var ids: [String] = []
        for leg in legs {
            if !ids.contains(leg.from) { ids.append(leg.from) }
            if !ids.contains(leg.to) { ids.append(leg.to) }
        }
        return ids
    }

    var isThreeTeamShape: Bool { teamIDs.count == 3 }

    var requestBody: [String: Any] {
        var body: [String: Any] = ["legs": legs.map(\.payload)]
        if let leagueContext {
            body["league_context"] = ["platform": leagueContext.platform, "league_id": leagueContext.leagueId]
        }
        return body
    }
}

/// `POST /api/trade/compare` with a `legs` body → the three-team branch of `trade-compare.v2`.
///
/// A distinct decodable type from `TradeCompare` rather than an overload of it: the two response
/// shapes share a vocabulary (`verdict_state`, `evaluability`, `analysis_context`) but the
/// three-team one has no top-level `net_value`/`explanation`/`capabilities` and adds
/// `participants`/`trade_shape`/`team_count`/`submission` that the two-team shape does not have.
/// Fields read exactly as documented in `omen-t1-three-team-capability`'s
/// `test/tradeRoute.test.js` — that branch is unmerged as of this writing, so this type is built
/// against the documented request/response shape rather than a live route.
struct TradeThreeTeamCompare: Decodable, Equatable {
    struct RosterFit: Decodable, Equatable {
        let summary: String?
        let depthDiscounted: Bool?

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            summary = try c.decodeIfPresent(String.self, forKey: .summary)
            depthDiscounted = try c.decodeIfPresent(Bool.self, forKey: .depthDiscounted)
        }

        enum CodingKeys: String, CodingKey {
            case summary
            case depthDiscounted = "depth_discounted"
        }
    }

    /// One player as the three-team engine returns it (`playerValue()` in `tradeValue.js`).
    /// **Carries no `team` field** — the server's `sideValue()` shape does not return the
    /// player's NFL team, only `name`/`position`. `OmenTradeAnswer.sides(of:teamOrder:)` builds
    /// the on-screen leg rows from the locally-authored `TradeThreeTeamLeg` (which does carry
    /// `team`, because the client is the one that read it off a roster) rather than from this
    /// type, for exactly that reason — see that function's doc comment.
    struct Player: Decodable, Equatable {
        let name: String
        let position: String?
        let playerKey: String?

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Unknown"
            position = try c.decodeIfPresent(String.self, forKey: .position)
            playerKey = try c.decodeIfPresent(String.self, forKey: .playerKey)
        }

        enum CodingKeys: String, CodingKey {
            case name, position
            case playerKey = "player_key"
        }
    }

    struct Side: Decodable, Equatable {
        let totalValue: Double?
        let playerCount: Int
        let missingProjectionCount: Int
        let players: [Player]

        /// The empty side — used as the fallback when a participant's response is missing
        /// `sends`/`receives` outright (never expected from T1's real route, but the client
        /// decodes defensively rather than failing the whole participant).
        static let empty = Side(totalValue: nil, playerCount: 0, missingProjectionCount: 0, players: [])

        init(totalValue: Double?, playerCount: Int, missingProjectionCount: Int, players: [Player]) {
            self.totalValue = totalValue
            self.playerCount = playerCount
            self.missingProjectionCount = missingProjectionCount
            self.players = players
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            totalValue = try c.decodeIfPresent(Double.self, forKey: .totalValue)
            playerCount = try c.decodeIfPresent(Int.self, forKey: .playerCount) ?? 0
            missingProjectionCount = try c.decodeIfPresent(Int.self, forKey: .missingProjectionCount) ?? 0
            players = try c.decodeIfPresent([Player].self, forKey: .players) ?? []
        }

        enum CodingKeys: String, CodingKey {
            case totalValue = "total_value"
            case playerCount = "player_count"
            case missingProjectionCount = "missing_projection_count"
            case players
        }
    }

    struct Participant: Decodable, Equatable, Identifiable {
        let teamID: String
        let teamName: String?
        let sends: Side
        let receives: Side
        let netValue: Double?
        let verdictState: TradeCompare.VerdictState
        /// "likely" / "unlikely" / "uncertain". T1's `acceptanceLikelihoodFor` — a qualitative
        /// read derived transparently from this same participant's `verdictState`, never a
        /// fabricated percentage.
        let acceptanceLikelihood: String?
        let confidence: String?
        let rosterFit: RosterFit?
        let evaluability: TradeCompare.Evaluability

        var id: String { teamID }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            teamID = try c.decodeIfPresent(String.self, forKey: .teamID) ?? ""
            teamName = try c.decodeIfPresent(String.self, forKey: .teamName)
            sends = try c.decodeIfPresent(Side.self, forKey: .sends) ?? .empty
            receives = try c.decodeIfPresent(Side.self, forKey: .receives) ?? .empty
            netValue = try c.decodeIfPresent(Double.self, forKey: .netValue)
            verdictState = try c.decodeIfPresent(TradeCompare.VerdictState.self, forKey: .verdictState) ?? .insufficientData
            acceptanceLikelihood = try c.decodeIfPresent(String.self, forKey: .acceptanceLikelihood)
            confidence = try c.decodeIfPresent(String.self, forKey: .confidence)
            rosterFit = try c.decodeIfPresent(RosterFit.self, forKey: .rosterFit)
            evaluability = try c.decode(TradeCompare.Evaluability.self, forKey: .evaluability)
        }

        enum CodingKeys: String, CodingKey {
            case teamID = "team_id", teamName = "team_name", sends, receives
            case netValue = "net_value"
            case verdictState = "verdict_state"
            case acceptanceLikelihood = "acceptance_likelihood"
            case confidence
            case rosterFit = "roster_fit"
            case evaluability
        }
    }

    /// T1's `buildThreeTeamSubmission`: a client-only checklist, never a claim of provider
    /// confirmation. `steps` line up 1:1, in order, with the legs the client POSTed — the same
    /// order `resolvedLegs.map` in `trade.js` iterates — so `TradeViewModel` can pair step *i*
    /// with `TradeThreeTeamOffer.legs[i]` to build the per-step "Copy" text.
    struct Submission: Decodable, Equatable {
        let mode: String
        let reason: String?
        let caption: String
        let steps: [String]

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            mode = try c.decodeIfPresent(String.self, forKey: .mode) ?? "split_handoff"
            reason = try c.decodeIfPresent(String.self, forKey: .reason)
            caption = try c.decodeIfPresent(String.self, forKey: .caption) ?? ""
            steps = try c.decodeIfPresent([String].self, forKey: .steps) ?? []
        }

        enum CodingKeys: String, CodingKey { case mode, reason, caption, steps }
    }

    let contractVersion: String
    let tradeShape: String
    let teamCount: Int
    let participants: [Participant]
    let evaluability: TradeCompare.Evaluability
    /// The first team named across the legs — "your" headline, per T1's own comment: the app's
    /// builder always lists the caller's team first.
    let verdictState: TradeCompare.VerdictState
    let analysisContext: TradeCompare.AnalysisContext
    let submission: Submission

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        contractVersion = try c.decodeIfPresent(String.self, forKey: .contractVersion) ?? ""
        tradeShape = try c.decodeIfPresent(String.self, forKey: .tradeShape) ?? "three_team"
        teamCount = try c.decodeIfPresent(Int.self, forKey: .teamCount) ?? 3
        participants = try c.decodeIfPresent([Participant].self, forKey: .participants) ?? []
        evaluability = try c.decode(TradeCompare.Evaluability.self, forKey: .evaluability)
        verdictState = try c.decodeIfPresent(TradeCompare.VerdictState.self, forKey: .verdictState) ?? .insufficientData
        analysisContext = try c.decode(TradeCompare.AnalysisContext.self, forKey: .analysisContext)
        submission = try c.decode(Submission.self, forKey: .submission)
    }

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version"
        case tradeShape = "trade_shape"
        case teamCount = "team_count"
        case participants, evaluability
        case verdictState = "verdict_state"
        case analysisContext = "analysis_context"
        case submission
    }

    /// "Your own" participant — the first team named across the legs, matching T1's
    /// `participants[0]` convention for the top-level `verdict_state`.
    var viewerParticipant: Participant? { participants.first }
}
