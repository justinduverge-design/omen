import Foundation

/// A real multi-league account, faked. No network.
///
/// Swift twin of `CarouselFixtures.kt`, and the same reasoning applies: every other Command
/// Center fixture builds the screen with `carousel == nil`, which is a genuinely different
/// branch — stacked sections, no pager, no filter chips. The founder's account runs the other
/// branch, so until this existed, every layout change to the carousel was verified by one
/// person looking at one phone. Three clipping bugs shipped that way.
///
/// One fixture, two consumers: `ScreenshotScenarios` renders it for the end-of-batch visual
/// check, `CarouselLayoutUITests` measures it for the regression gate. Keeping it one fixture
/// is the point — two would drift, and then the screenshot and the assertion describe
/// different screens.
///
/// Built from wire JSON rather than memberwise initialisers because these contract types
/// define custom `init(from:)`. That is a feature here: the fixture exercises the real decode
/// path, so a parsing regression surfaces too.
enum CarouselFixtures {

    /// Three lines at phone width — the maximum the watch rail renders.
    ///
    /// NOT what the app currently produces: `LeagueOverview.watchLine` emits only
    /// "Projected within N points." — one subtraction, and only while a game is live. The
    /// founder's 2026-09-10 note that this is uninformative is a contract gap, not a copy
    /// one. The fixture carries the length the surface has to survive regardless.
    static let hostileSignal =
        "Opponent still has two starters on Monday night and needs 31.2 from them; "
        + "your kicker and defense are already final, so this comes down to their "
        + "RB2 volume after halftime."

    /// Four ESPN, one Sleeper, one Yahoo — the count-descending-then-alphabetical order a
    /// correct server sends. The client renders that order without re-sorting, which
    /// `LeagueCarouselTests` proves separately.
    static let directoryJSON = """
    {"contract_version":"league-directory.v1","season":2026,
     "selection_persistence":"explicit","follow_persistence":"explicit",
     "active":{"platform":"espn","league_id":"e1","league_name":"EB Football",
               "team_id":"t1","team_name":"Dat Sauce Inc.","scoring_format":"PPR"},
     "platforms":[
       {"platform":"espn","connection_state":"connected","discovery":"full","leagues":[
         {"league_id":"e1","league_name":"EB Football","season":2026,"team_id":"t-e1",
          "team_name":"Dat Sauce Inc.","is_active":true,"is_followed":true},
         {"league_id":"e2","season":2026,"team_id":"t-e2",
          "team_name":"Justin's Absolutely Enormous Fantasy Team Name",
          "is_active":false,"is_followed":true},
         {"league_id":"e3","league_name":"The Money League (Championship Or Bust Edition)",
          "season":2026,"team_id":"t-e3","team_name":"Goat Squad",
          "is_active":false,"is_followed":true},
         {"league_id":"e4","league_name":"Dynasty Devils","season":2026,"team_id":"t-e4",
          "team_name":"Rebuild Year Again","is_active":false,"is_followed":true}]},
       {"platform":"sleeper","connection_state":"connected","discovery":"full","leagues":[
         {"league_id":"s1","league_name":"Slops Saloon Invitational","season":2026,
          "team_id":"t-s1","team_name":"Bad Beats Only","is_active":false,"is_followed":true}]},
       {"platform":"yahoo","connection_state":"connected","discovery":"full","leagues":[
         {"league_id":"y1","league_name":"Work League","season":2026,"team_id":"t-y1",
          "team_name":"Cubicle Kings","is_active":false,"is_followed":true}]}]}
    """

    static func directory() -> LeagueDirectory {
        // A fixture that cannot decode is a broken test, not a runtime condition — fail loudly
        // rather than degrade into an empty carousel that would quietly pass every assertion.
        try! JSONDecoder().decode(LeagueDirectory.self, from: Data(directoryJSON.utf8))
    }

