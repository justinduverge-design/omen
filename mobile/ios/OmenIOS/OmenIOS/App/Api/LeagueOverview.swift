import Foundation

/// `GET /api/league/overview` → `league-overview.v1`.
///
/// The League destination's payload. Distinct from `league-standings.v1`, which stays exactly
/// as it was because the Command Center context strip consumes it.
///
/// The defining property of this contract is that **every section carries its own status and
/// fails independently**. A dead matchup read arrives as `matchup.status == "unavailable"`
/// beside live standings. Nothing here may infer a section's health from whether its array is
/// empty — that is the F9 rule applied at section granularity.
struct LeagueOverview: Decodable, Equatable {
    let contractVersion: String
    let platform: String
    /// Carried so Trade can personalize against the same league this screen is showing,
    /// rather than discovering one of its own and disagreeing with League on screen.
    let leagueId: String?
    let leagueName: String?
    let season: Int?
    let week: Int?
    let matchup: Matchup
    let standings: Standings
    let activity: Activity

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version"
        case platform
        case leagueId = "league_id"
        case leagueName = "league_name"
        case season, week, matchup, standings, activity
    }

    // MARK: - Matchup

    struct Matchup: Decodable, Equatable {
        /// Mirrors the server's enum. An unrecognized value degrades to `.unavailable` rather
        /// than failing the decode — this contract is expected to grow, and one new status
        /// must not blank a screen whose other sections decoded fine.
        enum Status: String, Decodable {
            case pregame, live, final, noMatchup = "no_matchup", unavailable

            init(from decoder: Decoder) throws {
                let raw = try decoder.singleValueContainer().decode(String.self)
                self = Status(rawValue: raw) ?? .unavailable
            }
        }

        struct Side: Decodable, Equatable {
            let teamId: String?
            let teamName: String?
            let record: String?
            let points: Double?
            let projected: Double?

            enum CodingKeys: String, CodingKey {
                case teamId = "team_id"
                case teamName = "team_name"
                case record, points, projected
            }
        }

        let status: Status
        let you: Side?
        let opponent: Side?
        let unavailableReason: String?

        enum CodingKeys: String, CodingKey {
            case status, you, opponent
            case unavailableReason = "unavailable_reason"
        }
    }

    // MARK: - Standings

    struct Standings: Decodable, Equatable {
        enum Status: String, Decodable {
            case available, offSeason = "off_season", unavailable

            init(from decoder: Decoder) throws {
                let raw = try decoder.singleValueContainer().decode(String.self)
                self = Status(rawValue: raw) ?? .unavailable
            }
        }

        /// Current position only. `cutLineNote` is `nil` and `settingsKnown` is `false` until a
        /// provider path actually reads playoff settings — no probability, no clinch or
        /// elimination scenarios in v1.
        struct PlayoffPicture: Decodable, Equatable {
            let rank: Int
            let teamCount: Int
            let line: String
            let cutLineNote: String?
            let settingsKnown: Bool

            enum CodingKeys: String, CodingKey {
                case rank, line
                case teamCount = "team_count"
                case cutLineNote = "cut_line_note"
                case settingsKnown = "settings_known"
            }
        }

        let status: Status
        let playoffPicture: PlayoffPicture?
        /// Provider rank order, preserved exactly. Omen never reorders a league (§14.1).
        let teams: [LeagueStandings.Team]

        enum CodingKeys: String, CodingKey {
            case status, teams
            case playoffPicture = "playoff_picture"
        }
    }

    // MARK: - Activity

    /// v1 ships no activity signals. `status == .empty` with `unavailableFamilies == ["transactions"]`
    /// is the honest shape, not a placeholder: the screen can say *which* half is missing.
    /// The waiver/trade integration fills `items` and flips `status`; nothing else changes.
    struct Activity: Decodable, Equatable {
        enum Status: String, Decodable {
            case available, empty, partial, unavailable

            init(from decoder: Decoder) throws {
                let raw = try decoder.singleValueContainer().decode(String.self)
                self = Status(rawValue: raw) ?? .unavailable
            }
        }

        struct Item: Decodable, Equatable, Identifiable {
            let category: String
            let text: String
            let source: String

            var id: String { "\(category)|\(text)" }
        }

        let status: Status
        let unavailableFamilies: [String]
        let items: [Item]

        enum CodingKeys: String, CodingKey {
            case status, items
            case unavailableFamilies = "unavailable_families"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            status = try c.decode(Status.self, forKey: .status)
            unavailableFamilies = try c.decodeIfPresent([String].self, forKey: .unavailableFamilies) ?? []
            items = try c.decodeIfPresent([Item].self, forKey: .items) ?? []
        }
    }
}

