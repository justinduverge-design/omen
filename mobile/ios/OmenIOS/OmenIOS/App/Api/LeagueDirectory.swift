import Foundation

/// `GET /api/leagues` → `league-directory.v1`, and `POST /api/leagues/active`
/// → `league-active-selection.v1`.
///
/// Serves the approved team/league switcher sheet (visual briefs §10.2). Until this
/// existed, `OmenContextStrip` rendered a "Switch" affordance with nothing behind it —
/// and in the real app `onSwitchContext` was never even passed, so the control did not
/// render at all and a user with a connected league had no way to choose it.
///
/// Every field except the platform key is optional, for the same reason `MovesHistory`
/// models its rows that way: the server emits `null` per field rather than omitting the
/// object. `league_name` is `null` for an ESPN league because ESPN exposes no league
/// list; `scoring_format` is `null` for Yahoo because its rules are unreadable. Modelling
/// those as required would turn an ordinary honest response into a decode failure.
struct LeagueDirectory: Decodable, Equatable {
    let contractVersion: String?
    let season: Int?
    /// `"explicit"` once the reviewed selection column is applied, `"provider_binding_only"`
    /// until then. The sheet reads this to avoid promising a cross-provider choice that
    /// the server has told us it cannot yet persist.
    let selectionPersistence: String?
    let active: Active?
    let platforms: [PlatformGroup]

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version"
        case season, active, platforms
        case selectionPersistence = "selection_persistence"
    }

    /// True when the server has told us a cross-provider choice cannot persist AND the user
    /// actually has more than one provider to choose between. One provider has nothing to
    /// cross, so warning there would be noise about a limit the user cannot reach.
    ///
    /// Keyed off the server's own signal, so applying the reviewed selection column flips this
    /// to false with no client change.
    var crossProviderChoiceCannotPersist: Bool {
        guard selectionPersistence == "provider_binding_only" else { return false }
        return platforms.filter { !$0.leagues.isEmpty }.count > 1
    }

    struct Active: Decodable, Equatable {
        let platform: String?
        let leagueID: String?
        let leagueName: String?
        let teamID: String?
        let teamName: String?
        let scoringFormat: String?

        enum CodingKeys: String, CodingKey {
            case platform
            case leagueID = "league_id"
            case leagueName = "league_name"
            case teamID = "team_id"
            case teamName = "team_name"
            case scoringFormat = "scoring_format"
        }
    }

    struct PlatformGroup: Decodable, Equatable, Identifiable {
        /// `"connected"`, `"reconnect_required"`, or `"not_connected"`.
        let platform: String
        let connectionState: String?
        /// `"full"`, `"bound_only"`, or `"unavailable"`. ESPN is always `bound_only`.
        let discovery: String?
        /// Server-authored explanation for a partial or empty group. Rendered verbatim —
        /// the app must not invent its own reason for a provider's state.
        let notice: String?
        let leagues: [League]

        var id: String { platform }

        enum CodingKeys: String, CodingKey {
            case platform, discovery, notice, leagues
            case connectionState = "connection_state"
        }
    }

    struct League: Decodable, Equatable, Identifiable {
        let leagueID: String
        let leagueName: String?
        let season: Int?
        let scoringFormat: String?
        let teamID: String?
        let teamName: String?
        let isActive: Bool

        var id: String { leagueID }

        enum CodingKeys: String, CodingKey {
            case leagueID = "league_id"
            case leagueName = "league_name"
            case season
            case scoringFormat = "scoring_format"
            case teamID = "team_id"
            case teamName = "team_name"
            case isActive = "is_active"
        }
    }
}

/// `POST /api/leagues/active` → `league-active-selection.v1`.
struct LeagueSelectionResult: Decodable, Equatable {
    let contractVersion: String?
    let selectionPersistence: String?
    let active: Active?
    /// §10.3: the surfaces the caller must re-read after switching. Carried rather than
    /// hardcoded client-side so the server stays the authority on what a switch affects.
    let refresh: [String]

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version"
        case selectionPersistence = "selection_persistence"
        case active, refresh
    }

    struct Active: Decodable, Equatable {
        let platform: String?
        let leagueID: String?
        let teamID: String?

        enum CodingKeys: String, CodingKey {
            case platform
            case leagueID = "league_id"
            case teamID = "team_id"
        }
    }
}
