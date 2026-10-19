import Foundation

/// M5-Native-API-Client slice C — `GET /api/league/standings` → `league-standings.v1`.
///
/// This is the route that carries the provider identity `dashboard-summary.v1` does not:
/// `league_name` on the envelope, and `team_name` + `is_current_user` on every row, for
/// all three providers (`sleeper.js`, `espn.js`, `services/yahoo.js` each set the flag).
///
/// Unlike the dashboard summary — which reads our own rows — this makes a **live provider
/// call**. It is slower, it can fail on its own, and it correctly returns an empty
/// `standings` array during the off-season. Nothing on the Command Center may block on it.
struct LeagueStandings: Decodable, Equatable {
    let contractVersion: String
    let platform: String
    let leagueName: String?
    let standings: [Team]

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version"
        case platform
        case leagueName = "league_name"
        case standings
    }

    struct Team: Decodable, Equatable {
        let teamName: String?
        let isCurrentUser: Bool
        let rank: Int?
        let wins: Int?
        let losses: Int?
        /// F-SCR-01. `league-standings.v1` has always carried these — the Sleeper adapter uses
        /// `points_for` as the standings tiebreaker, and the web app renders both — while
        /// neither native client decoded them. A user could see two teams at 6-2 ranked
        /// differently with nothing on screen explaining why.
        let pointsFor: Double?
        let pointsAgainst: Double?

        enum CodingKeys: String, CodingKey {
            case teamName = "team_name"
            case isCurrentUser = "is_current_user"
            case rank, wins, losses
            case pointsFor = "points_for"
            case pointsAgainst = "points_against"
        }

        /// `is_current_user` is additive on some provider paths; a missing flag means
        /// "not known to be mine", never "mine".
        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            teamName = try c.decodeIfPresent(String.self, forKey: .teamName)
            isCurrentUser = try c.decodeIfPresent(Bool.self, forKey: .isCurrentUser) ?? false
            rank = try c.decodeIfPresent(Int.self, forKey: .rank)
            wins = try c.decodeIfPresent(Int.self, forKey: .wins)
            losses = try c.decodeIfPresent(Int.self, forKey: .losses)
            pointsFor = try c.decodeIfPresent(Double.self, forKey: .pointsFor)
            pointsAgainst = try c.decodeIfPresent(Double.self, forKey: .pointsAgainst)
        }
    }

    /// The caller's own team, if the provider identified one.
    var currentUserTeam: Team? {
        standings.first(where: { $0.isCurrentUser })
    }

    /// Maps the provider string to the design-system platform. An unrecognized provider
    /// yields `nil` rather than a guess, which keeps the context strip empty instead of
    /// badging a league with the wrong platform mark.
    var omenPlatform: OmenPlatform? {
        switch platform.lowercased() {
        case "sleeper": return .sleeper
        case "espn": return .espn
        case "yahoo": return .yahoo
        default: return nil
        }
    }

    /// The context strip this standings response can honestly support.
    ///
    /// Returns `nil` — meaning "leave the strip as it is" — unless we have a real platform,
    /// a real league name, and a team the provider marked as the caller's. A partial answer
    /// would mean printing a placeholder next to a real one, which is the invention this
    /// mapping exists to prevent.
    var contextStrip: OmenContextStripState? {
        guard
            let platform = omenPlatform,
            let teamName = currentUserTeam?.teamName, !teamName.isEmpty
        else { return nil }

        let league = leagueName.flatMap { $0.isEmpty ? nil : $0 }
        return .selected(platform: platform, leagueName: league, teamName: teamName)
    }

}
