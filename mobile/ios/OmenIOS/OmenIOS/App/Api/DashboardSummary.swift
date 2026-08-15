import Foundation

/// M5-Native-API-Client slice B — `GET /api/dashboard/summary` → `dashboard-summary.v1`.
///
/// Decoding is intentionally lenient about *additive* fields (the contract has grown
/// `lastResult`, `favorite_team`, and others over time and will grow again) and strict
/// about the fields the shell actually gates on. Unknown tool status strings decode to
/// `.unknown` rather than failing the whole response — an unrecognized status must not
/// black out a user's Command Center.
struct DashboardSummary: Decodable, Equatable {
    let contractVersion: String
    let isMock: Bool
    let user: User
    let platforms: Platforms
    let tools: Tools

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version"
        case isMock = "is_mock"
        case user, platforms, tools
    }

    struct User: Decodable, Equatable {
        let favoriteTeam: String?

        enum CodingKeys: String, CodingKey { case favoriteTeam = "favorite_team" }
    }

    struct Platforms: Decodable, Equatable {
        let yahoo: Platform
        let sleeper: Platform
        let espn: Platform

        var anyConnected: Bool { yahoo.connected || sleeper.connected || espn.connected }
    }

    struct Platform: Decodable, Equatable {
        let connected: Bool
        /// Present on Yahoo as `"token_expired"`. Absent on a healthy connection.
        let status: String?
        let leagueId: String?
        let username: String?

        enum CodingKeys: String, CodingKey {
            case connected, status, username
            case leagueId = "league_id"
        }
    }

    struct Tools: Decodable, Equatable {
        let omenOfTheWeek: Tool
        let waiverWire: Tool

        enum CodingKeys: String, CodingKey {
            case omenOfTheWeek = "omen_of_the_week"
            case waiverWire = "waiver_wire"
        }
    }

    struct Tool: Decodable, Equatable {
        let available: Bool
        let status: ToolStatus
    }

    /// The four states defined by `omenReadiness.js` and pinned in
    /// `omen-native-backend-state-contract-v1.md` §F2. No native code may invent a fifth.
    enum ToolStatus: String, Decodable, Equatable {
        case ready
        case pendingLiveEngine = "pending_live_engine"
        case needsPlatform = "needs_platform"
        case offSeason = "off_season"
        case unknown

        init(from decoder: Decoder) throws {
            let raw = try decoder.singleValueContainer().decode(String.self)
            self = ToolStatus(rawValue: raw) ?? .unknown
        }
    }
}

// MARK: - Mapping to Command Center state

extension OmenCommandCenterState {
    /// Builds the Command Center from shell truth alone.
    ///
    /// **What this contract does and does not carry.** `dashboard-summary.v1` carries tool
    /// gates and provider connection booleans. It carries no league display name, no team
    /// name, no matchup, no waiver opportunities, no ledger rows, and no standings. Those
    /// arrive in slices C/D/E from their own routes.
    ///
    /// So this mapping deliberately renders *honest absence* rather than filling the gap:
    /// the context strip stays `.empty` because naming a league we were not given a name for
    /// would be invention, and the matchup carries a reason derived from the real status.
    /// The missing display-name fields are a backend ask, recorded in
    /// `Blueprints/handoffs/frontend-to-backend.md` — not something to paper over here.
    /// `context` is slice C's overlay. It is `nil` until (and unless) `league-standings.v1`
    /// yields a platform, a league name, and a team this user owns — so the default here
    /// stays `.empty` and the screen only ever gains detail, never loses it.
    static func from(summary: DashboardSummary, context: OmenContextStripState? = nil) -> OmenCommandCenterState {
        let omenStatus = summary.tools.omenOfTheWeek.status
        let connected = summary.platforms.anyConnected

        return OmenCommandCenterState(
            greeting: greeting(for: omenStatus),
            context: context ?? .empty,
            matchup: .noMatchup(reason: matchupReason(for: omenStatus, connected: connected)),
            waiverWatch: waiverWatch(for: summary.tools.waiverWire.status, season: omenStatus),
            ledger: omenStatus == .needsPlatform ? .notConnected : .empty,
            leaguePulse: leaguePulse(for: omenStatus)
        )
    }

    private static func greeting(for status: DashboardSummary.ToolStatus) -> String {
        switch status {
        case .ready:
            return "This week's move is ready."
        case .pendingLiveEngine:
            return "Your league needs a little more setup."
        case .needsPlatform:
            return "Connect a league to see your matchup."
        case .offSeason:
            return "The season hasn't started yet."
        case .unknown:
            return "Omen is checking your leagues."
        }
    }

    private static func matchupReason(for status: DashboardSummary.ToolStatus, connected: Bool) -> String {
        switch status {
        case .ready:
            return "Open Omen to see this week's move."
        case .pendingLiveEngine:
            // F2: this means "connected but missing the provider-specific context a safe
            // live attempt needs" — NOT "the engine isn't built." Say the former.
            return "Your league is connected, but Omen still needs league details before it can call this week."
        case .needsPlatform:
            return connected
                ? "Your connection isn't usable yet. Reconnect it in Account to see your week."
                : "No matchup yet — connect Sleeper or ESPN to see your team's week."
        case .offSeason:
            return "No matchup yet — the regular season hasn't started."
        case .unknown:
            return "Omen couldn't read your league status. Pull to refresh."
        }
    }

    /// `buildWaiverTool()` in `src/routes/dashboard.js` only ever returns `ready` or
    /// `needs_platform` — it has no off-season branch, because the season gate lives on
    /// `omen_of_the_week` via `isOffSeason()`. So the season must be taken from the Omen
    /// status, or a connected user would be told to watch waivers in August.
    private static func waiverWatch(
        for status: DashboardSummary.ToolStatus,
        season: DashboardSummary.ToolStatus
    ) -> OmenWaiverWatchState {
        if season == .offSeason { return .offSeason }

        switch status {
        case .ready, .pendingLiveEngine:
            // The waiver tool reports usable, but this contract carries no opportunities.
            // "Availability needs confirmation" is exactly true; an empty `.calm` list would
            // read as "Omen looked and found nothing," which it has not done.
            return .availabilityUnknown
        case .needsPlatform, .unknown:
            return .notConnected
        case .offSeason:
            return .offSeason
        }
    }

    private static func leaguePulse(for status: DashboardSummary.ToolStatus) -> OmenLeaguePulseState {
        switch status {
        case .ready, .pendingLiveEngine:
            return .unavailable
        case .needsPlatform, .unknown:
            return .notConnected
        case .offSeason:
            return .offSeason(summary: "Standings return when the regular season starts.")
        }
    }
}