// MARK: - Command Center mapping

extension LeagueOverview {
    /// The Matchup Hero this payload can honestly support.
    ///
    /// Until now the hero's `.beforeGames` / `.live` / `.final` cases were constructed only in
    /// fixtures and the design gallery — the single real-data path returned `.noMatchup`
    /// unconditionally, so no connected user could ever see a matchup. This is that path.
    ///
    /// Returns `nil` for "leave the caller's current state alone", matching `contextStrip`.
    var matchupHero: OmenMatchupHeroState? {
        guard
            let you = matchup.you,
            let them = matchup.opponent,
            let mine = heroTeam(you),
            let theirs = heroTeam(them)
        else { return nil }

        switch matchup.status {
        case .pregame:
            // No kickoff time is carried by this contract. The label says what is true —
            // the week has not started — rather than inventing a time.
            return .beforeGames(
                selectedTeam: mine,
                opponent: theirs,
                startTime: "Not started",
                whatToWatch: watchLine
            )
        case .live:
            return .live(selectedTeam: mine, opponent: theirs, projectedFinish: nil, whatToWatch: watchLine)
        case .final:
            return .final(
                selectedTeam: mine,
                opponent: theirs,
                resultSummary: resultSummary(you: you, opponent: them),
                whatToWatch: nil
            )
        case .noMatchup, .unavailable:
            return nil
        }
    }

    /// `OmenMatchupTeam` takes non-optional strings, so absence is rendered as an empty
    /// record (the row simply omits it) and an em dash for a score we were not given —
    /// never a zero, which would read as "they scored nothing".
    private func heroTeam(_ side: Matchup.Side) -> OmenMatchupTeam? {
        guard let name = side.teamName, !name.isEmpty else { return nil }
        return OmenMatchupTeam(
            name: name,
            record: side.record ?? "",
            scoreText: side.points.map { String(format: "%.1f", $0) } ?? "—"
        )
    }

    /// Deterministic and checkable against the payload it came from. Anything requiring
    /// players-remaining or lineup risk needs data this contract does not carry.
    private var watchLine: String? {
        guard
            let mine = matchup.you?.points,
            let theirs = matchup.opponent?.points,
            matchup.status == .live
        else { return nil }

        let margin = abs(mine - theirs)
        return String(format: "Projected within %.1f points.", margin)
    }

    private func resultSummary(you: Matchup.Side, opponent: Matchup.Side) -> String {
        guard let mine = you.points, let theirs = opponent.points else { return "Final" }
        if mine == theirs { return String(format: "Tied %.1f–%.1f", mine, theirs) }
        let verb = mine > theirs ? "Won" : "Lost"
        return String(format: "%@ %.1f–%.1f", verb, mine, theirs)
    }

    /// Same rule as `LeagueStandings.contextStrip`: a real platform, a real league name, and a
    /// team the provider marked as the caller's — or nothing. A partial answer would print a
    /// placeholder beside a real one.
    var contextStrip: OmenContextStripState? {
        guard
            let platform = omenPlatform,
            let leagueName, !leagueName.isEmpty,
            let teamName = standings.teams.first(where: { $0.isCurrentUser })?.teamName,
            !teamName.isEmpty
        else { return nil }

        return .selected(platform: platform, leagueName: leagueName, teamName: teamName)
    }

    /// An unrecognized provider yields `nil` rather than a guess.
    var omenPlatform: OmenPlatform? {
        switch platform.lowercased() {
        case "sleeper": return .sleeper
        case "espn": return .espn
        case "yahoo": return .yahoo
        default: return nil
        }
    }

    /// League Pulse from this payload. Richer than the `league-standings.v1` derivation because
    /// the server has already computed the position line.
    var leaguePulse: OmenLeaguePulseState? {
        switch standings.status {
        case .offSeason:
            return .offSeason(summary: "Standings return when the regular season starts.")
        case .unavailable:
            return .unavailable
        case .available:
            guard let picture = standings.playoffPicture else { return .unavailable }
            return .available(
                position: picture.line,
                // Absent unless the server actually read playoff settings.
                cutLine: picture.settingsKnown ? picture.cutLineNote : nil,
                activity: activity.items.first?.text
            )
        }
    }
}
