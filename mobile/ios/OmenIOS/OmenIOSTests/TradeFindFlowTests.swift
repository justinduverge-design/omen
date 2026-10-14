import XCTest
@testable import Omen

/// Find a trade as the Trade tab's front door: resolving the user's own team from the league
/// directory, the real save call (`POST /api/trade/saved`), and the honest unavailable states.
@MainActor
final class TradeFindFlowTests: XCTestCase {

    // MARK: - Fixtures

    private func directory(_ json: String) -> LeagueDirectory {
        try! JSONDecoder().decode(LeagueDirectory.self, from: Data(json.utf8))
    }

    private var threeProviderDirectory: LeagueDirectory {
        directory("""
        {
          "contract_version": "league-directory.v1",
          "platforms": [
            { "platform": "espn", "connection_state": "connected", "leagues": [
              { "league_id": "517756847", "team_id": "8", "team_name": "TTO" },
              { "league_id": "999", "team_id": null }
            ] },
            { "platform": "sleeper", "connection_state": "connected", "leagues": [
              { "league_id": "s-1", "team_id": "4", "team_name": "DarthSlops" }
            ] },
            { "platform": "yahoo", "connection_state": "connected", "leagues": [
              { "league_id": "nfl.l.555", "team_id": "6", "team_name": "Puk Around" }
            ] }
          ]
        }
        """)
    }

    private func sessionManager() -> SessionManager {
        let session = Session(userID: "user-1", accessToken: "t", refreshToken: "r", expiresAtEpochSeconds: 2_000)
        return SessionManager(store: InMemorySecureSessionStore(initial: session), nowEpochSeconds: { 1_000 })
    }

    private func launcher(_ result: Result<LeagueDirectory, OmenApiError>) -> TradeFindLauncher {
        TradeFindLauncher(
            directoryRepository: StubLeagueDirectoryRepository(directory: result),
            sessionManager: sessionManager()
        )
    }

    // MARK: - Team resolution (works for all three providers)

    func testTeamResolvesForEspnSleeperAndYahoo() {
        let d = threeProviderDirectory
        XCTAssertEqual(TradeFindLauncher.teamID(in: d, platform: "espn", leagueID: "517756847"), "8")
        XCTAssertEqual(TradeFindLauncher.teamID(in: d, platform: "sleeper", leagueID: "s-1"), "4")
        XCTAssertEqual(TradeFindLauncher.teamID(in: d, platform: "yahoo", leagueID: "nfl.l.555"), "6")
        XCTAssertEqual(TradeFindLauncher.teamID(in: d, platform: "ESPN", leagueID: "517756847"), "8", "platform is case-insensitive")
    }

    func testTeamIsNilRatherThanGuessedWhenTheDirectoryDoesNotNameOne() {
        let d = threeProviderDirectory
        XCTAssertNil(TradeFindLauncher.teamID(in: d, platform: "espn", leagueID: "999"))
        XCTAssertNil(TradeFindLauncher.teamID(in: d, platform: "sleeper", leagueID: "missing"))
        // A league id that exists on a different provider is not a match.
        XCTAssertNil(TradeFindLauncher.teamID(in: d, platform: "yahoo", leagueID: "s-1"))
    }

    func testLauncherReachesReadyWithTheDirectorysTeam() async {
        let sut = launcher(.success(threeProviderDirectory))
        await sut.resolve(userID: "user-1", platform: "yahoo", leagueId: "nfl.l.555", fallbackTeamId: nil)
        XCTAssertEqual(sut.state, .ready(platform: "yahoo", leagueId: "nfl.l.555", teamId: "6"))
    }

    func testLauncherFallsBackToTheOverviewTeamOnlyWhenTheDirectoryIsBlank() async {
        let sut = launcher(.success(threeProviderDirectory))
        await sut.resolve(userID: "user-1", platform: "espn", leagueId: "999", fallbackTeamId: "12")
        XCTAssertEqual(sut.state, .ready(platform: "espn", leagueId: "999", teamId: "12"))

        // The fallback never overrides a team the directory did name.
        await sut.resolve(userID: "user-1", platform: "espn", leagueId: "517756847", fallbackTeamId: "12")
        XCTAssertEqual(sut.state, .ready(platform: "espn", leagueId: "517756847", teamId: "8"))
    }

    func testLauncherSaysTeamUnknownInsteadOfGuessing() async {
        let sut = launcher(.success(threeProviderDirectory))
        await sut.resolve(userID: "user-1", platform: "espn", leagueId: "999", fallbackTeamId: nil)
        XCTAssertEqual(sut.state, .teamUnknown)
    }

