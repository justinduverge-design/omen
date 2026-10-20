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
    /// Where we are in the NFL game week. Optional because it is additive and a server that
    /// predates it must not fail the decode — the headline falls back to a status-only line.
    let gameWeek: GameWeek?
    /// Compact coverage/routing only. Command keeps its independent section failures.
    let capabilities: [OmenDecisionCapability]?

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version"
        case isMock = "is_mock"
        case gameWeek = "game_week"
        case user, platforms, tools, capabilities
    }

    /// `game_week` — the Command Center headline's clock.
    ///
    /// **Comes from the server, never from the device.** NFL week rollover is a league fact in
    /// the league's own timezone: a phone in Los Angeles at 9pm Monday is still on Monday in
    /// the league's week while UTC has already moved it to Tuesday. Computing this client-side
    /// would give two users the same week and different headlines.
    struct GameWeek: Decodable, Equatable {
        /// Where in the week we are. Unknown values degrade to `.live` rather than failing —
        /// the contract may grow a phase, and one new string must not blank a headline.
        enum Phase: String, Decodable {
            /// Tuesday. Waivers cleared, last week scored, this week's plan being built.
            case preparing
            /// Wednesday. The plan is done and waiting.
            case ready
            /// Thursday through Monday. Games are on.
            case live
            case offSeason = "off_season"

            init(from decoder: Decoder) throws {
                let raw = try decoder.singleValueContainer().decode(String.self)
                self = Phase(rawValue: raw) ?? .live
            }
        }

        /// The week the phase refers to — on Tuesday and Wednesday that is the week about to
        /// be played, the same number the user will see on Sunday. `nil` in the off-season,
        /// deliberately: a headline naming a week that has not arrived is a lie the user can
        /// see, so absence is modelled rather than clamped to 1.
        let week: Int?
        let phase: Phase
        /// Day in the league's timezone, so copy can vary across the live window.
        let day: String?
        let isOffSeason: Bool?

        enum CodingKeys: String, CodingKey {
            case week, phase, day
            case isOffSeason = "is_off_season"
        }
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
