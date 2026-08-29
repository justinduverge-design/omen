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

        enum CodingKeys: String, CodingKey {
            case teamName = "team_name"
            case isCurrentUser = "is_current_user"
            case rank, wins, losses
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
            let leagueName, !leagueName.isEmpty,
            let teamName = currentUserTeam?.teamName, !teamName.isEmpty
        else { return nil }

        return .selected(platform: platform, leagueName: leagueName, teamName: teamName)
    }

    /// League Pulse, derived from the standings this response already carries.
    ///
    /// This exists because League Pulse used to be derived from `dashboard-summary.v1`'s tool
    /// status alone, which returned `.unavailable` for every healthy league — while this
    /// payload, already fetched for the context strip, carried the rank and team count the
    /// section needed. The data was in hand and discarded.
    ///
    /// Returns `nil` for "leave the caller's current state alone", matching `contextStrip`.
    /// The cut line and activity stay `nil` on purpose: `league-standings.v1` carries no
    /// playoff settings and no transaction feed, so neither can be stated without inventing.
    var leaguePulse: OmenLeaguePulseState? {
        guard !standings.isEmpty else { return nil }
        guard let rank = currentUserTeam?.rank, rank > 0 else { return nil }

        var position = "\(Self.ordinal(rank)) of \(standings.count)"
        if let team = currentUserTeam, let wins = team.wins, let losses = team.losses {
            position += " · \(wins)-\(losses)"
        }
        return .available(position: position, cutLine: nil, activity: nil)
    }

    /// English ordinal. Handles the 11/12/13 exception, which the naive last-digit rule gets
    /// wrong — a 12-team league is exactly where that bug would show.
    static func ordinal(_ n: Int) -> String {
        let suffix: String
        switch (n % 100, n % 10) {
        case (11, _), (12, _), (13, _): suffix = "th"
        case (_, 1): suffix = "st"
        case (_, 2): suffix = "nd"
        case (_, 3): suffix = "rd"
        default: suffix = "th"
        }
        return "\(n)\(suffix)"
    }
}