    func testLauncherHandlesNoLeagueDemoAndFailure() async {
        let sut = launcher(.success(threeProviderDirectory))
        await sut.resolve(userID: "user-1", platform: nil, leagueId: nil, fallbackTeamId: nil)
        XCTAssertEqual(sut.state, .leagueUnknown, "connected leagues without an active selection are not an empty account")

        let empty = launcher(.success(directory(#"{"contract_version":"league-directory.v1","platforms":[]}"#)))
        await empty.resolve(userID: "user-1", platform: nil, leagueId: nil, fallbackTeamId: nil)
        XCTAssertEqual(empty.state, .noLeague)

        await sut.resolve(userID: SessionManager.demoUserID, platform: "espn", leagueId: "1", fallbackTeamId: nil)
        XCTAssertEqual(sut.state, .demo)

        let failing = launcher(.failure(.network))
        await failing.resolve(userID: "user-1", platform: "espn", leagueId: "517756847", fallbackTeamId: nil)
        XCTAssertEqual(failing.state, .failed(.network))
    }

    func testLauncherRecoversActiveLeagueWhenSheetOpenedBeforeScopeLands() async {
        let active = directory("""
        {
          "contract_version": "league-directory.v1",
          "active": { "platform": "sleeper", "league_id": "s-1", "team_id": "4" },
          "platforms": [
            { "platform": "sleeper", "connection_state": "connected", "leagues": [
              { "league_id": "s-1", "team_id": "4", "team_name": "DarthSlops" }
            ] }
          ]
        }
        """)
        let sut = launcher(.success(active))

        // This is the physical-device race: the sheet receives nil before the shell's
        // asynchronous selected scope arrives. The directory's active context is authoritative.
        await sut.resolve(userID: "user-1", platform: nil, leagueId: nil, fallbackTeamId: nil)

        XCTAssertEqual(sut.state, .ready(platform: "sleeper", leagueId: "s-1", teamId: "4"))
    }

    // MARK: - Save hits the real endpoint

    private final class CapturingFetcher: OmenHTTPFetching {
        var captured: URLRequest?
        let status: Int
        let body: String
        init(status: Int, body: String) { self.status = status; self.body = body }

        func data(for request: URLRequest) async throws -> (Data, URLResponse) {
            captured = request
            let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!
            return (Data(body.utf8), response)
        }
    }

    private let reasoning: TradeFindReasoning = {
        let json = """
        {
          "fills_need_for": ["user"],
          "user_receives": { "position": "RB", "need": { "status": "hole", "have": 2, "required": 3 } },
          "opponent_receives": { "position": "WR", "need": { "status": "surplus", "have": 6, "required": 3 } },
          "evidence": ["live_roster_depth", "live_lineup_projection_delta"]
        }
        """
        return try! JSONDecoder().decode(TradeFindReasoning.self, from: Data(json.utf8))
    }()

    private func saveAction(_ fetcher: CapturingFetcher) -> ApiTradeFindSaveAction {
        ApiTradeFindSaveAction(
            client: OmenApiClient(baseURL: URL(string: "https://example.invalid")!, fetcher: fetcher),
            sessionManager: sessionManager()
        )
    }

    func testSavePostsCandidateIdAndReasoningVerbatimToTheSavedEndpoint() async throws {
        let fetcher = CapturingFetcher(status: 200, body: #"{"status":"saved"}"#)
        let outcome = await saveAction(fetcher).save(candidateId: "tok.find_2_a_b", reasoning: reasoning)

        XCTAssertEqual(outcome, .saved)
        XCTAssertEqual(fetcher.captured?.httpMethod, "POST")
        XCTAssertEqual(fetcher.captured?.url?.path, "/api/trade/saved")
        XCTAssertEqual(fetcher.captured?.value(forHTTPHeaderField: "Authorization"), "Bearer t")

        let sent = try JSONSerialization.jsonObject(with: XCTUnwrap(fetcher.captured?.httpBody)) as? [String: Any]
        XCTAssertEqual(sent?["candidate_id"] as? String, "tok.find_2_a_b")
        let sentReasoning = try XCTUnwrap(sent?["reasoning"] as? [String: Any])
        XCTAssertEqual(sentReasoning["fills_need_for"] as? [String], ["user"])
        XCTAssertEqual((sentReasoning["user_receives"] as? [String: Any])?["position"] as? String, "RB")
        XCTAssertEqual(sentReasoning["evidence"] as? [String], ["live_roster_depth", "live_lineup_projection_delta"])
        XCTAssertEqual(Set(sent?.keys.map { $0 } ?? []), ["candidate_id", "reasoning"], "nothing else is sent: the server resolves the trade itself")
    }

    func testSaveMaps410ToExpiredAndOtherFailuresToError() async {
        let expired = await saveAction(CapturingFetcher(status: 410, body: #"{"code":"trade_saved_candidate_expired"}"#))
            .save(candidateId: "x", reasoning: reasoning)
        XCTAssertEqual(expired, .expired)

        let unavailable = await saveAction(CapturingFetcher(status: 503, body: #"{"code":"trade_saved_queue_storage_unavailable"}"#))
            .save(candidateId: "x", reasoning: reasoning)
        XCTAssertEqual(unavailable, .error)

        let wrongStatus = await saveAction(CapturingFetcher(status: 200, body: #"{"status":"error"}"#))
            .save(candidateId: "x", reasoning: reasoning)
        XCTAssertEqual(wrongStatus, .error)
    }

    // MARK: - View model: expired saves and provider-aware copy

    private final class FixedSave: TradeFindSaveAction {
        let outcome: TradeFindSaveOutcome
        init(_ outcome: TradeFindSaveOutcome) { self.outcome = outcome }
        func save(candidateId: String, reasoning: TradeFindReasoning) async -> TradeFindSaveOutcome { outcome }
    }

    private func response(platform: String, status: String = "ok", reason: String? = nil, degraded: String = "[]", candidates: Bool = true) -> TradeFindResponse {
        let candidate = """
        {
          "id": "c1", "opponent_team_id": "2", "opponent_team_name": "Them",
          "give": { "name": "A", "position": "WR" }, "receive": { "name": "B", "position": "RB" },
          "user_lineup_delta": 2.0, "opponent_lineup_delta": 1.0,
          "reasoning": {
            "fills_need_for": ["user"],
            "user_receives": { "position": "RB", "need": { "status": "hole", "have": 1, "required": 2 } },
            "opponent_receives": { "position": "WR", "need": { "status": "surplus", "have": 5, "required": 3 } },
            "evidence": ["live_roster_depth"]
          }
        }
        """
        let reasonField = reason.map { "\"reason\": \"\($0)\"," } ?? ""
        let json = """
        {
          "contract_version": "trade-find.v1", "status": "\(status)", "platform": "\(platform)",
          "league_id": "l", "team_id": "1", "week": 3, \(reasonField)
          "bounds": { "teams_considered": 3, "teams_skipped_for_cap": [] },
          "degraded_teams": \(degraded), "budget_exceeded": false,
          "candidates": [\(candidates ? candidate : "")]
        }
        """
        return try! JSONDecoder().decode(TradeFindResponse.self, from: Data(json.utf8))
    }

    private func viewModel(_ result: TradeFindResponse, save: TradeFindSaveOutcome = .saved) -> TradeFindReviewViewModel {
        TradeFindReviewViewModel(
            repository: StubTradeFindRepository(result: .success(result)),
            saveAction: FixedSave(save),
            sessionManager: sessionManager()
        )
    }

    func testExpiredSaveIsItsOwnStateAndSearchAgainReloads() async {
        let sut = viewModel(response(platform: "sleeper"), save: .expired)
        await sut.load(platform: "sleeper", leagueId: "l", teamId: "1", week: nil)
        await sut.save()
        XCTAssertEqual(sut.saveState(for: "c1"), .expired)

        await sut.reload()
        XCTAssertEqual(sut.viewState, .reviewing)
        XCTAssertEqual(sut.saveState(for: "c1"), .idle, "a fresh search clears the stale save state")
    }

    func testASwipeOnAnAlreadySavedCardDoesNotSaveTwice() async {
        let sut = viewModel(response(platform: "sleeper"))
        await sut.load(platform: "sleeper", leagueId: "l", teamId: "1", week: nil)
        await sut.save()
        XCTAssertEqual(sut.saveState(for: "c1"), .saved)
        await sut.save()
        XCTAssertEqual(sut.saveState(for: "c1"), .saved)
    }

    func testDegradedSentenceNamesTheProviderThatFailedNotAlwaysEspn() async {
        let degraded = #"[{"team_id":"3","team_name":"Chubb Rock","reason":"roster_unreadable"}]"#
        for (platform, name) in [("yahoo", "Yahoo"), ("sleeper", "Sleeper"), ("espn", "ESPN")] {
            let sut = viewModel(response(platform: platform, status: "degraded", degraded: degraded))
            await sut.load(platform: platform, leagueId: "l", teamId: "1", week: nil)
            XCTAssertEqual(
                sut.degradedSentence,
                "\(name) couldn't read Chubb Rock's roster this week — Omen never proposes a trade against a roster it can't see."
            )
        }
    }

    func testProjectionlessProviderRoutesToAnHonestUnavailableStateNotNoGaps() async {
        let unavailable = response(platform: "yahoo", status: "unavailable", reason: "projections_unavailable", candidates: false)
        let sut = viewModel(unavailable)
        await sut.load(platform: "yahoo", leagueId: "l", teamId: "1", week: nil)
        XCTAssertEqual(sut.viewState, .routeElsewhere(reason: "projections_unavailable"))

        let copy = OmenTradeFindReviewScreen.unavailableCopy(reason: "projections_unavailable", platform: "yahoo")
        XCTAssertEqual(copy.title, "Yahoo doesn't share projections yet")
        XCTAssertFalse(copy.message.localizedCaseInsensitiveContains("no real gaps"))
    }

    func testEveryServerReasonHasItsOwnCopy() {
        let reasons = ["projections_unavailable", "provider_reauth_required", "league_not_active", "own_roster_unavailable", "provider_unsupported"]
        let titles = reasons.map { OmenTradeFindReviewScreen.unavailableCopy(reason: $0, platform: "espn").title }
        XCTAssertEqual(Set(titles).count, reasons.count)
    }
}