    private static func overviewJSON(
        platform: String,
        leagueID: String,
        leagueName: String?,
        status: String,
        you: String?,
        them: String?
    ) -> String {
        let name = leagueName.map { "\"\($0)\"" } ?? "null"
        let sides: String
        if let you, let them {
            sides = "\"you\":\(you),\"opponent\":\(them)"
        } else {
            sides = "\"you\":null,\"opponent\":null,\"unavailable_reason\":\"This league is on a bye.\""
        }
        return """
        {"contract_version":"league-overview.v1","platform":"\(platform)",
         "league_id":"\(leagueID)","league_name":\(name),"season":2026,"week":7,
         "matchup":{"status":"\(status)",\(sides)},
         "standings":{"status":"unavailable","teams":[]},
         "activity":{"status":"unavailable","unavailable_families":[],"items":[]}}
        """
    }

    static func overview(platform: String, leagueID: String) -> LeagueOverview {
        let json: String
        switch platform {
        case "yahoo":
            json = overviewJSON(
                platform: platform, leagueID: leagueID, leagueName: "Work League",
                status: "no_matchup", you: nil, them: nil
            )
        case "sleeper":
            json = overviewJSON(
                platform: platform, leagueID: leagueID,
                leagueName: "Slops Saloon Invitational", status: "pregame",
                you: #"{"team_name":"Bad Beats Only","record":"0-0","projected":121.4}"#,
                them: #"{"team_name":"Cubicle Kings","record":"0-0","projected":118.9}"#
            )
        default:
            json = overviewJSON(
                platform: platform, leagueID: leagueID,
                leagueName: leagueID == "e2" ? nil : "EB Football", status: "live",
                you: #"{"team_name":"Justin's Absolutely Enormous Fantasy Team Name","record":"6-1","points":64.8,"projected":119.6}"#,
                them: #"{"team_name":"G.O.A.T. SQUAD (Championship Or Bust Edition)","record":"5-2","points":58.1,"projected":114.2}"#
            )
        }
        return try! JSONDecoder().decode(LeagueOverview.self, from: Data(json.utf8))
    }

    /// - Parameter failingPlatform: a provider whose overview read fails, so the fixture can
    ///   prove one bad provider does not take the whole carousel down with it.
    final class FakeLeagueRepository: LeagueRepository {
        private let failingPlatform: String?
        init(failingPlatform: String? = nil) { self.failingPlatform = failingPlatform }

        func fetchStandings(accessToken: String) async -> Result<LeagueStandings, OmenApiError> {
            .failure(.network)
        }

        func fetchOverview(
            accessToken: String,
            platform: String?,
            leagueID: String?
        ) async -> Result<LeagueOverview, OmenApiError> {
            let p = platform ?? "espn"
            if p == failingPlatform { return .failure(.network) }
            return .success(CarouselFixtures.overview(platform: p, leagueID: leagueID ?? "e1"))
        }
    }

    final class FakeDirectoryRepository: LeagueDirectoryRepository {
        func fetchDirectory(accessToken: String) async -> Result<LeagueDirectory, OmenApiError> {
            .success(CarouselFixtures.directory())
        }

        func selectLeague(
            accessToken: String,
            platform: String,
            leagueID: String,
            teamID: String?
        ) async -> Result<LeagueSelectionResult, OmenApiError> {
            let json = """
            {"contract_version":"league-active-selection.v1",
             "selection_persistence":"explicit",
             "active":{"platform":"\(platform)","league_id":"\(leagueID)","team_id":null},
             "refresh":["command_center","omen","trade"]}
            """
            return .success(
                try! JSONDecoder().decode(LeagueSelectionResult.self, from: Data(json.utf8))
            )
        }

        /// The fixture never disconnects — no page in it is in that state — but the protocol
        /// requires it, and a fatalError here would turn an unrelated future test into a crash.
        func disconnect(accessToken: String, platform: String) async -> Result<Void, OmenApiError> {
            .success(())
        }
    }

    @MainActor
    static func viewModel(failingPlatform: String? = nil) -> LeagueCarouselViewModel {
        LeagueCarouselViewModel(
            directoryRepository: FakeDirectoryRepository(),
            leagueRepository: FakeLeagueRepository(failingPlatform: failingPlatform),
            sessionManager: SessionManager(
                store: InMemorySecureSessionStore(
                    initial: Session(
                        userID: "fixture",
                        accessToken: "t",
                        refreshToken: "r",
                        expiresAtEpochSeconds: 9_999_999_999
                    )
                ),
                nowEpochSeconds: { 1_000 }
            )
        )
    }
}
